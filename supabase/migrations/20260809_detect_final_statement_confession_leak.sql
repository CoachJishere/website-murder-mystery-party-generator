-- ADR-0067 follow-up: even with the corrected Call 4/5 prompt (and later the Sonnet
-- upgrade), the model doesn't always follow the "final_guilty/final_accomplice is a
-- denial, not a confession" instruction — confirmed directly in a live test (2/5
-- characters still opened with "I did it" despite the fix). Detector, not just a
-- prompt fix, per this codebase's established pattern of pairing prevention with
-- detection (ADR-0042, ADR-0064).
--
-- Scoped to reveal_confession_guilty/accomplice IS NOT NULL specifically: a package
-- generated BEFORE ADR-0067 has a confession in final_guilty by original design, not
-- by bug (that WAS the old, deliberate structure) — this detector only fires for
-- packages that went through the new split and still leaked a confession into the
-- wrong field.
create or replace function public.list_packages_with_final_statement_confession_leak(
  _since timestamp with time zone default '2026-08-06 00:00:00+00'::timestamp with time zone
)
returns table(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, characters text[])
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  with leaked as (
    select mp.id as package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at, mc.character_name
    from mystery_packages mp
    join conversations c on c.id = mp.conversation_id
    join mystery_characters mc on mc.package_id = mp.id
    where (mp.generation_status->>'status') in ('completed', 'needs_review') and mp.created_at >= _since
      and mp.mystery_style = 'character'
      and (
        (mc.reveal_confession_guilty is not null and mc.final_guilty ~* '\mI (did it|killed|poisoned|stabbed|shot|struck)\M')
        or
        (mc.reveal_confession_accomplice is not null and mc.final_accomplice ~* '\mI (helped (him|her|them)|stood watch)\M')
      )
  )
  select package_id, conversation_id, title, is_paid, created_at,
         array_agg(distinct character_name order by character_name) as characters
  from leaked
  group by package_id, conversation_id, title, is_paid, created_at
  order by is_paid desc, created_at desc;
$function$;
