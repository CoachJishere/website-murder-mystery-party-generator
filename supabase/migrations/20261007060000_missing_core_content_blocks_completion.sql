-- ADR-0103 Addendum 87: a package with no detective script, or whose game overview is an AI request for missing
-- input, now holds the completion gate.
--
-- "Murder At Montero Manor" (2026-10-07, paid USD 19.99, slip style, 11 characters): the Parent's master-context step
-- produced nothing, so the package was saved with master_context = '' , detective_script = NULL, no evidence cards and
-- a game_overview that read "The master context for this mystery arrived empty, so I have no victim, venue ...
-- Please send the master context ...". The 11 character sheets were populated, so none of the existing checks (all
-- character- or string-pattern based) fired; the reviewer flagged the overview as `high` but only after release, the
-- ready email went out at 01:46, and the customer found the package stuck. No generation alert was sent because the
-- gate considered the package healthy.
--
-- Corpus check before shipping: paid, completed packages created since 2026-06-01 (134): exactly 1 hit (this package).
-- All-time there are 17 completed paid packages with a short detective_script, all older than June (early design),
-- so the check is limited to packages created on or after 2026-06-01 to keep a later edit of an old package from
-- re-holding it. Detection only: the fix is a re-fire of the whole package (paid, needs a yes), so there is no
-- auto-remediate handler and the alert escalates to a human.

CREATE OR REPLACE FUNCTION public.package_missing_core_content(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT NULLIF(array_remove(ARRAY[
    CASE WHEN coalesce(length(_pkg.detective_script), 0) < 500 THEN 'detective_script_empty' END,
    CASE WHEN _pkg.game_overview ~* '(master context|please send|send me the|arrived empty|i have no (victim|details))' THEN 'game_overview_is_ai_request' END
  ], NULL), ARRAY[]::text[])
  WHERE _pkg.created_at >= '2026-06-01 00:00:00+00'::timestamptz;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_missing_core_content(_since timestamp with time zone DEFAULT '2026-06-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, problems text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_missing_core_content(mp.*) AS problems
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_missing_core_content(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_packages_with_missing_core_content(timestamptz) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_missing_core_content(mystery_packages) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_missing_core_content(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_missing_core_content(mystery_packages) TO service_role;

-- Wire into the gate by exact-text replacement on the LIVE definition (asserted), not re-typed.
DO $$
DECLARE
  _def text;
  _old text := E'  IF array_length(_defects, 1) IS NULL THEN\n    RETURN NULL;\n  END IF;\n  RETURN _defects;';
  _new text := E'  -- ADR-0103 Addendum 87: no detective script, or a game overview that is an AI request for missing input.\n  -- Detection-only; escalates to a human (the repair is a paid re-fire).\n  FOR _hit IN\n    SELECT unnest(coalesce(public.package_missing_core_content(_pkg), ARRAY[]::text[])) AS key\n  LOOP\n    _defects := _defects || (''missing_core_content.'' || _hit.key);\n  END LOOP;\n\n' || _old;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _def FROM pg_proc p WHERE p.proname = 'package_completion_blocking_defects';
  IF _def IS NULL THEN RAISE EXCEPTION 'package_completion_blocking_defects not found'; END IF;
  IF position('missing_core_content.' in _def) > 0 THEN
    RAISE NOTICE 'already patched';
    RETURN;
  END IF;
  IF (length(_def) - length(replace(_def, _old, ''))) / length(_old) <> 1 THEN
    RAISE EXCEPTION 'expected exactly one occurrence of the final return clause';
  END IF;
  EXECUTE replace(_def, _old, _new);
END $$;
