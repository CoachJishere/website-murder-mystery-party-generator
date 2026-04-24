-- Separate share token for the public recap page so a leaked recap URL
-- does NOT also grant access to the full host package (host_access_token).
ALTER TABLE mystery_packages
  ADD COLUMN IF NOT EXISTS recap_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_mystery_packages_recap_token
  ON mystery_packages(recap_token);

COMMENT ON COLUMN mystery_packages.recap_token IS
  'Public token for the shareable recap page (/recap/:token). Distinct from host_access_token so leaking a recap URL does not grant host access.';

-- SECURITY DEFINER function returning ONLY privacy-safe fields for the recap.
-- Excludes: solutions, character roles, guest names/emails, host email,
-- detective scripts, evidence card content, host guide.
CREATE OR REPLACE FUNCTION public.get_recap_data(recap_token UUID)
RETURNS TABLE(
  title TEXT,
  theme TEXT,
  player_count INTEGER,
  hosted_at TIMESTAMPTZ,
  character_names TEXT[],
  top_guest_quote TEXT,
  top_guest_character TEXT,
  guest_review_count INTEGER,
  guest_average_rating NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH pkg AS (
    SELECT mp.id, mp.title, mp.conversation_id, mp.generation_completed_at, mp.created_at
    FROM mystery_packages mp
    WHERE mp.recap_token = get_recap_data.recap_token
    LIMIT 1
  ),
  conv AS (
    SELECT c.theme, c.player_count
    FROM conversations c
    INNER JOIN pkg ON pkg.conversation_id = c.id
  ),
  chars AS (
    SELECT array_agg(mc.character_name ORDER BY mc.created_at) AS names
    FROM mystery_characters mc
    INNER JOIN pkg ON mc.package_id = pkg.id
    WHERE COALESCE(mc.character_role, 'suspect') <> 'victim'
  ),
  feedback AS (
    SELECT
      gf.best_part,
      gf.character_name,
      gf.star_rating,
      ROW_NUMBER() OVER (ORDER BY LENGTH(COALESCE(gf.best_part, '')) DESC) AS rn
    FROM guest_feedback gf
    INNER JOIN character_assignments ca ON ca.id = gf.character_assignment_id
    INNER JOIN mystery_characters mc ON mc.id = ca.character_id
    INNER JOIN pkg ON mc.package_id = pkg.id
    WHERE gf.star_rating >= 4
  ),
  top_quote AS (
    SELECT best_part, character_name FROM feedback WHERE rn = 1
  ),
  feedback_stats AS (
    SELECT
      COUNT(*)::INTEGER AS review_count,
      ROUND(AVG(star_rating)::NUMERIC, 1) AS avg_rating
    FROM feedback
  )
  SELECT
    pkg.title,
    conv.theme,
    conv.player_count,
    COALESCE(pkg.generation_completed_at, pkg.created_at) AS hosted_at,
    chars.names,
    top_quote.best_part,
    top_quote.character_name,
    feedback_stats.review_count,
    feedback_stats.avg_rating
  FROM pkg
  LEFT JOIN conv ON TRUE
  LEFT JOIN chars ON TRUE
  LEFT JOIN top_quote ON TRUE
  LEFT JOIN feedback_stats ON TRUE;
$$;

GRANT EXECUTE ON FUNCTION public.get_recap_data(UUID) TO anon, authenticated;
