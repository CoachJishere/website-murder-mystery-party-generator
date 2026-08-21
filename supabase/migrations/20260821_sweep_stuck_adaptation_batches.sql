-- Periodic reclaim sweep for mystery_adaptations rows stuck in 'processing'
-- past adapt-mystery-apply's own CLAIM_TTL_MINUTES (10 min). See ADR-0098.
--
-- mystery_adaptations is a paid-purchase table, and ADR-0092 established
-- that any cron touching paid packages needs explicit owner sign-off before
-- it runs unattended (it rejected exactly this kind of sweep for a
-- different stuck-status case on that basis). Explicit sign-off (Jonathan)
-- obtained 2026-08-21 before this was applied — see ADR-0098 Addendum.
--
-- Incident 2026-08-20 (ADR-0098): a customer's paid "Remove a Character"
-- batch got silently orphaned when the first invocation died mid-flight —
-- most likely Supabase's own platform-level wall-clock cap on a request that
-- never calls EdgeRuntime.waitUntil for its main work (commonly ~150s per
-- Supabase's own community discussions) killing the isolate abruptly,
-- bypassing this function's try/catch/finally entirely, so nothing ever
-- flips the row out of 'processing' or chain-dispatches the next character.
-- Root cause not fully confirmed — an AbortSignal.timeout(45s) fix was
-- deployed on the theory an un-timeout'd Anthropic call was the stall, but a
-- retry under that fix hung too, so this sweep is deliberately
-- cause-agnostic: whatever kills a future invocation, this guarantees the
-- row gets reclaimed and retried within ~10-20 minutes instead of sitting
-- stuck until a customer notices and emails in.
--
-- The row-level claim already has safe, tested TTL-based reclaim logic built
-- into adapt-mystery-apply/index.ts (proceed if 'paid' OR 'processing' past
-- the TTL) — this sweep only calls it, it adds no new mutation logic.
-- Mirrors sweep_stuck_needs_review_packages.sql's shape (coarse SQL filter,
-- always re-invoke, let the function's own logic decide whether there's
-- anything to do) and 20260729_schedule_auto_remediate_packages.sql's vault
-- secret pattern for the service-role bearer token.
--
-- Safety properties (all inherited from adapt-mystery-apply's existing code,
-- unchanged by this migration):
--   - Atomic, TTL-gated claim -- re-invoking a row a live invocation is
--     genuinely still working is a safe no-op (the UPDATE won't match).
--   - No customer is charged again -- Stripe payment already happened
--     before any row reaches 'paid'; this only re-attempts already-paid work.
--   - Bounded cost -- at most one retry per stuck row per sweep window, and
--     the polish-pass Anthropic call this might trigger is the same
--     ~$0.05/call already accepted for every normal removal
--     (POLISH_CALL_COST_USD_ESTIMATE in the function).
--
-- Requires the same vault secret 20260729's cron already depends on
-- (should already exist — verify before applying):
--   SELECT name FROM vault.decrypted_secrets WHERE name = 'service_role_key';

CREATE OR REPLACE FUNCTION public.sweep_stuck_adaptation_batches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _row record;
BEGIN
  FOR _row IN
    SELECT id
    FROM mystery_adaptations
    WHERE status = 'processing'
      AND processing_started_at < NOW() - INTERVAL '10 minutes'
      -- Guard against sweeping something ancient/anomalous without a human
      -- look first -- a row still 'processing' after 24h is a different,
      -- worse problem than this sweep's normal case and should surface, not
      -- be silently auto-retried indefinitely.
      AND processing_started_at > NOW() - INTERVAL '24 hours'
  LOOP
    PERFORM net.http_post(
      url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/adapt-mystery-apply',
      body := jsonb_build_object('adaptation_id', _row.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'service_role_key'
          LIMIT 1
        )
      ),
      timeout_milliseconds := 300000
    );
  END LOOP;
END;
$function$;

-- Scheduled 2026-08-21 with explicit owner sign-off (Jonathan).
SELECT cron.schedule(
  'sweep-stuck-adaptation-batches',
  '*/10 * * * *',
  $$SELECT public.sweep_stuck_adaptation_batches();$$
);

-- To disable without dropping the audit history, once scheduled:
--   SELECT cron.unschedule('sweep-stuck-adaptation-batches');
--
-- To review what it's caught:
--   SELECT id, batch_id, character_name, status, processing_started_at
--   FROM mystery_adaptations WHERE status = 'processing'
--   ORDER BY processing_started_at ASC;
