-- Pinterest pin pipeline: rows seeded from blog inventory, generated via Imagen 4 + Sharp,
-- posted to Pinterest by Make.com once status flips to 'generated'.

create table public.pinterest_pins (
  id uuid primary key default gen_random_uuid(),
  blog_post_url text not null,
  blog_post_title text,
  theme_category text,
  pinterest_board text,
  pin_title text,
  pin_description text,
  image_prompt text not null,
  overlay_text text not null,
  pin_image_url text,
  raw_image_url text,
  status text not null default 'draft'
    check (status in ('draft','approved','generating','generated','posted','failed')),
  scheduled_date date,
  generation_error text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pinterest_pins_status_scheduled_idx
  on public.pinterest_pins (status, scheduled_date);

create index pinterest_pins_blog_post_url_idx
  on public.pinterest_pins (blog_post_url);

alter table public.pinterest_pins enable row level security;

create or replace function public.set_pinterest_pins_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pinterest_pins_updated_at
  before update on public.pinterest_pins
  for each row execute function public.set_pinterest_pins_updated_at();

insert into storage.buckets (id, name, public)
values ('pinterest-pins', 'pinterest-pins', true)
on conflict (id) do nothing;
