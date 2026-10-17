-- ADR-0103 Addendum 109 (2026-10-17): "The Triwizard Tournament Murder" (4b0f83c9) came back with evidence_cards in French (rounds 3 and 4 fully,
-- the round 2 title) on an all-English order, while game_overview, detective_script and the sheets were English. package_parent_language_mismatch
-- (Addendum 108) reads only game_overview + detective_script, so nothing in the gate saw it; the reviewer found it, and its +p2 pass then translated
-- one English sentence INTO French. Second Parent language drift in two days (the first was the Great Pumpkin Heist, Portuguese).
-- Same test as package_parent_language_mismatch, applied to the evidence cards: the conversation's language is clear (top score >= 0.10), the
-- cards' top language is another one with score >= 0.10, and the cards score the conversation's language at less than half of that.
-- Corpus check 2026-08-15 onward with the live function: 1 hit, the Triwizard package (true). An ad hoc 6000-character version of the same test
-- also hit "Murder Under Golden Stars" (Swedish chat, customer chose English cards; a decision, not a defect), the live version does not. ALERT-ONLY, deliberately not in package_completion_blocking_defects(): the repair
-- is a free translation, and a gate hit would hold a package like Golden Stars that is correct as delivered.
create or replace function public.package_evidence_cards_language_mismatch(_pkg mystery_packages)
returns text[] language sql stable security definer set search_path to 'public','pg_temp' as $$
  with conv as (
    select left(string_agg(m.content, ' ' order by m.created_at), 20000) t from messages m where m.conversation_id = _pkg.conversation_id
  ),
  c as (select lang, r from public.text_language_scores((select t from conv)) order by r desc limit 1),
  ctxt as (select left(coalesce(_pkg.evidence_cards #>> '{}', ''), 20000) t),
  p as (select lang, r from public.text_language_scores((select t from ctxt)) order by r desc limit 1),
  pc as (select r from public.text_language_scores((select t from ctxt)) x where x.lang = (select lang from c))
  select case
    when coalesce(array_length(regexp_split_to_array(btrim((select t from ctxt)), '\s+'), 1), 0) < 40 then null
    when (select r from c) >= 0.10 and (select r from p) >= 0.10 and (select lang from p) <> (select lang from c)
         and coalesce((select r from pc), 0) < 0.5 * (select r from p)
      then array['evidence_cards=' || (select lang from p) || ' conversation=' || (select lang from c)]
    else null end;
$$;

create or replace function public.list_packages_with_evidence_cards_language_mismatch(_since timestamp with time zone default '2026-09-01 00:00:00+00')
returns table(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, mismatch text)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  select mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, (public.package_evidence_cards_language_mismatch(mp))[1]
  from mystery_packages mp join conversations c on c.id = mp.conversation_id
  where (mp.generation_status->>'status' in ('completed','needs_review'))
    and mp.created_at >= _since
    and public.package_evidence_cards_language_mismatch(mp) is not null
  order by c.is_paid desc, mp.created_at desc;
$$;
