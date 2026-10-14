-- ADR-0163 item 4: string-level artefacts that the hand sweeps keep finding and no detector covers.
-- Labelled misses: stray closing bold `not a confession.**` (Lip Sync), stray `}` at the end of a confession (Emma), paragraphs indented four
-- spaces that render as a code block (Vellacourt), a combining acute accent inside a word (Tijdcapsule). Alert-only: read-only function, not in
-- the completion gate and not in any heal. Corpus 2026-08-26 to 2026-10-14: 5 odd-bold hits (all unswept packages), 0 for the other three.
-- Deliberately NOT included: "first paragraph bold" (1120 legitimate bold lines in the same window).

create or replace function public.list_stray_markup(_pkg uuid default null, _since timestamptz default (now() - interval '60 days'))
returns table (package_id uuid, title text, item text, field text, kind text, snippet text)
language sql
stable
set search_path = public, pg_temp
as $fn$
  with f as (
    select c.package_id, p.title::text as title, c.character_name::text as item, e.key as field, e.value as txt
      from mystery_characters c
      join mystery_packages p on p.id = c.package_id
      cross join lateral jsonb_each_text(to_jsonb(c)) e
     where e.value is not null and length(e.value) > 0
       and (_pkg is null and p.created_at >= _since or c.package_id = _pkg)
       and (e.key = any (array['description','background','relationships','secret','introduction','rumors','accusations','final_statement',
                               'reveal_confession_guilty','reveal_confession_accomplice','round2_script','round3_script','round4_script'])
            or e.key ~ '^(round[234]|final)_(questions|innocent|guilty|accomplice)$')
    union all
    select p.id, p.title::text, 'PACKAGE DOCUMENTS', d.k, d.v
      from mystery_packages p
      cross join lateral (values ('game_overview', p.game_overview), ('detective_script', p.detective_script), ('materials', p.materials)) d(k, v)
     where d.v is not null and length(d.v) > 0 and (_pkg is null and p.created_at >= _since or p.id = _pkg)
  ),
  hits as (
    select package_id, title, item, field, 'odd_bold'::text as kind, right(txt, 80) as snippet
      from f where ((length(txt) - length(replace(txt, '**', ''))) / 2) % 2 = 1
    union all
    select package_id, title, item, field, 'brace', substring(txt from '.{0,40}[{}].{0,40}') from f where txt ~ '[{}]'
    union all
    select package_id, title, item, field, 'indent4', substring(txt from '(?:^|\n\n)( {4,}\S.{0,60})') from f where txt ~ '(^|\n\n) {4,}\S'
    union all
    select package_id, title, item, field, 'combining_mark', substring(txt from '.{0,20}[̀-ͯ].{0,20}') from f where txt ~ '[̀-ͯ]'
  )
  select * from hits order by title, item, field, kind;
$fn$;

comment on function public.list_stray_markup(uuid, timestamptz) is
  'ADR-0163 item 4. Alert-only. Odd number of ** pairs, stray { or }, paragraphs indented 4+ spaces, combining accent marks, in guest-facing character and document fields.';
