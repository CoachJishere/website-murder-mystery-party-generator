-- ADR-0113 follow-up: the previous version of this check required
-- character_role IS NOT NULL unconditionally, inherited from the ORIGINAL
-- (pre-ADR-0113) 2-field check. Auditing the 13-package historical manual
-- tier found character_role is a genuine era convention, not a
-- per-character defect: 100% null for every package created before
-- 2025-12, phasing out through Feb 2026 (ADR-0052's rollout), 0% null
-- from March 2026 onward -- confirmed zero packages anywhere in the corpus
-- have a MIX of null/non-null character_role (always all-or-nothing per
-- package), so this is safe to treat with the same partial-vs-uniform-null
-- distinction already established today for other fields: only a defect
-- when null on some-but-not-all characters in a package that has already
-- established the "role populated" convention for its own siblings.

CREATE OR REPLACE FUNCTION public.validate_package_characters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _expected_count int;
  _actual_count int;
  _empty_count int;
  _conversation_id uuid;
  _has_accomplice boolean;
  _any_role_populated boolean;
  _structural_defects text[];
  _reasons text[] := ARRAY[]::text[];
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
BEGIN
  IF NEW.generation_status->>'status' IS DISTINCT FROM 'completed'
     OR OLD.generation_status->>'status' = 'completed' THEN
    RETURN NEW;
  END IF;

  _conversation_id := NEW.conversation_id;

  SELECT has_accomplice INTO _has_accomplice
  FROM conversations WHERE id = _conversation_id;

  SELECT bool_or(character_role IS NOT NULL) INTO _any_role_populated
  FROM mystery_characters WHERE package_id = NEW.id;

  _expected_count := public.package_expected_character_count(NEW);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE
    description IS NULL
    OR (_any_role_populated AND character_role IS NULL)
    OR introduction IS NULL
    OR background IS NULL
    OR secret IS NULL
    OR rumors IS NULL
    OR relationships IS NULL
    OR accusations IS NULL
    OR (round2_script IS NULL AND round2_innocent IS NULL)
    OR (round3_script IS NULL AND round3_innocent IS NULL)
    OR (round4_script IS NULL AND round4_innocent IS NULL)
    OR (final_statement IS NULL AND final_innocent IS NULL)
    OR (round2_innocent IS NOT NULL AND round2_guilty IS NULL)
    OR (round3_innocent IS NOT NULL AND round3_guilty IS NULL)
    OR (round4_innocent IS NOT NULL AND round4_guilty IS NULL)
    OR (final_innocent IS NOT NULL AND final_guilty IS NULL)
    OR (_has_accomplice AND round2_innocent IS NOT NULL AND round2_accomplice IS NULL)
    OR (_has_accomplice AND round3_innocent IS NOT NULL AND round3_accomplice IS NULL)
    OR (_has_accomplice AND round4_innocent IS NOT NULL AND round4_accomplice IS NULL)
    OR (_has_accomplice AND final_innocent IS NOT NULL AND final_accomplice IS NULL)
  )
  INTO _actual_count, _empty_count
  FROM mystery_characters
  WHERE package_id = NEW.id;

  _structural_defects := public.package_completion_blocking_defects(NEW);

  IF _empty_count > 0 OR (_expected_count > 0 AND _actual_count < _expected_count) THEN
    _reasons := _reasons || (_empty_count || ' character(s) have missing content');
  END IF;

  IF _structural_defects IS NOT NULL THEN
    _reasons := _reasons || _structural_defects;
  END IF;

  IF array_length(_reasons, 1) > 0 THEN
    NEW.generation_status := jsonb_build_object(
      'status', 'needs_review',
      'progress', 100,
      'currentStep', 'Generation completed but needs review: ' || array_to_string(_reasons, '; '),
      'sections', jsonb_build_object(
        'hostGuide', true,
        'characters', (_empty_count = 0 AND _structural_defects IS NULL),
        'clues', true
      ),
      'emptyCharacters', _empty_count,
      'expectedCharacters', _expected_count,
      'actualCharacters', _actual_count,
      'structuralDefects', to_jsonb(coalesce(_structural_defects, ARRAY[]::text[]))
    );

    PERFORM net.http_post(
      url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/notify-generation-issue',
      body := jsonb_build_object('conversation_id', _conversation_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key,
        'apikey', _anon_key
      )
    );

    RAISE LOG 'Package % flagged at completion: %', NEW.id, array_to_string(_reasons, '; ');
  END IF;

  RETURN NEW;
END;
$function$;
