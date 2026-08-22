-- Fix: remediation_write_field refused to write a jsonb column (relationships,
-- secrets, evidence_cards) whose current value is a true SQL NULL — i.e. a
-- field that was never generated at all, not one holding a conflicting shape.
--
-- Found live 2026-08-22 while backfilling two completely empty characters
-- (Data/Diana Schmidt, Scale/Sara Vogel — The Dark Side Of DevOps package,
-- ADR-0098 Addendum 6) via regenerate-child-content: the "identity" call
-- group generated all 4 of its fields successfully, but the character-scope
-- write for `relationships` failed with "character.relationships is jsonb
-- null, not a JSON string — refusing to rewrite", and the accept-or-revert
-- gate correctly rolled back all 17 already-generated fields as a result
-- (safe behavior, but ~$0.09 of real Anthropic spend produced nothing).
--
-- Root cause: `jsonb_typeof(some_null_column)` returns SQL NULL, not the JSON
-- string literal 'null' — Postgres has no way to distinguish "this jsonb
-- column has never been set" from "this jsonb column holds the JSON value
-- null" via jsonb_typeof alone; both return NULL. The guard's own comment and
-- COMMENT ON FUNCTION text make clear its actual intent was narrower: refuse
-- only when the column already holds a conflicting shape (an object or
-- array), where to_jsonb(text) would silently corrupt it. `existing_type IS
-- DISTINCT FROM 'string'` is TRUE for both "genuinely never populated" and
-- "holds an object/array" — conflating a safe case with the risky one it was
-- actually meant to catch.
--
-- Fix: only refuse when existing_type is a REAL, non-null JSON type that
-- isn't 'string' (object/array/number/boolean/the JSON null literal). A
-- column that was never set (existing_type IS NULL) is always safe to write
-- fresh — there's no existing shape to corrupt.
CREATE OR REPLACE FUNCTION public.remediation_write_field(
  _scope   text,   -- 'package' | 'character'
  _row_id  uuid,
  _field   text,
  _value   text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  existing_type text;
  pkg_text  text[] := ARRAY['game_overview','detective_script','host_guide','timeline',
                            'hosting_tips','preparation_instructions','materials'];
  pkg_json  text[] := ARRAY['evidence_cards'];
  chr_text  text[] := ARRAY['introduction','rumors','background','secret','accusations','description',
                            'round2_script','round3_script','round4_script','final_statement',
                            'round2_questions','round3_questions','round4_questions',
                            'round2_innocent','round2_guilty','round2_accomplice',
                            'round3_innocent','round3_guilty','round3_accomplice',
                            'round4_innocent','round4_guilty','round4_accomplice',
                            'final_innocent','final_guilty','final_accomplice'];
  chr_json  text[] := ARRAY['relationships','secrets'];
BEGIN
  IF _value IS NULL THEN
    RAISE EXCEPTION 'remediation_write_field: refusing to null out %.%', _scope, _field;
  END IF;

  IF _scope = 'package' THEN
    IF _field = ANY (pkg_json) THEN
      -- Refuse only if the column already holds a conflicting shape (object/
      -- array/etc). A never-set column (existing_type IS NULL) or one that's
      -- already a JSON string is safe to write.
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
$fn$;

COMMENT ON FUNCTION public.remediation_write_field(text, uuid, text, text) IS
  'Whitelisted single-field writer for the auto-remediate-packages worker (ADR-0047). Writes jsonb-string columns via to_jsonb(text); refuses only if the column currently holds a conflicting shape (object/array) or if the new value is NULL. A column that was never set (NULL) is always writable. Fixed 2026-08-22 (ADR-0098 Addendum 6) — previously also refused a never-set NULL column, indistinguishable from a conflicting shape via jsonb_typeof alone. Raises on any non-whitelisted field.';

REVOKE ALL ON FUNCTION public.remediation_write_field(text, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remediation_write_field(text, uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remediation_write_field(text, uuid, text, text) TO service_role;
