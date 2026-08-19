-- ADR-0094: close the recovery-path character-count gap.
--
-- validate_package_characters() (the trigger firing on generation_completed_at
-- NULL -> NOT NULL) already compares mystery_characters row count against the
-- roster size parsed from extracted_characters, and correctly holds a package
-- at needs_review when characters are missing. But the two RECOVERY paths that
-- promote needs_review -> completed -- heal_completed_packages() and
-- promote_complete_packages(), both pg_cron every 2 minutes
-- (heal_completed_packages_2min, sweep_incomplete_packages_2min) -- only check
-- that EXISTING character rows aren't empty/NULL. Neither re-derives the
-- expected roster size, so a package correctly held for missing (not just
-- empty) characters gets silently re-promoted to completed by the very next
-- cron tick, with no alert. This is the mechanism behind Ciaran Fox's package
-- (ADR-0093) shipping "completed" at 16 of 24 characters.
--
-- Fix: extract the roster-size parser that was inline inside
-- validate_package_characters() into one shared function, and add a row-count
-- guard to both recovery paths using it -- same pattern ADR-0049 already used
-- to close the structural-defect version of this exact gap
-- (package_completion_blocking_defects(), also called from all three
-- functions). Deliberately sourced from extracted_characters, NOT
-- conversations.player_count -- player_count is guest headcount and the
-- product intentionally allows it to exceed character count (co-investigator
-- design, ADR-0064); using it as a hard floor would false-positive on every
-- such package. See ADR-0094 for the full trace and a historical sweep that
-- found no other live instance of this bug (20 of 21 candidates are
-- pre-ADR-0043 legacy rows already closed 2026-08-13; the 21st is the known,
-- intentional "Whispers From The Void" guest-dropout case).

-- ---------------------------------------------------------------------------
-- 1. Shared roster-size parser (extracted verbatim from
--    validate_package_characters()'s prior inline logic -- pure extraction,
--    not a behavior change).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_expected_character_count(_pkg mystery_packages)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  _extracted jsonb;
  _count int;
