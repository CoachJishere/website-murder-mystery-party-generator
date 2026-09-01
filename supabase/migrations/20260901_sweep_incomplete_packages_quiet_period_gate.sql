-- ADR-0103 Addendum 12/13: sweep_incomplete_packages() (cron every 2 minutes,
-- job "sweep_incomplete_packages_2min") can catch a package while Make.com's
-- child webhook is still actively writing mystery_characters rows -- the
-- child scenario writes generation_status='completed' (or sets
-- generation_completed_at) as an early/interim signal before every
-- character's content has actually landed.
--
-- Confirmed live on "Elementary, My Dear Cadaver"
-- (98857ef0-71d5-48a1-8c04-09be5092169c): 6 characters were flagged empty
-- and had recovery-regeneration webhooks dispatched via notify-generation-
-- issue at 20:38:03 -- a full 2 minutes before generation_completed_at
-- (20:40:11). All 6 turned out fully populated once generation actually
-- finished naturally seconds later; the recovery dispatches were pure
-- noise (and real spend -- $0.15/character logged, an actual regeneration
-- webhook re-fire, not a no-op). A corpus check across the prior 14 days
-- found the identical pre-completion timing gap (~1:40-3:47) on 9+ other
-- packages -- a recurring pattern, not a one-off.
--
-- Fix: require a quiet period before treating a package as stuck -- skip
-- it if any of its mystery_characters rows has been written to within the
-- last 3 minutes (comfortably covers the observed gap range). Mirrors the
-- RECENT_ATTEMPT_GRACE_MS pattern already used in notify-generation-issue
-- (ADR-0103 Addendum 9/ADR-0111): "still being actively written" is
-- treated as still-in-progress, not stuck. Nothing is permanently missed --
-- a genuinely stuck/crashed package goes quiet and gets caught on a later
-- 2-minute pass once the grace elapses.

CREATE OR REPLACE FUNCTION public.sweep_incomplete_packages()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _pkg record;
  _empty_count int;
  _actual_count int;
  _missing_fields text[];
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
BEGIN
  -- Flag packages claiming completion but missing content. Catches both:
  --   (a) successful runs with empty character data (original behavior)
  --   (b) crashed runs where generation_status got marked 'completed' (e.g.
  --       by the verification flow) without generation_completed_at being
  --       set -- happens when the parent's final upsert crashes mid-run.
  --       Today's Imagen R4 JSON-escape crash hit this exact path.
  FOR _pkg IN
    SELECT mp.id, mp.conversation_id, mp.detective_script, mp.evidence_cards, mp.evidence_card_images
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE c.is_paid = true
      AND COALESCE(mp.generation_started_at, mp.created_at) > NOW() - INTERVAL '24 hours'
      AND (mp.generation_status->>'status' = 'completed' OR mp.generation_completed_at IS NOT NULL)
      AND (mp.generation_status IS NULL OR mp.generation_status->>'status' NOT IN ('needs_review'))
      -- Quiet-period gate: don't flag a package while its characters are
      -- still actively being written by the generation pipeline.
      AND NOT EXISTS (
        SELECT 1 FROM mystery_characters mc2
        WHERE mc2.package_id = mp.id
          AND mc2.updated_at > NOW() - INTERVAL '3 minutes'
      )
      AND (
        mp.detective_script IS NULL OR length(mp.detective_script) < 100
        OR mp.evidence_cards IS NULL OR length(mp.evidence_cards::text) < 100
        OR mp.evidence_card_images IS NULL
        OR EXISTS (
          SELECT 1 FROM mystery_characters mc
          WHERE mc.package_id = mp.id
            AND (mc.description IS NULL OR mc.character_role IS NULL)
        )
      )
  LOOP
    SELECT COUNT(*), COUNT(*) FILTER (WHERE description IS NULL OR character_role IS NULL)
    INTO _actual_count, _empty_count
    FROM mystery_characters
    WHERE package_id = _pkg.id;

    _missing_fields := ARRAY[]::text[];
    IF _pkg.detective_script IS NULL OR length(_pkg.detective_script) < 100 THEN
      _missing_fields := _missing_fields || 'detective_script';
    END IF;
    IF _pkg.evidence_cards IS NULL OR length(_pkg.evidence_cards::text) < 100 THEN
      _missing_fields := _missing_fields || 'evidence_cards';
    END IF;
    IF _pkg.evidence_card_images IS NULL THEN
      _missing_fields := _missing_fields || 'evidence_card_images';
    END IF;
    IF _empty_count > 0 THEN
      _missing_fields := _missing_fields || ('characters(' || _empty_count || ' empty)');
    END IF;

    UPDATE mystery_packages
    SET generation_status = jsonb_build_object(
      'status', 'needs_review',
      'progress', 100,
      'currentStep', 'Generation incomplete — missing: ' || array_to_string(_missing_fields, ', '),
      'sections', jsonb_build_object(
        'hostGuide', true,
        'characters', _empty_count = 0,
        'clues', NOT (_pkg.evidence_cards IS NULL OR length(_pkg.evidence_cards::text) < 100)
      ),
      'emptyCharacters', _empty_count,
      'actualCharacters', _actual_count,
      'missingFields', to_jsonb(_missing_fields)
    )
    WHERE id = _pkg.id;

    PERFORM net.http_post(
      url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/notify-generation-issue',
      body := jsonb_build_object('conversation_id', _pkg.conversation_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key,
        'apikey', _anon_key
      )
    );

    RAISE LOG 'Sweep flagged package %: missing %', _pkg.id, _missing_fields;
  END LOOP;

  PERFORM public.promote_complete_packages();
END;
$function$;
