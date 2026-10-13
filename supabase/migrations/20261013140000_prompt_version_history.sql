-- ADR-0153 Update 1 item 4 (2026-10-13): which Make prompt version generated a package. The version is not stored on the package; it is inferred from
-- WHEN the package was generated against a log of when each Parent/Child blueprint version was imported. Rows for 2026-10-01 to 2026-10-13 are seeded
-- from CHANGELOG.md and CLAUDE.md (date only, so approximate = true, times staggered by version number so same-day imports order correctly).
-- From now on: when Jonathan says a version is imported, insert one row with the real time (approximate = false).
create table if not exists public.prompt_version_history (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('parent','child')),
  version int not null,
  name text,
  effective_from timestamptz not null,
  approximate boolean not null default true,
  note text,
  unique (kind, version)
);
alter table public.prompt_version_history enable row level security;
-- no policies: only the service role and the SECURITY DEFINER function below can read it.

insert into public.prompt_version_history (kind, version, effective_from, note) values
 ('child',48,'2026-10-01 12:48+00','seeded from CHANGELOG'),('child',49,'2026-10-02 12:49+00','seeded'),('child',51,'2026-10-02 12:51+00','seeded'),
 ('child',55,'2026-10-03 12:55+00','contains Child52, 53, 54'),('child',57,'2026-10-04 12:57+00','contains Child56'),('child',58,'2026-10-06 12:58+00','seeded'),
 ('child',59,'2026-10-06 12:59+00','Sonnet 5.5 medium adaptive'),('child',60,'2026-10-07 13:00+00','textResponse read'),('child',61,'2026-10-08 12:00+00','textResponse fallback'),
 ('child',62,'2026-10-13 08:00+00','Danish and Swedish label tables'),('child',63,'2026-10-13 13:00+00','quote talk removed'),
 ('parent',71,'2026-10-01 13:11+00','seeded'),('parent',72,'2026-10-02 12:00+00','seeded'),('parent',73,'2026-10-02 13:13+00','seeded'),
 ('parent',74,'2026-10-04 12:14+00','closing slot not bracketed'),('parent',75,'2026-10-04 12:15+00','prompt prevention'),('parent',76,'2026-10-06 12:16+00','slip reveal names no one'),
 ('parent',77,'2026-10-06 12:17+00','seeded'),('parent',79,'2026-10-06 12:19+00','Sonnet 5.5 medium adaptive'),('parent',80,'2026-10-07 12:20+00','textResponse read'),
 ('parent',81,'2026-10-08 12:01+00','textResponse fallback'),('parent',83,'2026-10-12 12:03+00','overview public info only'),('parent',84,'2026-10-13 09:00+00','materials language anchor'),
 ('parent',85,'2026-10-13 13:00+00','image prompt retry copies synced')
on conflict (kind, version) do nothing;

-- Parent version at package creation, Child version 45 minutes later (the Child runs within about an hour of creation; completion time is wrong for held or re-fired packages).
create or replace function public.package_prompt_versions(_created timestamptz, _completed timestamptz default null)  -- _completed is ignored, kept so the signature never changed
returns table(parent_version int, child_version int, approximate boolean)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  with p as (select version, approximate from prompt_version_history where kind='parent' and effective_from <= _created order by effective_from desc limit 1),
       c as (select version, approximate from prompt_version_history where kind='child' and effective_from <= _created + interval '45 minutes' order by effective_from desc limit 1)
  select (select version from p), (select version from c), coalesce((select approximate from p) or (select approximate from c), true);
$$;

create or replace view public.mystery_packages_prompt_versions with (security_invoker = true) as
  select mp.id as package_id, mp.created_at, v.parent_version, v.child_version, v.approximate
  from public.mystery_packages mp
  cross join lateral public.package_prompt_versions(mp.created_at) v;
