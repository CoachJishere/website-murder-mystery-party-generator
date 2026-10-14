-- ADR-0163 item 1: make the sweep exit criteria computable.
-- Additive only: new nullable columns, one data normalisation, one new view. No existing column or view is changed.

alter table public.package_review_misses
  add column if not exists cluster text,
  add column if not exists severity text,
  add column if not exists layer_owner text;

alter table public.package_review_misses drop constraint if exists package_review_misses_severity_check;
alter table public.package_review_misses add constraint package_review_misses_severity_check
  check (severity is null or severity in ('high','medium','low'));
alter table public.package_review_misses drop constraint if exists package_review_misses_layer_owner_check;
alter table public.package_review_misses add constraint package_review_misses_layer_owner_check
  check (layer_owner is null or layer_owner in ('prevent','detect','heal','reviewer','none'));

comment on column public.package_review_misses.cluster is 'ADR-0163 root-pattern cluster (C1..C16), not the category label';
comment on column public.package_review_misses.severity is 'high = spoiler, contradicts the game or loses a customer requirement; medium = wrong fact or voice a guest would notice; low = cosmetic. Backfilled 2026-10-14 from the cluster default with row overrides; new rows are set by the sweeper';
comment on column public.package_review_misses.layer_owner is 'layer that owns the pattern today (prevent/detect/heal/reviewer), or none when unowned; re-set when an owner ships';

alter table public.package_review_sweeps
  add column if not exists reviewer_ran_before_edit boolean,
  add column if not exists sweep_started_at timestamptz;

comment on column public.package_review_sweeps.reviewer_ran_before_edit is 'true only if the reviewer (and the +p2 pass) ran before the first hand edit; only these sweeps count toward recall (ADR-0103 Addendum 83)';

-- three spellings of the same value
update public.package_review_misses set found_by = 'hand_sweep' where found_by in ('sweep','hand sweep');

-- backfill: all 16 existing sweeps state in their note that the reviewer ran before the sweep edits
update public.package_review_sweeps set reviewer_ran_before_edit = true where reviewer_ran_before_edit is null;

with m as (select id, row_number() over (order by created_at, id) rn from public.package_review_misses),
cl(cluster, owner, sev, rns) as (values
  ('C1',  'detect',  'high',   array[2,3,4,5,10,12,68,69,71,72,73,74,77,79,80,82,83,84,85,86]),
  ('C1',  'detect',  'medium', array[46]),
  ('C2',  'none',    'high',   array[1,7,9,23,29,32,33,41,53,87,90,95,106,112,123,127]),
  ('C2',  'none',    'low',    array[59,60,100,113]),
  ('C3',  'none',    'medium', array[19,67,99,126]),
  ('C3',  'none',    'low',    array[13]),
  ('C4',  'none',    'medium', array[11,15,31,34,62,76,108,118,120,121]),
  ('C5',  'none',    'medium', array[8,16,25,26,30,36,45,47,107,39]),
  ('C6',  'detect',  'high',   array[22,38,61,102,115]),
  ('C6',  'detect',  'medium', array[24,54,55,63,75]),
  ('C6',  'detect',  'low',    array[124]),
  ('C7',  'none',    'medium', array[88,89,96,117,119,122,94,114]),
  ('C8',  'none',    'medium', array[17,70,97,103,125]),
  ('C9',  'heal',    'medium', array[43,48,49,50,51,52,91,101,104,110,111]),
  ('C9',  'heal',    'low',    array[44,105]),
  ('C10', 'heal',    'high',   array[6]),
  ('C10', 'heal',    'medium', array[35,56,57]),
  ('C11', 'detect',  'medium', array[20,93,27,65]),
  ('C11', 'detect',  'low',    array[18,28,64,78,81,109]),
  ('C12', 'none',    'low',    array[37,98,128]),
  ('C13', 'none',    'medium', array[14,21,40,42,116]),
  ('C16', 'prevent', 'high',   array[58,66,92])),
x as (select cluster, owner, sev, unnest(rns) rn from cl)
update public.package_review_misses t
   set cluster = x.cluster, layer_owner = x.owner, severity = x.sev
  from m join x using (rn)
 where t.id = m.id;

-- Stage-1/Stage-2 exit criteria of ADR-0163 as one query: last 8 valid sweeps per style, plus both styles together.
-- recall = real reviewer findings / (real + misses), the same definition as review_performance (human_verdict = 'real').
create or replace view public.sweep_exit_metrics as
with ranked as (
  select s.package_id, p.mystery_style as style,
         row_number() over (partition by p.mystery_style order by s.swept_at desc) as rk
    from public.package_review_sweeps s
    join public.mystery_packages p on p.id = s.package_id
   where s.reviewer_ran_before_edit is true
),
sel as (select package_id, style from ranked where rk <= 8),
per_pkg as (
  select sel.style, sel.package_id,
         (select count(*) from public.package_review_findings f where f.package_id = sel.package_id and f.human_verdict = 'real') as real_findings,
         (select count(*) from public.package_review_misses m where m.package_id = sel.package_id) as misses,
         (select count(*) from public.package_review_misses m where m.package_id = sel.package_id and m.severity = 'high') as high_misses,
         (select count(*) from public.package_review_misses m where m.package_id = sel.package_id and m.severity is null) as unrated_misses
    from sel
)
select coalesce(style, 'all') as scope,
       count(*) as sweeps,
       sum(real_findings) as real_findings,
       sum(misses) as misses,
       round(100.0 * sum(real_findings) / nullif(sum(real_findings) + sum(misses), 0)) as recall_pct,
       (percentile_cont(0.5) within group (order by misses))::numeric(6,1) as median_misses,
       sum(high_misses) as high_misses,
       sum(unrated_misses) as unrated_misses
  from per_pkg
 group by rollup (style);

comment on view public.sweep_exit_metrics is 'ADR-0163 Stage 1 criteria: recall_pct >= 85 per style, median_misses <= 3, high_misses = 0, over the last 8 valid sweeps per style. unrated_misses must be 0 for the view to be trusted.';
