-- Wire pinterest_pins to the source blog post (uuid FK) and add the 1.91:1 blog hero crop URL.
-- The blog hero is generated alongside the Pinterest pin in the same run-generation call —
-- one Imagen output, three derivatives: pin (1000x1500), raw (1024x1024), blog hero (1200x630).

alter table public.pinterest_pins
  add column blog_post_id uuid references public.blog_posts(id) on delete set null,
  add column blog_hero_url text;

create index pinterest_pins_blog_post_id_idx on public.pinterest_pins (blog_post_id);
