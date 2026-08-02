-- ADR-0054: widen the detector RPCs' status filter to include 'needs_review'.
--
-- ADR-0053 added five content-quality defect classes to the completion gate
-- (validate_package_characters), which sets generation_status.status = 'needs_review'.
-- It justified doing so for `self_directed_question` on the grounds that the class
-- "is fixed post-completion by the live ADR-0047 worker" and therefore would not
-- strand packages in needs_review.
--
-- That reasoning was wrong as shipped. Every list_packages_* detector RPC — the way
-- the ADR-0047 worker finds work — filtered on status = 'completed'. So the gate's own
-- action (setting needs_review) made the package invisible to the worker meant to heal
-- it. A package held by the gate could never be remediated, and since nothing else
-- clears the flag, MysteryView's stale-needs-review banner (>10 min old) became permanent.
--
-- Found 2026-08-02 on package 33671764-71f9-488a-bed7-9afc712b0051 ("The Case Of The
-- Stolen Golden Flamingo", paid): package_completion_blocking_defects() returned
-- two self_directed_question defects while list_packages_with_self_directed_questions()
-- returned zero rows.
--
-- Fix: widen the status predicate on all 8 detector RPCs. The rest of the chain already
-- works — heal_completed_packages() (pg_cron, every 2 min) re-checks
-- package_completion_blocking_defects() and flips needs_review -> completed once clean.
--
-- Rewrites are applied programmatically from pg_get_functiondef so each function body is
-- preserved byte-for-byte apart from the status predicate. The count assertion makes the
-- migration fail loudly rather than silently under-applying if a body is reworded later.

DO $migration$
DECLARE
  _fn record;
  _new_def text;
  _changed int := 0;
BEGIN
  FOR _fn IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'list_packages_%'
  LOOP
    _new_def := replace(
      replace(_fn.def,
        '(mp.generation_status->>''status'') = ''completed''',
        '(mp.generation_status->>''status'') IN (''completed'', ''needs_review'')'),
      ') IN (''completed'', ''complete'')',
      ') IN (''completed'', ''complete'', ''needs_review'')'
    );

    IF _new_def <> _fn.def THEN
      EXECUTE _new_def;
      _changed := _changed + 1;
      RAISE LOG 'widened status filter on %', _fn.proname;
    END IF;
  END LOOP;

  IF _changed <> 8 THEN
    RAISE EXCEPTION 'expected to rewrite 8 detector RPCs, rewrote %', _changed;
  END IF;
END
$migration$;
