-- ADR-0155 Decision 1: the 5-minute held-package sweep of auto-remediate-packages lists its classes explicitly, so the new
-- accomplice_role_mismatch heal needs adding here or a held package would wait for the half-hourly full sweep. Same command as before
-- (live definition read 2026-10-13) with one more class. Idempotent: alter_job just rewrites the command.
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'auto-remediate-held-packages'),
  command := $cmd$
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
      'classes', jsonb_build_array('identity_contamination', 'slip_culprit_leak', 'template_artifact', 'missing_role_branch_content', 'pointform_language_mismatch', 'narration_person_mismatch', 'accomplice_role_mismatch')
    ),
    timeout_milliseconds := 280000
  );
  $cmd$
);
