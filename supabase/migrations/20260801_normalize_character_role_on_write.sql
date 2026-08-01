-- Make an invalid character_role impossible to persist as delivered content.
-- ADR-0051 layer 1 ("Structural DB constraints — make the worst classes
-- impossible to persist"), executed as ADR-0052.
--
-- INCIDENT: Velvet Viper (2026-07-30) and Coronation (2026-07-31) both stored
-- a raw 502 Bad Gateway HTML body verbatim in character_role (among other
-- fields). ADR-0049 added a pre-completion GATE that catches an invalid
-- character_role and downgrades the package to needs_review before it can
-- reach `completed` — but the gate only fires at the completion boundary. A
-- 502 body (or any other garbage) can still land in the character_role
-- COLUMN itself, sitting there as delivered content for however long the
-- package remains in generation. This migration closes that: the column can
-- no longer hold anything other than the four known roles, or NULL, full stop.
--
-- THE CRUX DECISION: REJECT (hard CHECK) vs COERCE (BEFORE trigger), traced
-- live against the actual write path before choosing:
--
--   Generation writes mystery_characters via Make.com scenario 9061052 ("MM
--   Live - Child (Unified) v19"), module `supabase:upsertARecord` (ids 404,
--   408, 412, 504, 508, 512, 516, 520 — one per character slot across both
--   routes; confirmed by walking the live blueprint backup,
--   temp-files/MM Live - Child (Unified)19-SlipGuilt-OutputHygiene-VictimQuestions.blueprint.json).
--   Every one of those modules has NO `onerror` handler configured at all
--   (the key is entirely absent from the blueprint, not even an empty
--   array — contrast with the createAMessage modules one step upstream,
--   which at least have `"onerror": []`). The scenario's own metadata sets
--   `"dlq": true` and `"maxErrors": 5` with no auto-resume directive on these
--   modules. Make's documented behavior for a module error with no error
--   handler attached is to stop the entire scenario execution at that
--   bundle and file it as an incomplete execution in the DLQ for manual
--   review/resume — it does not skip forward, and it does not gracefully
--   continue writing the remaining characters in that route.
--
--   A hard CHECK constraint on character_role — the natural first instinct,
--   and what ADR-0051's sequencing note names as the example — would turn
--   every future 5xx-body-as-role write into exactly that: an aborted,
--   DLQ-parked scenario run, mid-generation, for a real paying customer,
--   requiring manual intervention to even retry. That is a strictly worse
--   outcome than today's bug (which at least completes, just wrong) for the
--   subset of runs it would newly break, and it directly contradicts
--   ADR-0050's own precedent one migration ago on this exact table family:
--   "a data-integrity fix that takes down live paying-customer generation
--   ... is a worse outcome than a self-healing trigger that closes the
--   actual data-quality hole today."
--
--   DECISION: COERCE, via a BEFORE INSERT OR UPDATE trigger, following the
--   ADR-0050 template exactly. mystery_characters already has a normalize
--   trigger for this purpose (normalize_character_data_trigger /
--   normalize_character_data()) — extended in place rather than adding a
--   second trigger, since it already owns "clean up a Make.com write before
--   it lands" for this table (relationships/secrets shape-fixing) and
--   there's no ordering conflict to manage (no other same-table trigger
--   reads character_role before completion).
--
-- WHAT IT'S COERCED TO, AND WHY THAT STILL GETS CAUGHT: NOT to NULL.
-- package_completion_blocking_defects() (ADR-0049) explicitly treats a NULL
-- character_role as legitimate ("character-style/random-slip games leave it
-- unset") — coercing to NULL would make a scrubbed 502 body indistinguishable
-- from that legitimate case for that specific check, defeating the purpose
-- of the "must not silently let a coerced-but-invalid package reach
-- completed" requirement for anyone who later tightens that carve-out.
-- Instead: coerced to the sentinel string 'invalid_role' — a value that is
-- deliberately NOT NULL and NOT one of the four known roles, so it trips the
-- EXISTING invalid_role branch of package_completion_blocking_defects() on
-- its own terms (that function's whole design is "flag any non-NULL value
-- outside the enum"). That function is already called, unconditionally, from
-- all three completion-setting paths that matter:
--   - validate_package_characters() (the BEFORE UPDATE completion trigger,
--     ADR-0049) — sentinel trips its structural-defect fold-in.
--   - heal_completed_packages() and promote_complete_packages() (the 2-minute
--     recovery crons, ADR-0049) — both already call
--     package_completion_blocking_defects(mp) IS NULL in their WHERE clause,
--     so the sentinel blocks re-promotion the same way NULL would have via
--     their separate ad-hoc "character_role IS NULL" check, but through the
--     purpose-built mechanism instead of a coincidental one.
-- Net effect: the raw error body is never stored as delivered content (this
-- migration's actual goal), and the package is routed into the exact same
-- retry/hold flow ADR-0049 already built and verified for this failure mode —
-- no new gating logic needed, no new failure mode introduced.
--
-- DATA RECONCILIATION: 21 existing mystery_characters rows (2 packages,
-- both paid + completed 2026-04-22, already known from ADR-0049's own
-- verification pass) hold the legacy uppercase vocabulary
-- (MURDERER/GUILTY/ACCOMPLICE/INNOCENT) instead of the current
-- lowercase enum. Zero rows currently hold an HTML/502 body (verified live
-- immediately before writing this migration) — both known incidents were
-- already hand-repaired before this session, per ADR-0049. Because the fix
-- here is a trigger (fires on write), not a table-wide CHECK (validated
-- against ALL existing rows at ADD time), reconciling old data isn't
-- strictly required for the trigger to apply cleanly — but it's done anyway
-- below because it's a real, low-risk, customer-facing bug fix:
-- src/pages/CharacterAccess.tsx only shows the murderer/accomplice role
-- banner on an exact lowercase match, so these 21 rows currently render no
-- banner at all for characters whose role was already known unambiguously
-- (each package has exactly one MURDERER/GUILTY row = the culprit). Mapped
-- MURDERER/GUILTY -> murderer, ACCOMPLICE -> accomplice, INNOCENT -> suspect
-- (the column's own default, and the only safe generic mapping — no
-- redHerring information exists in the legacy vocabulary to recover).
-- Idempotent: the WHERE clause only matches rows still holding the legacy
-- uppercase values, so re-running this migration after the fix has already
-- landed is a no-op.

CREATE OR REPLACE FUNCTION public.normalize_character_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  -- Normalize relationships format if needed
  IF NEW.relationships IS NOT NULL AND jsonb_typeof(NEW.relationships) = 'array' THEN
    -- Check each relationship and transform if needed
    NEW.relationships = (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(rel) = 'object' AND (rel->>'name' IS NOT NULL OR rel->>'character' IS NOT NULL) THEN
            jsonb_build_object(
              'character', COALESCE(rel->>'name', rel->>'character'),
              'description', COALESCE(rel->>'relation', rel->>'description')
            )
          ELSE rel
        END
      )
      FROM jsonb_array_elements(NEW.relationships) rel
    );
  END IF;

  -- Normalize secrets format if needed
  IF NEW.secrets IS NOT NULL THEN
    -- Convert string to array if it's not already
    IF jsonb_typeof(NEW.secrets) = 'string' THEN
      NEW.secrets = jsonb_build_array(NEW.secrets);
    -- Handle object type
    ELSIF jsonb_typeof(NEW.secrets) = 'object' THEN
      NEW.secrets = (
        SELECT jsonb_agg(key || ': ' || value)
        FROM jsonb_each_text(NEW.secrets)
      );
    END IF;
  END IF;

  -- ADR-0052 (ADR-0051 layer 1): character_role must only ever be one of
  -- the four known values, or NULL. Coerce (never reject — see this
  -- migration's header for why REJECT was ruled out against the live
  -- Make.com write path) any other value -- e.g. a raw 502/HTML error body,
  -- or any future non-enum garbage -- to a non-NULL sentinel that isn't a
  -- valid role, so it still trips package_completion_blocking_defects()'s
  -- existing invalid_role check (ADR-0049) rather than being mistaken for
  -- the legitimate "role intentionally left unset" NULL case.
  IF NEW.character_role IS NOT NULL
     AND NEW.character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring') THEN
    NEW.character_role := 'invalid_role';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.normalize_character_data() IS
  'Normalizes mystery_characters shape on write: relationships/secrets '
  'format-fixing (original), plus ADR-0052 character_role coercion -- any '
  'non-NULL value outside (murderer, accomplice, suspect, redHerring) is '
  'replaced with the sentinel ''invalid_role'' so it cannot be stored as '
  'delivered content, and still trips the ADR-0049 pre-completion gate.';

-- Data reconciliation: legacy uppercase vocabulary on 2 known historical
-- packages (paid + completed 2026-04-22). Idempotent via the WHERE clause.
UPDATE public.mystery_characters
SET character_role = CASE upper(character_role)
    WHEN 'MURDERER' THEN 'murderer'
    WHEN 'GUILTY' THEN 'murderer'
    WHEN 'ACCOMPLICE' THEN 'accomplice'
    WHEN 'SUSPECT' THEN 'suspect'
    WHEN 'INNOCENT' THEN 'suspect'
    WHEN 'REDHERRING' THEN 'redHerring'
    WHEN 'RED HERRING' THEN 'redHerring'
    ELSE character_role
  END
WHERE character_role IS NOT NULL
  AND character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring')
  AND upper(character_role) IN (
    'MURDERER', 'GUILTY', 'ACCOMPLICE', 'SUSPECT', 'INNOCENT', 'REDHERRING', 'RED HERRING'
  );
