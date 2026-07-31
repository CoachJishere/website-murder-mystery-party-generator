-- Audit log + field accessors for the closed-loop auto-remediation worker.
-- See ADR-0047.
--
-- WHY: ADR-0042 gave us detection; remediation stayed manual. The
-- `auto-remediate-packages` worker closes the loop by attempting a
-- class-specific fix for detector-flagged packages, then RE-RUNNING the
-- detector and only accepting the fix if the package now passes. Because the
-- worker mutates paid packages and spends money with nobody watching, every
-- action it takes has to be reconstructable after the fact — that is what this
-- table is for. The owner should be able to answer "what did it do to my
-- customers' packages last night, what did it cost, and can I undo it?" from
-- this table alone.
--
-- The table also carries load-bearing SAFETY state, not just history:
--   * the per-package/per-defect ATTEMPT CAP is a count over these rows, so the
--     worker can never loop on a package it cannot actually fix;
--   * the GLOBAL DAILY SPEND CAP is a sum of cost_usd over today's rows.
-- Deleting rows from this table therefore re-arms both caps. Don't prune it
-- without understanding that.

-- ---------------------------------------------------------------------------
-- 1. The audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auto_remediation_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   uuid NOT NULL REFERENCES public.mystery_packages(id) ON DELETE CASCADE,
  -- detector/defect class, e.g. 'missing_images', 'self_directed_questions',
  -- 'template_artifact', 'game_overview_victim_mismatch',
  -- 'identity_contamination', 'slip_culprit_leak'
  defect_class text NOT NULL,
  -- what the worker did, e.g. 'regenerate_images:round2,round3',
  -- 'retarget_question:mystery_characters.round3_questions',
  -- 'skip:attempt_cap', 'escalate:no_safe_autofix'
  action       text NOT NULL,
  -- the prior value of the mutated field (or a JSON map of them), so a bad
  -- fix is recoverable by hand. NULL for escalate/skip rows (nothing mutated).
  before_value text,
  outcome      text NOT NULL CHECK (outcome IN ('fixed', 'escalated', 'failed')),
  cost_usd     numeric(10,4) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auto_remediation_log IS
  'Audit trail for the auto-remediate-packages worker (ADR-0047): one row per remediation attempt. Also holds the safety state the worker reads back — the per-package/per-defect attempt cap counts rows here, and the global daily spend cap sums cost_usd here. Deleting rows re-arms both caps.';
COMMENT ON COLUMN public.auto_remediation_log.before_value IS
  'Prior value of the mutated field (JSON map when several fields changed), so an accepted-but-wrong fix can be reverted by hand. NULL when nothing was mutated (escalate/skip rows).';
COMMENT ON COLUMN public.auto_remediation_log.outcome IS
  'fixed = fix applied AND the detector re-ran clean. escalated = no safe auto-fix, cap hit, or the re-detect gate rejected the fix. failed = the fix attempt itself errored.';

-- Attempt-cap lookup: "how many times have we already tried this defect on this package?"
CREATE INDEX IF NOT EXISTS auto_remediation_log_package_class_idx
  ON public.auto_remediation_log (package_id, defect_class, created_at DESC);

-- Daily-spend-cap lookup: "how much have we spent since midnight?"
CREATE INDEX IF NOT EXISTS auto_remediation_log_created_at_idx
  ON public.auto_remediation_log (created_at DESC);

-- Owner-facing review of what ran unattended.
CREATE INDEX IF NOT EXISTS auto_remediation_log_outcome_idx
  ON public.auto_remediation_log (outcome, created_at DESC);

-- Service-role only. No policies -> no anon/authenticated access; the service
-- role bypasses RLS. This is an internal ops table, never customer-facing.
ALTER TABLE public.auto_remediation_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.auto_remediation_log TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Whitelisted field accessors
--
-- The worker's text fixes (question retarget, template-artifact strip) have to
-- read and write individual content fields, some of which are jsonb columns
-- holding a JSON *string* (evidence_cards, relationships, secrets). Reading
-- those needs `#>> '{}'` and writing them needs `to_jsonb(...)`; going through
-- PostgREST directly would either return the quoted JSON literal or silently
-- change the jsonb type.
--
-- These accessors centralise that, and — more importantly — WHITELIST the
-- fields the worker is allowed to touch. An unknown field raises rather than
-- writing anywhere unexpected: the worker cannot be talked into mutating
-- generation_status, master_context, host_access_token, or anything else
-- load-bearing, even if a future code path asks it to.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.remediation_read_field(
  _scope   text,   -- 'package' | 'character'
  _row_id  uuid,
  _field   text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v text;
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
  IF _scope = 'package' THEN
    IF _field = ANY (pkg_json) THEN
      -- jsonb holding a JSON string -> unwrap with #>> '{}'; tolerate a genuine
      -- object/array by falling back to its text form (mirrors the ADR-0016 detector).
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
$fn$;

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
      -- Only rewrite a jsonb column that already holds a JSON string. If it
      -- holds an object/array, to_jsonb(text) would change its shape — refuse
      -- and let the worker escalate instead.
      EXECUTE format('SELECT jsonb_typeof(%I) FROM public.mystery_packages WHERE id = $1', _field)
        INTO existing_type USING _row_id;
      IF existing_type IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION 'remediation_write_field: %.% is jsonb %, not a JSON string — refusing to rewrite',
          _scope, _field, coalesce(existing_type, 'null');
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
      IF existing_type IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION 'remediation_write_field: %.% is jsonb %, not a JSON string — refusing to rewrite',
          _scope, _field, coalesce(existing_type, 'null');
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

COMMENT ON FUNCTION public.remediation_read_field(text, uuid, text) IS
  'Whitelisted single-field reader for the auto-remediate-packages worker (ADR-0047). Unwraps jsonb-string columns (evidence_cards/relationships/secrets) via #>> ''{}''. Raises on any non-whitelisted field.';
COMMENT ON FUNCTION public.remediation_write_field(text, uuid, text, text) IS
  'Whitelisted single-field writer for the auto-remediate-packages worker (ADR-0047). Writes jsonb-string columns via to_jsonb(text), and refuses if the column currently holds an object/array (shape change) or if the new value is NULL. Raises on any non-whitelisted field.';

-- Worker-only. `remediation_write_field` is an arbitrary-content writer over
-- mystery_packages/mystery_characters, so who can call it matters a lot.
--
-- REVOKE ... FROM PUBLIC is NOT sufficient on its own: Supabase issues EXECUTE
-- to `anon` and `authenticated` by default for functions in the public schema,
-- and those are explicit role grants that a PUBLIC revoke does not touch.
-- Without the second revoke below, both accessors are callable unauthenticated
-- via /rest/v1/rpc/ — i.e. anyone could rewrite any package's delivered text.
-- (Caught by the Supabase security advisor during the ADR-0047 build.)
-- The service role bypasses the grant system, so the worker is unaffected.
REVOKE ALL ON FUNCTION public.remediation_read_field(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remediation_write_field(text, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remediation_read_field(text, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remediation_write_field(text, uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remediation_read_field(text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.remediation_write_field(text, uuid, text, text) TO service_role;
