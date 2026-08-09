-- ADR-0071: recent sales notification popup
-- Nullable, additive: cardholder first name captured at checkout (stripe-webhook to populate separately)
alter table public.conversations
  add column if not exists purchaser_first_name text;

-- Narrow read-only surface for the anonymous recent-sales popup.
-- Deliberately does NOT expose conversations directly (chat content + email live there,
-- and payment fields are guarded per ADR-0032/0033) -- only these three safe columns.
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
  select title, purchaser_first_name, purchase_date
  from public.conversations
  where is_paid = true
    and purchase_date is not null
    and title is not null
  order by purchase_date desc
  limit greatest(1, least(limit_count, 50));
$$;

grant execute on function public.get_recent_public_sales(int) to anon, authenticated;
