-- Add welcome discount tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS welcome_promo_code TEXT,
ADD COLUMN IF NOT EXISTS welcome_promo_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS discount_reminder_day5_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discount_reminder_day7_sent BOOLEAN DEFAULT FALSE;

-- Index for querying active discount users (for reminder emails)
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_promo_expires
ON profiles(welcome_promo_expires_at)
WHERE welcome_promo_code IS NOT NULL;

COMMENT ON COLUMN profiles.welcome_promo_code IS 'Unique Stripe promotion code for 7-day welcome discount';
COMMENT ON COLUMN profiles.welcome_promo_expires_at IS 'When the welcome discount expires (7 days after signup)';
COMMENT ON COLUMN profiles.discount_reminder_day5_sent IS 'Whether the day-5 discount reminder email was sent';
COMMENT ON COLUMN profiles.discount_reminder_day7_sent IS 'Whether the day-7 discount reminder email was sent';

-- pg_cron job: run send-discount-reminders daily at 9 AM UTC
-- (Adjust schedule as needed. This calls the Edge Function via HTTP.)
-- SELECT cron.schedule(
--   'send-discount-reminders',
--   '0 9 * * *',
--   $$SELECT net.http_post(
--     url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/send-discount-reminders',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   )$$
-- );
