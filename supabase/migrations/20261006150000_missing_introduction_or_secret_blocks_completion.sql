-- ADR-0103 Addendum 85: a character with no introduction, or no secret at all, now holds the completion gate.
--
-- "The Vellacourt Gala" (2026-10-06): William was delivered with introduction = NULL and secret = '' / secrets = [],
-- and nothing noticed. `missing_round_content` only tested the round scripts, the final statement and the three
-- question fields, so a character whose Round 1 introduction and secret never generated passed the gate, the reviewer
-- and every detector, and shipped.
--
-- Corpus check before shipping (paid, completed packages since 2026-04-01: 56 slip, 101 detective, 1,896 characters):
-- zero real characters match; the only three hits are the "TEST Mystery" fixture rows. So the new test cannot hold a
-- healthy package. The defect key stays `missing_round_content.<name>`, so the existing remediation path handles it.
--
-- Applied by exact-text replacement on the live definition (checked against pg_get_functiondef on 2026-10-06 first).

DO $$
DECLARE
  _def text;
  _old text := E'OR coalesce(mc.round2_questions,'''') = '''' OR coalesce(mc.round3_questions,'''') = '''' OR coalesce(mc.round4_questions,'''') = ''''\n      )';
  _new text := E'OR coalesce(mc.round2_questions,'''') = '''' OR coalesce(mc.round3_questions,'''') = '''' OR coalesce(mc.round4_questions,'''') = ''''\n        OR coalesce(mc.introduction,'''') = ''''\n        OR (coalesce(mc.secret,'''') = '''' AND coalesce(mc.secrets::text,''[]'') IN (''[]'',''null'',''''))\n      )';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _def FROM pg_proc p WHERE p.proname = 'package_completion_blocking_defects';
  IF _def IS NULL THEN RAISE EXCEPTION 'package_completion_blocking_defects not found'; END IF;
  IF position('coalesce(mc.introduction,'''') = ''''' in _def) > 0 THEN
    RAISE NOTICE 'already patched';
    RETURN;
  END IF;
  IF (length(_def) - length(replace(_def, _old, ''))) / length(_old) <> 1 THEN
    RAISE EXCEPTION 'expected exactly one occurrence of the question-fields clause';
  END IF;
  EXECUTE replace(_def, _old, _new);
END $$;
