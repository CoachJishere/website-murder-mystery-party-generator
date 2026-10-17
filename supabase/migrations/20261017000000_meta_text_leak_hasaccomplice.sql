-- ADR-0103 Addendum 106 (2026-10-17): "The Enthusiasts: A Deadly Club Deck Launch Evening" (slip, 12 players, accomplice)
-- shipped a detective script with the line "[If hasAccomplice is true, insert here:]" right before the accomplice
-- beat. The Parent prompt's conditional ("[ACCOMPLICE BEAT - conditional ... Never output this instruction itself]")
-- is caught by `accomplice beat\M`, but this shortened variant names the internal flag instead. The detective script
-- is read aloud or recorded as audio, so a leaked variable name is a high-severity defect, and "hasAccomplice" can
-- never appear in guest-facing text. Corpus check before applying: 0 packages and 0 characters contained it once the
-- one live hit was repaired.
--
-- Patches the live package_meta_text_leak definition in place (adds `\mhasAccomplice\M` to the marker regex) instead
-- of restating the whole function, so any other change that landed outside the local migration history is kept.
DO $patch$
DECLARE
  d text;
  patched text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d
  FROM pg_proc p
  WHERE p.proname = 'package_meta_text_leak' AND p.pronamespace = 'public'::regnamespace;

  IF d IS NULL THEN
    RAISE EXCEPTION 'package_meta_text_leak not found';
  END IF;

  IF d ~* 'hasaccomplice' THEN
    RETURN; -- already patched
  END IF;

  patched := replace(d, 'accomplice beat\M|self-reference', 'accomplice beat\M|\mhasAccomplice\M|self-reference');

  IF patched = d THEN
    RAISE EXCEPTION 'anchor "accomplice beat\M|self-reference" not found in package_meta_text_leak';
  END IF;

  EXECUTE patched;
END
$patch$;
