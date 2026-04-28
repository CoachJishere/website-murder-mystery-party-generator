-- Speeds up the post-generation health check and adds an email-cooldown column.
--
-- WHY:
--   1. Previously the `sweep_incomplete_packages` pg_cron job ran every 30 min.
--      That meant a customer whose generation had a partial failure could see a
--      "needs_review" warning for up to 30 min before our auto-recovery (also
--      triggered by the sweep) attempted to fix it. Most child generations
--      finish in 60-90s, so checking every 2 min catches issues much faster.
--
--   2. With a 2-min sweep cadence and an unrecoverable failure, the previous
--      flow would send 720 alert emails per day (every 2 min). The new
--      `last_notified_at` column gives notify-generation-issue a 6h cooldown:
--      first detection emails support; subsequent detections within 6h
--      attempt recovery silently. Worst case: 4 emails per day.
--
-- The auto-recovery itself (firing v14 child webhooks for empty characters)
-- runs on EVERY sweep, not just the ones that send email. The cooldown only
-- gates the support-team notification, not the self-healing attempt.

ALTER TABLE mystery_packages
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

COMMENT ON COLUMN mystery_packages.last_notified_at IS
  'Set by notify-generation-issue when an alert email is sent. Used as a 6h cooldown so persistent failures don''t flood the support inbox while auto-recovery still runs every sweep cycle.';

-- Replace the 30-min sweep schedule with 2-min. The existing job's exact name
-- depends on how it was created; the DO block below finds and rescheduled any
-- cron entry whose command references sweep_incomplete_packages, falling back
-- to a fresh schedule if no existing one is found.
DO $$
DECLARE
  existing_job RECORD;
BEGIN
  FOR existing_job IN
    SELECT jobid, jobname FROM cron.job
    WHERE command ILIKE '%sweep_incomplete_packages%'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
    RAISE NOTICE 'Unscheduled cron job % (id=%)', existing_job.jobname, existing_job.jobid;
  END LOOP;

  PERFORM cron.schedule(
    'sweep_incomplete_packages_2min',
    '*/2 * * * *',
    $cron$SELECT public.sweep_incomplete_packages()$cron$
  );
END $$;
