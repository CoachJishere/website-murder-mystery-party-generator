-- Add UTM / referrer attribution columns and skip count for re-prompt logic
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS landing_referrer TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS attribution_skip_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_utm_source
  ON profiles(utm_source) WHERE utm_source IS NOT NULL;

COMMENT ON COLUMN profiles.utm_source IS 'utm_source captured at first landing before signup (e.g. google, tiktok, newsletter)';
COMMENT ON COLUMN profiles.utm_medium IS 'utm_medium captured at first landing (e.g. cpc, social, email)';
COMMENT ON COLUMN profiles.utm_campaign IS 'utm_campaign captured at first landing';
COMMENT ON COLUMN profiles.utm_term IS 'utm_term captured at first landing';
COMMENT ON COLUMN profiles.utm_content IS 'utm_content captured at first landing';
COMMENT ON COLUMN profiles.landing_referrer IS 'document.referrer captured on first landing before signup';
COMMENT ON COLUMN profiles.landing_page IS 'First pathname (with search) the user landed on before signup';
COMMENT ON COLUMN profiles.attribution_skip_count IS 'Number of times the user has skipped the attribution survey. Used to re-prompt up to twice total.';
