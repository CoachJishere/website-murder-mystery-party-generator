-- ADR-0107: defense-in-depth detector for the victim dual-name defect
-- (ADR-0104 Addendum 3, ADR-0103 Addendum 1).
--
-- ADR-0107's fix is a prompt instruction (Parent59/60), not a hard constraint —
-- there was never an existing rule the model was following that this corrects,
-- just a new one it might ignore or drift away from the same way it drifted
-- into always dual-naming the victim in the first place. This detector is the
-- backstop: it flags any completed package where master_context's
-- victimProfile.name still contains "/" after the prompt fix ships, so a
-- regression shows up on the next sweep instead of needing another hand audit
-- like today's to find it.
--
-- Read-only, not wired into package_completion_blocking_defects() — per
-- ADR-0053's bar, gating requires a validated zero-false-positive detector,
-- and this one hasn't been run against the live corpus yet to confirm that.

CREATE OR REPLACE FUNCTION public.package_victim_name_unresolved(_pkg mystery_packages)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT (regexp_match(_pkg.master_context, '"victimProfile":\s*\{\s*"name":\s*"([^"]+)"'))[1]
  WHERE _pkg.master_context IS NOT NULL
    AND (regexp_match(_pkg.master_context, '"victimProfile":\s*\{\s*"name":\s*"([^"]+)"'))[1] LIKE '%/%';
$function$;

-- Read-only listing for the ADR-0103 sweep ritual and the 6-hourly health check.
CREATE OR REPLACE FUNCTION public.list_packages_with_unresolved_victim_name(
  _since timestamp with time zone DEFAULT '2026-08-23 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean,
               created_at timestamp with time zone, victim_dual_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_victim_name_unresolved(mp.*)
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (mp.generation_status->>'status') IN ('completed', 'needs_review')
    AND mp.created_at >= _since
    AND public.package_victim_name_unresolved(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;
