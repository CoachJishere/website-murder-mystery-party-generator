-- ADR-0131 item 2, Stage 3 (continued): the advisory list_packages_with_*
-- siblings now call the same shared predicates as the gate. Output shape
-- (sources text[] / overview_victim text, status filter, is_test exclusion,
-- _since parameter) is unchanged -- only the internal pattern/extraction
-- logic is now sourced from one place instead of two.

CREATE OR REPLACE FUNCTION public.list_packages_with_meta_text_leak(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, sources text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_meta_text_leak(mp.*) AS sources
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_meta_text_leak(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

COMMENT ON FUNCTION public.list_packages_with_meta_text_leak(timestamptz) IS
$doc$ADR-0131 item 2 cutover (2026-09-28): now calls the shared package_meta_text_leak() predicate, same one package_completion_blocking_defects() calls -- structurally cannot drift from the gate again. Previously an independently-maintained inline pattern; ADR-0131 Part 2B found it had drifted ~10 markers ahead of the gate's own stale copy before this cutover. Detects leaked authoring/meta text in package content, incl. leaked prompt-template word-count directives (ADR-0103 Addendum 54, 2026-09-23) and the T-V pronoun-pair/relationship-matrix patterns.$doc$;

CREATE OR REPLACE FUNCTION public.list_packages_with_victim_mismatch(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, overview_victim text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_victim_mismatch_candidate(mp.*) AS overview_victim
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_victim_mismatch_candidate(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

COMMENT ON FUNCTION public.list_packages_with_victim_mismatch(timestamptz) IS
$doc$ADR-0131 item 2 cutover (2026-09-28): now calls the shared package_victim_mismatch_candidate() predicate, same one package_completion_blocking_defects() calls -- structurally cannot drift from the gate again. Previously an independently-maintained 3-fallback-pattern extraction; ADR-0131 Part 2B found the gate's own copy had only the first (header-only) pattern, already measured ~78% inert (ADR-0060). Completed packages whose game_overview names a victim (surname) that appears nowhere in master_context or any character background -- a foreign-victim bleed. Adelaide Crane / "Sophie Duplock" incident, audit 2026-07-25. Still does NOT catch a same-package victim/suspect identity swap (Lyn DiFranco shape) -- a known, unchanged limitation.$doc$;
