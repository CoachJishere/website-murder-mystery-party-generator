-- ADR-0061: wire the child-content regenerator (ADR-0054) into the closed loop.
--
-- Three pieces:
--   1. A concurrency claim so the new 5-minute held-only sweep (below) and the
--      existing 4-hour full sweep can't both repair the same package at once.
--      Column + two SECURITY DEFINER RPCs, grant pattern mirrors
--      remediation_read_field/remediation_write_field (ADR-0047).
--   2. A second, narrowly-scoped pg_cron job: re-invokes the SAME
--      auto-remediate-packages function (no new edge function) every 5 minutes,
--      restricted via two new optional request fields
--      (`only_needs_review`, `classes`) to just the three classes this pass
--      makes delegatable to regenerate-child-content. The existing 4-hour
--      full-window job is unchanged and remains the backstop for everything.
--   3. Nothing here touches package_completion_blocking_defects(),
--      validate_package_characters(), heal_completed_packages(), or
--      promote_complete_packages() — promotion to `completed` still happens
--      exclusively through that existing gate, never on a repair's own say-so.

-- ---------------------------------------------------------------------------
-- 1. Concurrency claim
-- ---------------------------------------------------------------------------

ALTER TABLE public.mystery_packages
  ADD COLUMN IF NOT EXISTS remediation_claimed_at timestamptz;

COMMENT ON COLUMN public.mystery_packages.remediation_claimed_at IS
  'ADR-0061: set by claim_package_for_remediation() while a delegated '
  'regenerate-child-content repair (identity_contamination, slip_culprit_leak, '
  'or the meta_text_leak character-scope fallback) is in flight, so the '
  '4-hour full sweep and the 5-minute held-only sweep cannot both repair the '
  'same package at once. Self-releasing: a claim older than its TTL is '
  'treated as expired (crash backstop), and the claimant releases it '
  'explicitly on completion regardless of outcome.';

CREATE OR REPLACE FUNCTION public.claim_package_for_remediation(
  _pkg_id uuid,
  _ttl_minutes int DEFAULT 10
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _rows int;
BEGIN
  UPDATE public.mystery_packages
  SET remediation_claimed_at = now()
  WHERE id = _pkg_id
    AND (
      remediation_claimed_at IS NULL
      OR remediation_claimed_at < now() - make_interval(mins => _ttl_minutes)
    );
  GET DIAGNOSTICS _rows = ROW_COUNT;
  -- Atomic by construction: this single UPDATE's WHERE clause is evaluated
  -- against the current committed row under normal MVCC row-level locking, so
  -- two concurrent callers racing this statement serialize on the row and the
  -- second one (re-evaluating WHERE against the now-claimed row) affects zero
  -- rows and returns false. No advisory lock needed or usable here: the
  -- edge function calls this over PostgREST/RPC, one call per statement, with
  -- no persistent session to hold a session-scoped advisory lock across the
  -- several subsequent calls (readField/writeField/Claude/logRow) a repair
  -- actually makes.
  RETURN _rows > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_package_remediation_claim(
  _pkg_id uuid
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  UPDATE public.mystery_packages
  SET remediation_claimed_at = NULL
  WHERE id = _pkg_id;
$function$;

-- Same lock-down as remediation_read_field/remediation_write_field
-- (20260729_auto_remediation_log.sql): REVOKE ALL FROM PUBLIC alone is not
-- sufficient — Supabase grants EXECUTE on public-schema functions to
-- anon/authenticated by default, which must be explicitly revoked too.
REVOKE ALL ON FUNCTION public.claim_package_for_remediation(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_package_remediation_claim(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_package_for_remediation(uuid, int) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_package_remediation_claim(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_package_for_remediation(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_package_remediation_claim(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. 5-minute held-only sweep — same function, tighter cadence, narrower scope
-- ---------------------------------------------------------------------------
--
-- Deliberately does NOT touch the existing 'auto-remediate-packages' job
-- (43 */4 * * *, all six classes, all statuses in the 30-day window) — that
-- remains the unchanged backstop. This job exists only to give the three
-- newly-delegatable classes (identity_contamination, slip_culprit_leak,
-- template_artifact) a much shorter time-to-first-attempt while a package
-- sits in needs_review, without 48x-ing the cadence of the paid classes that
-- don't need it (missing_images, game_overview_victim_mismatch).
--
-- Body fields `only_needs_review`/`classes` are new, additive, optional
-- request fields on the SAME edge function — see
-- supabase/functions/auto-remediate-packages/index.ts. An old caller posting
-- '{}' (this job's sibling, and any manual dry_run) is completely unaffected.

SELECT cron.schedule(
  'auto-remediate-held-packages',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/auto-remediate-packages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
        LIMIT 1
      )
    ),
    body := jsonb_build_object(
      'only_needs_review', true,
      'classes', jsonb_build_array('identity_contamination', 'slip_culprit_leak', 'template_artifact')
    ),
    timeout_milliseconds := 280000
  );
  $$
);

-- To disable without dropping the audit history:
--   SELECT cron.unschedule('auto-remediate-held-packages');
--
-- To review what the held-only sweep did vs. the full sweep:
--   SELECT created_at, defect_class, action, outcome, cost_usd
--   FROM auto_remediation_log
--   WHERE defect_class IN ('identity_contamination','slip_culprit_leak','meta_text_leak')
--   ORDER BY created_at DESC LIMIT 50;
