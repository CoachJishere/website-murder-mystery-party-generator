-- Add a composite (status, id) index on blog_posts.
--
-- Context: scripts/prerender-blog.mjs paginates published posts via
-- `.eq('status','published').order('id').range(from, from+99)`. With only
-- the existing single-column `idx_blog_posts_status` index, that query has
-- no way to get rows pre-sorted by id -- Postgres must fetch ALL published
-- rows (2652 as of 2026-08-04) via the status index and fully re-sort them
-- by id on EVERY page of the loop (confirmed via EXPLAIN ANALYZE: ~350ms/page
-- even warm-cached), repeated ~27 times as the script pages through. This
-- compounded with a separate bug (deploy.yml not passing SUPABASE_SERVICE_KEY,
-- so the script silently ran as the `anon` role with a 3s statement_timeout)
-- to cause a real CI build failure (57014: statement timeout) on 2026-08-04.
-- The credentials bug is fixed separately; this index fixes the underlying
-- query cost so pagination stays cheap regardless of which role runs it or
-- how large the table grows.
--
-- With (status, id), the planner can do a single ordered index scan
-- filtered on status and already sorted by id -- no full-table sort per page.

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_id ON public.blog_posts (status, id);

-- The existing single-column idx_blog_posts_status is left in place
-- (status is still the composite index's leading column, so it's largely
-- redundant, but dropping it is out of scope for this fix).
