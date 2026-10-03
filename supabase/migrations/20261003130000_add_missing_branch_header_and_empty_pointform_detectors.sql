-- ADR-0103 Addendum 80: two new detectors (info-level until the next migration wires them into the completion gate).
-- Trigger: "Boogie Nights, Bloody Nights" (2026-10-03): 32 slip-style branch fields had no baked-in header and 2 pointform
-- fields were empty, and nothing detected either. Corpus (completed/needs_review since 2026-08-01): about a third of slip-style
-- packages have at least one headerless branch field, and about 15 of 65 packages have an empty pointform next to non-empty prose.
--
-- package_missing_branch_header: SLIP STYLE ONLY (mystery_style = 'character'). In detective style the round scripts are headerless
-- in the majority (57%), so absence there is normal. Flags a non-empty introduction / per-role round / final / reveal-confession
-- field whose text does not start with '#'. The host's compiled guide concatenates these raw fields, so a headerless accomplice
-- branch runs on unlabeled after the guilty one. Source format 'field:character_name' (same as the dangling-quote detector).
--
-- package_empty_pointform: only when the conversation's script_type is 'both' or 'pointForm' (a 'full'-prose customer never sees
-- pointform). Flags prose longer than 200 chars whose *_pointform sibling is empty. `accusations` is excluded on purpose: its
-- pointform is empty by design for innocents (352 of 488 detective-style rows). Source format 'field:character_name'.
CREATE OR REPLACE FUNCTION public.package_missing_branch_header(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH f AS (
    SELECT mc.character_name, t.field
    FROM mystery_characters mc
    CROSS JOIN LATERAL (VALUES
      ('introduction', mc.introduction),
      ('round2_innocent', mc.round2_innocent), ('round2_guilty', mc.round2_guilty), ('round2_accomplice', mc.round2_accomplice),
      ('round3_innocent', mc.round3_innocent), ('round3_guilty', mc.round3_guilty), ('round3_accomplice', mc.round3_accomplice),
      ('round4_innocent', mc.round4_innocent), ('round4_guilty', mc.round4_guilty), ('round4_accomplice', mc.round4_accomplice),
      ('final_innocent', mc.final_innocent), ('final_guilty', mc.final_guilty), ('final_accomplice', mc.final_accomplice),
      ('reveal_confession_guilty', mc.reveal_confession_guilty), ('reveal_confession_accomplice', mc.reveal_confession_accomplice)
    ) AS t(field, val)
    WHERE mc.package_id = _pkg.id
      AND _pkg.mystery_style = 'character'
      AND btrim(coalesce(t.val, '')) <> ''
      AND ltrim(t.val) !~ '^#'
  )
  SELECT array_agg(field || ':' || character_name ORDER BY field, character_name) FROM f;
$function$;

CREATE OR REPLACE FUNCTION public.package_empty_pointform(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH f AS (
    SELECT mc.character_name, t.field
    FROM mystery_characters mc
    CROSS JOIN LATERAL (VALUES
      ('introduction', mc.introduction, mc.introduction_pointform),
      ('rumors', mc.rumors, mc.rumors_pointform),
      ('round2_script', mc.round2_script, mc.round2_script_pointform),
      ('round3_script', mc.round3_script, mc.round3_script_pointform),
      ('round4_script', mc.round4_script, mc.round4_script_pointform),
      ('final_statement', mc.final_statement, mc.final_statement_pointform),
      ('round2_innocent', mc.round2_innocent, mc.round2_innocent_pointform), ('round2_guilty', mc.round2_guilty, mc.round2_guilty_pointform), ('round2_accomplice', mc.round2_accomplice, mc.round2_accomplice_pointform),
      ('round3_innocent', mc.round3_innocent, mc.round3_innocent_pointform), ('round3_guilty', mc.round3_guilty, mc.round3_guilty_pointform), ('round3_accomplice', mc.round3_accomplice, mc.round3_accomplice_pointform),
      ('round4_innocent', mc.round4_innocent, mc.round4_innocent_pointform), ('round4_guilty', mc.round4_guilty, mc.round4_guilty_pointform), ('round4_accomplice', mc.round4_accomplice, mc.round4_accomplice_pointform),
      ('final_innocent', mc.final_innocent, mc.final_innocent_pointform), ('final_guilty', mc.final_guilty, mc.final_guilty_pointform), ('final_accomplice', mc.final_accomplice, mc.final_accomplice_pointform),
      ('reveal_confession_guilty', mc.reveal_confession_guilty, mc.reveal_confession_guilty_pointform),
      ('reveal_confession_accomplice', mc.reveal_confession_accomplice, mc.reveal_confession_accomplice_pointform)
    ) AS t(field, prose, pf)
    WHERE mc.package_id = _pkg.id
      AND (SELECT c.script_type FROM conversations c WHERE c.id = _pkg.conversation_id) IN ('both', 'pointForm')
      AND length(btrim(coalesce(t.prose, ''))) > 200
      AND btrim(coalesce(t.pf, '')) = ''
  )
  SELECT array_agg(field || ':' || character_name ORDER BY field, character_name) FROM f;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_missing_branch_header(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, sources text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_missing_branch_header(mp.*) AS sources
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_missing_branch_header(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_empty_pointform(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, sources text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_empty_pointform(mp.*) AS sources
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_empty_pointform(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.list_packages_with_missing_branch_header(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_packages_with_empty_pointform(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_with_missing_branch_header(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_packages_with_empty_pointform(timestamptz) TO service_role;
