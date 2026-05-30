-- Auto-create a draft pinterest_pins row whenever an EN blog post becomes published.
-- The Edge Function fill-pinterest-creative picks up these drafts (status='draft' AND pin_title IS NULL)
-- on a schedule, calls Claude API to generate the creative, and flips status to 'approved'.

create or replace function public.create_pinterest_pin_for_published_post()
returns trigger language plpgsql security definer as $$
begin
  -- Only fire when transitioning to published or inserting as published.
  -- Only EN posts. Skip if a pinterest_pin already exists for this blog post.
  if new.status = 'published' and new.language = 'en' and (
       tg_op = 'INSERT'
       or (tg_op = 'UPDATE' and (old.status is distinct from 'published'))
     )
     and not exists (select 1 from public.pinterest_pins where blog_post_id = new.id)
  then
    insert into public.pinterest_pins (
      blog_post_id, blog_post_url, blog_post_title,
      image_prompt, overlay_text,
      status, priority, scheduled_date
    ) values (
      new.id,
      'https://www.mysterymaker.party/blog/' || new.slug,
      new.title,
      '',  -- placeholder; Edge Function will fill
      '',  -- placeholder
      'draft',
      1,   -- priority=1 → new posts jump the queue ahead of priority=10 backlog
      current_date  -- post on the day it publishes; Make.com picks it up next run
    );
  end if;
  return new;
end;
$$;

drop trigger if exists blog_posts_create_pinterest_pin on public.blog_posts;

create trigger blog_posts_create_pinterest_pin
after insert or update of status on public.blog_posts
for each row execute function public.create_pinterest_pin_for_published_post();

comment on function public.create_pinterest_pin_for_published_post() is
  'Seeds a draft pinterest_pins row when a blog post becomes published. Edge Function fill-pinterest-creative completes the row asynchronously.';
