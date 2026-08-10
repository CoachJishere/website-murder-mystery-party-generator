-- ADR-0071 follow-up: displaying a real first name publicly is a distinct
-- processing purpose from fulfilling the purchase, and needs its own consent --
-- gated on explicit opt-in captured at purchase time, defaulting to false.
alter table public.conversations
  add column if not exists social_proof_opt_in boolean not null default false;

create or replace function public.get_recent_public_sales(limit_count int default 15)
returns table (
  mystery_title text,
  purchaser_first_name text,
  purchased_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    title,
    case when social_proof_opt_in then purchaser_first_name else null end,
    purchase_date
  from public.conversations
  where is_paid = true
    and purchase_date is not null
    and title is not null
  order by purchase_date desc
  limit greatest(1, least(limit_count, 50));
$$;

grant execute on function public.get_recent_public_sales(int) to anon, authenticated;
