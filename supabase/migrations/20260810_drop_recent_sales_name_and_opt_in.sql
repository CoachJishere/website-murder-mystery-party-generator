-- ADR-0071 final decision: title alone already reads as customized/real;
-- decided not to collect or display purchaser name/location at all, which
-- also sidesteps the consistency problem of a low opt-in rate producing a
-- mostly-anonymous, occasionally-named popup. Data minimization: don't keep
-- collecting a field we decided not to use.
drop function if exists public.get_recent_public_sales(int);

create function public.get_recent_public_sales(limit_count int default 15)
returns table (
  mystery_title text,
  purchased_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select title, purchase_date
  from public.conversations
  where is_paid = true
    and purchase_date is not null
    and title is not null
  order by purchase_date desc
  limit greatest(1, least(limit_count, 50));
$$;

grant execute on function public.get_recent_public_sales(int) to anon, authenticated;

alter table public.conversations
  drop column if exists purchaser_first_name,
  drop column if exists social_proof_opt_in;
