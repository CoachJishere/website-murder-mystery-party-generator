-- ADR-0108: validate_package_characters() must re-fire on every transition
-- into 'completed', not just the first generation_completed_at NULL -> NOT
-- NULL write.
--
-- Traced why Jaclyn's 30-player package ("Operation: Thirty & Murdery",
-- b8428a57-1c2b-4bf1-881c-98c8436be6a9) shipped generation_status='completed'
-- (firing the ready email) while genuinely missing one full character row.
-- ADR-0094/0095's row-count guard (package_expected_character_count()) was
-- tested directly against this package's live data and is correct -- it
-- returns 30. Neither of the two functions ADR-0094 guarded
-- (heal_completed_packages(), promote_complete_packages(), both pg_cron
-- every 2 minutes) performed the actual completion write -- confirmed via
-- cron.job_run_details, neither ran within minutes of the package's real
-- completion timestamp (generation_completed_at = 13:09:19.865,
-- ready_email_sent_at = 13:09:19.909, 44ms apart). No edge function in this
-- repo writes generation_status to 'completed' either (grepped).
--
-- Conclusion: a fourth write path -- almost certainly Make.com's Child
-- scenario blueprint writing "batch finished" directly once the recovery
-- webhooks notify-generation-issue dispatched (13:05:32-33) completed --
-- set generation_status='completed' a second time, bypassing every guard.
-- This trigger's old firing condition (OLD.generation_completed_at IS NOT
-- NULL OR NEW.generation_completed_at IS NULL -> skip) is a ONE-SHOT gate:
-- once generation_completed_at is set the first time (during the original,
-- correctly-blocked completion attempt), the trigger permanently no-ops for
-- that package regardless of how many more times generation_status gets
-- written to 'completed' afterward, by anything.
--
-- ADR-0094's own Discussion explicitly considered broadening this trigger
-- and rejected it, calling the risk "a hypothetical future third path" not
-- worth the wider blast radius at the time. This incident is that path
-- turning out to be real four days after ADR-0094 shipped.
--
-- Fix: change the firing condition to re-validate on ANY transition of
-- generation_status->>'status' into 'completed', from any source, instead
-- of tying it to generation_completed_at's one-shot write. Same guard logic
-- already inside the function (package_expected_character_count() +
-- package_completion_blocking_defects()) -- only the entry condition
-- changes. Closes the gap regardless of which external system performs the
-- write, without requiring a Make.com blueprint audit or import.
--
-- See docs/adr/0108-completion-gate-must-revalidate-every-write.md.

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
