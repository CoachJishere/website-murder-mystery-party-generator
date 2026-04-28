-- Auto-heal mystery_packages whose status was flipped to 'needs_review' by the
-- sweep, but whose characters have since been recovered. Without this, the
-- customer would see the "We're Finalizing Your Mystery" warning indefinitely
-- even after auto-recovery filled in the missing fields.
--
-- Logic: a package in needs_review whose characters all have non-empty
-- description and character_role gets reset to 'completed'. Runs every 2
-- minutes alongside the sweep so the warning auto-clears within the same
-- cycle that recovery completes.

CREATE OR REPLACE FUNCTION public.heal_completed_packages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  healed_count integer;
BEGIN
  WITH healed AS (
    UPDATE mystery_packages mp
    SET generation_status = jsonb_set(
      jsonb_set(
        coalesce(mp.generation_status::jsonb, '{}'::jsonb),
        '{status}', '"completed"'::jsonb, true
      ),
      '{currentStep}', '"Package generation completed"'::jsonb, true
    )
    WHERE (mp.generation_status->>'status') = 'needs_review'
      AND EXISTS (
        SELECT 1 FROM mystery_characters mc WHERE mc.package_id = mp.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM mystery_characters mc
        WHERE mc.package_id = mp.id
          AND (
            mc.character_role IS NULL
            OR mc.description IS NULL
            OR length(coalesce(mc.description, '')) < 100
          )
      )
    RETURNING mp.id
  )
  SELECT count(*) INTO healed_count FROM healed;
  RETURN healed_count;
END;
$$;

COMMENT ON FUNCTION public.heal_completed_packages IS
  'Reverses sweep_incomplete_packages: any mystery_packages flagged needs_review whose characters have since been healed (description + character_role populated) get their status reset to completed. Returns count of healed packages.';

-- Schedule alongside the sweep at 2-min cadence
SELECT cron.schedule(
  'heal_completed_packages_2min',
  '*/2 * * * *',
  $cron$SELECT public.heal_completed_packages()$cron$
);
