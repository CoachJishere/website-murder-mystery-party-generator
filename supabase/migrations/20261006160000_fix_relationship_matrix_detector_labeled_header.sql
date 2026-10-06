-- ADR-0103 Addendum 86: package_relationship_matrix_contradiction() read every column one cell off whenever the matrix header's
-- top-left cell is a label ("| Character | Agatha | ... |") instead of empty ("| | Agatha | ... |").
-- The old code assumed the empty form: btrim(line, '| ') drops an empty top-left cell, so hdr[] then has one entry fewer than the
-- row, and column j of a row is header j-1. With a "Character" label hdr[] has the same length as the row and column j is header j.
-- Measured 2026-10-06 over the 100 packages since 2026-08-01 that have a matrix: 73 empty top-left, 27 labeled. The detector's
-- numbers for those 27 (and so the ADR-0134 baseline of 44 packages / 110 hits) were noise in both directions. Found on "The Last
-- Thanksgiving": 5 hits, all 5 false (every ally/rival list agreed with the matrix when read by hand).
-- Fix: align by length, so both header shapes parse. Only the function body changes; grants are preserved by CREATE OR REPLACE.
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
  hoff int;
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
    -- empty top-left cell: hdr[] is one shorter than the row, column j is header j-1; labeled top-left: same length, column j is header j
    hoff := CASE WHEN array_length(hdr,1) = array_length(cells,1) THEN 0 ELSE 1 END;
    FOR j IN 2..array_length(cells,1) LOOP
      IF j - hoff <= array_length(hdr,1) THEN rowobj := rowobj || jsonb_build_object(hdr[j-hoff], cells[j]); END IF;
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
