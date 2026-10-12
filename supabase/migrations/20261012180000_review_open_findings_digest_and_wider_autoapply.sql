-- ADR-0149: daily check for packages released with unverified open reviewer findings, and wider reviewer auto-apply.
-- Applied live on 2026-10-12 through the SQL tool; kept here as the paper trail. Idempotent.

-- 1. Severity threshold for the daily email ('high', 'medium', or 'off').
INSERT INTO pipeline_settings (key, value) VALUES ('review_open_digest_min_severity', 'high') ON CONFLICT (key) DO NOTHING;

-- 2. Auto-apply language_slip too (secret_leak deliberately NOT added), and Danish and Swedish (the reviewer's language detector learned both in the same change).
UPDATE pipeline_settings SET value = 'single_generation_slip,wrong_fact,cross_field_contradiction,language_slip'
  WHERE key = 'review_auto_apply_classes' AND value = 'single_generation_slip,wrong_fact,cross_field_contradiction';
UPDATE pipeline_settings SET value = 'en,es,fr,de,it,pt,nl,da,sv'
  WHERE key = 'review_auto_apply_languages' AND value = 'en,es,fr,de,it,pt,nl';

-- 3. Daily run of review-package-quality in open_digest mode (07:30 UTC = 09:30 Valencia). One email at most per UTC day, only when something qualifies.
SELECT cron.unschedule('review-open-findings-digest') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'review-open-findings-digest');
SELECT cron.schedule('review-open-findings-digest', '30 7 * * *', $cmd$
  SELECT net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/review-package-quality',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'open_digest'),
    timeout_milliseconds := 60000
  );
$cmd$);
