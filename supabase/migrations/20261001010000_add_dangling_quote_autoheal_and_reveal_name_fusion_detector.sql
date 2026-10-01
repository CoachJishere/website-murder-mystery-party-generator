-- ADR-0103 Addendum 67/68: two fixes prompted by "The Last Invitation" sweep
-- (2026-09-30/2026-10-01) finding both the dangling-quote bug and a 2nd
-- (then 3rd) occurrence of the reveal-line murderer/victim name-fusion bug
-- still shipping live, with no automated catch for either.
--
-- 1. package_dangling_quote_mark(_pkg): extracts list_packages_with_dangling_
--    quote_mark's own per-field WHERE-clause logic into a shared, package-row
--    helper (ADR-0131 single-source-of-truth pattern, same shape as
--    package_victim_mismatch_candidate / package_accomplice_role_mismatch),
--    so it can also be wired into package_completion_blocking_defects().
--    list_packages_with_dangling_quote_mark is rewritten to call it, so the
--    advisory RPC and the completion gate can never drift apart. This is the
--    half of the fix that ALSO gets a real auto-remediation handler in
--    auto-remediate-packages (see that file's new dangling_quote_mark class)
--    -- the fix is a pure, safe, single-character trim with no judgment call,
--    so it's a good candidate for full self-heal, unlike #2 below.
--
-- 2. package_reveal_name_fusion(_pkg) / list_packages_with_reveal_name_fusion:
--    new detector for the murderer-first-name-fused-with-victim-surname bug
--    in detective_script's REVEAL section (e.g. "Jay DeWald's killer stands
--    revealed" when the murderer is "Jay" and the victim is "Gabe DeWald").
--    Confirmed 3 live occurrences across the corpus before this detector
--    existed (2026-07-28 "Ghosts Of The Past", 2026-09-08 ADR-0103 Addendum
--    29, 2026-09-30 Addendum 67) -- all three hand-fixed. Victim name is
--    extracted from master_context's victimProfile.name via regex (same
--    pattern already used live in auto-remediate-packages' getVictimName(),
--    validated here against 15/15 recent packages -- far more reliable than
--    game_overview prose parsing, which is what package_victim_mismatch_
--    candidate has to fall back to and still misses this package's own
--    game_overview shape).
--
--    DELIBERATELY DETECTION-ONLY -- wired into package_completion_blocking_
--    defects() so it blocks completion and surfaces via the existing
--    health-check/manual-sweep path, but NOT given an auto-remediation
--    handler. Tested the obvious deterministic fix (swap "<murderer-first>
--    <victim-surname>" for the victim's full name) against both the
--    2026-09-30 and 2026-07-28 real instances: correct for the first
--    ("Jay DeWald's killer" -> "Gabe DeWald's killer" is exactly right) but
--    WRONG for the second ("Did you help Riley Blackwell take Reese
--    Blackwell's life?" would become "Did you help Reese Blackwell take
--    Reese Blackwell's life?" -- nonsensical, implies the victim helped kill
--    herself). The correct repair depends on the surrounding sentence
--    structure, which varies -- exactly the "no mechanical fix -> escalate,
--    don't guess" case this codebase's auto-remediation already refuses to
--    touch elsewhere (cf. identity_conflict, which has the same shape: a
--    completion-gate check with no handler). A human picks the right
--    surgical edit each time.
--
--    False-positive guards validated against the full corpus before
--    shipping (see ADR-0103 Addendum 67/68 for the corpus queries): (a)
--    titles (Dr./Professor/Mr./etc.) are never treated as a first name --
--    "Dr. Splice" and "Professor Vaingloryus" are legitimate references to
--    a victim who happens to share the murderer's own title, not fusions;
--    (b) a surname the murderer legitimately shares with the victim (a
--    family mystery where several OTHER characters' own character_name
--    already carries that same surname, e.g. "Nacife" used across an
--    entire family cast) is excluded.

-- ---------------------------------------------------------------------------
-- 1. Dangling quote mark -- shared helper + gate wiring.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.package_dangling_quote_mark(_pkg mystery_packages)
RETURNS text[]
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH fields AS (
    SELECT character_name, 'introduction' AS field, introduction AS val
      FROM mystery_characters WHERE package_id = _pkg.id AND introduction IS NOT NULL
    UNION ALL
    SELECT character_name, 'final_statement', final_statement
      FROM mystery_characters WHERE package_id = _pkg.id AND final_statement IS NOT NULL
    UNION ALL
    SELECT character_name, 'reveal_confession_guilty', reveal_confession_guilty
      FROM mystery_characters WHERE package_id = _pkg.id AND reveal_confession_guilty IS NOT NULL
    UNION ALL
    SELECT character_name, 'reveal_confession_accomplice', reveal_confession_accomplice
      FROM mystery_characters WHERE package_id = _pkg.id AND reveal_confession_accomplice IS NOT NULL
    UNION ALL
    SELECT character_name, 'final_innocent', final_innocent
      FROM mystery_characters WHERE package_id = _pkg.id AND final_innocent IS NOT NULL
  ),
  hits AS (
    SELECT DISTINCT (field || ':' || character_name) AS source
    FROM fields
    WHERE trim(val) ~ '[.!?][''’]$'
      AND val !~ '(^|[\s(:])[''’]\S'
  )
  SELECT array_agg(source ORDER BY source) FROM hits;
$function$;

COMMENT ON FUNCTION public.package_dangling_quote_mark(mystery_packages) IS
$doc$Package-row version of list_packages_with_dangling_quote_mark's own per-field check (ADR-0131 single-source-of-truth pattern) -- used both by that RPC and by package_completion_blocking_defects(). Returns 'field:character_name' source strings, or NULL. See ADR-0103 Addendum 55/67.$doc$;

CREATE OR REPLACE FUNCTION public.list_packages_with_dangling_quote_mark(_since timestamptz DEFAULT '2026-04-01 00:00:00+00'::timestamptz)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamptz, sources text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_dangling_quote_mark(mp.*) AS sources
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_dangling_quote_mark(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

COMMENT ON FUNCTION public.list_packages_with_dangling_quote_mark(timestamptz) IS
$doc$Flags an unmatched trailing quote mark (sentence-ending punctuation immediately followed by a closing quote with no matching opening quote nearby, per-line) in introduction/final_statement/reveal_confession_guilty/reveal_confession_accomplice/final_innocent. Traced to an ambiguous JSON-formatting instruction on the LAST field at 8 Make.com generation call sites; fixed at the source in blueprint v44 (imported 2026-09-25) -- a live hit post-v44 means the prompt fix didn't fully land (confirmed 2026-10-01, ADR-0103 Addendum 67: 5 of 10 post-v44 packages still hit this, not a rare straggler). As of Addendum 68, also wired into package_completion_blocking_defects() and auto-remediate-packages' deterministic self-heal (the fix is a pure, safe, single-character trim). See ADR-0103 Addendum 55/67/68.$doc$;

-- ---------------------------------------------------------------------------
-- 2. Reveal-line murderer/victim name-fusion detector (new, detection-only).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.package_reveal_name_fusion(_pkg mystery_packages)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _victim_name text;
  _victim_surname text;
  _murderer_name text;
  _murderer_first text;
BEGIN
  IF _pkg.id IS NULL OR coalesce(_pkg.detective_script, '') = '' THEN
    RETURN NULL;
  END IF;

  _victim_name := (regexp_match(coalesce(_pkg.master_context, ''),
    '"victimProfile"\s*:\s*\{[\s\S]{0,255}?"name"\s*:\s*"([^"]+)"'))[1];
  IF _victim_name IS NULL THEN
    RETURN NULL;
  END IF;

  _victim_surname := (regexp_match(_victim_name, '([A-Za-z]+)$'))[1];
  IF _victim_surname IS NULL OR length(_victim_surname) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT character_name INTO _murderer_name
  FROM mystery_characters
  WHERE package_id = _pkg.id AND character_role = 'murderer'
  LIMIT 1;
  IF _murderer_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- First token of the murderer's own name, skipping a leading honorific/title
  -- (e.g. "Professor Ivy/Ivo Ravensmoor" -> "Ivy", not "Professor" -- a title
  -- immediately followed by the victim's surname is almost always a
  -- legitimate reference to the victim, who often shares the same title).
  SELECT tok INTO _murderer_first
  FROM unnest(regexp_split_to_array(regexp_replace(_murderer_name, '[/(].*', ''), '\s+')) AS tok
  WHERE tok !~* '^(Dr|Prof|Professor|Mr|Mrs|Ms|Miss|Captain|Detective|Inspector|Lord|Lady|Sir|Madame|Father|Sister|Rev|Reverend)\.?$'
  LIMIT 1;
  IF _murderer_first IS NULL OR length(_murderer_first) < 3 THEN
    RETURN NULL;
  END IF;

  -- The murderer legitimately shares this surname with the victim (e.g. it's
  -- a family mystery and this is genuinely their own name) -- not a bug.
  IF _murderer_name ~* ('\m' || _victim_surname || '\M') THEN
    RETURN NULL;
  END IF;

  -- Same guard, corpus-validated shape: the surname is used broadly as a
  -- family name across the cast (other characters' own character_name
  -- already carries it), not a one-off fusion artifact in this one sentence.
  IF EXISTS (
    SELECT 1 FROM mystery_characters mc2
    WHERE mc2.package_id = _pkg.id
      AND mc2.character_name ~* ('\m' || _victim_surname || '\M')
  ) THEN
    RETURN NULL;
  END IF;

  IF _pkg.detective_script ~ ('\m' || _murderer_first || '\s+' || _victim_surname || '\M') THEN
    RETURN 'murderer=' || _murderer_first || ',victim_surname=' || _victim_surname || ',victim_full=' || _victim_name;
  END IF;

  RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.package_reveal_name_fusion(mystery_packages) IS
$doc$Flags detective_script fusing the murderer's own first name directly onto the victim's surname (e.g. "Jay DeWald's killer" when the murderer is "Jay" and the victim is "Gabe DeWald") -- read aloud at the game's climax, makes it briefly sound like the murderer was the one killed. 3 confirmed live occurrences before this detector shipped (2026-07-28, 2026-09-08 ADR-0103 Addendum 29, 2026-09-30 Addendum 67), all in this exact section. Victim name comes from master_context's victimProfile.name (validated 15/15 against recent packages -- far more reliable than game_overview prose parsing). DELIBERATELY DETECTION-ONLY, no auto-remediation handler: the correct fix depends on the surrounding sentence and a single deterministic transform produces correct output for one known instance but nonsense for another (see ADR-0103 Addendum 67/68). Known false-positive shapes excluded: a title (Dr./Professor/etc.) mistaken for a first name, and a surname the murderer legitimately shares with the victim as an established family name used across the cast.$doc$;

CREATE OR REPLACE FUNCTION public.list_packages_with_reveal_name_fusion(_since timestamptz DEFAULT '2026-04-01 00:00:00+00'::timestamptz)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamptz, fusion text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_reveal_name_fusion(mp.*) AS fusion
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_reveal_name_fusion(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

COMMENT ON FUNCTION public.list_packages_with_reveal_name_fusion(timestamptz) IS
$doc$Advisory sibling of package_completion_blocking_defects()'s reveal_name_fusion check -- same logic (ADR-0131 pattern). See package_reveal_name_fusion() for the full detector writeup. See ADR-0103 Addendum 67/68.$doc$;

-- ADR-0103 Addendum 51 precedent (20260928170000): newly created detector
-- RPCs default to PUBLIC EXECUTE in Postgres -- lock it down the same way
-- as every other list_packages_with_* function. Re-applied to the existing
-- dangling-quote RPC too, harmless no-op there since CREATE OR REPLACE with
-- an unchanged signature already preserves prior grants.
REVOKE EXECUTE ON FUNCTION public.list_packages_with_dangling_quote_mark(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_dangling_quote_mark(timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION public.list_packages_with_reveal_name_fusion(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_reveal_name_fusion(timestamptz) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Wire both into package_completion_blocking_defects().
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.package_completion_blocking_defects(_pkg mystery_packages)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _defects text[] := ARRAY[]::text[];
  _pattern text := '<html[\s>]|<!doctype\s+html|bad gateway|gateway[\s-]*time[\s-]*out|50[234]\s+(bad gateway|service unavailable|gateway[\s-]*time[\s-]*out)';
  _hit record;
  _has_r2acc boolean;
  _has_r3acc boolean;
  _has_r4acc boolean;
  _has_finalacc boolean;
  _has_revacc boolean;
  _has_revguilty boolean;
  _accomplice_mismatch text;
  _missing_accusations text[];
  _dangling_quote text[];
  _reveal_fusion text;
BEGIN
  IF _pkg.id IS NULL THEN
    RETURN NULL;
  END IF;

  FOR _hit IN
    SELECT kv.key
    FROM jsonb_each_text(to_jsonb(_pkg)) AS kv(key, value)
    WHERE kv.key IN (
      'title', 'game_overview', 'host_guide', 'materials', 'preparation_instructions',
      'timeline', 'hosting_tips', 'evidence_cards', 'relationship_matrix', 'detective_script'
    )
    AND kv.value ~* _pattern
  LOOP
    _defects := _defects || ('error_body_in_package.' || _hit.key);
  END LOOP;

  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND mc.character_role IS NOT NULL
      AND mc.character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring')
  LOOP
    _defects := _defects || ('invalid_role.' || _hit.key);
  END LOOP;

  FOR _hit IN
    SELECT mc.character_name || '.' || kv.key AS key
    FROM mystery_characters mc,
         jsonb_each_text(to_jsonb(mc)) AS kv(key, value)
    WHERE mc.package_id = _pkg.id
      AND kv.key NOT IN ('id', 'package_id', 'created_at', 'updated_at')
      AND kv.value ~* _pattern
  LOOP
    _defects := _defects || ('error_body_in_character.' || _hit.key);
  END LOOP;

  -- ADR-0131 item 2 cutover: single source of truth, shared with
  -- list_packages_with_meta_text_leak(). Structurally cannot drift.
  FOR _hit IN
    SELECT unnest(coalesce(public.package_meta_text_leak(_pkg), ARRAY[]::text[])) AS key
  LOOP
    IF _hit.key = 'package' THEN
      _defects := _defects || 'meta_text_leak.package'::text;
    ELSE
      _defects := _defects || ('meta_text_leak.character.' || substring(_hit.key from 11));
    END IF;
  END LOOP;

  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND (coalesce(mc.round2_questions,'') || ' ' || coalesce(mc.round3_questions,'') || ' ' || coalesce(mc.round4_questions,''))
          ~* ('\*\*to ' || regexp_replace(mc.character_name, '([\[\](){}.*+?^$\\|])', '\\\1', 'g') || '\M')
  LOOP
    _defects := _defects || ('self_directed_question.' || _hit.key);
  END LOOP;

  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND (
        (_pkg.mystery_style = 'character' AND (
          coalesce(mc.round2_innocent,'') = '' OR coalesce(mc.round3_innocent,'') = '' OR
          coalesce(mc.round4_innocent,'') = '' OR coalesce(mc.final_innocent,'') = '' OR
          coalesce(mc.round2_guilty,'') = '' OR coalesce(mc.round3_guilty,'') = '' OR
          coalesce(mc.round4_guilty,'') = '' OR coalesce(mc.final_guilty,'') = ''
        ))
        OR (_pkg.mystery_style IS DISTINCT FROM 'character' AND (
          coalesce(mc.round2_script,'') = '' OR coalesce(mc.round3_script,'') = '' OR
          coalesce(mc.round4_script,'') = '' OR coalesce(mc.final_statement,'') = ''
        ))
        OR coalesce(mc.round2_questions,'') = '' OR coalesce(mc.round3_questions,'') = '' OR coalesce(mc.round4_questions,'') = ''
      )
  LOOP
    _defects := _defects || ('missing_round_content.' || _hit.key);
  END LOOP;

  IF _pkg.mystery_style = 'character' THEN
    SELECT
      bool_or(coalesce(round2_accomplice,'') <> ''),
      bool_or(coalesce(round3_accomplice,'') <> ''),
      bool_or(coalesce(round4_accomplice,'') <> ''),
      bool_or(coalesce(final_accomplice,'') <> ''),
      bool_or(coalesce(reveal_confession_accomplice,'') <> ''),
      bool_or(coalesce(reveal_confession_guilty,'') <> '')
    INTO _has_r2acc, _has_r3acc, _has_r4acc, _has_finalacc, _has_revacc, _has_revguilty
    FROM mystery_characters
    WHERE package_id = _pkg.id;

    FOR _hit IN
      SELECT mc.character_name AS key
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
        AND (
          (_has_r2acc AND coalesce(mc.round2_accomplice,'') = '') OR
          (_has_r3acc AND coalesce(mc.round3_accomplice,'') = '') OR
          (_has_r4acc AND coalesce(mc.round4_accomplice,'') = '') OR
          (_has_finalacc AND coalesce(mc.final_accomplice,'') = '') OR
          (_has_revacc AND coalesce(mc.reveal_confession_accomplice,'') = '') OR
          (_has_revguilty AND coalesce(mc.reveal_confession_guilty,'') = '')
        )
    LOOP
      _defects := _defects || ('missing_role_branch_content.' || _hit.key);
    END LOOP;
  END IF;

  -- Bidirectional as of Addendum 62: previously only checked pointform-reads-
  -- English + prose-reads-non-English (the Addendum 40 direction). Now also
  -- catches prose-reads-English + pointform-reads-non-English (the direction
  -- that actually occurred on this package and 4 others in the corpus).
  FOR _hit IN
    WITH blobs AS (
      SELECT mc.character_name AS key,
        coalesce(mc.introduction,'') || ' ' || coalesce(mc.rumors,'') || ' ' || coalesce(mc.accusations,'') || ' ' ||
        coalesce(mc.round2_script,'') || ' ' || coalesce(mc.round3_script,'') || ' ' || coalesce(mc.round4_script,'') || ' ' ||
        coalesce(mc.final_statement,'') || ' ' ||
        coalesce(mc.round2_innocent,'') || ' ' || coalesce(mc.round2_guilty,'') || ' ' || coalesce(mc.round2_accomplice,'') || ' ' ||
        coalesce(mc.round3_innocent,'') || ' ' || coalesce(mc.round3_guilty,'') || ' ' || coalesce(mc.round3_accomplice,'') || ' ' ||
        coalesce(mc.round4_innocent,'') || ' ' || coalesce(mc.round4_guilty,'') || ' ' || coalesce(mc.round4_accomplice,'') || ' ' ||
        coalesce(mc.final_innocent,'') || ' ' || coalesce(mc.final_guilty,'') || ' ' || coalesce(mc.final_accomplice,'') || ' ' ||
        coalesce(mc.reveal_confession_guilty,'') || ' ' || coalesce(mc.reveal_confession_accomplice,'') AS prose_blob,
        coalesce(mc.introduction_pointform,'') || ' ' || coalesce(mc.rumors_pointform,'') || ' ' || coalesce(mc.accusations_pointform,'') || ' ' ||
        coalesce(mc.round2_script_pointform,'') || ' ' || coalesce(mc.round3_script_pointform,'') || ' ' || coalesce(mc.round4_script_pointform,'') || ' ' ||
        coalesce(mc.final_statement_pointform,'') || ' ' ||
        coalesce(mc.round2_innocent_pointform,'') || ' ' || coalesce(mc.round2_guilty_pointform,'') || ' ' || coalesce(mc.round2_accomplice_pointform,'') || ' ' ||
        coalesce(mc.round3_innocent_pointform,'') || ' ' || coalesce(mc.round3_guilty_pointform,'') || ' ' || coalesce(mc.round3_accomplice_pointform,'') || ' ' ||
        coalesce(mc.round4_innocent_pointform,'') || ' ' || coalesce(mc.round4_guilty_pointform,'') || ' ' || coalesce(mc.round4_accomplice_pointform,'') || ' ' ||
        coalesce(mc.final_innocent_pointform,'') || ' ' || coalesce(mc.final_guilty_pointform,'') || ' ' || coalesce(mc.final_accomplice_pointform,'') || ' ' ||
        coalesce(mc.reveal_confession_guilty_pointform,'') || ' ' || coalesce(mc.reveal_confession_accomplice_pointform,'') AS pointform_blob
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
    ),
    scored AS (
      SELECT key,
        length(prose_blob) AS prose_len,
        length(pointform_blob) AS pf_len,
        (SELECT count(*) FROM regexp_matches(prose_blob, '\ythe\y|\yand\y|\ywas\y|\yyou\y|\yher\y|\yhis\y|\ywith\y|\ythat\y|\yfor\y|\yare\y|\yhave\y|\ythis\y', 'gi')) AS prose_hits,
        (SELECT count(*) FROM regexp_matches(pointform_blob, '\ythe\y|\yand\y|\ywas\y|\yyou\y|\yher\y|\yhis\y|\ywith\y|\ythat\y|\yfor\y|\yare\y|\yhave\y|\ythis\y', 'gi')) AS pf_hits
      FROM blobs
    )
    SELECT key
    FROM scored
    WHERE prose_len > 200 AND pf_len > 100
      AND (
        (pf_hits >= 3 AND (pf_hits::numeric / pf_len * 1000) > 3 AND (prose_hits::numeric / prose_len * 1000) < 1)
        OR
        (prose_hits >= 3 AND (prose_hits::numeric / prose_len * 1000) > 3 AND (pf_hits::numeric / pf_len * 1000) < 1)
      )
  LOOP
    _defects := _defects || ('pointform_language_mismatch.' || _hit.key);
  END LOOP;

  FOR _hit IN
    WITH name_first AS (
      SELECT mc.id AS mc_id,
        regexp_replace((regexp_split_to_array(regexp_replace(mc.character_name, '[/(].*', ''), '\s+'))[1],
          '([.^$|()\[\]{}*+?\\])', '\\\1', 'g') AS first_tok
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
    ),
    fields AS (
      SELECT mc.id AS mc_id, mc.character_name AS key, kv.key AS field_name, kv.value AS field_text
      FROM mystery_characters mc,
           jsonb_each_text(to_jsonb(mc)) AS kv(key, value)
      WHERE mc.package_id = _pkg.id
        AND kv.key IN (
          'round2_guilty','round3_guilty','round4_guilty','final_guilty',
          'round2_accomplice','round3_accomplice','round4_accomplice','final_accomplice',
          'round2_innocent','round3_innocent','round4_innocent','final_innocent',
          'reveal_confession_guilty','reveal_confession_accomplice',
          'round2_script','round3_script','round4_script','final_statement'
        )
        AND length(coalesce(kv.value,'')) > 150
    ),
    scored AS (
      SELECT f.mc_id, f.key, f.field_name,
        regexp_replace(f.field_text, '^(##[^\n]*\n+)+(\*\*[^\n]*\*\*\n+)*', '') AS body,
        nf.first_tok
      FROM fields f JOIN name_first nf ON nf.mc_id = f.mc_id
      WHERE length(nf.first_tok) >= 3
    ),
    tagged AS (
      SELECT *,
        (left(body,110) ~* ('\y' || first_tok || '\y\s*''?s?\s+\w*(s|ing|es|n''t)?\y\s*(spreads|leans|folds|shrugs|nods|sighs|pauses|turns|steers|redirects|gestures|glances|looks|admits|confesses|acknowledges|reminds|explains|insists|says|tells|doesn''t|finally|crosses|cracks|drops|closes|holds|points|smiles|grins|frowns|hesitates|straightens|lowers|raises|clears|stiffens)')) AS is_third,
        (left(body,200) ~* '\y(i|i''m|i''ll|i''ve|i''d)\y') AS has_first_person,
        field_name ~ '(innocent|_script|final_statement)$' AS is_baseline,
        (body ~* ''',?\s*(he|she|they)\s+(says|admits|asks|replies|tells|insists|explains|confesses|remarks|notes)\y') AS has_dialogue_tag
      FROM scored
    ),
    per_char AS (
      SELECT mc_id, key,
        bool_or(has_first_person AND is_baseline) AS baseline_is_first,
        array_agg(DISTINCT field_name) FILTER (WHERE is_third AND NOT has_dialogue_tag AND NOT is_baseline) AS bad_fields
      FROM tagged
      GROUP BY mc_id, key
    )
    SELECT key, bad_fields
    FROM per_char
    WHERE baseline_is_first AND bad_fields IS NOT NULL AND array_length(bad_fields,1) > 0
  LOOP
    _defects := _defects || ('narration_person_mismatch.' || _hit.key || ':' || array_to_string(_hit.bad_fields, ','));
  END LOOP;

  -- ADR-0131 item 2 cutover: single source of truth, shared with
  -- list_packages_with_victim_mismatch(). Structurally cannot drift.
  IF public.package_victim_mismatch_candidate(_pkg) IS NOT NULL THEN
    _defects := _defects || ('victim_mismatch.' || public.package_victim_mismatch_candidate(_pkg));
  END IF;

  IF _pkg.mystery_style = 'character'
     AND NOT EXISTS (SELECT 1 FROM mystery_characters m2 WHERE m2.package_id = _pkg.id AND m2.character_role = 'murderer')
  THEN
    FOR _hit IN
      SELECT mc.character_name AS key
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
        AND (coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'')) ~* '\myou (poisoned|killed|murdered|stabbed|strangled|shot|smothered)\M'
        AND (coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'')) ~* '(hide|hiding|conceal|cover up).{0,60}(guilt|your crime|your own crime|what you did)'
    LOOP
      _defects := _defects || ('slip_culprit_leak.' || _hit.key);
    END LOOP;
  END IF;

  FOR _hit IN
    WITH kin AS (
      SELECT unnest(ARRAY[
        'brother','sister','father','mother','husband','wife','son','daughter',
        'uncle','aunt','nephew','niece','cousin','twin'
      ]) AS term
    ),
    chars AS (
      SELECT mc.character_name,
        coalesce(mc.introduction,'') || ' ' || coalesce(mc.round2_script,'') || ' ' ||
        coalesce(mc.round3_script,'') || ' ' || coalesce(mc.round4_script,'') || ' ' ||
        coalesce(mc.final_statement,'') AS claims,
        coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'') || ' ' ||
        coalesce(mc.description::text,'') AS truth
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
    ),
    conflicts AS (
      SELECT k.term, ch.character_name
      FROM chars ch CROSS JOIN kin k
      WHERE ch.claims ~* ('\mmy (own )?' || k.term || '\M')
        AND ch.truth !~* ('\m' || k.term)
    )
    SELECT term, array_to_string(array_agg(character_name ORDER BY character_name), ',') AS claimants
    FROM conflicts
    GROUP BY term
    HAVING count(*) >= 2
  LOOP
    _defects := _defects || ('identity_conflict.' || _hit.term || ':' || _hit.claimants);
  END LOOP;

  _defects := _defects || coalesce(public.package_victim_is_playable_character(_pkg), ARRAY[]::text[]);

  -- ADR-0103 Addendum 65: accomplice-role-count mismatch (>1 accomplice-tagged
  -- character, or 1 when has_accomplice=false). Deliberately excludes the
  -- has_accomplice=true/count=0 shape -- see function comment.
  _accomplice_mismatch := public.package_accomplice_role_mismatch(_pkg);
  IF _accomplice_mismatch IS NOT NULL THEN
    _defects := _defects || ('accomplice_role_mismatch.' || _accomplice_mismatch);
  END IF;

  -- ADR-0103 Addendum 65: murderer/accomplice missing Round-4 accusations/
  -- deflection content.
  _missing_accusations := public.package_culprit_missing_accusations(_pkg);
  IF _missing_accusations IS NOT NULL AND array_length(_missing_accusations, 1) > 0 THEN
    FOR _hit IN SELECT unnest(_missing_accusations) AS key LOOP
      _defects := _defects || ('culprit_missing_accusations.' || _hit.key);
    END LOOP;
  END IF;

  -- ADR-0103 Addendum 67/68: dangling trailing quote mark (self-heals via
  -- auto-remediate-packages' deterministic handler once this holds the gate).
  _dangling_quote := public.package_dangling_quote_mark(_pkg);
  IF _dangling_quote IS NOT NULL AND array_length(_dangling_quote, 1) > 0 THEN
    FOR _hit IN SELECT unnest(_dangling_quote) AS key LOOP
      _defects := _defects || ('dangling_quote_mark.' || _hit.key);
    END LOOP;
  END IF;

  -- ADR-0103 Addendum 67/68: murderer/victim reveal-line name fusion.
  -- Detection-only, no auto-remediation handler -- see function comment.
  _reveal_fusion := public.package_reveal_name_fusion(_pkg);
  IF _reveal_fusion IS NOT NULL THEN
    _defects := _defects || ('reveal_name_fusion.' || _reveal_fusion);
  END IF;

  IF array_length(_defects, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN _defects;
END;
$function$;
