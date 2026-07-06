-- Extend the guest-packet metadata RPC to also return the package's game_overview,
-- so character packets can open with the same scene-setting the host guide shows.
-- Return type changes, so the function must be dropped and recreated.
-- Applied to production 2026-07-06 via MCP (migration name: add_game_overview_to_packet_metadata_rpc).
DROP FUNCTION IF EXISTS public.get_packet_metadata_by_token(uuid);

CREATE FUNCTION public.get_packet_metadata_by_token(access_token_param uuid)
 RETURNS TABLE(script_type text, mystery_style text, mystery_type text, has_accomplice boolean, game_overview text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT c.script_type, c.mystery_style, c.mystery_type, c.has_accomplice, mp.game_overview
  FROM character_assignments ca
  JOIN mystery_characters mc ON mc.id = ca.character_id
  JOIN mystery_packages mp ON mp.id = mc.package_id
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE ca.access_token = access_token_param
    AND ca.is_sent = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_packet_metadata_by_token(uuid) TO anon, authenticated;
