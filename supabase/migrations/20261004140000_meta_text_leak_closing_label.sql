-- ADR-0103 Addendum 83 (2026-10-04): the Parent prompt's closing slot is written "[CLOSING: 1 short paragraph where the detective
-- closes the scene ...]" and the model sometimes prints that label verbatim into detective_script (4 packages in 3 months:
-- "Murder By Copy", "A Feast For The Dying", "The Masked Betrayal", "Death By Dessert"). package_meta_text_leak already matched
-- "[closing paragraph" but not "[closing:", so no detector saw it. Patched in place from the LIVE function text (so nothing that
-- landed outside the local migration history is lost); auto-remediate-packages' ARTIFACT_SPAN_RX / ARTIFACT_TOKEN_RX got the
-- paired pattern the same day (keep the two in sync by hand, see the comment above ARTIFACT_SPAN_RX).
DO $mig$
DECLARE
  d text;
  old_alt text := $a$\[closing paragraph|$a$;
  new_alt text := $a$\[closing paragraph|\[closing:|$a$;
BEGIN
  d := pg_get_functiondef('public.package_meta_text_leak(mystery_packages)'::regprocedure);
  IF position($a$\[closing:$a$ IN d) > 0 THEN
    RAISE NOTICE 'already present';
    RETURN;
  END IF;
  IF position(old_alt IN d) = 0 THEN
    RAISE EXCEPTION 'marker not found in package_meta_text_leak';
  END IF;
  d := replace(d, old_alt, new_alt);
  EXECUTE d;
END
$mig$;
