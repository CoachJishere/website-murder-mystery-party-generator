-- ADR-0103 Addendum 99, Update 3: character sheets whose `secret` (or `relationships`) is not written to the player in second person.
-- The sections are headed "YOUR SECRET" / "YOUR RELATIONSHIPS" and the point-form is second person, but Call 1 of the Child prompt only
-- fixed the person of the SPOKEN fields (first person), so English secrets mostly came out in third or first person ("Lola is older than
-- the studio has claimed", "I was Xorg's secret lover"). Child67 adds the rule; this lister measures whether it holds.
-- ENGLISH PACKAGES ONLY: Spanish, Italian and Portuguese drop the subject pronoun ("Tienes", "Hai"), and other languages have their own
-- forms, so a pronoun test would be noise there. Detection only, no heal (the fix is a rewrite), not part of the completion gate, not alerted:
-- before Child67 is live it flags almost every English package, so it is a sweep and before/after tool. The "Why This Matters" tail is
-- excluded from the secret test because it is often second person even when the paragraphs above it are not.
create or replace function public.list_packages_with_sheet_wrong_person(_since timestamptz default '2026-09-01 00:00:00+00')
returns table(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamptz, english_characters integer, bad_secrets integer, bad_relationships integer, characters text[])
language sql stable
set search_path = public, pg_temp
as $$
  with chars as (
    select p.id pid, p.conversation_id cid, p.title, cv.is_paid, p.created_at, c.character_name,
      (select count(*) from regexp_matches(coalesce(c.introduction, ''), '\m(the|and|that|with)\M', 'gi')) >= 4 as is_en,
      regexp_replace(regexp_replace(coalesce(c.secret, ''), '^## [^\n]*\s+', ''), '\*\*[^*]*\*\*.*$', '', 's') !~* '\m(you|your|yours|yourself)\M' as secret_bad,
      (length(coalesce(c.relationships #>> '{}', '')) > 200
        and regexp_replace(coalesce(c.relationships #>> '{}', ''), '^## [^\n]*\s+', '') !~* '\m(you|your|yours)\M') as rel_bad
    from public.mystery_packages p
    join public.mystery_characters c on c.package_id = p.id
    join public.conversations cv on cv.id = p.conversation_id
    where p.created_at >= _since
  )
  select pid, cid, title, bool_or(is_paid), created_at,
         count(*)::int,
         (count(*) filter (where secret_bad))::int,
         (count(*) filter (where rel_bad))::int,
         array_agg(character_name order by character_name) filter (where secret_bad or rel_bad)
  from chars
  where is_en
  group by pid, cid, title, created_at
  having count(*) filter (where secret_bad or rel_bad) > 0
  order by created_at desc;
$$;
comment on function public.list_packages_with_sheet_wrong_person(timestamptz) is
  'ADR-0103 Addendum 99 Update 3: English packages with character secrets/relationships not written to the player in second person. Sweep and before/after tool, not a gate, not alerted.';
