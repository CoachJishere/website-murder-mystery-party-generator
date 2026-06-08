-- Add attribution tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS attribution_source TEXT,
ADD COLUMN IF NOT EXISTS attribution_source_other TEXT,
ADD COLUMN IF NOT EXISTS attribution_surveyed_at TIMESTAMPTZ;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_attribution_source
ON profiles(attribution_source) WHERE attribution_source IS NOT NULL;

COMMENT ON COLUMN profiles.attribution_source IS 'Self-reported source: google, youtube, tiktok, instagram, reddit, friend, blog, other';
COMMENT ON COLUMN profiles.attribution_source_other IS 'Free-text detail when attribution_source is other';
COMMENT ON COLUMN profiles.attribution_surveyed_at IS 'Timestamp when user completed or skipped the attribution survey';
