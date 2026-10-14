-- ADR-0163 item 5, ABANDONED. Kept only so the repo matches the live database (the drop of this function was declined).
-- Safe to remove: drop function public._pronoun_scan(uuid);
-- Why abandoned: it looks for a gendered pronoun within 30 characters after a character's first name. A regex window cannot tell who the
-- pronoun refers to ("Toni/Tony needed the hours she took" - she is the victim). As a per-name consistency check it flagged 37 names in 20
-- packages since 2026-10-01 (mostly the majority pronoun plus one stray), and as a dual-name check 60 packages with 2 to 68 hits each; the
-- hits read were almost all noise. See ADR-0163 Addendum 4.
create or replace function public._pronoun_scan(_pkg uuid)
returns table (subject text, pclass text, item text, field text, snippet text)
language sql stable
set search_path = public, pg_temp
as $fn$
  with subj as (
    select distinct tok from (
      select (regexp_match(btrim(side), '^[^[:space:]]+'))[1] as tok
        from mystery_characters c cross join lateral regexp_split_to_table(c.character_name, '/') side
       where c.package_id = _pkg
    ) s
    where tok ~ '^[[:upper:]][[:alpha:]'']{2,}$'
      and lower(tok) not in ('the','and','von','van','der','den','mrs','miss','lady','lord','sir','madame','mister','captain','professor','doctor','detective','inspector','agent','dame','madam','king','queen','prince','princess','chef','dr','mr','ms','baron','count','countess','reverend','father','mother','sister','brother','uncle','aunt','grandma','grandpa','nurse','officer','sheriff','judge','colonel','general','major','sergeant','lieutenant','master','mistress','miss','young','old','big','little','sweet')
  ),
  fld as (
    select c.character_name::text as item, e.key as field, e.value as txt
      from mystery_characters c cross join lateral jsonb_each_text(to_jsonb(c)) e
     where c.package_id = _pkg and e.value is not null and length(e.value) > 0
       and e.key ~ '^(description|background|relationships|secret|introduction|rumors|accusations|final_statement|reveal_confession_(guilty|accomplice)|round[234]_(script|questions|innocent|guilty|accomplice)|final_(innocent|guilty|accomplice))(_pointform)?$'
  )
  select s.tok, case when m.pr in ('he','him','his','himself') then 'masc' when m.pr in ('she','her','hers','herself') then 'fem' else 'neut' end,
         f.item, f.field, m.snip
    from subj s
    join fld f on f.txt like '%' || s.tok || '%'
    cross join lateral (
      select (r)[1] as pr, substr(f.txt, greatest(strpos(f.txt, s.tok) - 20, 1), 110) as snip
        from regexp_matches(f.txt, '\m' || s.tok || '\M(?![''’]s)[^.!?,;:\n[:upper:]]{0,30}?\m(he|him|his|himself|she|her|hers|herself|they|them|their|theirs|themself|themselves)\M', 'g') r
    ) m;
$fn$;
comment on function public._pronoun_scan(uuid) is 'ABANDONED prototype (ADR-0163 Addendum 4): a regex window cannot resolve who a pronoun refers to, precision near zero. Safe to drop: drop function public._pronoun_scan(uuid);';
