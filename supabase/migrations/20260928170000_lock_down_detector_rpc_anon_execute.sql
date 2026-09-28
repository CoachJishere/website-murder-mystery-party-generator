-- Lock down anon/authenticated EXECUTE on the list_packages_with_* / list_completed_but_empty_packages
-- detector-RPC family, matching the ADR-0032 precedent for list_packages_missing_evidence_images.
--
-- Postgres grants EXECUTE to PUBLIC by default on newly created functions. These detector RPCs
-- were never explicitly revoked, so an unauthenticated caller could enumerate paid customer package
-- titles/ids via the REST RPC endpoint (found 2026-08-01, deferred; only 1 of 9 was locked down at
-- the time). Confirmed 2026-09-28: nothing in supabase/functions or src/ calls any of these with the
-- anon key -- both call sites (regenerate-child-content, auto-remediate-packages) construct their
-- Supabase client with SUPABASE_SERVICE_ROLE_KEY only, so this is a pure hardening change with zero
-- functional blast radius.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'list_completed_but_empty_packages',
    'list_packages_with_characters_absent_from_conversation',
    'list_packages_with_dangling_quote_mark',
    'list_packages_with_evidence_culprit_spoiler',
    'list_packages_with_final_statement_confession_leak',
    'list_packages_with_identity_conflicts',
    'list_packages_with_meta_text_leak',
    'list_packages_with_missing_role_branch_content',
    'list_packages_with_narration_person_mismatch',
    'list_packages_with_pointform_language_mismatch',
    'list_packages_with_role_tag_leak',
    'list_packages_with_self_directed_questions',
    'list_packages_with_slip_culprit_leak',
    'list_packages_with_structural_defects',
    'list_packages_with_unconfessed_culprit',
    'list_packages_with_unresolved_victim_name',
    'list_packages_with_victim_as_character',
    'list_packages_with_victim_mismatch'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(timestamptz) FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(timestamptz) TO service_role', fn);
  END LOOP;
END $$;
