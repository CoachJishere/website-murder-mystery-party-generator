-- ADR-0103 Addendum 96 (2026-10-14): detector for a fixed partner named in a slip game's guilty-slip deflection tips.
--
-- In a slip game the culprit and the accomplice are drawn from the whole cast at game time, yet the `accusations` bullets for the guilty
-- slip named a fixed partner on 15 of 22 sheets of "Emma's Honky Tonk Meow-der Mystery" (2026-10-09) and 4 of 11 of "Murder At Montero Manor"
-- (2026-10-07), e.g. "Lean on your accomplice, Tracy Catman, for quiet backup". The reviewer caught 1 of the 15. The player is told to cover for a
-- random cast member who is probably innocent.
--
-- Rule (slip style only; a detective game's culprit is predetermined, so naming is by design there). A bullet line (`- ...`) of `accusations` or
-- `accusations_pointform` of character X is flagged when it names ANOTHER character of the same package (full name without a "(..." or "/..." tail,
-- the first word of the name, or the part after "&") in one of three shapes, the name matched case-sensitively:
--   1. "accomplice"/"partner" directly followed by the name ("your accomplice, Tracy Catman", "partner Shania");
--   2. the name, then within 25 characters of the same sentence "is/as/being your/our accomplice/partner/cover/ally" ("Dolly is your partner");
--   A line with a conditional ("If George is your accomplice, ...", "If accomplice is Lily") is never flagged: that is a valid way to cover whoever draws the slip.
--   3. a protect-verb directly followed by the name ("Lean on", "Protect", "Back up", "Back", "Stay loyal to", "Stay close to", "Rely on",
--      "Let <name> back/vouch/speak/support/cover/stay/stand/help ...",
--      "Never name/accuse/turn on/implicate/point at/look at", "Do not look at/name/accuse").
-- English wording only. Mirrored BY HAND in supabase/functions/auto-remediate-packages/partner-tip.ts (the free heal rewrites the offending
-- sentence); keep both in sync.
--
-- Validation on all slip packages since 2026-09-01 (before the hand fixes): Montero Manor 4 owners, this package 15 owners + 1 conditional
-- (Catsy, now excluded by rule 2's exception); 0 other packages. Not part of package_completion_blocking_defects(): moderate impact (the game
-- still works) and the heal is free and runs from the normal sweep, so it does not need to hold a package. Read-only, service_role only.

CREATE OR REPLACE FUNCTION public.package_slip_partner_named(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH chars AS (
    SELECT character_name, accusations, accusations_pointform
    FROM mystery_characters
    WHERE package_id = _pkg.id AND _pkg.mystery_style = 'character'
  ),
  al AS (
    SELECT c.character_name AS cn, x.alias
    FROM chars c,
    LATERAL (
      SELECT DISTINCT a AS alias
      FROM unnest(ARRAY[
        trim(regexp_replace(c.character_name, '\s*[(/].*$', '')),
        split_part(trim(regexp_replace(c.character_name, '\s*&.*$', '')), ' ', 1),
        nullif(trim(split_part(c.character_name, '&', 2)), '')
      ]) AS a
      WHERE a IS NOT NULL AND length(a) >= 3
    ) x
  ),
  -- one alternation of every OTHER character's aliases per owner: 3 regex compiles per owner instead of one per (line, alias)
  alt AS (
    SELECT c.character_name AS owner,
           (SELECT string_agg(DISTINCT regexp_replace(al.alias, '([.*+?^${}()|\[\]\\])', '\\\1', 'g'), '|')
              FROM al WHERE al.cn <> c.character_name) AS names
    FROM chars c
  ),
  ln AS (
    SELECT c.character_name AS owner, 'accusations' AS field, l.line
    FROM chars c, LATERAL regexp_split_to_table(coalesce(c.accusations, ''), E'\n') AS l(line)
    WHERE l.line ~ '^- '
    UNION ALL
    SELECT c.character_name, 'accusations_pointform', l.line
    FROM chars c, LATERAL regexp_split_to_table(coalesce(c.accusations_pointform, ''), E'\n') AS l(line)
    WHERE l.line ~ '^- '
  ),
  cand AS (
    SELECT ln.owner, ln.field, ln.line, alt.names
    FROM ln JOIN alt ON alt.owner = ln.owner
    WHERE alt.names IS NOT NULL
      AND ln.line ~ '(ccomplice|artner|ean on|rotect|ack|tay loyal|tay close|ely on|et [A-Z]|ever (name|accuse|turn on|implicate|point at|look at)|o not (look at|name|accuse)|on''t (look at|name|accuse))'
      -- a conditional ("If George is your accomplice, ...", "If accomplice is Lily") is a valid way to cover the drawn partner
      AND ln.line !~ '\m[Ii]f\M[^.;]{0,60}\m(?:accomplice|partner)\M'
  ),
  hits AS (
    SELECT DISTINCT (field || ':' || owner) AS source
    FROM cand
    WHERE line ~ ('\m(?:[Aa]ccomplice|[Pp]artner)\s*(?:is\s+|,\s*|:\s*)?(?:' || names || ')\M')
       OR line ~ ('\m(?:' || names || ')\M[^.]{0,25}\m(?:is|as|being)\s+(?:your|our)\s+(?:accomplice|partner|cover|ally)')
       OR line ~ ('\m(?:[Ll]ean on|[Pp]rotect|[Bb]ack up|[Bb]ack|[Ss]tay loyal to|[Ss]tay close to|[Rr]ely on|[Nn]ever (?:name|accuse|turn on|implicate|point at|look at)|[Dd]o not (?:look at|name|accuse)|[Dd]on''t (?:look at|name|accuse))\s+(?:' || names || ')\M')
       OR line ~ ('\m[Ll]et\s+(?:' || names || ')\M(?:\s+\w+){0,2}?\s+(?:back|vouch|speak|support|cover|stay|stand|help)')
  )
  SELECT array_agg(source ORDER BY source) FROM hits;
$function$;

COMMENT ON FUNCTION public.package_slip_partner_named(mystery_packages) IS
$doc$Slip-style packages only: 'field:character' strings for each guilty-slip deflection bullet (accusations / accusations_pointform) that names another cast member as the player's accomplice, partner, cover or ally, or tells the player to protect or lean on a named character. Culprit and accomplice are drawn at game time, so a fixed partner is wrong (ADR-0103 Addendum 96). Mirrored by partner-tip.ts in auto-remediate-packages (free heal rewrites the sentence). NULL when clean.$doc$;

CREATE OR REPLACE FUNCTION public.list_packages_with_slip_partner_named(_since timestamptz DEFAULT '2026-04-01 00:00:00+00'::timestamptz)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamptz, sources text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_slip_partner_named(mp.*) AS sources
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE mp.mystery_style = 'character'
    AND (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_slip_partner_named(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

COMMENT ON FUNCTION public.list_packages_with_slip_partner_named(timestamptz) IS
$doc$Slip-style packages whose guilty-slip deflection tips name a fixed partner (ADR-0103 Addendum 96). Sweep step 3 data point and the auto-remediate class slip_partner_named (free sentence rewrite).$doc$;

REVOKE EXECUTE ON FUNCTION public.list_packages_with_slip_partner_named(timestamptz) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_slip_partner_named(mystery_packages) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_slip_partner_named(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_slip_partner_named(mystery_packages) TO service_role;
