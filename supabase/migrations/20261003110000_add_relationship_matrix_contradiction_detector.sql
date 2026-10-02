-- ADR-0134: advisory detector for ally/rival lists that contradict master_context.relationshipMatrix.
-- Flags a character whose ALLIES section names someone the matrix marks Hostile, or whose RIVALS section names someone it marks
-- Friendly (the "hard" contradictions; Neutral-as-ally/rival is a softer, far commoner pattern and is deliberately NOT flagged).
-- Measured 2026-10-03 over the 92 completed packages since 2026-08-01: 43 of 879 characters (5%) in 29 packages (32%).
-- Escalate-only: it never blocks completion and is not part of package_completion_blocking_defects(), because the cause is the
-- Child prompt (fixed going forward by Child52) and the repair is a by-hand edit of one ally/rival paragraph.
-- Matrix is symmetric (0 of 12,868 pairs differ across the corpus), so the character's own row is read.
-- Parsing is header-language-agnostic (section headings are bold lines ending in ":**", entries are "**Name** - ...") and names are
-- matched by token overlap because the matrix uses short names ("Edu") where character_name can be longer ("Eduard 'Edu'").
CREATE OR REPLACE FUNCTION public._rel_name_score(a text, b text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH ta AS (SELECT DISTINCT t FROM unnest(regexp_split_to_array(lower(coalesce(a,'')), '[^[:alnum:]]+')) t WHERE t <> ''),
       tb AS (SELECT DISTINCT t FROM unnest(regexp_split_to_array(lower(coalesce(b,'')), '[^[:alnum:]]+')) t WHERE t <> '')
  SELECT CASE WHEN (SELECT count(*) FROM ta) = 0 OR (SELECT count(*) FROM tb) = 0 THEN 0
              ELSE (SELECT count(*) FROM ta JOIN tb USING (t))::numeric
                   / least((SELECT count(*) FROM ta), (SELECT count(*) FROM tb)) END;
$function$;

CREATE OR REPLACE FUNCTION public.package_relationship_matrix_contradiction(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  raw text;
  mlines text[];
  hdr text[];
  cells text[];
  rowname text;
  matrix jsonb := '{}'::jsonb;  -- { rowname: { colname: value } }
  i int; j int;
  mc record;
  rk text;
  best numeric; sc numeric; n99 int; n50 int; c99 int; c50 int;
  rowobj jsonb;
  sect int;
  ln text; nm text; cellv text; colk text; cbest numeric; bestcol text;
  hits text[] := '{}';
BEGIN
  raw := substring(coalesce(_pkg.master_context,'') from '"relationshipMatrix":\s*"((?:[^"\\]|\\.)*)"');
  IF raw IS NULL THEN RETURN NULL; END IF;
  raw := replace(replace(raw, '\n', E'\n'), '\"', '"');
  SELECT array_agg(l) INTO mlines FROM unnest(string_to_array(raw, E'\n')) l WHERE l LIKE '|%';
  IF mlines IS NULL OR array_length(mlines,1) < 3 THEN RETURN NULL; END IF;
  hdr := ARRAY(SELECT btrim(regexp_replace(c, '\*', '', 'g')) FROM unnest(string_to_array(btrim(mlines[1], '| '), '|')) c);
  FOR i IN 3..array_length(mlines,1) LOOP
    cells := ARRAY(SELECT btrim(c) FROM unnest(string_to_array(btrim(mlines[i], '| '), '|')) c);
    rowname := btrim(regexp_replace(cells[1], '\*', '', 'g'));
    rowobj := '{}'::jsonb;
    FOR j IN 2..array_length(cells,1) LOOP
      -- hdr[] has no entry for the empty top-left cell, so column j of a row is header j-1
      IF j - 1 <= array_length(hdr,1) THEN rowobj := rowobj || jsonb_build_object(hdr[j-1], cells[j]); END IF;
    END LOOP;
    matrix := matrix || jsonb_build_object(rowname, rowobj);
  END LOOP;

  FOR mc IN SELECT character_name, relationships FROM mystery_characters WHERE package_id = _pkg.id AND relationships IS NOT NULL LOOP
    -- resolve this character's matrix row by token overlap
    -- accept a match only when it is unambiguous: exactly one candidate at full score, else exactly one at >= 0.5
    -- (two cast members who share a surname must never be mistaken for each other)
    rk := NULL; best := 0; n99 := 0; n50 := 0;
    FOR rowname IN SELECT jsonb_object_keys(matrix) LOOP
      sc := public._rel_name_score(mc.character_name, rowname);
      IF sc >= 0.99 THEN n99 := n99 + 1; END IF;
      IF sc >= 0.5 THEN n50 := n50 + 1; END IF;
      IF sc > best THEN best := sc; rk := rowname; END IF;
    END LOOP;
    CONTINUE WHEN rk IS NULL OR NOT ((best >= 0.99 AND n99 = 1) OR (best >= 0.5 AND best < 0.99 AND n50 = 1));
    rowobj := matrix -> rk;
    sect := 0;
    FOREACH ln IN ARRAY string_to_array(coalesce(mc.relationships #>> '{}', ''), E'\n') LOOP
      IF ln ~ '^\*\*[^*]{3,45}:\*\*\s*$' THEN sect := sect + 1; CONTINUE; END IF;
      nm := substring(ln from '^\*\*([^*]+?)\*\*\s*[-–—:]');
      CONTINUE WHEN nm IS NULL OR sect NOT IN (1,2);
      cellv := NULL; cbest := 0; bestcol := NULL; c99 := 0; c50 := 0;
      FOR colk IN SELECT jsonb_object_keys(rowobj) LOOP
        sc := public._rel_name_score(nm, colk);
        IF sc >= 0.99 THEN c99 := c99 + 1; END IF;
        IF sc >= 0.5 THEN c50 := c50 + 1; END IF;
        IF sc > cbest THEN cbest := sc; cellv := rowobj ->> colk; bestcol := colk; END IF;
      END LOOP;
      CONTINUE WHEN cbest < 0.5 OR NOT ((cbest >= 0.99 AND c99 = 1) OR (cbest >= 0.5 AND cbest < 0.99 AND c50 = 1));
      IF sect = 1 AND cellv = 'Hostile' THEN hits := hits || (mc.character_name || ' (matrix row ' || rk || '): ally ' || nm || ' = matrix ' || bestcol || ' is Hostile'); END IF;
      IF sect = 2 AND cellv = 'Friendly' THEN hits := hits || (mc.character_name || ' (matrix row ' || rk || '): rival ' || nm || ' = matrix ' || bestcol || ' is Friendly'); END IF;
    END LOOP;
  END LOOP;
  RETURN CASE WHEN array_length(hits,1) IS NULL THEN NULL ELSE hits END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_relationship_matrix_contradiction(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, sources text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_relationship_matrix_contradiction(mp.*) AS sources
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND public.package_relationship_matrix_contradiction(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

-- Match the existing detector functions: callable by service_role only (the list function is SECURITY DEFINER and returns package
-- titles and conversation ids, so it must never be reachable by anon/authenticated).
REVOKE ALL ON FUNCTION public._rel_name_score(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.package_relationship_matrix_contradiction(mystery_packages) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_packages_with_relationship_matrix_contradiction(timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._rel_name_score(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_relationship_matrix_contradiction(mystery_packages) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_packages_with_relationship_matrix_contradiction(timestamp with time zone) TO service_role;
