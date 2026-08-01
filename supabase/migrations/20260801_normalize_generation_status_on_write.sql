-- Recurrence guard for the generation_status double-encoding bug (ADR-0049 follow-on).
--
-- WHY: 20260801_normalize_generation_status_double_encoding.sql cleared the 24
-- existing rows where generation_status was stored as a jsonb STRING containing
-- JSON text instead of a jsonb object. That migration's own header flagged the
-- root cause as unfixed: "something in the write path ... persists
-- generation_status as a string on some runs."
--
-- ROOT CAUSE (confirmed 2026-08-01): Make.com's generic Supabase connector (app
-- "supabase", module "upsertARecord") introspects the mystery_packages table via
-- its getTableParams RPC and exposes EVERY column — including the jsonb
-- generation_status column — as a Make field of type "text". There is no
-- object/collection field type available for jsonb columns in this connector.
-- Consequently every "Upsert a Record" module in the live production scenario
-- ("MM Live - Parent v49 (Accomplice-Beat Silent-Omission) (ADR-0042 G9)",
-- Make scenario id 9106101) supplies generation_status as a hand-built, escaped
-- JSON string, e.g.:
--   "generation_status": "{\"status\": \"in_progress\", \"progress\": 20, ...}"
-- (confirmed present in ~25 module instances across all 4 parallel routes —
-- module ids 48, 178, 15300, 185, 220, 222, 217, 158, 15301, 100, 307, 310, 313,
-- 2423, 15302, 2435, 2443, 2446, 2449, 2459, 15303, 2471, 2479, 2482, 2485 — see
-- temp-files/MM Live - Parent49 (Accomplice-Beat Silent-Omission).blueprint.json).
-- Make sends that text-typed value as a JSON string in the PostgREST request
-- body; PostgREST/Postgres happily stores a string as a valid jsonb scalar,
-- which is the double-encoding.
--
-- All in-repo TypeScript/JS writers (src/services/mysteryPackageService.ts,
-- supabase/functions/mystery-webhook-trigger, api/generation-complete.js) pass
-- plain JS objects through supabase-js / fetch+JSON.stringify(body) and were
-- verified NOT to double-encode — they are unaffected by this trigger.
--
-- FIX: editing ~25 duplicated mapper fields inside a 2MB live, revenue-critical
-- Make.com blueprint (scenarios_update wholesale-replaces the blueprint, no
-- partial edit) was assessed as too high-risk to do blind in this session, and
-- the connector offers no non-text field type to switch to for jsonb columns
-- anyway (would require replacing the Supabase modules with raw HTTP modules —
-- tracked as deferred work, see vault note). Instead we normalize AT THE WRITE
-- BOUNDARY: a BEFORE INSERT OR UPDATE trigger inspects NEW.generation_status and
--   - if it's already a jsonb object, passes it through unchanged;
--   - if it's a jsonb string that decodes to a JSON object (the Make.com
--     double-encoding pattern), coerces it to that object before storage —
--     this keeps the live generation pipeline working without any Make.com
--     change;
--   - if it's a jsonb string that does NOT decode to a JSON object, or any
--     other non-object type (array, number, bool), REJECTS the write so
--     genuinely malformed data can never land silently.
--
-- Named trg_00_* so it fires (alphabetically) before the existing
-- trg_maintain_needs_review_at trigger, which reads generation_status->>'status'
-- and must see the normalized object, not the raw string.

CREATE OR REPLACE FUNCTION public.normalize_generation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  decoded jsonb;
BEGIN
  IF NEW.generation_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.generation_status) = 'object' THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.generation_status) = 'string' THEN
    BEGIN
      decoded := (NEW.generation_status #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION
        'generation_status was written as a non-JSON string (parse error: %): %',
        SQLERRM, NEW.generation_status;
    END;

    IF jsonb_typeof(decoded) <> 'object' THEN
      RAISE EXCEPTION
        'generation_status string does not decode to a jsonb object (decoded type: %): %',
        jsonb_typeof(decoded), NEW.generation_status;
    END IF;

    -- Self-heal the known Make.com double-encoding pattern.
    NEW.generation_status := decoded;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'generation_status must be a jsonb object, got %: %',
    jsonb_typeof(NEW.generation_status), NEW.generation_status;
END;
$$;

COMMENT ON FUNCTION public.normalize_generation_status() IS
  'Recurrence guard for the 2026-08-01 generation_status double-encoding bug. '
  'Coerces a jsonb-string-of-JSON-object into a proper object (Make.com '
  'upsertARecord writes generation_status as text — see migration header); '
  'rejects anything else that is not already a jsonb object.';

DROP TRIGGER IF EXISTS trg_00_normalize_generation_status ON public.mystery_packages;

CREATE TRIGGER trg_00_normalize_generation_status
  BEFORE INSERT OR UPDATE ON public.mystery_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_generation_status();
