-- Schedule the closed-loop auto-remediation worker via pg_cron. See ADR-0047.
--
-- ⚠️ NOT YET APPLIED. This file is deliberately committed un-run: the worker
-- mutates paid packages and spends money unattended (the highest-stakes
-- automation in the repo), so ADR-0047 requires an independent eval before it
-- runs on a schedule. Apply this migration only after that eval passes.
--
-- Until then the worker can be exercised safely by hand:
--   POST /functions/v1/auto-remediate-packages  { "dry_run": true }
-- which runs every detector and reports the actions it *would* take without
-- mutating a row or spending a cent.
--
-- CADENCE: every 4 hours at :43. Two constraints set this:
--   * It must be SHORTER than the health check's 6-hourly cadence
--     (`17 */6 * * *` in .github/workflows/health-check.yml) so a mechanical
--     defect is self-healed *before* the health check would email/open an issue
--     about it. Otherwise the owner gets alerted about problems that were about
--     to fix themselves — exactly the noise ADR-0047 is trying to remove.
--   * The :43 offset keeps it clear of the :17 health-check slot, so the worker
--     is never mid-write while the detectors are being read for alerting.
--
-- AUTH: pg_net posts the service-role key as a Bearer token, read from the
-- vault at execution time (same pattern as 20260510_pinterest_creative_cron.sql
-- and the generation-monitoring cron). This requires the vault secret to exist:
--
--   SELECT vault.create_secret('<SUPABASE_SERVICE_ROLE_KEY>', 'service_role_key');
--
-- It was created for the Pinterest cron, so it should already be present —
-- verify before applying:
--   SELECT name FROM vault.decrypted_secrets WHERE name = 'service_role_key';

SELECT cron.schedule(
  'auto-remediate-packages',
  '43 */4 * * *',
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
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- To disable without dropping the audit history:
--   SELECT cron.unschedule('auto-remediate-packages');
--
-- To review what it did unattended:
--   SELECT created_at, defect_class, action, outcome, cost_usd
--   FROM auto_remediation_log ORDER BY created_at DESC LIMIT 50;
