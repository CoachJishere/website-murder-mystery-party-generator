-- ADR-0139: paid orders whose generation never started.
--
-- Generation is started only by the customer's browser (the "Generate my mystery" button on the post-payment page). The Stripe
-- webhook marks the order paid but never starts anything. If the customer pays and leaves without clicking, no package row and no
-- generation_attempts row ever exist and nothing detects it (2 of the last ~37 paid orders: 2026-09-15 "The Gilded Cage",
-- 2026-10-04 "Murder By Copy", the latter sat 7h22m).
--
-- list_paid_unstarted_orders() is the detector; the rescue-unstarted-orders edge function (cron every 2 minutes) starts generation for
-- each hit through mystery-webhook-trigger and emails an alert. "Unstarted" = paid, no package row, and NO generation_attempts row at
-- all, so a customer who clicked (even if the click failed or needed more info) is never double-started by the rescue.

create or replace function public.list_paid_unstarted_orders(
  min_age_minutes integer default 3,
  max_age_hours integer default 72
) returns table (conversation_id uuid, title text, purchase_date timestamptz, age_minutes integer, player_count integer, mystery_style text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.title, c.purchase_date,
         (extract(epoch from (now() - c.purchase_date)) / 60)::integer,
         c.player_count, c.mystery_style
  from conversations c
  where c.is_paid is true
    and c.purchase_date is not null
    and c.purchase_date <= now() - make_interval(mins => min_age_minutes)
    and c.purchase_date >= now() - make_interval(hours => max_age_hours)
    and not exists (select 1 from mystery_packages p where p.conversation_id = c.id)
    and not exists (select 1 from generation_attempts a where a.conversation_id = c.id)
  order by c.purchase_date;
$$;

revoke all on function public.list_paid_unstarted_orders(integer, integer) from public, anon, authenticated;
grant execute on function public.list_paid_unstarted_orders(integer, integer) to service_role;

select cron.schedule(
  'rescue-unstarted-orders',
  '*/2 * * * *',
  $cron$
  select net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/rescue-unstarted-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
