-- ADR-0163 item 2: deterministic "twin" search. For every reviewer finding of any class, list the OTHER fields of the same package that
-- repeat a distinctive three-word phrase from the flagged quote (the reviewer often fixes one instance and misses the sibling:
-- Flin Flon, "photos laid", "red ink", the guilty twin of a fixed leak). Read-only, alert-only, no LLM.
-- Why not the ADR-0140 pass: its anchors were capitalised multi-word names only and its classes were wrong_fact and
-- cross_field_contradiction only, so it never produced a finding (0 of 323).

create or replace function public.list_review_twin_candidates(_pkg uuid)
returns table (
  finding_id uuid, category text, parent_item text, parent_field text,
  twin_item text, twin_field text, shared text, exact_repeat boolean, snippet text
)
language plpgsql
stable
set search_path = public, pg_temp
as $fn$
begin
  return query
  with stop(w) as (
    select distinct unnest(string_to_array(
      'the and for with that this from was were are has had have not but all you your his her him she they them their its our out who what when then than into over upon been being will would could should there here about after before also just very more some any one two can did does said say says like only even still such too own off per via une des les est pas que qui par pour dans sur avec sans aux ces ses mon ton son leur nous vous elle ils eux der die das und ein eine einen dem den mit von nicht auch auf aus bei nach sich sind war hat het een van voor met niet ook dat zijn naar uit tot als bij maar och att som det inte med har kan var ett eller los las una por con para como pero más sus mis del lei gli nel non sono più', ' '))
  ),
  fields as (
    select c.character_name::text as item, e.key as field, e.value as raw
      from mystery_characters c
      cross join lateral jsonb_each_text(to_jsonb(c)) e
     where c.package_id = _pkg
       and e.value is not null and length(e.value) > 0
       and (e.key = any (array[
              'description','background','relationships','secret','secrets','introduction','rumors',
              'round2_questions','round2_innocent','round2_guilty','round2_accomplice',
              'round3_questions','round3_innocent','round3_guilty','round3_accomplice',
              'round4_questions','round4_innocent','round4_guilty','round4_accomplice',
              'final_innocent','final_guilty','final_accomplice','accusations',
              'reveal_confession_guilty','reveal_confession_accomplice',
              'round2_script','round3_script','round4_script','final_statement'])
            or e.key like '%\_pointform')
    union all
    select 'PACKAGE DOCUMENTS', 'game_overview', p.game_overview from mystery_packages p where p.id = _pkg and p.game_overview is not null
    union all
    select 'PACKAGE DOCUMENTS', 'detective_script', p.detective_script from mystery_packages p where p.id = _pkg and p.detective_script is not null
    union all
    select 'PACKAGE DOCUMENTS', 'materials', p.materials from mystery_packages p where p.id = _pkg and p.materials is not null
    union all
    select 'PACKAGE DOCUMENTS', 'evidence_cards', p.evidence_cards::text from mystery_packages p where p.id = _pkg and p.evidence_cards is not null
  ),
  norm as (
    select item, field, raw,
           regexp_replace(regexp_replace(replace(lower(raw), '’', ''''), '[^[:alpha:]'' ]+', ' ', 'g'), ' +', ' ', 'g') as t
      from fields
  ),
  toks as (
    select n.item, n.field, w.i, w.w
      from norm n, lateral regexp_split_to_table(n.t, ' ') with ordinality as w(w, i)
     where length(w.w) >= 3
  ),
  bg as (
    select item, field, w as w1,
           lead(w) over (partition by item, field order by i) as w2,
           lead(w, 2) over (partition by item, field order by i) as w3
      from toks
  ),
  fb as (select distinct item, field, w1 || ' ' || w2 || ' ' || w3 as b from bg where w3 is not null),
  df as (select b, count(*) as n from fb group by b),
  fnd as (
    select f.id, f.category, f.item_name, f.field,
           regexp_replace(regexp_replace(replace(lower(f.exact_quote), '’', ''''), '[^[:alpha:]'' ]+', ' ', 'g'), ' +', ' ', 'g') as qn
      from package_review_findings f
     where f.package_id = _pkg and f.human_verdict is distinct from 'false'
       and f.item_name <> 'REQUIREMENTS' and f.exact_quote is not null
  ),
  ftok as (
    select fnd.id, w.i, w.w from fnd, lateral regexp_split_to_table(fnd.qn, ' ') with ordinality as w(w, i) where length(w.w) >= 3
  ),
  fbg as (
    select id, w as w1, lead(w) over (partition by id order by i) as w2, lead(w, 2) over (partition by id order by i) as w3 from ftok
  ),
  pb as (select distinct id, w1 || ' ' || w2 || ' ' || w3 as b, w1, w2, w3 from fbg where w3 is not null),
  names as (
    select distinct w from (
      select regexp_split_to_table(lower(c.character_name), '[^[:alpha:]]+') as w from mystery_characters c where c.package_id = _pkg
    ) x where length(w) >= 3
  ),
  keep as (
    select pb.id, pb.b
      from pb
      join df on df.b = pb.b
      join fnd on fnd.id = pb.id
     where df.n <= case when fnd.category = 'language_slip' then 12 else 4 end
       and not (pb.w1 in (select w from names) and pb.w2 in (select w from names) and pb.w3 in (select w from names))
       -- at least two content words: a run of stop words ("who says they") is not a phrase
       and (select count(*) from (values (pb.w1), (pb.w2), (pb.w3)) v(w) where v.w not in (select w from stop)) >= 2
  ),
  hits as (
    select k.id, fb.item, fb.field, array_agg(distinct k.b) as shared
      from keep k
      join fb on fb.b = k.b
      join fnd on fnd.id = k.id
     where not (fb.item = fnd.item_name and fb.field = fnd.field)
       and not (fb.item = fnd.item_name and fnd.field = 'secret' and fb.field = 'secrets')   -- same text stored twice
       and not exists (select 1 from fnd f2 where f2.item_name = fb.item and f2.field = fb.field)
     group by k.id, fb.item, fb.field
  )
  select h.id, fnd.category::text, fnd.item_name::text, fnd.field::text, h.item, h.field,
         array_to_string(h.shared, ' | '),
         (array_length(string_to_array(fnd.qn, ' '), 1) >= 4 and strpos(nt.t, trim(fnd.qn)) > 0),
         replace(substr(nt.raw, greatest(strpos(lower(nt.raw), split_part(h.shared[1], ' ', 1)) - 60, 1), 200), E'\n', ' ')
    from hits h
    join fnd on fnd.id = h.id
    join norm nt on nt.item = h.item and nt.field = h.field
   order by fnd.item_name, fnd.field, h.item, h.field;
end;
$fn$;

comment on function public.list_review_twin_candidates(uuid) is
  'ADR-0163 item 2. Alert-only: fields that repeat a distinctive three-word phrase of a reviewer finding in another field. A twin_field ending in _pointform is the stale-summary kind (also covered by the pointform resync). exact_repeat = the whole flagged quote (4+ words) recurs verbatim.';
