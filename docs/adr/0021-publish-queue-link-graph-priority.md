# 0021 — Order the daily publish queue by link-graph importance

**Status:** Accepted
**Date:** 2026-06-23

## Context

The blog is the primary acquisition channel (see the north-star doc). ~420 EN posts were written; they are released one per day by the `publish-daily-blog.yml` GitHub Action, which flipped the next draft from `status='draft'` to `'published'`.

That workflow selected the next post with:

```
/rest/v1/blog_posts?language=eq.en&status=eq.draft&order=created_at.asc&limit=1
```

i.e. **the oldest draft by creation date** — purely chronological, blind to each page's value or position in the site's link graph. Two problems followed:

1. **High-value pages waited months.** Cross-links are defined in `cross_link_map.json`: `murder-mystery-party-ideas` is an intended link target of **196** other posts, `murder-mystery-party-for-adults-guide` of 128, `first-time-hosting-…` of 69. These hubs sat unpublished behind low-traffic theme posts that happened to be created earlier.

2. **Dead internal links accumulated.** Cross-links are injected into a post's body *at publish time* (`apply-crosslinks.mjs`). A published post that links to a still-draft target produces a live 404. By 2026-06-23 an audit of the 152 live posts found **166 dead internal-link instances** across 57 targets — 51 of which were finished-but-unpublished drafts. (Those 51 were published and 6 orphan links removed in the same session; dead links 166 → 0.)

## Decision

Order the publish queue by **link-graph importance**: a draft's intended in-degree in `cross_link_map.json` — how many source posts are designed to link to it — descending, tie-broken by `created_at` ascending (preserving the old stable order within a priority band).

Implemented as `scripts/pick-next-draft.mjs`:
- reads `cross_link_map.json`, sums each slug's appearances across every source's `links_to` array → in-degree;
- queries Supabase for remaining EN drafts;
- prints the single highest-priority slug (or a ranked `--table=N` for humans).

`publish-daily-blog.yml` now calls `node scripts/pick-next-draft.mjs` instead of the `order=created_at.asc` REST query. If `cross_link_map.json` is absent the script falls back to `created_at` order — the historical behaviour — so the workflow degrades safely.

## Rationale

- **Equity first.** The most-linked-to pages carry the most internal PageRank and serve the most navigational paths; publishing them first front-loads the SEO value of the remaining queue.
- **Fewer new dead links.** Publishing high-in-degree targets early means that when their many referrers publish, the target is already live — the opposite of the chronological order that created the 166-link backlog.
- **No schema change, self-maintaining.** The signal lives in `cross_link_map.json` (already checked out by the workflow). Computing it at run time means the order tracks the map automatically when it is regenerated (e.g. the quarterly refresh). A `publish_priority` column would have to be recomputed and kept in sync; a SQL view can't see the map at all.
- **Simple and reversible.** One script + a one-line workflow change. Revert = restore the old REST query.

## Alternatives considered

- **`publish_priority` integer column on `blog_posts`.** Durable and queryable, but needs a migration and a recompute job whenever the map changes; the value silently goes stale otherwise. Rejected for the maintenance burden.
- **Live Supabase view counting inbound links from published content.** Considered, but after the 51-draft cleanup every remaining draft has 0 inbound links *from published posts* — the signal had been exhausted. The intended graph (the map) is the only stable source of importance, and the DB can't read it. Rejected.
- **Count inbound links from all posts (published + draft) in SQL.** Also collapsed to 0 for the remaining drafts — the existing content links only to the already-published target set. The map captures intended structure that the materialised content does not. Rejected.
- **Topological order (targets strictly before sources).** Would drive dead links to exactly zero, but the link graph has cycles, so no clean topo sort exists. In-degree-desc is the pragmatic proxy. Not pursued.

## Consequences

- The next daily run publishes `murder-mystery-brunch-party-guide` (in-degree 15) rather than the chronological pick. The top of the queue is now hub/theme pages with 5–15 intended inbound links each.
- Residual issue, **not** solved here: `apply-crosslinks.mjs` still injects links to draft targets, so a low-priority source can still publish before a low-priority target and create a *temporary* dead link. Reprioritisation greatly reduces this but does not eliminate it. Tracked for a follow-up: gate cross-link injection (or the rot-signal gate) on target publish status. Logged in vault `00_INBOX/publish-queue-prioritization-2026-06-23-mystery-maker.md`.
- A weekly check belongs in the SEO digest: remaining-draft count, the next few prioritised slugs, and a live dead-link count, so regressions surface where they'll be seen.

## Key files

- `scripts/pick-next-draft.mjs` — the picker (new)
- `.github/workflows/publish-daily-blog.yml` — step 1 now calls the picker
- `cross_link_map.json` — source of the in-degree signal
- `scripts/apply-crosslinks.mjs` — injects the links at publish time (residual dead-link source)

## Discussion

The debate was where the priority signal should live. The instinct was a DB-side ranking (column or view) so the workflow stays a thin REST call. But the importance we care about is *designed* link structure, which exists only in `cross_link_map.json`, not in the materialised post content — and certainly not after the cleanup that zeroed out every remaining draft's measured in-degree. Moving the few lines of ranking logic into a script that reads the map directly was both simpler and more correct than trying to mirror the map into Postgres. Keeping a `created_at` fallback means the workflow never hard-depends on the map file being present.
