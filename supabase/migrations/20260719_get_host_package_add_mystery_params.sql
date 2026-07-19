-- ADR-0037: HostAccess guide tab now renders via HostGuideTemplate (single source of
-- truth with the dashboard). The template needs mystery type/style/accomplice/player
-- count, which live on conversations — join them into the host-package RPC.
-- Return-type change requires DROP first.
DROP FUNCTION IF EXISTS public.get_host_package(uuid);

CREATE OR REPLACE FUNCTION public.get_host_package(access_token uuid)
 RETURNS TABLE(title text, game_overview text, host_guide text, materials text, preparation_instructions text, timeline text, hosting_tips text, detective_script text, evidence_cards jsonb, mystery_type text, mystery_style text, has_accomplice boolean, player_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    mp.title, mp.game_overview, mp.host_guide, mp.materials,
    mp.preparation_instructions, mp.timeline, mp.hosting_tips,
    mp.detective_script, mp.evidence_cards,
    c.mystery_type, c.mystery_style, c.has_accomplice, c.player_count
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE mp.host_access_token = access_token
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_host_package(uuid) TO anon, authenticated, service_role;
