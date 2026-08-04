-- Tighten the full remediation sweep (all 6 classes, all statuses) from every
-- 4 hours to every 30 minutes. See ADR-0062.
--
-- Context: ADR-0061 explicitly rejected tightening this job's cadence,
-- reasoning that it would 48x the paid classes' (missing_images,
-- game_overview_victim_mismatch) frequency for no benefit, just more
-- spend-cap pressure. That reasoning assumed meaningful daily volume.
-- Confirmed actual volume is 1-3 purchases/day, so the $5/day cap is nowhere
-- close to being pressured even at this tighter cadence. See ADR-0062 for
-- the full reasoning and the volume/architecture distinction it draws.
--
-- CADENCE: every 30 minutes, at :13 and :43. Keeps the existing :43 offset
-- (26 min clear of the 6-hourly health check's :17 slot, per ADR-0047) and
-- adds a second run at :13 (4 min before :17) -- comfortably outside the
-- worker's observed ~1-11s execution time, so it is still never mid-write
-- while the health check reads state for alerting.
--
-- cron.schedule() with an existing job name updates that job in place (same
-- jobid) rather than creating a duplicate -- confirmed via
-- `SELECT jobid FROM cron.job WHERE jobname = 'auto-remediate-packages'`
-- before and after applying this migration.

SELECT cron.schedule(
  'auto-remediate-packages',
  '13,43 * * * *',
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

-- To revert to the original 4-hour cadence:
--   SELECT cron.schedule('auto-remediate-packages', '43 */4 * * *', $$ ...same body as above... $$);
--
-- To review what it did unattended:
--   SELECT created_at, defect_class, action, outcome, cost_usd
--   FROM auto_remediation_log ORDER BY created_at DESC LIMIT 50;
