-- ADR-0103 Addendum 82 (2026-10-04): slip-style reveal confessions that name a specific cast member as the
-- helper or culprit. The murderer and accomplice slips are drawn at the table, so a confession must never
-- name another cast member ("Fabian found me", "Blair came to me", "protected Bones"). Found by hand on
-- "Hedberg Hollow" (5 confessions); a corpus query since 2026-04-01 found it in 15 more delivered packages
-- (all slip style, none with a predetermined murderer role), and the LLM reviewer is blind to it
-- (review_performance: character/secret_leak 0 real finds, 6 misses).
--
-- Detector only (this migration). Precision choices, from reading every hit in the corpus:
--   * case-sensitive match on name tokens taken from OTHER characters' names (dual names A/B give both),
--     minus tokens the speaker shares (a surname in common) and a title stop-list;
--   * guilty confession: "NAME found/helped/took/told/... me|my|us";
--   * accomplice confession: "NAME came to me", "protected/protecting/covered for/helped NAME",
--     "NAME was standing/dropped/swung/did it/had done/was the one", "found NAME standing/shaking/...".
--     A bare "found NAME" and "protecting NAME" in the GUILTY branch are deliberately NOT matched: a spouse
--     found at the party or a motive ("I told myself I was protecting Joe") is legitimate.
--   * packages with a predetermined murderer/accomplice role are skipped (naming is legitimate there).
CREATE OR REPLACE FUNCTION public.package_confession_names_cast_member(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  hits text[] := ARRAY[]::text[];
  a record;
  b record;
  tok text;
  stop text[] := ARRAY['The','Mrs','Miss','Doctor','Captain','Chef','Camper','Detective','Sheriff','Officer','Professor','Counselor','Agent','Ranger','Madame','Madam','Lord','Lady','Sir','Dame','Aunt','Uncle','Father','Mother','Brother','Sister','Old','Young','Little','Big','Reverend','Judge','Count','Baron','Baroness','Duke','Duchess','Colonel','Major','General','Lieutenant','Sergeant','Inspector','Nurse','Maid','Butler','Cook','Gardener','Housekeeper','Director','Mayor','Senator','Governor','President','Queen','King','Prince','Princess','Saint','Mister'];
BEGIN
  IF _pkg.id IS NULL OR _pkg.mystery_style IS DISTINCT FROM 'character' THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM mystery_characters WHERE package_id = _pkg.id AND character_role IN ('murderer', 'accomplice')) THEN
    RETURN NULL;
  END IF;

  FOR a IN
    SELECT character_name, reveal_confession_guilty AS rg, reveal_confession_accomplice AS ra
    FROM mystery_characters WHERE package_id = _pkg.id
  LOOP
    FOR b IN
      SELECT character_name FROM mystery_characters WHERE package_id = _pkg.id AND character_name <> a.character_name
    LOOP
      FOR tok IN
        SELECT t FROM regexp_split_to_table(regexp_replace(b.character_name, '\(.*?\)', ' ', 'g'), '[\s/"''.,]+') AS t
        WHERE length(t) >= 3 AND t ~ '^[A-Z][a-z]+$' AND t <> ALL (stop)
      LOOP
        CONTINUE WHEN position(tok in coalesce(a.rg, '') || ' ' || coalesce(a.ra, '')) = 0;  -- cheap pre-filter: 30-char cast went from seconds to 0.15 s
        CONTINUE WHEN a.character_name ~ ('\m' || tok || '\M');
        IF a.rg IS NOT NULL AND a.rg ~ ('\m' || tok || '\M\s+(found|helped|took|told|pulled|folded|covered|hid|moved|caught|walked|came to|came around|came upon)\M[^.]{0,30}\m(me|my|us)\M') THEN
          hits := hits || (a.character_name || '.reveal_confession_guilty');
        END IF;
        IF a.ra IS NOT NULL AND (
             a.ra ~ ('\m' || tok || '\M\s+came to me')
          OR a.ra ~ ('\m(protected|protecting|covered for|helped)\s+' || tok || '\M')
          OR a.ra ~ ('\m' || tok || '\M\s+(was standing|dropped|swung|did it|had done|was the one)')
          OR a.ra ~ ('\mfound\s+' || tok || '\M\s+(standing|shaking|breathing|over|by the)')
        ) THEN
          hits := hits || (a.character_name || '.reveal_confession_accomplice');
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF array_length(hits, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ARRAY(SELECT DISTINCT h FROM unnest(hits) AS h ORDER BY h);
END;
$function$;

-- One row per (package, character), with the flagged reveal_confession_* fields, for the worker and the regen gate.
CREATE OR REPLACE FUNCTION public.list_packages_with_confession_names_cast_member(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, character_name text, fields text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH flagged AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           unnest(public.package_confession_names_cast_member(mp)) AS hit
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (mp.generation_status->>'status') IN ('completed', 'needs_review')
      AND mp.created_at >= _since
      AND NOT c.is_test
      AND mp.mystery_style = 'character'
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         regexp_replace(hit, '\.reveal_confession_\w+$', '') AS character_name,
         array_agg(DISTINCT substring(hit from '\.(reveal_confession_\w+)$') ORDER BY substring(hit from '\.(reveal_confession_\w+)$')) AS fields
  FROM flagged
  GROUP BY package_id, conversation_id, title, is_paid, created_at, regexp_replace(hit, '\.reveal_confession_\w+$', '')
  ORDER BY is_paid DESC, created_at DESC, character_name;
$function$;
