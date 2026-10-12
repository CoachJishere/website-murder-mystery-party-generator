-- ADR-0150: requirements-coverage item inside the review, and a second review pass after release. Applied live 2026-10-12; paper trail. Idempotent.
INSERT INTO pipeline_settings (key, value) VALUES ('review_requirements', 'on'), ('review_second_pass', 'on') ON CONFLICT (key) DO NOTHING;

SELECT cron.unschedule('review-second-pass') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'review-second-pass');
SELECT cron.schedule('review-second-pass', '*/5 * * * *', $cmd$
  SELECT net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/review-package-quality',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'second_pass'),
    timeout_milliseconds := 280000
  );
$cmd$);