BEGIN
  BEGIN
    IF jsonb_typeof(_pkg.extracted_characters) = 'array' THEN
      _count := jsonb_array_length(_pkg.extracted_characters);
    ELSIF jsonb_typeof(_pkg.extracted_characters) = 'string' THEN
      _extracted := (_pkg.extracted_characters #>> '{}')::jsonb;
      IF jsonb_typeof(_extracted) = 'array' THEN
        _count := jsonb_array_length(_extracted);
      ELSE
        _count := 0;
      END IF;
    ELSE
      _count := 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _count := 0;
  END;
  RETURN coalesce(_count, 0);
END;
$fn$;

COMMENT ON FUNCTION public.package_expected_character_count(mystery_packages) IS
  'Roster size implied by mystery_packages.extracted_characters (the same source validate_package_characters() has always used), parsed defensively since Make.com sometimes stores it as a bare comma-separated string instead of a JSON array. Returns 0 (never blocks) when unparseable or absent. Deliberately NOT conversations.player_count -- player_count is guest headcount, which the product intentionally allows to exceed character count (extra guests co-investigate rather than getting their own character, ADR-0064) -- using it here would false-positive on every such package. Called from validate_package_characters(), heal_completed_packages(), and promote_complete_packages() (ADR-0094) so the parsing logic exists exactly once.';

GRANT EXECUTE ON FUNCTION public.package_expected_character_count(mystery_packages) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. validate_package_characters(): refactor to call the shared function
--    instead of its own inline copy. Byte-identical behavior for this
--    function's existing caller (the generation_completed_at trigger).
-- ---------------------------------------------------------------------------
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
  _structural_defects text[];
  _reasons text[] := ARRAY[]::text[];
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
BEGIN
  -- Only fire when generation_completed_at is being set (was NULL, now has value)
  IF OLD.generation_completed_at IS NOT NULL OR NEW.generation_completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  _conversation_id := NEW.conversation_id;

  -- Count expected characters from extracted_characters (ADR-0094: shared
  -- parser, was inline here).
  _expected_count := public.package_expected_character_count(NEW);

  -- Count actual characters with content
  SELECT COUNT(*), COUNT(*) FILTER (WHERE description IS NULL OR character_role IS NULL)
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

-- ---------------------------------------------------------------------------
-- 3. heal_completed_packages(): add the row-count guard alongside the
--    existing ADR-0049 structural-defect guard.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.heal_completed_packages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  healed_count integer;
BEGIN
  WITH healed AS (
    UPDATE mystery_packages mp
    SET generation_status = jsonb_set(
      jsonb_set(
        coalesce(mp.generation_status::jsonb, '{}'::jsonb),
        '{status}', '"completed"'::jsonb, true
      ),
      '{currentStep}', '"Package generation completed"'::jsonb, true
    )
    WHERE (mp.generation_status->>'status') = 'needs_review'
      AND EXISTS (SELECT 1 FROM mystery_characters mc WHERE mc.package_id = mp.id)
      AND NOT EXISTS (
        SELECT 1 FROM mystery_characters mc
        WHERE mc.package_id = mp.id
          AND (
            mc.character_role IS NULL
            OR mc.description IS NULL
            OR length(coalesce(mc.description, '')) < 100
          )
      )
      -- ADR-0049: never re-promote a package that still has an invalid
      -- character_role or a raw upstream error/HTML body in any delivered
      -- field. Without this, this cron (every 2 minutes) silently undid the
      -- validate_package_characters() gate above for any package it also
      -- happened to match on the pre-existing NULL/short-description checks.
      AND public.package_completion_blocking_defects(mp) IS NULL
      -- ADR-0094: never re-promote a package that's still short on character
      -- ROW COUNT (not just content quality on the rows that exist). Without
      -- this, a package correctly held at needs_review for missing characters
      -- -- e.g. 16 of 24 rows, all 16 well-formed -- satisfied every check
      -- above and got silently re-promoted to completed on the very next tick.
      AND (
        public.package_expected_character_count(mp) = 0
        OR (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id)
           >= public.package_expected_character_count(mp)
      )
    RETURNING mp.id
  )
  SELECT count(*) INTO healed_count FROM healed;
  RETURN healed_count;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. promote_complete_packages(): same row-count guard.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_complete_packages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _pkg record;
BEGIN
  -- Find packages marked needs_review where all characters now have content
  FOR _pkg IN
    SELECT mp.id, mp.conversation_id
    FROM mystery_packages mp
    WHERE mp.generation_completed_at IS NOT NULL
      AND mp.generation_status->>'status' = 'needs_review'
      AND NOT EXISTS (
        SELECT 1 FROM mystery_characters mc
        WHERE mc.package_id = mp.id
          AND (mc.description IS NULL OR mc.character_role IS NULL)
      )
      -- Must have at least one character
      AND EXISTS (
        SELECT 1 FROM mystery_characters mc
        WHERE mc.package_id = mp.id
      )
      -- ADR-0049: same structural-defect guard as heal_completed_packages().
      AND public.package_completion_blocking_defects(mp) IS NULL
      -- ADR-0094: same row-count guard as heal_completed_packages().
      AND (
        public.package_expected_character_count(mp) = 0
        OR (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id)
           >= public.package_expected_character_count(mp)
      )
  LOOP
    UPDATE mystery_packages
    SET generation_status = jsonb_build_object(
      'status', 'completed',
      'progress', 100,
      'currentStep', 'Package generation completed',
      'sections', jsonb_build_object(
        'hostGuide', true,
        'characters', true,
        'clues', true,
        'inspectorScript', true,
        'characterMatrix', true
      )
    )
    WHERE id = _pkg.id;

    RAISE LOG 'Package % promoted from needs_review to completed', _pkg.id;
  END LOOP;
END;
$function$;
