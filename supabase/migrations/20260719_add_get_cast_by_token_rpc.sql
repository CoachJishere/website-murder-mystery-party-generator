-- ADR-0037 R3: token-scoped cast roster for the guest character page so players
-- can keep track of who's who. Returns ONLY name + public description for every
-- character in the same package as the token holder — no secrets, roles, or scripts.
CREATE OR REPLACE FUNCTION public.get_cast_by_token(access_token_param uuid)
 RETURNS TABLE(character_name text, description text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mc2.character_name, mc2.description
  FROM character_assignments ca
  JOIN mystery_characters mc  ON mc.id = ca.character_id
  JOIN mystery_characters mc2 ON mc2.package_id = mc.package_id
  WHERE ca.access_token = access_token_param
    AND ca.is_sent = true
  ORDER BY mc2.character_name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_cast_by_token(uuid) TO anon, authenticated, service_role;
