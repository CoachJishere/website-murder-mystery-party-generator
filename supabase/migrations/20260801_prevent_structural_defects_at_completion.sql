-- PREVENTION layer for the structural-defect class documented in ADR-0048 (the
-- detector) and ADR-0049 (this migration). Where ADR-0048's
-- list_packages_with_structural_defects() finds already-completed broken
-- packages after the fact, this migration stops the SAME defects from ever
-- being marked `completed` in the first place, on EVERY path that can set that
-- status.
--
-- WHY: two incidents, same root cause. "Death At The Velvet Viper" (paid,
-- 2026-07-30) and "Murder At The Coronation" (paid, 2026-07-31, package
-- 96b62ce5, conversation f106ef2c) both reached generation_status=completed
-- with a raw 502 response body stored verbatim in a character's
-- character_role — Coronation had the SAME 122-char error body in
-- character_role, background, AND secret simultaneously. Root cause traced to
-- scenario 9061052 ("MM Live - Child (Unified) v19"): module `http:ActionSendData`
-- "Parse Claude JSON" (ids 402/406/410/413/502/506/510/514/518/521/525) calls
-- the `parse-claude-json` edge function with `handleErrors: false` — a 5xx from
-- that function (Supabase Edge Function gateway hiccup, not a bug in the
-- function's own code) is NOT treated as a Make module error, so the raw error
-- body flows straight into the next `supabase:upsertARecord` module's
-- character_role / background / secret / description / introduction fields.
-- No error handler exists anywhere in that scenario today (verified: every
-- `onerror` slot is empty or absent). See ADR-0049 for the full trace and the
-- recommended (not-yet-applied — must be done in the Make UI, not by blueprint
-- edit) Make-side fix.
--
-- THIS MIGRATION is the DB-level prevention layer, deliberately independent of
-- the Make.com fix: it is the one point every completion path already goes
-- through (or can be made to), so it closes the hole regardless of whether the
-- upstream Make fix ever lands, and regardless of any FUTURE caller (a direct
-- Make PATCH to mystery_packages, a manual admin import, a client auto-
-- correction) that might reintroduce the same failure shape.
--
-- ---------------------------------------------------------------------------
-- WHAT COUNTS AS A COMPLETION-BLOCKING DEFECT (deliberately narrow — see
-- ADR-0049 Rationale for why this does NOT fold in ADR-0048's other three
-- sub-checks):
--   1. invalid_role  — a NON-NULL character_role outside
--      ('murderer','accomplice','suspect','redHerring'). NULL is legitimate
--      (random-slip character-style games leave it unset).
--   2. error_body    — ANY delivered field (package-level or character-level)
--      containing a raw upstream error/HTML body: `<html`, `<!DOCTYPE html`,
--      "bad gateway", "gateway timeout"/"gateway-timeout", or a 502/503/504
--      status paired with its standard reason phrase. Patterns are
--      deliberately narrow (two-word phrases / numeric-code-plus-phrase, never
--      a bare "gateway") so a mystery plot that happens to mention a gateway,
--      stargate, or similar never false-positives.
-- Both classes are simple, mechanical, zero-judgment invariants — exactly the
-- kind ADR-0047's auto-remediation-worker findings say are safe to act on
-- without fabricating content, because the action here is never "repair the
-- text", only "don't call it done".
--
-- ---------------------------------------------------------------------------
-- WHERE THIS IS WIRED IN (all three completion-setting paths that exist in the
-- DB layer today):
--   1. validate_package_characters() — the EXISTING pre-completion trigger
--      (fires once, on the OLD.generation_completed_at IS NULL -> NOT NULL
--      transition). Extended to also call package_completion_blocking_defects()
--      and fold any hit into the same needs_review downgrade +
--      notify-generation-issue call it already does for empty characters.
--      This is the primary gate: it is what intercepts
--      api/generation-complete.js's completing UPDATE, any future direct
--      Make.com PATCH to mystery_packages, and the client-side
--      getPackageGenerationStatus() auto-correction in
--      src/services/mysteryPackageService.ts — all of them execute a plain
--      UPDATE mystery_packages, and Postgres triggers fire regardless of
--      caller (PostgREST/anon-key, service-role, or SQL Editor).
--   2. heal_completed_packages() (cron, */2 * * * *) and
--      promote_complete_packages() (called from sweep_incomplete_packages,
--      also */2 * * * *) — the RECOVERY paths that promote needs_review back
--      to completed. Investigation found BOTH bypass
--      validate_package_characters() by construction: neither touches
--      generation_completed_at (only sweep_incomplete_packages's OWN
--      needs_review-setting UPDATE does, and only on the way IN), so the
--      trigger's `OLD.generation_completed_at IS NOT NULL` early-return always
--      short-circuits it for these two functions. Without this migration, a
--      package the new gate above correctly blocked would have been silently
--      re-promoted to completed by the very next heal_completed_packages tick
--      (within 2 minutes) — neither function checks character_role validity
--      or error-body content, only NULL-ness and description length. Both are
--      extended here with the same package_completion_blocking_defects() call
--      so the recovery path can never resurrect a structurally broken package.
--
-- Shared logic lives in ONE function, package_completion_blocking_defects(),
-- so all three call sites can never drift out of sync with each other.

-- ---------------------------------------------------------------------------
-- 1. Shared defect-check function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_completion_blocking_defects(_pkg mystery_packages)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  _defects text[] := ARRAY[]::text[];
  -- Deliberately narrow: two-word HTTP-error phrases, a status code paired
  -- with its reason phrase, or literal markup markers. Never a bare word like
  -- "gateway" that could appear in legitimate mystery-party prose.
  _pattern text := '<html[\s>]|<!doctype\s+html|bad gateway|gateway[\s-]*time[\s-]*out|50[234]\s+(bad gateway|service unavailable|gateway[\s-]*time[\s-]*out)';
  _hit record;
BEGIN
  IF _pkg.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Package-level delivered content holding a raw upstream error/HTML body.
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

  -- character_role outside the known vocabulary. NULL is legitimate
  -- (character-style/random-slip games leave it unset) — only flag a non-NULL
  -- value that isn't one of the four known roles. Mirrors ADR-0048's
  -- invalid_role sub-check, but as a BLOCKING prevention check rather than a
  -- read-only detector.
  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND mc.character_role IS NOT NULL
      AND mc.character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring')
  LOOP
    _defects := _defects || ('invalid_role.' || _hit.key);
  END LOOP;

  -- ANY character column (round scripts, background, secret, pointform
  -- variants, etc.) holding a raw upstream error/HTML body. Dynamic scan via
  -- to_jsonb so a newly added column is covered automatically, without a
  -- follow-up migration to this allowlist.
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

  IF array_length(_defects, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN _defects;
END;
$fn$;

COMMENT ON FUNCTION public.package_completion_blocking_defects(mystery_packages) IS
  'Prevention-layer structural check (ADR-0049). Returns NULL if clean, or a text[] of defects if ANY character_role is set to a value outside (murderer, accomplice, suspect, redHerring), or ANY delivered field (package- or character-level) contains a raw upstream error/HTML body (502/503/504 + reason phrase, bad gateway, gateway timeout, <html, <!DOCTYPE). Called from validate_package_characters() (the pre-completion trigger) and from heal_completed_packages()/promote_complete_packages() (the recovery paths) so no path can ever mark a structurally broken package completed. Deliberately narrower than the ADR-0048 escalate-only detector (list_packages_with_structural_defects): does not attempt multiple_murderers, name_background_mismatch, or duplicated_cast, which require human judgment to resolve rather than a clear reject-and-retry invariant.';

GRANT EXECUTE ON FUNCTION public.package_completion_blocking_defects(mystery_packages) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Extend the EXISTING pre-completion trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_package_characters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _extracted jsonb;
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

  -- Count expected characters from extracted_characters
  BEGIN
    IF jsonb_typeof(NEW.extracted_characters) = 'array' THEN
      _expected_count := jsonb_array_length(NEW.extracted_characters);
    ELSIF jsonb_typeof(NEW.extracted_characters) = 'string' THEN
      _extracted := (NEW.extracted_characters #>> '{}')::jsonb;
      IF jsonb_typeof(_extracted) = 'array' THEN
        _expected_count := jsonb_array_length(_extracted);
      ELSE
        _expected_count := 0;
      END IF;
    ELSE
      _expected_count := 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _expected_count := 0;
  END;

  -- Count actual characters with content
  SELECT COUNT(*), COUNT(*) FILTER (WHERE description IS NULL OR character_role IS NULL)
  INTO _actual_count, _empty_count
  FROM mystery_characters
  WHERE package_id = NEW.id;

  -- ADR-0049: structural-integrity gate — invalid character_role enum values,
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
-- 3. Extend the RECOVERY paths so they can never resurrect a structurally
--    broken package (both bypass the trigger above by construction — see
--    header note).
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
    RETURNING mp.id
  )
  SELECT count(*) INTO healed_count FROM healed;
  RETURN healed_count;
END;
$function$;

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
