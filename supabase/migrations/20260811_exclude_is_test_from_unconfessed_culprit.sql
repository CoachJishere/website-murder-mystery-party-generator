-- Follow-up to 20260808_detect_unconfessed_detective_culprit.sql: the detector
-- didn't exclude is_test packages (ADR-0072), unlike the other RPC-based
-- health-check detectors that specifically use an RPC (rather than a raw REST
-- filter) so they can join conversations and exclude is_test cleanly. Caught
-- while wiring this detector into health-check.yml — the disposable test
-- package created to live-test the ADR-0070 fix (is_test=true) would have
-- been eligible to alert if a future regression re-flagged it.

CREATE OR REPLACE FUNCTION public.list_packages_with_unconfessed_culprit(
  _since timestamptz DEFAULT '2026-01-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  reason text,
  character_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH pkgs AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE c.mystery_style = 'detective'
      AND (mp.generation_status->>'status') = 'completed'
      AND mp.created_at >= _since
      AND c.is_test = false
  ),
  murderers AS (
    SELECT mc.package_id, mc.character_name, mc.final_statement
    FROM mystery_characters mc
    WHERE mc.character_role = 'murderer'
  ),
  accomplices AS (
    SELECT mc.package_id, mc.character_name, mc.final_statement,
           regexp_split_to_array(
             regexp_replace(mc.character_name, '[^A-Za-z/ ]', '', 'g'), '[/ ]+'
           ) AS name_tokens
    FROM mystery_characters mc
    WHERE mc.character_role = 'accomplice'
  ),
  murderer_flags AS (
    SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at,
           'murderer_denies'::text AS reason, m.character_name
    FROM murderers m
    JOIN pkgs p ON p.package_id = m.package_id
    WHERE m.final_statement ~* '(that.?s not me|not me\.|wasn.?t me|isn.?t me|i would never|i.?m innocent|i am innocent|i didn.?t (do|kill|murder|commit|help|participate)|not who i am|that.?s something i would never|nothing more\.|no knowledge)'
      AND m.final_statement !~* '(i did it|i killed|i murdered|i poisoned|yes\.? i did|i confess|i stand here guilty|i took .{0,15}life|i understand the gravity|i realize i (took|committed))'
  ),
  accomplice_flags AS (
    SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at,
           'accomplice_denies_despite_named'::text AS reason, a.character_name
    FROM accomplices a
    JOIN murderers m ON m.package_id = a.package_id
    JOIN pkgs p ON p.package_id = a.package_id
    WHERE EXISTS (
            SELECT 1 FROM unnest(a.name_tokens) t
            WHERE length(t) > 3 AND m.final_statement ILIKE '%' || t || '%'
          )
      AND a.final_statement ~* '(that.?s not me|not me\.|wasn.?t me|isn.?t me|i would never|i.?m innocent|i am innocent|i didn.?t (do|kill|murder|commit|help|participate)|not who i am|that.?s something i would never|nothing more\.|no knowledge)'
      AND a.final_statement !~* '(i helped|i agreed to help|guilty of helping|i admit|i confess|i was the lookout|i.?m guilty|i am guilty|i provided|i assisted|i created that|i staged)'
  )
  SELECT * FROM murderer_flags
  UNION ALL
  SELECT * FROM accomplice_flags
  ORDER BY is_paid DESC, created_at DESC;
$$;

COMMENT ON FUNCTION public.list_packages_with_unconfessed_culprit(timestamptz) IS
  'Read-only backlog of detective-style completed packages whose Final Statements round (the ONLY reveal moment in this format) fails to actually reveal the solution: the murderer''s own final_statement reads as a denial rather than a confession, or a named accomplice''s final_statement denies a role the murderer already confessed to on their behalf. Keyword heuristic, escalate-only — read the flagged final_statement before acting, do not auto-remediate. Excludes is_test packages (ADR-0072). Default _since = 2026-01-01. See ADR-0070.';
