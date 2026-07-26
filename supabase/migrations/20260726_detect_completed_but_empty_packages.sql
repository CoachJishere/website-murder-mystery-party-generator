-- Detector: packages marked "completed" (or has_complete_package) that shipped
-- with ZERO character rows — a delivered mystery with no cast.
--
-- WHY (incident 2026-07-26): "Victorian mansion - 32 Players" (conversation
-- e49805d9-57f2-4469-89cc-325ce0490ff7, paid customer) was triggered before the
-- chat concept was finished — no victim, event, or character roster. The parent
-- scenario flagged master_context Part 1 as "incomplete_context" but the pipeline
-- proceeded anyway, produced placeholder-only content ("Character A"–"E"),
-- extracted 0 characters, and marked the package generation_status=completed /
-- progress 100. Every one of health-check checks 1–9 missed it: check 2 only sees
-- generations stuck *in_progress*, and a completed package with a populated
-- game_overview looked healthy. It was caught only because Jonathan happened to
-- see the notify-issue alert seconds after purchase — exactly the failure mode
-- that would sit silent for days/weeks otherwise (ADR-0043).
--
-- This is the detection backstop behind the ADR-0043 completion invariant (which
-- stops future 0-character packages being marked completed) and the entry gate
-- (which stops generation firing without a concept). It also flags any pre-fix
-- rows already stuck in this state, including the incident package itself.
--
-- Read-only, no status mutation, _since default — same pattern as
-- list_packages_missing_evidence_images (ADR-0016) and
-- list_packages_with_identity_conflicts (ADR-0041).

CREATE OR REPLACE FUNCTION public.list_completed_but_empty_packages(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  status text,
  has_complete_package boolean,
  character_count bigint,
  reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    mp.id AS package_id,
    mp.conversation_id,
    c.title,
    c.is_paid,
    mp.created_at,
    (mp.generation_status->>'status') AS status,
    c.has_complete_package,
    (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id) AS character_count,
    CASE
      WHEN (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id) = 0
        THEN 'completed_but_no_characters'
      ELSE 'completed_but_no_overview'
    END AS reason
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE mp.created_at >= _since
    -- Any signal the package is being treated as done for the customer
    AND (
      (mp.generation_status->>'status') = 'completed'
      OR c.has_complete_package = true
    )
    -- ...but it is missing something a real delivered package must have:
    AND (
      -- zero character rows (the incident signature), or
      (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id) = 0
      -- has characters but no overview text at all (hollow shell)
      OR mp.game_overview IS NULL
      OR length(btrim(mp.game_overview)) = 0
    )
  ORDER BY mp.created_at DESC
$$;

COMMENT ON FUNCTION public.list_completed_but_empty_packages(timestamptz) IS
  'ADR-0043 detector: packages marked completed/has_complete_package but missing a real cast (0 mystery_characters rows) or an empty game_overview. Read-only backstop for the completion invariant + concept-completeness entry gate. Wired into health-check.yml.';

GRANT EXECUTE ON FUNCTION public.list_completed_but_empty_packages(timestamptz) TO service_role;
