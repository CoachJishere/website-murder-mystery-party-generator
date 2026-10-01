-- ADR-0069 Addendum 3: restores the has_accomplice auto-sync block that
-- migration 20260905183501_sync_has_accomplice_from_actual_characters.sql
-- added to validate_package_characters(), which migration
-- 20260908074900_stamp_generation_completed_at_on_validated_completion.sql
-- silently dropped three days later by redefining the function from a base
-- that predated the sync block -- classic paired-predicate-drift via
-- CREATE OR REPLACE.
--
-- Confirmed live-database drift directly (not just comparing repo files):
-- pg_get_functiondef() on the deployed function showed no
-- _has_accomplice_actual variable and no UPDATE conversations block.
-- Live broken 2026-09-08 through 2026-10-01 (~3 weeks) -- every package that
-- completed in that window never had has_accomplice auto-corrected at
-- completion. Found while investigating why "Emma's Honky Tonk: A Meow-der
-- Mystery" (package 1b44560c-5e95-4d8a-93d8-6fa682e074d7) still showed
-- has_accomplice=true after its 4 wrongly-tagged accomplice characters had
-- already been corrected to 0 (ADR-0103 Addendum 66) and the package had
-- gone through a real completion transition.
--
-- Corpus check across all mystery_style='detective' packages completed
-- since 2026-09-08 for a genuine has_accomplice/character_role mismatch
-- (either direction) found zero other live instances -- Emma's Honky Tonk,
-- fixed directly via UPDATE at the same time as this migration, was the
-- only real-world case the ~3-week outage actually affected.
--
-- This migration is byte-for-byte the 20260908074900 version with the
-- 20260905183501 sync block re-inserted in its original position (before
-- the structural-defects gate) -- no other logic changed.

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
  _has_accomplice_actual boolean;
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

  -- Count expected characters from extracted_characters (ADR-0094: shared
  -- parser, was inline here).
  _expected_count := public.package_expected_character_count(NEW);

  -- Count actual characters with content
  SELECT COUNT(*), COUNT(*) FILTER (WHERE description IS NULL OR character_role IS NULL)
  INTO _actual_count, _empty_count
  FROM mystery_characters
  WHERE package_id = NEW.id;

  -- has_accomplice sync (ADR-0069, migration 20260905183501): the ground
  -- truth is whichever role Make.com actually assigned, not the stale
  -- form/chat-opener value. Best-effort, unconditional (data hygiene, not a
  -- completion gate) -- correct it regardless of whether this package ends
  -- up flagged needs_review below.
  --
  -- RESTORED 2026-10-01 (ADR-0069 Addendum 3): migration 20260908074900
  -- (ADR-0103 Addendum 30 follow-up, generation_completed_at stamping)
  -- redefined this function from a base that predated this block and
  -- silently dropped it -- classic paired-predicate-drift. Live broken
  -- between 2026-09-08 and 2026-10-01 (~3 weeks).
  SELECT EXISTS (
    SELECT 1 FROM mystery_characters
    WHERE package_id = NEW.id AND character_role = 'accomplice'
  ) INTO _has_accomplice_actual;

  UPDATE conversations
  SET has_accomplice = _has_accomplice_actual
  WHERE id = _conversation_id AND has_accomplice IS DISTINCT FROM _has_accomplice_actual;

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
  ELSE
    -- Genuinely validated completion: this trigger is the authoritative
    -- source of truth for when a package actually finished, overriding
    -- whatever timestamp any caller (in-repo or external) tried to set in
    -- the same statement. Fixes the stale-timestamp shape from ADR-0103
    -- Addendum 29.
    NEW.generation_completed_at := now();
  END IF;

  RETURN NEW;
END;
$function$;
