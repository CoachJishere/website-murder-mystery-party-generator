-- ADR-0103 Addendum 108 (2026-10-17): "The Great Pumpkin Heist At The D Loop Halloween Party" came back with master_context, game_overview,
-- detective_script, evidence_cards and materials in Portuguese for an all-English order (chat English, trigger logged [Language] "en", the
-- character sheets English). Nothing noticed: the materials-vs-overview check compares two Parent fields that were both Portuguese, and no
-- gate compared the Parent output with the conversation. This compares the stopword score of the conversation's language against the same
-- language in game_overview + detective_script (same word lists as text_language_scores). Flags when the conversation's language is
-- clear (top score >= 0.10), the Parent text's top language is a different one with score >= 0.10, and the Parent text scores the
-- conversation's language at less than half of that. Zero hits over 2026-09-01 onward before this package was repaired (no false positives).
-- Detection only: the repair is a translation or a paid re-fire, so it escalates to a human sweep.
create or replace function public.package_parent_language_mismatch(_pkg mystery_packages)
returns text[] language sql stable security definer set search_path to 'public','pg_temp' as $$
  with conv as (
    select left(string_agg(m.content, ' ' order by m.created_at), 20000) t from messages m where m.conversation_id = _pkg.conversation_id
  ),
  c as (select lang, r from public.text_language_scores((select t from conv)) order by r desc limit 1),
  ptxt as (select left(coalesce(_pkg.game_overview,'') || ' ' || coalesce(_pkg.detective_script,''), 20000) t),
  p as (select lang, r from public.text_language_scores((select t from ptxt)) order by r desc limit 1),
  pc as (select r from public.text_language_scores((select t from ptxt)) x where x.lang = (select lang from c))
  select case
    when coalesce(array_length(regexp_split_to_array(btrim((select t from ptxt)), '\s+'), 1), 0) < 60 then null
    when (select r from c) >= 0.10 and (select r from p) >= 0.10 and (select lang from p) <> (select lang from c)
         and coalesce((select r from pc), 0) < 0.5 * (select r from p)
      then array['overview_script=' || (select lang from p) || ' conversation=' || (select lang from c)]
    else null end;
$$;

create or replace function public.list_packages_with_parent_language_mismatch(_since timestamp with time zone default '2026-09-01 00:00:00+00')
returns table(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, mismatch text)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  select mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, (public.package_parent_language_mismatch(mp))[1]
  from mystery_packages mp join conversations c on c.id = mp.conversation_id
  where (mp.generation_status->>'status' in ('completed','needs_review'))
    and mp.created_at >= _since
    and public.package_parent_language_mismatch(mp) is not null
  order by c.is_paid desc, mp.created_at desc;
$$;

-- Gate: add the check to package_completion_blocking_defects() without re-pasting the whole function (idempotent).
do $do$
declare d text; anchor text := E'  IF array_length(_defects, 1) IS NULL THEN\n    RETURN NULL;\n  END IF;\n  RETURN _defects;';
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p where p.proname = 'package_completion_blocking_defects';
  if d like '%package_parent_language_mismatch%' then return; end if;
  if position(anchor in d) = 0 then raise exception 'anchor not found in package_completion_blocking_defects'; end if;
  d := replace(d, anchor,
    E'  -- ADR-0103 Addendum 108: Parent output (overview and detective script) in another language than the conversation. Detection-only.\n'
    || E'  FOR _hit IN\n    SELECT unnest(coalesce(public.package_parent_language_mismatch(_pkg), ARRAY[]::text[])) AS key\n  LOOP\n'
    || E'    _defects := _defects || (''parent_language_mismatch.'' || _hit.key);\n  END LOOP;\n\n' || anchor);
  execute d;
end
$do$;
