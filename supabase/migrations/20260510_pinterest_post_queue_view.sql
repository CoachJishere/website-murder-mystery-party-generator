-- Pre-sorted queue view for Make.com. Returns ready-to-post pins in the right order:
-- new-publish (priority=1) wins over backlog (priority=10) on tie.
-- Make.com Search Rows hits this view; UPDATEs still target the underlying pinterest_pins table.

create or replace view public.pinterest_post_queue as
select *
from public.pinterest_pins
where status = 'generated'
  and scheduled_date is not null
  and scheduled_date <= current_date
order by priority asc, scheduled_date asc, created_at asc;

comment on view public.pinterest_post_queue is
  'Pre-ordered queue of pins ready for Pinterest posting. Make.com Search Rows hits this view (table=pinterest_post_queue, limit=1). Updates still go to pinterest_pins.';

grant select on public.pinterest_post_queue to anon, authenticated, service_role;
