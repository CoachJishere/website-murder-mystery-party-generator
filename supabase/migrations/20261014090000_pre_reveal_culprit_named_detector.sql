-- ADR-0160 (2026-10-14): alert-only detector for detective-style narration that names the culprit before the reveal.
--
-- Found while building ADR-0158: the Round 3/4 narration is read aloud to every guest, and in some packages it names
-- the murderer or accomplice and dwells on them ("I have one person whose timeline doesn't add up. Jonny Newman ...").
-- Corpus (125 paid detective packages, every flagged package read): 17 real pointers, all dated before 2026-08-26;
-- 0 in the 59 packages since. Rule: a murderer/accomplice name part appears at all in a Round 3 or Round 4 section
-- (precision 16 real + 1 debatable of 17 flags, recall 16 of 17 real). Round 2 and the other sections are NOT checked:
-- Round 2 legitimately lists every suspect's motive, which is where all 6 roster false positives were.
--
-- Validation on the whole detective corpus (270 packages scanned in 244 ms): 19 flags = all 17 real + the 1 debatable
-- (204db42d) + 1 false positive, 0 of the 6 Round-2 roster packages. The false positive is "Dead Serious: The Br31
-- Unveiling" (2026-10-13, package 6eb76783): an ice-cream cast whose murderer is "French Vanilla", and Round 3 shows a jar
-- labelled "Pure Vanilla Base". No character is named; the cast name is an ordinary word. Known FP shape: a themed cast
-- whose names are common nouns. Not fixable deterministically without a dictionary, acceptable for an alert-only check.
--
-- Deliberately NOT part of package_completion_blocking_defects(): the impact is moderate (the game still works), there
-- is no free heal (a fix is a paid regeneration), and the base rate is currently 0. It is a sweep data point, like
-- list_packages_with_unresolved_victim_name. Read-only, no table writes, service_role only.
--
-- Name handling: tokens of the character name (split on space, "/", "-"; quotes and parentheses dropped; title words and
-- tokens under 3 letters dropped; must start with a capital), case-sensitive whole-word match. A token that also occurs in
-- another character's name or in the victim's name is ignored (shared surname, "Blackstone"). Round sections are found by
-- heading ("Round 3", "Ronda 4", "Runde 3", "第3回合" ...) and run to the next heading of the same or a higher level.

CREATE OR REPLACE FUNCTION public.package_pre_reveal_culprit_named(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH lines AS (
    SELECT t.ord, t.line
    FROM regexp_split_to_table(coalesce(_pkg.detective_script, ''), E'\n') WITH ORDINALITY AS t(line, ord)
    WHERE _pkg.mystery_style = 'detective'
  ),
  heads AS (
    SELECT ord, line, length((regexp_match(line, '^(#{1,4})[ \t]+'))[1]) AS lvl
    FROM lines
    WHERE line ~ '^#{1,4}[ \t]+\S'
  ),
  rounds AS (
    SELECT h.ord,
           coalesce((SELECT min(h2.ord) FROM heads h2 WHERE h2.ord > h.ord AND h2.lvl <= h.lvl), 2147483647) AS endord
    FROM heads h
    WHERE h.line ~* '(round|ronda|ronde|runde|runda|rundan|manche|tour|kierros|turno|rodada)\s*[34]\M'
       OR h.line ~ '(ラウンド|라운드|回合|轮)\s*[34３４三四]'
       OR h.line ~ '第\s*[34３４三四]\s*(回合|轮|ラウンド|라운드)'
  ),
  rtext AS (
    SELECT string_agg(l.line, E'\n' ORDER BY l.ord) AS txt
    FROM lines l JOIN rounds r ON l.ord > r.ord AND l.ord < r.endord
  ),
  victim AS (
    SELECT coalesce(substring(_pkg.master_context from '"victimProfile"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"'), '') AS name
  ),
  toks AS (
    SELECT mc.character_name AS cname,
           (mc.character_role IN ('murderer', 'accomplice')) AS is_culprit,
           t.tok AS tok
    FROM mystery_characters mc
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(mc.character_name, '[''"“”‘’()]', ' ', 'g'), '[\s/\-]+') AS t(tok)
    WHERE mc.package_id = _pkg.id
    UNION ALL
    SELECT NULL, false, t.tok
    FROM victim v
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(v.name, '[''"“”‘’()]', ' ', 'g'), '[\s/\-]+') AS t(tok)
  ),
  clean AS (
    SELECT cname, is_culprit, regexp_replace(tok, '[.,;:]+$', '') AS tok FROM toks
  ),
  usable AS (
    SELECT * FROM clean
    WHERE length(tok) >= 3
      AND tok ~ '^[[:upper:]]'
      AND lower(tok) !~ '^(dr|the|professor|prof|mr|mrs|ms|sir|lady|lord|captain|chef|miss|madame|monsieur|von|van|der|den|del|das|dos|and)$'
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE array_agg(DISTINCT u.cname ORDER BY u.cname) END
  FROM usable u, rtext r
  WHERE u.is_culprit
    AND r.txt IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM usable o
      WHERE lower(o.tok) = lower(u.tok) AND NOT o.is_culprit AND o.cname IS DISTINCT FROM u.cname
    )
    AND r.txt ~ ('(?<![[:alpha:]])' || regexp_replace(u.tok, '([\[\](){}.*+?^$|\\])', '\\\1', 'g') || '(?![[:alpha:]])');
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_pre_reveal_culprit_name(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, characters text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, x.characters
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  CROSS JOIN LATERAL (SELECT public.package_pre_reveal_culprit_named(mp.*) AS characters) x
  WHERE mp.mystery_style = 'detective'
    AND mp.created_at >= _since
    AND mp.detective_script IS NOT NULL
    AND x.characters IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_packages_with_pre_reveal_culprit_name(timestamptz) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_pre_reveal_culprit_named(mystery_packages) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_pre_reveal_culprit_name(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_pre_reveal_culprit_named(mystery_packages) TO service_role;
