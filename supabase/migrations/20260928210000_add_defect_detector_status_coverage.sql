-- ADR-0131 item 3: predicate-agreement check.
--
-- ADR-0055 widened every list_packages_with_* detector's status filter from
-- `= 'completed'` to `IN ('completed', 'needs_review')`, specifically so the
-- auto-remediation worker and health-check could still see (and fix) a
-- package the completion gate had just held in needs_review -- without
-- this, a held package is invisible to the very systems meant to repair it,
-- the exact deadlock ADR-0055 fixed. ADR-0072's migration (a month later)
-- silently reverted this for all eight detectors that existed at the time,
-- by hand-rewriting them from a stale pre-widening snapshot -- caught only
-- by a routine sweep, a month after it regressed. Nothing before this
-- migration asserted the two states stay in agreement.
--
-- This function exposes each detector's actual live status-predicate
-- coverage so a script (scripts/detect-status-predicate-drift.mjs) can
-- diff it against a reviewed allowlist of the functions that legitimately
-- don't include needs_review, and flag anything else -- the general shape
-- of check that would have caught ADR-0072's regression on its next run,
-- not a month later.
CREATE OR REPLACE FUNCTION public.list_defect_detector_status_coverage()
RETURNS TABLE(function_name text, mentions_completed boolean, mentions_needs_review boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p.proname::text,
    pg_get_functiondef(p.oid) ~* '''completed''',
    pg_get_functiondef(p.oid) ~* '''needs_review'''
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      p.proname LIKE 'list_packages_with_%'
      OR p.proname IN ('list_completed_but_empty_packages', 'list_packages_missing_evidence_images')
    )
  ORDER BY p.proname;
$function$;

COMMENT ON FUNCTION public.list_defect_detector_status_coverage() IS
$doc$ADR-0131 item 3: structural ground truth for whether each list_packages_with_*/list_completed_but_empty_packages/list_packages_missing_evidence_images function's own live SQL mentions the 'completed' and 'needs_review' status literals. Consumed by scripts/detect-status-predicate-drift.mjs (health-check check 17), which diffs this against a reviewed allowlist of the functions that legitimately don't include needs_review, to catch a silent revert of ADR-0055's widening (exactly what happened, undetected for a month, per ADR-0072's own addendum) sooner than the next routine sweep.$doc$;

-- Lock down anon/authenticated EXECUTE, matching the ADR-0032 Addendum
-- convention already applied to the 18 pre-existing detector RPCs earlier
-- today -- Postgres grants EXECUTE to PUBLIC by default on a new function,
-- and this RPC's only real callers are health-check.yml and the script
-- above, both using the service_role key.
REVOKE EXECUTE ON FUNCTION public.list_defect_detector_status_coverage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_defect_detector_status_coverage() TO service_role;
