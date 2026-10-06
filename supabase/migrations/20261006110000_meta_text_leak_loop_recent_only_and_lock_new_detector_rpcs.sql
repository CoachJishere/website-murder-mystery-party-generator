-- ADR-0103 Addendum 84 follow-up (2026-10-06). Applied live via execute_sql; recorded here as the paper trail.
--
-- 1. The word-loop rule added in 20261006100000 took list_packages_with_meta_text_leak over 30 days from ~7s to ~13s, past the API
--    role's 8s statement_timeout, so the 06:28 UTC health check reported "could not run the meta-text-leak detector". The loop test
--    now only runs for packages created in the last 7 days (loops matter at generation time; the whole corpus was scanned by hand
--    once and only El Ultimo Trago had any). Patched in place from the live definition, with asserts.
-- 2. The two slip-reveal detector functions were created with the default public execute grant (the list function is SECURITY DEFINER
--    and returns package titles and character names). Locked to service_role, like the meta-text detectors.

DO $patch$
DECLARE d text; orig text;
BEGIN
  SELECT pg_get_functiondef('public.package_meta_text_leak(mystery_packages)'::regprocedure) INTO d;
  orig := d;
  IF position('t.txt ~* m.loop_rx' in d) = 0 THEN RAISE EXCEPTION 'loop_rx test not found'; END IF;
  IF position('CASE WHEN _pkg.created_at > now() - interval ''7 days''' in d) > 0 THEN RAISE NOTICE 'already limited'; RETURN; END IF;
  d := replace(d, 't.txt ~* m.loop_rx', '(CASE WHEN _pkg.created_at > now() - interval ''7 days'' THEN t.txt ~* m.loop_rx ELSE false END)');
  IF d = orig THEN RAISE EXCEPTION 'nothing changed'; END IF;
  EXECUTE d;
END $patch$;

REVOKE EXECUTE ON FUNCTION public.list_packages_with_slip_reveal_names_cast_member(timestamptz) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_slip_reveal_names_cast_member(mystery_packages) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_slip_reveal_names_cast_member(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_slip_reveal_names_cast_member(mystery_packages) TO service_role;
