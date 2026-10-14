-- ADR-0163 item 3: relationship-matrix OMISSIONS. package_relationship_matrix_contradiction() only flags an ally that is Hostile or a rival
-- that is Friendly in the matrix. Three sightings in 16 swept packages were the opposite: the matrix has a mutual Friendly (or Hostile) pair that
-- the sheet lists nowhere (Josie/Harry, French Vanilla/Strawberry Cheesecake, Sheila/Shawna). Read-only, advisory: matrix-vs-sheet drift is
-- common in this corpus (the contradiction detector alone hits 17 of 91 packages since 2026-08-26), so this is never a gate.

create or replace function public._rel_best_key(_name text, _keys text[])
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $fn$
declare k text; sc numeric; best numeric := 0; bk text; n99 int := 0; n50 int := 0;
begin
  foreach k in array _keys loop
    sc := public._rel_name_score(_name, k);
    if sc >= 0.99 then n99 := n99 + 1; end if;
    if sc >= 0.5 then n50 := n50 + 1; end if;
    if sc > best then best := sc; bk := k; end if;
  end loop;
  if bk is not null and ((best >= 0.99 and n99 = 1) or (best >= 0.5 and best < 0.99 and n50 = 1)) then return bk; end if;
  return null;
end;
$fn$;

create or replace function public.package_relationship_matrix_omission(_pkg mystery_packages)
returns text[]
language plpgsql
stable
set search_path = public, pg_temp
as $fn$
declare
  raw text; mlines text[]; hdr text[]; cells text[]; rowname text; matrix jsonb := '{}'::jsonb;
  i int; j int; hoff int; mc record; rk text; rowobj jsonb; orow jsonb; ok text; kk text;
  sect int; ln text; nm text; bc text; colk text; v text; listed text[]; parsed boolean;
  hits text[] := '{}';
begin
  raw := substring(coalesce(_pkg.master_context,'') from '"relationshipMatrix":\s*"((?:[^"\\]|\\.)*)"');
  if raw is null then return null; end if;
  raw := replace(replace(raw, '\n', E'\n'), '\"', '"');
  select array_agg(l) into mlines from unnest(string_to_array(raw, E'\n')) l where l like '|%';
  if mlines is null or array_length(mlines,1) < 3 then return null; end if;
  hdr := array(select btrim(regexp_replace(c, '\*', '', 'g')) from unnest(string_to_array(btrim(mlines[1], '| '), '|')) c);
  for i in 3..array_length(mlines,1) loop
    cells := array(select btrim(c) from unnest(string_to_array(btrim(mlines[i], '| '), '|')) c);
    rowname := btrim(regexp_replace(cells[1], '\*', '', 'g'));
    rowobj := '{}'::jsonb;
    hoff := case when array_length(hdr,1) = array_length(cells,1) then 0 else 1 end;
    for j in 2..array_length(cells,1) loop
      if j - hoff <= array_length(hdr,1) then rowobj := rowobj || jsonb_build_object(hdr[j-hoff], cells[j]); end if;
    end loop;
    matrix := matrix || jsonb_build_object(rowname, rowobj);
  end loop;

  for mc in select character_name, relationships from mystery_characters where package_id = _pkg.id and relationships is not null loop
    rk := public._rel_best_key(mc.character_name, array(select jsonb_object_keys(matrix)));
    continue when rk is null;
    rowobj := matrix -> rk;
    listed := '{}'; parsed := false; sect := 0;
    foreach ln in array string_to_array(coalesce(mc.relationships #>> '{}', ''), E'\n') loop
      if ln ~ '^\*\*[^*]{3,45}:\*\*\s*$' then sect := sect + 1; continue; end if;
      nm := substring(ln from '^\*\*([^*]+?)\*\*\s*[-–—:]');
      continue when nm is null or sect not in (1,2);
      parsed := true;
      bc := public._rel_best_key(nm, array(select jsonb_object_keys(rowobj)));
      if bc is not null then listed := listed || bc; end if;
    end loop;
    continue when not parsed;   -- sheet has no parsable ally/rival list: nothing to compare
    for colk in select jsonb_object_keys(rowobj) loop
      v := rowobj ->> colk;
      continue when v not in ('Friendly','Hostile');
      continue when public._rel_name_score(colk, rk) >= 0.99;                       -- the character itself
      continue when colk = any (listed);
      ok := public._rel_best_key(colk, array(select jsonb_object_keys(matrix)));    -- the other character's own matrix row
      continue when ok is null;
      orow := matrix -> ok;
      kk := public._rel_best_key(rk, array(select jsonb_object_keys(orow)));
      continue when kk is null or (orow ->> kk) is distinct from v;                 -- mutual pairs only
      hits := hits || (mc.character_name || ' (matrix row ' || rk || '): mutual ' || v || ' with ' || colk
                       || ' but the sheet lists ' || case when v = 'Friendly' then 'no such ally' else 'no such rival' end);
    end loop;
  end loop;
  return case when array_length(hits,1) is null then null else hits end;
end;
$fn$;

comment on function public.package_relationship_matrix_omission(mystery_packages) is
  'ADR-0163 item 3. Advisory only. Mutual Friendly/Hostile matrix pairs the character sheet does not list (the contradiction detector covers wrong-list, this covers missing).';
