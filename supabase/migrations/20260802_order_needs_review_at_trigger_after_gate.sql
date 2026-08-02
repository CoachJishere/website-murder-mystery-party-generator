-- ADR-0058: `needs_review_at` was never set when the completion gate held a package.
--
-- Postgres fires BEFORE ROW triggers in NAME order. On mystery_packages that gave:
--   trg_00_normalize_generation_status   (deliberate `00_` prefix — runs first)
--   trg_maintain_needs_review_at         <-- ran BEFORE the gate ('m' < 'v')
--   trg_validate_package_characters      <-- the gate, sets status = 'needs_review'
--
-- So when the timestamp trigger evaluated NEW.generation_status it still saw the
-- caller's value ('completed'), not 'needs_review' — the gate had not run yet. The
-- timestamp was therefore never written on the gate path.
--
-- Consequence: MysteryView computes `ageMs = ts ? Date.now() - ts : Infinity`, so a
-- NULL timestamp reads as infinitely stale and the amber "we're finalizing" banner
-- rendered IMMEDIATELY instead of after the intended ~10-minute silent-recovery
-- window — defeating the exact UX softening the window exists for.
--
-- Fix: rename so it sorts AFTER the gate, using the same explicit-ordering-by-prefix
-- idiom the table already uses for trg_00_normalize_generation_status. The function
-- body is unchanged; only firing order moves.
--
-- The WHEN clause is preserved. For BEFORE ROW triggers Postgres evaluates WHEN
-- immediately before the function would run, against NEW as modified by earlier
-- BEFORE triggers — so at its new position it sees the gate's 'needs_review' and
-- still short-circuits no-op status writes.
--
-- Verified on disposable rows 2026-08-02: before the rename a completing UPDATE that
-- the gate held left needs_review_at NULL; after, it is set. The clear path
-- (needs_review -> completed nulls the timestamp) was re-checked and is unaffected.

DROP TRIGGER IF EXISTS trg_maintain_needs_review_at ON public.mystery_packages;

CREATE TRIGGER trg_zz_maintain_needs_review_at
  BEFORE UPDATE ON public.mystery_packages
  FOR EACH ROW
  WHEN (old.generation_status IS DISTINCT FROM new.generation_status)
  EXECUTE FUNCTION _maintain_needs_review_at();
