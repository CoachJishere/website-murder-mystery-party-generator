-- ADR-0103 Addendum 45: wires narration_person_mismatch into the self-heal
-- pipeline (auto-remediate-packages), same per-character precise-field-list
-- delegation shape as missing_role_branch_content. See
-- supabase/functions/auto-remediate-packages/index.ts (DefectClass union,
-- DETECTOR_RPC map, delegateToRegenerator's hint union, and the new
-- handleNarrationPersonMismatch dispatch) and
-- supabase/functions/regenerate-child-content/index.ts (DefectHint union) for
-- the corresponding code changes, deployed separately via the Supabase CLI.
--
-- This migration only updates the 5-minute held-only sweep's cron job (id 9)
-- to include the new class -- the 4-hourly full sweep (job 'auto-remediate-
-- packages') runs ALL classes by default (no `classes` filter in its body),
-- so it already picks up narration_person_mismatch with no change needed.
SELECT cron.alter_job(
  job_id := 9,
  command := $$
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
      'classes', jsonb_build_array('identity_contamination', 'slip_culprit_leak', 'template_artifact', 'missing_role_branch_content', 'pointform_language_mismatch', 'narration_person_mismatch')
    ),
    timeout_milliseconds := 280000
  );
  $$
);
