-- ADR-0096: package_completion_blocking_defects() never checked for a
-- character's round-script/final-statement content being empty -- only
-- description/character_role (validate_package_characters()'s own inline
-- _empty_count) and a list of unrelated defect classes (error bodies,
-- invalid roles, meta-text leaks, self-directed questions, victim mismatch,
-- slip-culprit leak, identity conflicts). A character can have a fully
-- populated description/background/role and STILL be missing every round
-- script and final statement -- confirmed live on The Staged Suicide
-- Details (Han Yu) and The Birthday Betrayal (Casey/Cassidy Chen), both
-- 2026-08-19/20, both slipped past every existing gate and detector because
-- none of them look at these fields. See
-- docs/adr/0096-missing-round-content-blocking-defect.md.
--
-- Also worth recording: an earlier attempt at this exact check already
-- exists as get_empty_characters() (migration 20260422125154,
-- fix_get_empty_characters_to_check_scripts) -- but it was never wired into
-- any caller (not the completion trigger, not any edge function, not any
-- cron; confirmed via a full-codebase and full-schema search). It has done
-- nothing since the day it was written. That migration landed 2026-04-22
-- 12:51 UTC; "Death On The Dance Floor" and "Death At The Deadwood Saloon"
-- -- two of the worst-hit packages in this ADR's historical sweep (17/18
-- and 9/9 characters affected) -- were generated the SAME DAY, ~5 hours
-- later. Not reused here: different design (LENGTH < 50 threshold, joins
-- conversations for mystery_style, standalone SETOF rather than folded into
-- the shared defect-list function), and this fix follows ADR-0049's
-- established pattern of one function wired into all three completion
-- gates rather than adding a second disconnected checker.
--
-- Fix: add a defect class to the one shared function already wired into all
-- three completion gates (validate_package_characters() trigger,
-- heal_completed_packages(), promote_complete_packages()) -- same pattern
-- ADR-0049 established, avoiding the "one concept two predicates" drift
-- class this codebase has hit multiple times before.

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

  -- ADR-0096: a character's round-content call group (round2/3/4_script +
  -- final_statement for detective style; round2/3/4_innocent + final_innocent
  -- + round2/3/4_guilty + final_guilty for character style -- these two
  -- branches are generated for every character regardless of role, so an
  -- empty one is never legitimate) occasionally comes back and gets written
  -- as entirely empty while Make.com still reports the run as successful.
  -- round2/3/4_questions is shared by both styles and checked either way.
  -- Deliberately NOT checking round*_accomplice/final_accomplice: that
  -- branch is conditional on conversations.has_accomplice, and joining that
  -- in here risks false positives this ADR's historical sweep didn't verify
  -- against -- narrower, evidence-matched scope only.
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
