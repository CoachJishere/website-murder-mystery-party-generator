-- ADR-0113: validate_package_characters()'s "empty character" check only
-- looked at description/character_role, missing ~20 other substantive
-- content fields (accusations, secret, rumors, round2-4 branches, final
-- branches, etc). Corpus sweep found 20 real paid packages with a
-- character silently missing one of these fields while siblings had it
-- populated -- invisible to this gate since it shipped (see ADR-0103
-- Addendum 6 for the incident that surfaced this).
--
-- This schema supports two content shapes per round/final field, and both
-- are legitimately in live use (not determined cleanly by mystery_style):
--   - "branching" model: round{N}_innocent / round{N}_guilty /
--     round{N}_accomplice (any player could draw any slip)
--   - "single-script" model: round{N}_script / final_statement (fixed
--     roles, one script per character)
-- The check accepts either model being complete rather than assuming one
-- based on mystery_style. Accomplice-branch fields are only required when
-- the package's conversation has has_accomplice = true and the branching
-- model is in use for that round/character -- a non-accomplice package
-- legitimately has all-null accomplice fields (see ADR-0103 Addendum 6
-- discussion: Jonathan caught this nuance before the fix shipped).

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
  _structural_defects text[];
  _reasons text[] := ARRAY[]::text[];
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
BEGIN
  -- ADR-0108: fire on EVERY transition of generation_status into
  -- 'completed', not just the first generation_completed_at write. Skip
  -- when NEW isn't becoming 'completed' at all, or when OLD was already
  -- 'completed' (an unrelated later edit to an already-validated row --
  -- prevents re-validation churn / repeat notify-generation-issue calls
  -- on every subsequent touch of an already-completed package).
  IF NEW.generation_status->>'status' IS DISTINCT FROM 'completed'
     OR OLD.generation_status->>'status' = 'completed' THEN
    RETURN NEW;
  END IF;

  _conversation_id := NEW.conversation_id;

  SELECT has_accomplice INTO _has_accomplice
  FROM conversations WHERE id = _conversation_id;

  -- Count expected characters from extracted_characters (ADR-0094: shared
  -- parser, was inline here).
  _expected_count := public.package_expected_character_count(NEW);

  -- Count actual characters with content.
  -- ADR-0113: expanded from description/character_role only to every
  -- substantive content field a delivered character actually needs,
  -- accepting either the branching or single-script model per round.
  SELECT COUNT(*), COUNT(*) FILTER (WHERE
    description IS NULL
    OR character_role IS NULL
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

  -- ADR-0049: structural-integrity gate -- invalid character_role enum values,
  -- or a raw upstream error/HTML body verbatim in any delivered field. Catches
  -- the Velvet Viper (2026-07-30) / Coronation (2026-07-31) failure mode
  -- BEFORE completion, rather than after (ADR-0048's detector).
  _structural_defects := public.package_completion_blocking_defects(NEW);

  IF _empty_count > 0 OR (_expected_count > 0 AND _actual_count < _expected_count) THEN
    _reasons := _reasons || (_empty_count || ' character(s) have missing content');
  END IF;

  IF _structural_defects IS NOT NULL THEN
    _reasons := _reasons || _structural_defects;
  END IF;

  -- If there are empty characters, missing characters, or structural defects,
  -- flag and notify instead of letting completion stand.
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

    -- Call the Edge Function via pg_net
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
