-- Periodic sweep that re-checks packages still `needs_review` and re-invokes
-- notify-generation-issue so its new self-heal grace period gate (ADR-0065)
-- gets a chance to decide whether enough time/evidence has accumulated to
-- actually alert a human.
--
-- Why this exists: the only other caller of notify-generation-issue for a
-- content-quality/structural needs_review is validate_package_characters()'s
-- completion trigger, which fires exactly once, synchronously, at the exact
-- moment needs_review_at is set to "now" -- so the grace-period gate inside
-- the function can never pass on that first call (age is always ~0). Without
-- a re-check, a package still stuck past the grace window would never
-- actually get alerted. sweep_incomplete_packages() (the existing 2-min
-- sweep) can't be reused for this -- it explicitly EXCLUDES needs_review
-- rows, since it targets a different failure mode (completed-but-crashed
-- packages, not content-quality defects).
--
-- The gate logic itself lives entirely in notify-generation-issue (single
-- source of truth, per ADR-0065's Discussion) -- this sweep's SQL filter is
-- deliberately coarse (just "still needs_review, recent"); it always
-- re-invokes the function and lets the function decide whether to actually
-- send. At current volume this is a handful of cheap HTTP calls, not worth
-- duplicating the grace-period/escalation-log logic here just to avoid them.
--
-- Deliberately NOT filtered on is_paid: validate_package_characters() (the
-- trigger that makes the original synchronous call) has no such filter
-- either -- an unpaid conversation can hit needs_review too. Restricting
-- this sweep to paid packages would silently exclude unpaid ones from ever
-- being re-checked, so an unpaid package classified as worker-fixable would
-- suppress its email on the first (age-zero) call and then never get
-- re-evaluated -- a real behavior regression, not just a timing change.

CREATE OR REPLACE FUNCTION public.sweep_stuck_needs_review_packages()
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
    WHERE mp.generation_status->>'status' = 'needs_review'
      AND mp.created_at > NOW() - INTERVAL '30 days'
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
  'sweep-stuck-needs-review-packages',
  '*/10 * * * *',
  $$SELECT public.sweep_stuck_needs_review_packages();$$
);

-- To disable without dropping the audit history:
--   SELECT cron.unschedule('sweep-stuck-needs-review-packages');
