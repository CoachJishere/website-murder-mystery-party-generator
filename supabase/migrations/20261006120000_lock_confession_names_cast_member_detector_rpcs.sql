-- 2026-10-06: the two confession_names_cast_member functions (20261004100000) were created with the default public execute grant.
-- The list function is SECURITY DEFINER and returns package titles, paid status and character names to anyone with the public API key.
-- Locked to service_role, like the meta-text detectors. Every caller already uses the service-role key (auto-remediate-packages,
-- regenerate-child-content, the health-check workflow); the completion gate is SECURITY DEFINER and unaffected. Applied live; recorded here.
REVOKE EXECUTE ON FUNCTION public.list_packages_with_confession_names_cast_member(timestamptz) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_confession_names_cast_member(mystery_packages) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_confession_names_cast_member(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_confession_names_cast_member(mystery_packages) TO service_role;
