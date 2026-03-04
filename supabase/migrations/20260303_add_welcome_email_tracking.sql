-- Add welcome email tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

-- Create index for querying
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_email_sent
ON profiles(welcome_email_sent);

-- Add comment to document the columns
COMMENT ON COLUMN profiles.welcome_email_sent IS 'Tracks whether user has received welcome email after signup';
COMMENT ON COLUMN profiles.welcome_email_sent_at IS 'Timestamp when welcome email was sent';
