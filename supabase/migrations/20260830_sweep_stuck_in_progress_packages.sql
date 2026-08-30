-- ADR-0116: periodic sweep that catches a paid package stuck at
-- generation_status = 'in_progress' with no forward progress for an
-- unusual length of time, and alerts via the existing notify-generation-issue
-- path -- the same one sweep_stuck_needs_review_packages() already reuses.
--
-- Why this exists: found during the Staša incident (ADR-0115) that no
-- existing healing job touches this state -- sweep_incomplete_packages(),
-- promote_complete_packages(), auto-remediate-packages, and
-- sweep_stuck_needs_review_packages() all require generation_status to
-- already be 'completed' or 'needs_review'. A package that starts
-- generating and then genuinely stalls mid-run (Make.com scenario failure,
-- content-filter block, platform outage -- not just the specific
-- package_id race ADR-0115 closed) was invisible to every automated system
-- until either a customer emailed asking where their order was, or someone
-- happened to look. This sweep is the missing "did this ever move again"
-- check for that one remaining status value.
--
-- Deliberately alert-only, not auto-retry: diagnosing today's incident
-- required pulling the actual Make.com execution log, not just DB state --
-- a cron blindly re-triggering a stuck package risks repeating a failed
-- (billable) run without understanding why it failed, or masking a
-- problem that needs a human to actually look. notify-generation-issue
-- already composes and sends a real alert email by default for any
-- package it's invoked on (its suppression gates are narrowly scoped to
-- specific recovery-in-progress cases that don't apply here -- no
-- structuralDefects, no empty/missing characters), and already has its own
-- 6-hour cooldown (last_notified_at) -- so this sweep's SQL filter is
-- deliberately coarse, same pattern as sweep_stuck_needs_review_packages():
-- just find candidates and always re-invoke, let the function's own gates
-- decide whether to actually send.
--
-- Filtered on is_paid = true and is_test IS NOT TRUE (unlike the
-- needs_review sibling, which deliberately isn't filtered that way for a
-- different reason -- see that migration's comment): an in-progress
-- package only exists at all for a paid conversation or a service-role
-- call (internal recovery/testing, per mystery-webhook-trigger's payment
-- gate), and internal test/debug runs -- exactly what today's own
-- multi-hour investigation looked like from the outside -- shouldn't page
-- a human as if they were a stuck customer order.
--
-- 45-minute threshold: generous margin above the ~10-20 minutes a normal
-- generation run takes (Child executions ~135-160s each for up to ~35
-- characters, plus Parent's own sequential Claude/image-generation work --
-- see ADR-0106 Addendum 2's own timing data). Keyed on updated_at (last
-- actual write to the row), not generation_started_at, so a package still
-- making real progress every few minutes is never falsely flagged --
-- only genuine silence triggers this.

CREATE OR REPLACE FUNCTION public.sweep_stuck_in_progress_packages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _pkg record;
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
BEGIN
  FOR _pkg IN
    SELECT mp.id, mp.conversation_id
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE mp.generation_status->>'status' = 'in_progress'
      AND mp.updated_at < NOW() - INTERVAL '45 minutes'
      AND mp.created_at > NOW() - INTERVAL '30 days'
      AND c.is_paid = true
      AND c.is_test IS NOT TRUE
  LOOP
    PERFORM net.http_post(
      url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/notify-generation-issue',
      body := jsonb_build_object('conversation_id', _pkg.conversation_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key,
        'apikey', _anon_key
      )
    );
  END LOOP;
END;
$function$;

SELECT cron.schedule(
  'sweep-stuck-in-progress-packages',
  '*/10 * * * *',
  $$SELECT public.sweep_stuck_in_progress_packages();$$
);

-- To disable without dropping the audit history:
--   SELECT cron.unschedule('sweep-stuck-in-progress-packages');
