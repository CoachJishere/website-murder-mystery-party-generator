-- ADR-0103 Addendum 96: the slip_partner_named heal also rewrites the point-form twin of `accusations`. The two remediation_*_field functions keep
-- an allowlist of character columns; `accusations_pointform` was not on it (dry run of the new class on "Murder At Montero Manor" failed with
-- "accusations_pointform is not a remediable character field"). Live bodies diffed first (pg_get_functiondef 2026-10-14); the ONLY change is the
-- one extra entry in chr_text of each function.

CREATE OR REPLACE FUNCTION public.remediation_read_field(_scope text, _row_id uuid, _field text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v text;
  pkg_text  text[] := ARRAY['game_overview','detective_script','host_guide','timeline',
                            'hosting_tips','preparation_instructions','materials'];
  pkg_json  text[] := ARRAY['evidence_cards'];
  chr_text  text[] := ARRAY['introduction','rumors','background','secret','accusations','accusations_pointform','description',
                            'round2_script','round3_script','round4_script','final_statement',
                            'round2_questions','round3_questions','round4_questions',
                            'round2_innocent','round2_guilty','round2_accomplice',
                            'round3_innocent','round3_guilty','round3_accomplice',
                            'round4_innocent','round4_guilty','round4_accomplice',
                            'final_innocent','final_guilty','final_accomplice',
                            'reveal_confession_guilty','reveal_confession_accomplice'];
  chr_json  text[] := ARRAY['relationships','secrets'];
BEGIN
  IF _scope = 'package' THEN
    IF _field = ANY (pkg_json) THEN
      EXECUTE format(
        'SELECT CASE WHEN jsonb_typeof(%1$I) = ''string'' THEN %1$I #>> ''{}'' ELSE %1$I::text END
           FROM public.mystery_packages WHERE id = $1', _field)
        INTO v USING _row_id;
    ELSIF _field = ANY (pkg_text) THEN
      EXECUTE format('SELECT %I FROM public.mystery_packages WHERE id = $1', _field)
        INTO v USING _row_id;
    ELSE
      RAISE EXCEPTION 'remediation_read_field: % is not a remediable package field', _field;
    END IF;

  ELSIF _scope = 'character' THEN
    IF _field = ANY (chr_json) THEN
      EXECUTE format(
        'SELECT CASE WHEN jsonb_typeof(%1$I) = ''string'' THEN %1$I #>> ''{}'' ELSE %1$I::text END
           FROM public.mystery_characters WHERE id = $1', _field)
        INTO v USING _row_id;
    ELSIF _field = ANY (chr_text) THEN
      EXECUTE format('SELECT %I FROM public.mystery_characters WHERE id = $1', _field)
        INTO v USING _row_id;
    ELSE
      RAISE EXCEPTION 'remediation_read_field: % is not a remediable character field', _field;
    END IF;

  ELSE
    RAISE EXCEPTION 'remediation_read_field: unknown scope %', _scope;
  END IF;

  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remediation_write_field(_scope text, _row_id uuid, _field text, _value text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  existing_type text;
  pkg_text  text[] := ARRAY['game_overview','detective_script','host_guide','timeline',
                            'hosting_tips','preparation_instructions','materials'];
  pkg_json  text[] := ARRAY['evidence_cards'];
  chr_text  text[] := ARRAY['introduction','rumors','background','secret','accusations','accusations_pointform','description',
                            'round2_script','round3_script','round4_script','final_statement',
                            'round2_questions','round3_questions','round4_questions',
                            'round2_innocent','round2_guilty','round2_accomplice',
                            'round3_innocent','round3_guilty','round3_accomplice',
                            'round4_innocent','round4_guilty','round4_accomplice',
                            'final_innocent','final_guilty','final_accomplice',
                            'reveal_confession_guilty','reveal_confession_accomplice'];
  chr_json  text[] := ARRAY['relationships','secrets'];
BEGIN
  IF _value IS NULL THEN
    RAISE EXCEPTION 'remediation_write_field: refusing to null out %.%', _scope, _field;
  END IF;

  IF _scope = 'package' THEN
    IF _field = ANY (pkg_json) THEN
      EXECUTE format('SELECT jsonb_typeof(%I) FROM public.mystery_packages WHERE id = $1', _field)
        INTO existing_type USING _row_id;
      IF existing_type IS NOT NULL AND existing_type != 'string' THEN
        RAISE EXCEPTION 'remediation_write_field: %.% is jsonb %, not a JSON string — refusing to rewrite',
          _scope, _field, existing_type;
      END IF;
      EXECUTE format('UPDATE public.mystery_packages SET %I = to_jsonb($2::text), updated_at = now() WHERE id = $1', _field)
        USING _row_id, _value;
    ELSIF _field = ANY (pkg_text) THEN
      EXECUTE format('UPDATE public.mystery_packages SET %I = $2, updated_at = now() WHERE id = $1', _field)
        USING _row_id, _value;
    ELSE
      RAISE EXCEPTION 'remediation_write_field: % is not a remediable package field', _field;
    END IF;

  ELSIF _scope = 'character' THEN
    IF _field = ANY (chr_json) THEN
      EXECUTE format('SELECT jsonb_typeof(%I) FROM public.mystery_characters WHERE id = $1', _field)
        INTO existing_type USING _row_id;
      IF existing_type IS NOT NULL AND existing_type != 'string' THEN
        RAISE EXCEPTION 'remediation_write_field: %.% is jsonb %, not a JSON string — refusing to rewrite',
          _scope, _field, existing_type;
      END IF;
      EXECUTE format('UPDATE public.mystery_characters SET %I = to_jsonb($2::text), updated_at = now() WHERE id = $1', _field)
        USING _row_id, _value;
    ELSIF _field = ANY (chr_text) THEN
      EXECUTE format('UPDATE public.mystery_characters SET %I = $2, updated_at = now() WHERE id = $1', _field)
        USING _row_id, _value;
    ELSE
      RAISE EXCEPTION 'remediation_write_field: % is not a remediable character field', _field;
    END IF;

  ELSE
    RAISE EXCEPTION 'remediation_write_field: unknown scope %', _scope;
  END IF;
END;
$function$;
