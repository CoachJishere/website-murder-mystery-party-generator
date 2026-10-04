-- ADR-0138 (2026-10-04): quality review BEFORE release. A new package that passes the structural gate is held in
-- status 'reviewing' while the LLM reviewer runs and its high-precision findings are applied; only then does it
-- become 'completed' and the "your mystery is ready" email fires (that email is triggered by the transition into
-- 'completed', so holding the transition holds the email). Staged behind pipeline_settings.quality_review_release:
-- 'off' (default, current behaviour), 'test_only' (conversations.is_test only), 'on'.
--
-- Customers are never held by the reviewer: a review that fails, times out or hits a cost cap releases the package
-- anyway (the edge function does that and alerts; release_stuck_reviewing_packages() is the DB-side safety net).
-- Only first delivery is reviewed: a package whose ready email was already sent (adaptations, re-completions) passes
-- straight through.

CREATE TABLE IF NOT EXISTS public.pipeline_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_settings ENABLE ROW LEVEL SECURITY;  -- no policies: service role only

INSERT INTO public.pipeline_settings (key, value) VALUES
  ('quality_review_release', 'off'),
  ('review_auto_apply_classes', 'single_generation_slip,wrong_fact,cross_field_contradiction'),
  ('review_max_minutes', '15')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.mystery_packages
  ADD COLUMN IF NOT EXISTS quality_review_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_review_released_at timestamptz;

CREATE OR REPLACE FUNCTION public.quality_review_applies(_conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE (SELECT value FROM pipeline_settings WHERE key = 'quality_review_release')
    WHEN 'on' THEN true
    WHEN 'test_only' THEN coalesce((SELECT is_test FROM conversations WHERE id = _conversation_id), false)
    ELSE false
  END;
$function$;

-- Intercept the successful-gate branch of the completion trigger (patch-in-place on the live function text).
DO $mig$
DECLARE
  d text;
  marker text := E'  ELSE\n    NEW.generation_completed_at := now();\n  END IF;';
  repl text := E'  ELSIF NEW.quality_review_released_at IS NULL\n        AND NEW.ready_email_sent_at IS NULL\n        AND public.quality_review_applies(NEW.conversation_id) THEN\n    -- ADR-0138: hold for the quality review; the reviewer releases it (release_package_after_review).\n    NEW.generation_status := jsonb_build_object(\n      ''status'', ''reviewing'',\n      ''progress'', 98,\n      ''currentStep'', ''Quality review'',\n      ''sections'', jsonb_build_object(''hostGuide'', true, ''characters'', true, ''clues'', true)\n    );\n    NEW.quality_review_started_at := now();\n  ELSE\n    NEW.generation_completed_at := now();\n  END IF;';
BEGIN
  d := pg_get_functiondef('public.validate_package_characters()'::regprocedure);
  IF position('ADR-0138' IN d) > 0 THEN RAISE NOTICE 'already patched'; RETURN; END IF;
  IF position(marker IN d) = 0 THEN RAISE EXCEPTION 'marker not found in validate_package_characters'; END IF;
  d := replace(d, marker, repl);
  EXECUTE d;
END
$mig$;

-- Release a reviewed package. Returns the resulting status ('completed', or 'needs_review' if the gate re-held it).
CREATE OR REPLACE FUNCTION public.release_package_after_review(_package_id uuid, _reason text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _st text;
BEGIN
  SELECT generation_status->>'status' INTO _st FROM mystery_packages WHERE id = _package_id FOR UPDATE;
  IF _st IS DISTINCT FROM 'reviewing' THEN
    RETURN 'not_reviewing:' || coalesce(_st, 'null');
  END IF;
  UPDATE mystery_packages
  SET quality_review_released_at = now(),
      generation_status = jsonb_build_object(
        'status', 'completed', 'progress', 100, 'currentStep', 'Package generation completed',
        'sections', jsonb_build_object('hostGuide', true, 'characters', true, 'clues', true, 'inspectorScript', true, 'characterMatrix', true)
      )
  WHERE id = _package_id;
  INSERT INTO auto_remediation_log (package_id, defect_class, action, before_value, outcome, cost_usd)
  VALUES (_package_id, 'quality_review_release', 'release:' || left(_reason, 80), NULL, 'fixed', 0);
  SELECT generation_status->>'status' INTO _st FROM mystery_packages WHERE id = _package_id;
  RETURN _st;
END;
$function$;

-- DB-side safety net: never leave a customer waiting if the edge function is down.
CREATE OR REPLACE FUNCTION public.release_stuck_reviewing_packages()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _pkg record;
  _n integer := 0;
  _max_min integer := coalesce((SELECT value::integer FROM pipeline_settings WHERE key = 'review_max_minutes'), 15) + 5;
BEGIN
  FOR _pkg IN
    SELECT id FROM mystery_packages
    WHERE generation_status->>'status' = 'reviewing'
      AND coalesce(quality_review_started_at, updated_at) < now() - make_interval(mins => _max_min)
  LOOP
    PERFORM public.release_package_after_review(_pkg.id, 'safety_net_timeout');
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END;
$function$;

SELECT cron.schedule('release-stuck-reviewing-packages', '* * * * *', $$SELECT public.release_stuck_reviewing_packages();$$);

SELECT cron.schedule('review-release-queue', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/review-package-quality',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'release_queue'),
    timeout_milliseconds := 280000
  );
$$);
