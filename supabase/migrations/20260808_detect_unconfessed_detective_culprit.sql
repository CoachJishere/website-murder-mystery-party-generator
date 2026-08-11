-- Durable detector for detective-style ("predetermined culprit") packages
-- whose Final Statements round doesn't actually reveal the solution.
--
-- WHY:
--   In detective-style mysteries (mystery_style='detective'), unlike
--   character-style, there is no separate "Reveal" round — "Final Statements"
--   IS the reveal moment. The murderer's final_statement is supposed to
--   branch on role ([IF MURDERER]/[IF ACCOMPLICE]/[IF SUSPECT] in the Make.com
--   "MM Live - Child (Detective-Style)" blueprint) into a confession, an
--   admission, or a denial. That branching is unreliable: in a manually-read
--   sample the murderer's own final_statement was sometimes a flat denial
--   ("that's not me", pointing suspicion elsewhere) instead of a confession —
--   meaning the package ships with NO character material that ever states
--   who did it. A related variant: the murderer confesses and explicitly
--   names an accomplice by name, but the accomplice's own final_statement
--   denies it, contradicting the murderer's account in the same round.
--   See ADR-0070 (support check on "Death At The Blackthorn Wedding",
--   2026-08-07 purchase) for the investigation and worked examples.
--
-- HEURISTIC:
--   murderer_denies: the murderer's final_statement matches denial-shaped
--     phrases ("that's not me", "I would never", "I didn't kill/help", etc.)
--     and does NOT match confession-shaped phrases ("I did it", "I killed",
--     "I confess", "I took a life", etc.).
--   accomplice_denies_despite_named: the murderer's final_statement mentions
--     the accomplice by a name token (>3 chars, from either side of a
--     dual-gender "Name/Name Surname" character_name), and the accomplice's
--     own final_statement matches the same denial phrases without matching
--     admission phrases ("I helped", "I agreed to help", "I was the lookout",
--     etc.).
--   Validated 2026-08-08 against all 60 completed detective-style packages
--   (excluding one unrelated, unpaid, pre-existing test package with
--   corrupted character_role data — 15 characters tagged 'murderer'/
--   'accomplice' in a single 25-player package, package_id 177a75ce-...).
--   15 rows flagged, all paid, spanning purchases 2026-04-22 through
--   2026-08-07. Every flagged row was manually read against the source text.
--
-- LIMITATIONS (documented, accepted — same tradeoff as
--   list_packages_with_identity_conflicts, ADR-0041):
--   - False positive confirmed: "Death At The Velvet Rose" (Max Sullivan) is
--     a genuine confession; the denial regex matches an embedded clause
--     ("I didn't kill O'Malley for pleasure, and I didn't kill Victor for
--     pleasure") that reads as denial-shaped out of context.
--   - False negative risk: natural-language confession/denial framing is not
--     perfectly separable by keyword matching. This is a heuristic backlog,
--     not a ground-truth classifier — READ the flagged final_statement before
--     acting on any row. Do not auto-remediate off this function's output.
--   - Scoped to mystery_style='detective' only. Character-style's equivalent
--     failure mode is a different bug with its own fix, see ADR-0067.
--
-- Read-only backlog, same pattern as list_packages_with_identity_conflicts
-- (ADR-0041) and list_packages_missing_evidence_images (ADR-0016): no status
-- mutation, callable on demand or from the health-check workflow. See
-- ADR-0070.

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
  'Read-only backlog of detective-style completed packages whose Final Statements round (the ONLY reveal moment in this format) fails to actually reveal the solution: the murderer''s own final_statement reads as a denial rather than a confession, or a named accomplice''s final_statement denies a role the murderer already confessed to on their behalf. Keyword heuristic, escalate-only — read the flagged final_statement before acting, do not auto-remediate. Default _since = 2026-01-01. See ADR-0070.';
