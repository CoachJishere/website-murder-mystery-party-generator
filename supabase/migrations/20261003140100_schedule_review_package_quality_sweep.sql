-- ADR-0136: run the report-only reviewer on every new paid package, 20 minutes after completion (the selector enforces the delay),
-- one package per 5-minute tick. Same auth pattern as the auto-remediate jobs (service role key from vault).
SELECT cron.schedule(
  'review-package-quality-sweep',
  '*/5 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/review-package-quality',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
      )
    ),
    body := jsonb_build_object('mode', 'sweep', 'max_packages', 1),
    timeout_milliseconds := 280000
  );
  $cmd$
);
