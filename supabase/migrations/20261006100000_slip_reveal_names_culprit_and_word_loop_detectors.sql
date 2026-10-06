-- ADR-0103 Addendum 84 (2026-10-06): two detectors found by the "Roslyn's Clay" and "El Ultimo Trago" sweeps.
--
-- 1. package_slip_reveal_names_cast_member(): in a slip-style game (mystery_style = 'character') the culprit is drawn
--    from slips at game time, so the detective's closing section must not name a cast member. Roslyn's Clay (2026-10-05)
--    had "Martin. It's time you told this room the truth ... Martin, I am arresting you ... Take him away" - a full
--    spoiler that also broke the random draw (Martin was the customer). 1 of 50 slip packages in the corpus; detection
--    is a string check and the impact is total, so it ships now (the Addendum 38 test). Detection-only, escalates to a
--    human sweep, same tier as reveal_name_fusion: a hand edit takes a minute and a templated heal would lose the
--    evidence-specific reveal text.
--
-- 2. package_meta_text_leak(): add a word-repetition check. A degenerate generation loop ("until until until ...")
--    truncated 6 fields across 4 characters of "El Ultimo Trago". The existing English-"until"-in-foreign-prose rule
--    exempts any field that also contains "the/and/with/that", and the loop itself contains "the", so Veronica's
--    looped final_statement was NOT flagged. Five or more identical consecutive words is never legitimate prose;
--    corpus check before shipping: 4 hits, all on El Ultimo Trago, none anywhere else.
--
-- Both existing functions are patched by exact-text replacement on the LIVE definition (with an assert), not
-- re-typed, so nothing else in them can drift.

