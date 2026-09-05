-- has_accomplice suffers the same class of staleness as player_count (see
-- mystery-webhook-trigger's "Auto-sync player_count" block and ADR-0069
-- Addendum 1/2, 2026-09-05): it's a value set once from the customer's
-- opening form/chat state and never refreshed, but customers routinely
-- decide "let's have an accomplice" (or drop one) purely through freeform
-- chat, which nothing currently writes back to conversations.has_accomplice.
--
-- Confirmed live: "The Oath And The Poisoned Cup" (a3c58f9a-368e-4fca-ab32-
-- 3b87e37925bd) — customer typed "Accomplice is a Dane sworn by coercion" in
-- chat, master_context correctly built a single accompliceSelection, and
-- mystery_characters correctly has one character_role='accomplice' row — but
-- conversations.has_accomplice stayed false the entire time. Unlike
-- player_count, whether an accomplice exists isn't reliably extractable from
-- the chat text alone (it's a narrative/plot decision the Make.com parent
-- scenario makes when writing master_context, not a count) — so this can't
-- be synced pre-generation the way player_count is. It CAN be synced the
-- moment the real answer becomes knowable: when the package's characters
-- exist and generation transitions to 'completed', same trigger point
-- validate_package_characters() already fires at (ADR-0108).
--
-- Piggybacks on that existing trigger rather than adding a new one: it
-- already resolves _conversation_id and already queries mystery_characters
-- for this package on every completion transition, so this is one more
-- cheap, unconditional, best-effort correction alongside the existing
-- character-count/structural-defect checks — data hygiene, not a gate, so it
-- runs regardless of whether the package is flagged needs_review below.

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

  -- has_accomplice sync: the ground truth is whichever role Make.com actually
  -- assigned, not the stale form/chat-opener value. Best-effort, unconditional
  -- (data hygiene, not a completion gate) -- correct it regardless of whether
  -- this package ends up flagged needs_review below.
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
