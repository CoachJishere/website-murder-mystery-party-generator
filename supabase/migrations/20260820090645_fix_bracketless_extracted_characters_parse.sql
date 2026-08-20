-- ADR-0095: close the bracketless-extracted_characters gap in
-- package_expected_character_count() (ADR-0094 follow-up).
--
-- ADR-0094 fixed the "package silently re-promoted to completed while
-- missing whole characters" gap by adding package_expected_character_count(),
-- which parses extracted_characters as either a JSON array or a JSON string
-- containing one. But it only handles a string that IS ALREADY a valid JSON
-- array once unquoted. Two packages purchased hours after ADR-0094 shipped
-- (The Staged Suicide Details, The Birthday Betrayal) proved a THIRD shape
-- exists in production: Make.com sometimes writes extracted_characters as a
-- bare comma-joined sequence of JSON objects with NO enclosing [ ] at all --
-- e.g. `{"name":"A",...}, {"name":"B",...}` rather than `[{"name":"A",...},
-- {"name":"B",...}]`. Casting that text straight to jsonb raises a syntax
-- error, the existing EXCEPTION block catches it, and _count falls back to 0
-- -- "unparseable" -- so the row-count guard never applies, exactly
-- reproducing the class of gap ADR-0094 was written to close, on both the
-- original validate_package_characters() trigger and the two recovery
-- functions (none of which noticed, because none of them re-derive their own
-- copy of this parser -- they all call this one shared function, which is
-- the point of ADR-0094's design and why this fix only needs to touch one
-- place).
--
-- Both incidents were paid, real customers within hours of purchase. The
-- Staged Suicide Details was missing 4 of 14 characters, including the
-- predetermined killer -- the host-facing detective_script and
-- master_context (generated from the complete original concept, unaffected
-- by this bug) still correctly named the killer, so restoring the missing
-- character rows was sufficient; no separate detective-script fix was
-- needed. The Birthday Betrayal was missing 1 of 10, referenced by name in
-- three other characters' relationships text. Both remediated manually via
-- the same CHILD_WEBHOOK notify-generation-issue's auto-recovery already
-- uses, before this migration was written.
--
-- Fix: give the string branch a second parse attempt -- wrap in [ ] --
-- before falling back to 0. Still fails open (returns 0, never blocks) if
-- both attempts fail, same posture as ADR-0094.

CREATE OR REPLACE FUNCTION public.package_expected_character_count(_pkg mystery_packages)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  _raw text;
  _extracted jsonb;
  _count int;
BEGIN
  BEGIN
    IF jsonb_typeof(_pkg.extracted_characters) = 'array' THEN
      _count := jsonb_array_length(_pkg.extracted_characters);
    ELSIF jsonb_typeof(_pkg.extracted_characters) = 'string' THEN
      _raw := _pkg.extracted_characters #>> '{}';

      -- Attempt 1: the string is already a valid JSON array once unquoted
      -- (ADR-0094's original case).
      BEGIN
        _extracted := _raw::jsonb;
      EXCEPTION WHEN OTHERS THEN
        _extracted := NULL;
      END;

      -- Attempt 2 (ADR-0095): the string is a bare comma-joined sequence of
      -- JSON objects with no enclosing [ ] at all. Wrap and retry.
      IF jsonb_typeof(_extracted) IS DISTINCT FROM 'array' THEN
        BEGIN
          _extracted := ('[' || _raw || ']')::jsonb;
        EXCEPTION WHEN OTHERS THEN
          _extracted := NULL;
        END;
      END IF;

      IF jsonb_typeof(_extracted) = 'array' THEN
        _count := jsonb_array_length(_extracted);
      ELSE
        _count := 0;
      END IF;
    ELSE
      _count := 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _count := 0;
  END;
  RETURN coalesce(_count, 0);
END;
$fn$;

COMMENT ON FUNCTION public.package_expected_character_count(mystery_packages) IS
  'Roster size implied by mystery_packages.extracted_characters (the same source validate_package_characters() has always used). Parses defensively: a real JSON array, a JSON string containing one, or (ADR-0095) a bare comma-joined sequence of JSON objects with no enclosing [ ] -- all three shapes seen in production. Returns 0 (never blocks) when unparseable or absent. Deliberately NOT conversations.player_count -- player_count is guest headcount, which the product intentionally allows to exceed character count (extra guests co-investigate rather than getting their own character, ADR-0064) -- using it here would false-positive on every such package. Called from validate_package_characters(), heal_completed_packages(), and promote_complete_packages() (ADR-0094) so the parsing logic exists exactly once.';
