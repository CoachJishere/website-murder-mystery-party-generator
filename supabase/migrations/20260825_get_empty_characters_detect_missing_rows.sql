-- ADR-0109: get_empty_characters() was blind to wholly-missing character
-- rows, and Make.com's live Parent blueprint (Parent60, module 223 "Check
-- empty chars (detective)") calls this RPC directly as its own completion
-- gate -- entirely invisible to a repo-based grep, since the caller's
-- definition lives in Make.com's UI/API, not this repository.
--
-- Traced via the Make API: Parent60's router ("Mark generation outcome (no
-- retry)") writes generation_status='completed' when
-- {{length(223.data)}} == 0, where module 223 is a raw HTTP call to
-- .../rest/v1/rpc/get_empty_characters. The function's original definition
-- (2026-04-22, fix_get_empty_characters_to_check_scripts) can only ever
-- return rows that EXIST -- a character with no mystery_characters row at
-- all is invisible to it by construction, exactly reproducing the shape
-- ADR-0108's completion trigger was built to catch on the Postgres side.
-- Reconstructed the incident in an isolated BEGIN...ROLLBACK test before
-- writing this fix: 1 fully-populated character + 1 wholly-missing (2
-- expected) returned 0 rows from the original function.
--
-- Fix: additive UNION branch returning one synthetic sentinel row when
-- actual mystery_characters count is short of package_expected_character_
-- count() (the already-trusted ADR-0094/0095 parser). Makes Make.com's
-- length(...) == 0 check correctly evaluate false for a missing character,
-- with no Make.com blueprint edit or manual import required -- Make.com's
-- router only inspects array length, never the id field, so the sentinel
-- row's NULL id is safe for its only confirmed live caller. Verified both
-- directions before deploying: missing-row case now returns the sentinel
-- (previously 0 rows), and a genuinely complete package still returns 0
-- rows (no false positive).
--
-- See docs/adr/0109-get-empty-characters-blind-to-missing-rows.md.

CREATE OR REPLACE FUNCTION public.get_empty_characters(p_package_id uuid)
 RETURNS TABLE(id uuid, character_name text, package_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mc.id, mc.character_name, mc.package_id
  FROM mystery_characters mc
  JOIN mystery_packages mp ON mp.id = mc.package_id
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE mc.package_id = p_package_id
    AND (
      -- Always require introduction
      mc.introduction IS NULL OR LENGTH(mc.introduction) < 50
      -- For detective-style, require detective scripts
      OR (
        c.mystery_style = 'detective'
        AND (
          mc.round2_script IS NULL OR LENGTH(mc.round2_script) < 50
          OR mc.round3_script IS NULL OR LENGTH(mc.round3_script) < 50
          OR mc.round4_script IS NULL OR LENGTH(mc.round4_script) < 50
          OR mc.final_statement IS NULL OR LENGTH(mc.final_statement) < 50
        )
      )
      -- For character-based, require innocent + guilty scripts (accomplice optional)
      OR (
        c.mystery_style = 'character'
        AND (
          mc.round2_innocent IS NULL OR LENGTH(mc.round2_innocent) < 50
          OR mc.round2_guilty IS NULL OR LENGTH(mc.round2_guilty) < 50
          OR mc.round3_innocent IS NULL OR LENGTH(mc.round3_innocent) < 50
          OR mc.round3_guilty IS NULL OR LENGTH(mc.round3_guilty) < 50
          OR mc.round4_innocent IS NULL OR LENGTH(mc.round4_innocent) < 50
          OR mc.round4_guilty IS NULL OR LENGTH(mc.round4_guilty) < 50
          OR mc.final_innocent IS NULL OR LENGTH(mc.final_innocent) < 50
          OR mc.final_guilty IS NULL OR LENGTH(mc.final_guilty) < 50
        )
      )
    )
  UNION ALL
  SELECT NULL::uuid AS id, '(missing character row)'::text AS character_name, mp.id AS package_id
  FROM mystery_packages mp
  WHERE mp.id = p_package_id
    AND (SELECT count(*) FROM mystery_characters mc2 WHERE mc2.package_id = p_package_id)
        < public.package_expected_character_count(mp);
$function$;
