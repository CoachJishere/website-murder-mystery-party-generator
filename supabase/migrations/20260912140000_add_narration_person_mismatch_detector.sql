-- ADR-0103 Addendum 45: narration_person_mismatch detector.
--
-- Found via sweep: a character's own guilty/accomplice/reveal_confession
-- branch can drift into third-person narration (or literally self-reference
-- the character's own name mid-confession) while that SAME character's
-- baseline branch (round*_innocent, or round*_script/final_statement for
-- detective style) stays correctly first-person.
--
-- Third-person narration is NOT inherently a defect in this corpus -- a large
-- fraction of packages legitimately use a stage-direction-plus-quoted-dialogue
-- style (e.g. "Joe's shoulders drop... 'Okay,' he says. 'I did it.'"), a
-- normal screenplay/dialogue-tag convention. An initial "character's own name
-- appears 2+ times" heuristic false-positived on ~90% of its own hits when
-- tested against the live corpus (role-label character names like "The
-- Leader"/"Sales/Simon Keller", and legitimate dramatic self-naming). The
-- reliable signal, confirmed by finding an independent instance of the same
-- bug in an unrelated package (Molly, "The Jealous Niece" -- her
-- round2_innocent/round3_innocent are correctly first-person, her
-- round2_guilty/round3_guilty are pure third-person narration with zero
-- quotable dialogue): a character's own confirmed-first-person baseline
-- branch proves they write in first person, but a SIBLING branch opens with
-- [OwnName]+narrator-verb AND contains zero actual quoted-dialogue tag
-- (nothing a player could perform as their own line).
--
-- A "second person" sub-check (starts with You/Your) was tried and dropped --
-- rhetorical openers like "You want the truth? Fine, I..." are extremely
-- common, legitimate first-person text and produced ~75% false positives on
-- manual sampling.
--
-- Performance note: the list_packages_with_* companion initially timed out
-- at the full-corpus default scope even at a 2-minute statement_timeout,
-- despite every individual sub-expression being fast in isolation when
-- tested standalone. Fixed by forcing MATERIALIZED on every CTE and pushing
-- the package-scope filter (pkg) ahead of the expensive per-field regex work
-- via a "WHERE package_id IN (SELECT ...)" semi-join, rather than joining pkg
-- only at the very end -- this is the final, working version (superseding
-- two earlier same-session iterations that were applied directly via the
-- Supabase MCP tool without a matching local file).

CREATE OR REPLACE FUNCTION public.package_completion_blocking_defects(_pkg mystery_packages)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _defects text[] := ARRAY[]::text[];
  _pattern text := '<html[\s>]|<!doctype\s+html|bad gateway|gateway[\s-]*time[\s-]*out|50[234]\s+(bad gateway|service unavailable|gateway[\s-]*time[\s-]*out)';
  _meta_pattern text := '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose |\[if guilty)';
  _hit record;
  _overview_name text;
  _overview_surname text;
  _has_r2acc boolean;
  _has_r3acc boolean;
  _has_r4acc boolean;
  _has_finalacc boolean;
  _has_revacc boolean;
  _has_revguilty boolean;
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

  IF (
    coalesce(_pkg.game_overview,'') || ' ' || coalesce(_pkg.detective_script,'') || ' ' ||
    coalesce(_pkg.host_guide,'') || ' ' || coalesce(_pkg.timeline,'') || ' ' ||
    coalesce(_pkg.hosting_tips,'') || ' ' || coalesce(_pkg.preparation_instructions,'') || ' ' ||
    coalesce(_pkg.evidence_cards #>> '{}','')
  ) ~* _meta_pattern THEN
    _defects := _defects || 'meta_text_leak.package'::text;
  END IF;

  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND (
        coalesce(mc.introduction,'') || ' ' || coalesce(mc.rumors,'') || ' ' ||
        coalesce(mc.background,'') || ' ' || coalesce(mc.secret,'') || ' ' ||
        coalesce(mc.relationships::text,'') || ' ' || coalesce(mc.description::text,'') || ' ' ||
        coalesce(mc.accusations,'') || ' ' ||
        coalesce(mc.round2_script,'') || ' ' || coalesce(mc.round3_script,'') || ' ' ||
        coalesce(mc.round4_script,'') || ' ' || coalesce(mc.final_statement,'') || ' ' ||
        coalesce(mc.round2_innocent,'') || ' ' || coalesce(mc.round2_guilty,'') || ' ' || coalesce(mc.round2_accomplice,'') || ' ' ||
        coalesce(mc.round3_innocent,'') || ' ' || coalesce(mc.round3_guilty,'') || ' ' || coalesce(mc.round3_accomplice,'') || ' ' ||
        coalesce(mc.round4_innocent,'') || ' ' || coalesce(mc.round4_guilty,'') || ' ' || coalesce(mc.round4_accomplice,'') || ' ' ||
        coalesce(mc.final_innocent,'') || ' ' || coalesce(mc.final_guilty,'') || ' ' || coalesce(mc.final_accomplice,'')
      ) ~* _meta_pattern
  LOOP
    _defects := _defects || ('meta_text_leak.character.' || _hit.key);
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
      AND pf_hits >= 3
      AND (pf_hits::numeric / pf_len * 1000) > 3
      AND (prose_hits::numeric / prose_len * 1000) < 1
  LOOP
    _defects := _defects || ('pointform_language_mismatch.' || _hit.key);
  END LOOP;

  -- ADR-0103 Addendum 45: narration_person_mismatch (see migration header for
  -- full rationale/tuning history).
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

  _overview_name := (regexp_match(coalesce(_pkg.game_overview,''), 'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1];
  IF _overview_name IS NOT NULL THEN
    _overview_surname := (regexp_match(_overview_name, '([A-Za-z]+)$'))[1];
    IF _overview_surname IS NOT NULL AND length(_overview_surname) >= 4
       AND coalesce(_pkg.master_context,'') !~* ('\m' || _overview_surname || '\M')
       AND NOT EXISTS (
         SELECT 1 FROM mystery_characters mc
         WHERE mc.package_id = _pkg.id
           AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || _overview_surname || '\M')
       )
    THEN
      _defects := _defects || ('victim_mismatch.' || _overview_name);
    END IF;
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

  IF array_length(_defects, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN _defects;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_narration_person_mismatch(_since timestamptz DEFAULT '2026-04-01'::timestamptz)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamptz, character_name text, fields text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pkg AS MATERIALIZED (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (mp.generation_status ->> 'status') IN ('completed', 'needs_review')
      AND mp.created_at >= _since
      AND NOT c.is_test
  ),
  name_first AS MATERIALIZED (
    SELECT mc.id AS mc_id, mc.package_id,
      regexp_replace((regexp_split_to_array(regexp_replace(mc.character_name, '[/(].*', ''), '\s+'))[1],
        '([.^$|()\[\]{}*+?\\])', '\\\1', 'g') AS first_tok
    FROM mystery_characters mc
    WHERE mc.package_id IN (SELECT package_id FROM pkg)
  ),
  fields AS MATERIALIZED (
    SELECT mc.id AS mc_id, mc.package_id, mc.character_name AS key, kv.key AS field_name, kv.value AS field_text
    FROM mystery_characters mc,
         jsonb_each_text(to_jsonb(mc)) AS kv(key, value)
    WHERE mc.package_id IN (SELECT package_id FROM pkg)
      AND kv.key IN (
        'round2_guilty','round3_guilty','round4_guilty','final_guilty',
        'round2_accomplice','round3_accomplice','round4_accomplice','final_accomplice',
        'round2_innocent','round3_innocent','round4_innocent','final_innocent',
        'reveal_confession_guilty','reveal_confession_accomplice',
        'round2_script','round3_script','round4_script','final_statement'
      )
      AND length(coalesce(kv.value,'')) > 150
  ),
  scored AS MATERIALIZED (
    SELECT f.mc_id, f.package_id, f.key, f.field_name,
      regexp_replace(f.field_text, '^(##[^\n]*\n+)+(\*\*[^\n]*\*\*\n+)*', '') AS body,
      nf.first_tok
    FROM fields f JOIN name_first nf ON nf.mc_id = f.mc_id
    WHERE length(nf.first_tok) >= 3
  ),
  tagged AS MATERIALIZED (
    SELECT mc_id, package_id, key, field_name,
      (left(body,110) ~* ('\y' || first_tok || '\y\s*''?s?\s+\w*(s|ing|es|n''t)?\y\s*(spreads|leans|folds|shrugs|nods|sighs|pauses|turns|steers|redirects|gestures|glances|looks|admits|confesses|acknowledges|reminds|explains|insists|says|tells|doesn''t|finally|crosses|cracks|drops|closes|holds|points|smiles|grins|frowns|hesitates|straightens|lowers|raises|clears|stiffens)')) AS is_third,
      (left(body,200) ~* '\y(i|i''m|i''ll|i''ve|i''d)\y') AS has_first_person,
      field_name ~ '(innocent|_script|final_statement)$' AS is_baseline,
      (body ~* ''',?\s*(he|she|they)\s+(says|admits|asks|replies|tells|insists|explains|confesses|remarks|notes)\y') AS has_dialogue_tag
    FROM scored
  ),
  per_char AS MATERIALIZED (
    SELECT mc_id, package_id, key,
      bool_or(has_first_person AND is_baseline) AS baseline_is_first,
      array_agg(DISTINCT field_name) FILTER (WHERE is_third AND NOT has_dialogue_tag AND NOT is_baseline) AS bad_fields
    FROM tagged
    GROUP BY mc_id, package_id, key
  )
  SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at, pc.key AS character_name, pc.bad_fields AS fields
  FROM per_char pc
  JOIN pkg p ON p.package_id = pc.package_id
  WHERE pc.baseline_is_first AND pc.bad_fields IS NOT NULL AND array_length(pc.bad_fields,1) > 0
  ORDER BY p.is_paid DESC, p.created_at DESC;
$function$;
