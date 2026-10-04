-- ADR-0103 Addendum 82 (2026-10-04): add the confession_names_cast_member class to the completion gate.
-- Built from the LIVE function text (patch-in-place), so any other change that landed outside the local
-- migration history is preserved. The class self-heals via auto-remediate-packages (delegates to
-- regenerate-child-content, deployed the same day); a package that cannot be healed stays needs_review and
-- raises the normal held-package alert.
DO $mig$
DECLARE
  d text;
  marker text := E'  IF array_length(_defects, 1) IS NULL THEN\n    RETURN NULL;\n  END IF;\n  RETURN _defects;';
  block text := E'  -- ADR-0103 Addendum 82: slip-style reveal confession naming another cast member as helper/culprit.\n  FOR _hit IN\n    SELECT unnest(coalesce(public.package_confession_names_cast_member(_pkg), ARRAY[]::text[])) AS key\n  LOOP\n    _defects := _defects || (''confession_names_cast_member.'' || _hit.key);\n  END LOOP;\n\n';
BEGIN
  d := pg_get_functiondef('public.package_completion_blocking_defects(mystery_packages)'::regprocedure);
  IF position('confession_names_cast_member' IN d) > 0 THEN
    RAISE NOTICE 'already present';
    RETURN;
  END IF;
  IF position(marker IN d) = 0 THEN
    RAISE EXCEPTION 'marker not found in package_completion_blocking_defects';
  END IF;
  d := replace(d, marker, block || marker);
  EXECUTE d;
END
$mig$;
