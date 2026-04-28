-- Tracks how long a package has been stuck in `needs_review`. Used by the UI
-- to suppress the customer-facing warning during the auto-recovery window
-- (~10 min) — the customer never sees a warning for issues that self-heal.
--
-- A trigger on mystery_packages keeps the column in sync so we don't need to
-- modify the sweep or heal functions:
--   - If status flips TO 'needs_review' and the column is NULL → stamp now()
--   - If status flips AWAY from 'needs_review' → clear column to NULL
--   - If status stays needs_review → leave column alone (preserves original timestamp)

ALTER TABLE mystery_packages
  ADD COLUMN IF NOT EXISTS needs_review_at timestamptz;

COMMENT ON COLUMN mystery_packages.needs_review_at IS
  'Timestamp when the current needs_review state began. Cleared automatically when status flips away. Used by the UI to gate the customer-facing warning during the auto-recovery window.';

CREATE OR REPLACE FUNCTION public._maintain_needs_review_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_status text;
  new_status text;
BEGIN
  old_status := OLD.generation_status->>'status';
  new_status := NEW.generation_status->>'status';

  -- Just entered needs_review: stamp now (only if not already stamped)
  IF new_status = 'needs_review' AND old_status IS DISTINCT FROM 'needs_review' THEN
    NEW.needs_review_at := now();
  -- Left needs_review: clear the timestamp
  ELSIF old_status = 'needs_review' AND new_status IS DISTINCT FROM 'needs_review' THEN
    NEW.needs_review_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintain_needs_review_at ON mystery_packages;
CREATE TRIGGER trg_maintain_needs_review_at
  BEFORE UPDATE ON mystery_packages
  FOR EACH ROW
  WHEN (OLD.generation_status IS DISTINCT FROM NEW.generation_status)
  EXECUTE FUNCTION public._maintain_needs_review_at();

-- Backfill: any package currently in needs_review with no timestamp gets one
-- as of "now" (we don't know the actual original time, but this is the most
-- conservative — they'll be assumed-just-flagged and get the silent recovery
-- window instead of the warning).
UPDATE mystery_packages
SET needs_review_at = now()
WHERE generation_status->>'status' = 'needs_review'
  AND needs_review_at IS NULL;
