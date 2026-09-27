CREATE OR REPLACE FUNCTION public.list_packages_with_role_tag_leak(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, tagged_character text, leaked_into_character text, field text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH tagged AS (
    SELECT mc.package_id, mc.id AS tagged_char_id, mc.character_name
    FROM mystery_characters mc
    WHERE mc.character_role IN ('murderer', 'accomplice')
      AND mc.character_name ~ '\(.+\)\s*$'
  ),
  per_field AS (
    SELECT mc.id, mc.package_id, mc.character_name AS source_character,
      unnest(array['introduction','background','rumors','round2_questions','round2_innocent','round2_guilty','round2_accomplice',
                   'round3_questions','round3_innocent','round3_guilty','round3_accomplice',
                   'round4_questions','round4_innocent','round4_guilty','round4_accomplice',
                   'final_innocent','final_guilty','final_accomplice','accusations','secret','final_statement',
                   'quick_reference','reveal_confession_guilty','reveal_confession_accomplice',
                   'round2_script','round3_script','round4_script',
                   'introduction_pointform','rumors_pointform','accusations_pointform',
                   'round2_script_pointform','round3_script_pointform','round4_script_pointform','final_statement_pointform',
                   'round2_innocent_pointform','round2_guilty_pointform','round2_accomplice_pointform',
                   'round3_innocent_pointform','round3_guilty_pointform','round3_accomplice_pointform',
                   'round4_innocent_pointform','round4_guilty_pointform','round4_accomplice_pointform',
                   'final_innocent_pointform','final_guilty_pointform','final_accomplice_pointform',
                   'reveal_confession_guilty_pointform','reveal_confession_accomplice_pointform',
                   'description','relationships','secrets']) AS col,
      unnest(array[introduction,background,rumors,round2_questions,round2_innocent,round2_guilty,round2_accomplice,
                   round3_questions,round3_innocent,round3_guilty,round3_accomplice,
                   round4_questions,round4_innocent,round4_guilty,round4_accomplice,
                   final_innocent,final_guilty,final_accomplice,accusations,secret,final_statement,
                   quick_reference,reveal_confession_guilty,reveal_confession_accomplice,
                   round2_script,round3_script,round4_script,
                   introduction_pointform,rumors_pointform,accusations_pointform,
                   round2_script_pointform,round3_script_pointform,round4_script_pointform,final_statement_pointform,
                   round2_innocent_pointform,round2_guilty_pointform,round2_accomplice_pointform,
                   round3_innocent_pointform,round3_guilty_pointform,round3_accomplice_pointform,
                   round4_innocent_pointform,round4_guilty_pointform,round4_accomplice_pointform,
                   final_innocent_pointform,final_guilty_pointform,final_accomplice_pointform,
                   reveal_confession_guilty_pointform,reveal_confession_accomplice_pointform,
                   description::text,relationships::text,secrets::text]) AS val
    FROM mystery_characters mc
  )
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         tg.character_name, pf.source_character, pf.col
  FROM tagged tg
  JOIN per_field pf ON pf.package_id = tg.package_id AND pf.id <> tg.tagged_char_id
  JOIN mystery_packages mp ON mp.id = tg.package_id
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE pf.val IS NOT NULL
    AND strpos(pf.val, tg.character_name) > 0
    AND mp.created_at >= _since
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

COMMENT ON FUNCTION public.list_packages_with_role_tag_leak IS 'ADR-0103 Addendum 59: detects a murderer/accomplice character''s internal role-suffixed name (e.g. "Trinity (Asesina)") leaking verbatim into another character''s own guest-facing fields. Known false-positive shapes (not bugs): the legitimate dual-gender "(or Other Name)" convention, and non-role descriptive parentheticals like a company affiliation or nickname tag applied to a murderer/accomplice who happens to also be tagged that way -- eyeball each hit''s field/snippet before treating it as a real leak.';
