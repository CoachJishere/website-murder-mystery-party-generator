# 0034. Supabase egress outage and image-hosting strategy

## Status

Accepted

## Date

2026-07-17

## Context

On 2026-07-17 guests reported that every shared character link returned "access
denied" — a site-wide functional outage of the guest/host sharing flow. The
frontend (GitHub Pages) was fully healthy; the failure was entirely on the
Supabase data plane.

Root cause: the Supabase project's data API was returning **HTTP 402** —

> "Service for this project is restricted due to the following violations:
> `exceed_egress_quota`. The project owner must upgrade their plan or remove
> spend caps to restore service."

The org (`CoachJ's Org`, id `pkjpxvxrhzunkcluknls`) was on the **free plan**
(5 GB/month egress cap) and had blown past it. Every anon RPC the guest/host
pages depend on (`get_token_by_short_code`, `get_character_by_token`,
`get_character_details`, `get_packet_metadata_by_token`) returned 402, and
`CharacterAccess.tsx` treats that error as "assignment not found" → the
"access denied" card. The same restriction produced the "Supabase API error"
health-check failures (Issue #3, first seen **2026-07-10**) and the failing
daily encrypted backup. Note the management API still reported the project
`ACTIVE_HEALTHY` — that flag does not reflect the egress restriction, which is
what made the outage easy to misread as a frontend problem.

What consumed the egress: the **`pinterest-pins` Storage bucket** — a **public**
bucket holding 706 objects / 1.2 GB of multi-MB images (avg 1.75 MB), which
**only ever grows (no pruning)** and is served on the metered path. Upload
history shows a bulk spike of **367 pins / 660 MB on 2026-07-03** (and similar
206+88-pin batches in May). Public pin source images are re-crawled by Pinterest
repeatedly, so a monotonically growing pile of large public images being
re-fetched is a natural way to exhaust a 5 GB cap the week after a bulk drop.

**Critical dependency discovered during triage:** the `pinterest-pins` bucket is
not just Pinterest scratch space — `scripts/pinterest/upload-blog-hero.mjs`
uploads blog hero images into the *same* bucket, and **235 `blog_posts` rows have
`featured_image_url` pointing into it**. So the bucket is load-bearing for the
live blog. Naive pruning (delete old objects) would turn 235 blog hero images
into 404s.

Exact object-level egress attribution (Pinterest crawl vs. daily DB backup vs.
app traffic) is **not available** via the Supabase MCP tools — it lives only in
the dashboard billing → usage report. The stored-size and growth pattern point
squarely at the pins bucket, but this ADR does not claim a byte-level split.

## Decision

1. **Immediate fix (done): upgrade the org to Pro.** Pro includes 250 GB
   egress/month (~50× the free cap). The upgrade lifted the restriction
   immediately with no code change or redeploy — verified the anon RPC path
   returned HTTP 200 again right after.

2. **Defer the image migration off Supabase.** Do **not** move the pins/blog
   images to external hosting right now. On Pro, exceeding the egress allowance
   *bills* (~$0.09/GB over 250 GB) rather than *restricts the site*, so the
   recurring-outage risk is contained. At current scale (3 pins/day steady
   state) the project is expected to sit well under 250 GB. Migration is an
   optimization, not an emergency, and adds a new dependency (a Cloudflare R2
   account + API token) plus implementation/repoint work.

3. **Cheap safety step instead: set a Supabase usage/billing alert** (e.g. warn
   at ~150 GB egress) so a future runaway is caught before it costs money —
   never again a silent restriction. This is an operator action in the dashboard.

4. **If migration is ever justified (egress creeps toward 250 GB, or Pro cost
   becomes unwanted): move to Cloudflare R2, copy-first.** R2 has zero egress
   fees and a 10 GB free tier (bucket is 1.2 GB). Procedure: copy all objects
   Supabase → R2, rewrite the 235 `blog_posts.featured_image_url` values and the
   two pipeline scripts (`upload-blog-hero.mjs`, `run-generation.mjs`) to R2
   URLs, verify the new URLs load, and **only then** empty the Supabase bucket.
   Nothing is deleted until copies are proven live → zero image loss.

5. **Any pruning must be reference-aware.** Because 235 blog heroes live in this
   bucket, only objects not referenced by any `blog_posts.featured_image_url`
   (and not otherwise needed) may be deleted. Blind age-based pruning is
   prohibited.

## Rationale

The outage was a billing-quota restriction, not a bug, so the fastest and only
real fix on a free plan was the plan upgrade — free quota otherwise only resets
at the next billing cycle, leaving guests locked out for days. Once on Pro the
failure mode changes from "site down" to "slightly larger bill," which removes
the urgency that would justify taking on an R2 migration and its new moving
parts today. Recording the 235-blog dependency now is the highest-value output:
it's the non-obvious fact that makes both pruning dangerous and migration
non-trivial, and it would otherwise have to be rediscovered mid-incident.

## Alternatives Considered

- **Migrate to Cloudflare R2 now.** Rejected as premature. Correct long-term if
  the numbers justify it, but it's real work + a new dependency for a risk the
  upgrade already contained. Kept as the documented path (decision 4).
- **Move images to GitHub Pages `public/`** (where Cold Case images live).
  Rejected for this bucket: 1.2 GB / 700 images in the git repo bloats the
  checkout badly. Fine for a handful of assets, wrong tool for hundreds.
- **Reference-aware pruning on Supabase, stay on free.** Rejected as the primary
  fix: it might drop egress under 5 GB temporarily, but the bucket keeps growing
  and the cap is tiny; it trades an outage now for the same outage later. The
  reference-aware constraint is retained as a guardrail (decision 5).
- **Stay on Pro with a usage alert (chosen).** Lowest effort, removes the outage
  risk, and defers optional optimization until data justifies it.

## Consequences

- Guest/host sharing, health checks, and the daily backup recover automatically
  the moment the plan changes — no redeploy needed.
- Ongoing cost: Pro (~$25/mo). Egress overage bills rather than restricts.
- A billing/usage alert still needs to be set by hand in the dashboard
  (tracked as an open follow-up).
- The `pinterest-pins` bucket remains public, unpruned, and doubles as blog-hero
  storage. This is accepted for now but documented as tech debt; the R2 path and
  the reference-aware pruning constraint are on record for whoever revisits it.
- Anyone touching the pins bucket must know: **235 blog posts depend on it** —
  see the parity check before deleting anything.

## Key files

- `src/pages/CharacterAccess.tsx` — guest access; 402 surfaces as "access denied"
- `scripts/pinterest/upload-blog-hero.mjs` — uploads blog heroes into `pinterest-pins`
- `scripts/pinterest/run-generation.mjs` — daily pin generation/upload pipeline
- `blog_posts.featured_image_url` — 235 rows reference the `pinterest-pins` bucket
- Storage buckets: `pinterest-pins` (public, 1.2 GB), `evidence-images` (public, 90 MB), `cold-case-files` (private)

## Discussion

The debated question was whether to fix the *symptom* (upgrade) or the *cause*
(get large public images off metered storage) in the same session. The pull
toward doing the migration immediately was strong — it's the "proper" fix. What
settled it was reframing the failure mode: on the free plan the cause produces a
*hard site outage*; on Pro it produces a *marginal bill*. That 50× headroom plus
overage-bills-not-blocks turns the migration from "must do to stay up" into
"optional cost optimization," which doesn't clear the bar for taking on a new R2
dependency and repointing 235 live blog URLs under time pressure. The discovery
that the pins bucket also backs 235 blog heroes reinforced caution: it makes the
naive quick-fix (prune old pins) actively dangerous, so rushing was exactly the
wrong instinct. Deferring with a documented path + a billing alert preserves the
option without paying for it now.