CREATE OR REPLACE FUNCTION public.package_slip_reveal_names_cast_member(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH reveal AS (
    -- the LAST "## " section of the detective script (the section header is translated in non-English packages)
    SELECT substring(_pkg.detective_script from '(?s)^.*\n(##\s[^\n]*\n.*)$') AS txt
    WHERE _pkg.mystery_style = 'character' AND _pkg.detective_script IS NOT NULL
  ),
  victim AS (
    SELECT lower(coalesce(substring(_pkg.master_context from '"victimProfile"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"'), '')) AS name
  ),
  toks AS (
    SELECT DISTINCT mc.character_name AS cname, t.tok AS tok
    FROM mystery_characters mc
    CROSS JOIN LATERAL regexp_split_to_table(regexp_replace(mc.character_name, '\s*\(.*$', ''), '[\s/]+') AS t(tok)
    WHERE mc.package_id = _pkg.id
      AND length(t.tok) >= 4
      AND lower(t.tok) !~ '^(the|captain|brother|sister|cousin|uncle|aunt|professor|doctor|madame|madam|lady|lord|miss|mister|señor|señora|doña|inspector|detective|sergeant|father|mother|reverend|sheriff|chief|baron|count|countess|duke|duchess|king|queen|prince|princess|master|young|little|great|dame|colonel|major|general|admiral|judge|saint)$'
  )
  -- Only culprit-ADDRESSING shapes count, not any mention: a reveal legitimately cites cast members as clue sources
  -- ("Mint Chip's supply network", "the compartment registered to Miss Ashworth"). The first version flagged any mention
  -- and hit 8 of 131 slip packages, 6 of them false positives. Shapes: an accusation/arrest word near the name, the name
  -- followed by "is the killer / under arrest / you are", or the name as a direct address ("Martin. It's time ...").
  -- Corpus after tightening: Roslyn's Clay (pre-fix) and "The Workshop Of St. Nick" (both real), plus "Death At The
  -- Deadwood Saloon" (an April legacy fixed-murderer vote-card design that names its murderer on purpose; known FP).
  -- English plus the main verbs of es/fr/de; other languages are not covered yet.
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE array_agg(DISTINCT t.cname ORDER BY t.cname) END
  FROM (SELECT cname, tok, regexp_replace(tok, '([\[\](){}.*+?^$|\\])', '\\\1', 'g') AS esc FROM toks) t, reveal r, victim v
  WHERE r.txt IS NOT NULL
    AND position(lower(t.tok) in v.name) = 0
    AND (
      r.txt ~* ('(killer|murderer|culprit|guilty|arrest[a-z]*|accus[a-z]*|asesin[oa]|culpable|arrest[oa]|acus[a-z]*|coupable|meurtri[a-z]*|assassin|schuldig|mörder[a-z]*|verhaft[a-z]*)[^.\n]{0,60}\m' || t.esc || '\M')
      OR r.txt ~* ('\m' || t.esc || '\M[^.\n]{0,50}(is the (killer|murderer|culprit)|under arrest|arresting|are guilty|did it|you did|you are|es (el|la) (asesin[oa]|culpable)|est (le|la) (coupable|meurtri[a-z]*)|sind schuldig)')
      OR r.txt ~* ('\m' || t.esc || '\M[.,:]\s+(it''?s time|it is time|you\M|step forward|stand|tell|speak|confess|es hora|ha llegado|c''est l''heure|es ist zeit)')
    );
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_slip_reveal_names_cast_member(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, characters text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_slip_reveal_names_cast_member(mp.*) AS characters
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_slip_reveal_names_cast_member(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

-- Patch package_meta_text_leak: add the repetition regex to the marker CTE and OR it into both hit tests.
DO $patch$
DECLARE
  d text;
  orig text;
BEGIN
  SELECT pg_get_functiondef('public.package_meta_text_leak(mystery_packages)'::regprocedure) INTO d;
  orig := d;
  IF position('loop_rx' in d) > 0 THEN
    RAISE NOTICE 'package_meta_text_leak already has loop_rx, skipping';
    RETURN;
  END IF;
  IF position($a$'\muntil\M'::text AS until_rx,$a$ in d) = 0 OR position($b$t.txt ~ m.stray_rx$b$ in d) = 0 THEN
    RAISE EXCEPTION 'package_meta_text_leak anchors not found; live definition has drifted, refusing to patch';
  END IF;
  d := replace(d, $a$'\muntil\M'::text AS until_rx,$a$,
                  $a$'\muntil\M'::text AS until_rx,
      '\m(\w{2,})\M(\s+\1\M){4,}'::text AS loop_rx,$a$);
  d := replace(d, $b$t.txt ~ m.stray_rx$b$, $b$t.txt ~ m.stray_rx OR t.txt ~* m.loop_rx$b$);
  IF d = orig THEN
    RAISE EXCEPTION 'package_meta_text_leak patch changed nothing';
  END IF;
  EXECUTE d;
END
$patch$;

-- Patch the completion gate: hold a slip package whose reveal names a cast member.
DO $patch$
DECLARE
  d text;
  orig text;
  anchor text := E'  IF array_length(_defects, 1) IS NULL THEN\n    RETURN NULL;\n  END IF;\n  RETURN _defects;';
  block text := E'  -- ADR-0103 Addendum 84: slip-style detective reveal naming a cast member (the culprit is drawn at game time).\n  -- Detection-only; escalates to a human sweep.\n  FOR _hit IN\n    SELECT unnest(coalesce(public.package_slip_reveal_names_cast_member(_pkg), ARRAY[]::text[])) AS key\n  LOOP\n    _defects := _defects || (''slip_reveal_names_culprit.'' || _hit.key);\n  END LOOP;\n\n';
BEGIN
  SELECT pg_get_functiondef('public.package_completion_blocking_defects(mystery_packages)'::regprocedure) INTO d;
  orig := d;
  IF position('slip_reveal_names_culprit' in d) > 0 THEN
    RAISE NOTICE 'gate already has slip_reveal_names_culprit, skipping';
    RETURN;
  END IF;
  IF position(anchor in d) = 0 THEN
    RAISE EXCEPTION 'gate anchor not found; live definition has drifted, refusing to patch';
  END IF;
  d := replace(d, anchor, block || anchor);
  IF d = orig THEN
    RAISE EXCEPTION 'gate patch changed nothing';
  END IF;
  EXECUTE d;
END
$patch$;
