-- Hybrid cadence support: priority column + composite index.
-- New blog post pins (auto-seeded when a post publishes) get priority=1 → jump the queue.
-- Backlog pins default to 10 → fill gaps when no fresh content is ready.
-- Make.com search orders by priority ASC, scheduled_date ASC, so a new post always wins
-- against a backlog pin scheduled for the same day.

alter table public.pinterest_pins add column priority smallint not null default 10;

create index pinterest_pins_priority_scheduled_idx
  on public.pinterest_pins (priority, scheduled_date);

comment on column public.pinterest_pins.priority is
  'Lower number = higher priority. New blog post pins get priority=1 (jump queue); backlog defaults to 10. Make.com query orders by priority ASC, scheduled_date ASC.';
