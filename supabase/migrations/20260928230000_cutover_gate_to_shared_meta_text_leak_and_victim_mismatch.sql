-- ADR-0131 item 2, Stage 3: cutover. package_completion_blocking_defects()'s
-- meta_text_leak and victim_mismatch blocks now call the shared predicates
-- (package_meta_text_leak, package_victim_mismatch_candidate) built in
-- Stage 1 and shadow-tested in Stage 2. Every other block (error_body,
-- invalid_role, self_directed_question, missing_round_content,
-- missing_role_branch_content, pointform_language_mismatch,
-- narration_person_mismatch, slip_culprit_leak, identity_conflict,
-- victim_is_playable_character) is preserved byte-for-byte from the live
-- source fetched immediately before writing this migration.
--
-- Shadow-test results (ADR-0131 Addendum 8): meta_text_leak -- 2 "lost"
-- hits both confirmed to be the legitimate [choose a name or leave blank]
-- convention (a correct false-positive fix, not lost coverage); 8 newly-
-- caught hits (all paid) confirmed genuine via actual matched text (a real
-- unresolved "[No hostile relationships listed in the relationship matrix
-- for X]" template artifact). victim_mismatch -- both old and new logic
-- return zero hits on the full current corpus (200 non-test packages); the
-- structural widening (1 extraction pattern -> 3) has no live impact today
-- but closes the documented ~78%-inert gap (ADR-0060) for future packages.
--
-- Old inline patterns kept below in a comment as the documented rollback
-- reference for one release cycle, per this ADR's own Discussion section.
--
-- OLD _meta_pattern (superseded, now sourced from package_meta_text_leak):
--   '(let me reconsider|let me reread|let me recalculate|let me look at this
--   more carefully|i need to correct this|on second thought|master_context|
--   as an ai language model|wait, i need to|\[closing paragraph|\[insert |
--   \[choose |\[if guilty)'
-- OLD victim extraction (superseded, now sourced from
-- package_victim_mismatch_candidate): single pattern only --
--   'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'

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

  IF array_length(_defects, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN _defects;
END;
$function$;
