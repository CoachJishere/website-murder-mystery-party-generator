# ADR-0011: Pinterest Pipeline as a DB-Status Machine Across Three Runners

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made May 2026, captured retroactively)

## Context

Pinterest is a sustained traffic source for the blog and requires regular pin posting — multiple new pins per day, each with a custom image, overlay text, and link back to a blog post. Manual creation would not scale at the publish cadence.

The work decomposes into three structurally different steps:

1. **Creative authoring.** For each blog post that doesn't yet have a pin: pick an image prompt, an overlay text, a target landing URL. This is LLM work — Claude is good at writing pin-appropriate overlay copy given the blog content. Outputs are small text fields written back to a DB row.
2. **Image generation + compositing.** Take the prompt, call Imagen 4 to produce a base image, composite the overlay text onto it via Sharp, crop a separate blog hero version, upload all three to Supabase storage. This is **binary processing** (PNG manipulation), needs a real Node runtime, and is **rate-limited** by Imagen's 70-requests/day paid tier quota.
3. **Posting to Pinterest.** Take the generated assets and metadata, post to the Pinterest API. This is **OAuth-and-API-call** work, twice daily, against an external service that Make.com already has battle-tested wiring for.

These three steps have qualitatively different requirements:

- Step 1 is LLM-bound; latency seconds to minutes per row; needs prompt-cache discipline; called on-demand when new blog posts ship.
- Step 2 is quota-bound; needs Sharp (a native binary that Supabase Edge Functions can't run); needs the daily Imagen quota gate; binary upload to storage.
- Step 3 is rate-limited by Pinterest; needs OAuth tokens for the Pinterest API; benefits from Make.com's existing scheduling and retry semantics.

The naive "one runner does it all" architecture would force one environment to handle Sharp (rules out Edge Functions), Imagen quota tracking, Pinterest OAuth, and LLM creative work — coupling all three failure modes into one job and one cron schedule.

## Decision

**Three runners, one DB table as the status machine.**

### `pinterest_pins` table is the source of truth

Single row per pin. Status column moves through a small state machine:

```
draft → approved → generating → generated → posted
                              ↘ failed (recoverable, retried by next run)
```

Other columns: `blog_post_url`, `blog_post_title`, `image_prompt`, `overlay_text`, `pin_url`, `raw_url`, `hero_url`, `generation_error`, etc. The row is the contract between the three runners.

### Runner 1: `fill-pinterest-creative` Edge Function

- **When:** triggered when a blog post is ready for promotion (either by trigger or scheduled call — TBD; not yet deployed as of May 2026).
- **What:** Reads `pinterest_pins` rows with `status='draft'`. Calls Claude to generate `image_prompt`, `overlay_text` based on the blog post. Writes back and flips status to `'approved'`.
- **Why Edge Function:** LLM call is the dominant cost; Edge Function has fast cold start, no Sharp dependency, no quota gate. Right tool.

### Runner 2: GitHub Actions workflow (`pinterest-image-gen.yml`), daily at 06:00 UTC

- **When:** daily cron.
- **What:** Reads `pinterest_pins` where `status='approved'`. Per row: lock to `'generating'`, call Imagen 4, composite via Sharp, crop blog hero, upload all three artifacts to Supabase storage, set status to `'generated'`. On error: `'failed'` + populates `generation_error`. The `--limit 65` flag keeps a 5-row buffer under Imagen's 70/day quota.
- **Why GitHub Actions:** Sharp needs a real Node runtime (Edge Functions can't run it). The daily cadence aligns naturally with Imagen's daily quota. GitHub Actions gives logs, retries, manual `workflow_dispatch`, and zero infra overhead — and we already pay for it via the GitHub plan.
- **Locking is optimistic** — the lock query has `.eq('status', 'approved')` so two concurrent runners can't double-process the same row.

### Runner 3: Make.com scenario, twice daily

- **When:** twice daily (Pinterest API rate limits and posting cadence).
- **What:** Reads `pinterest_pins` where `status='generated'`. Posts to Pinterest API. Flips status to `'posted'`.
- **Why Make.com:** Pinterest OAuth + posting is already wired in Make.com from prior work; rebuilding that in GHA or Edge Functions would duplicate something that works.

### Why the table is the contract

No runner calls any other runner directly. Each reads rows in one status and writes rows in another. This means:

- **Any runner can be paused independently.** If Imagen quota is exhausted, image-gen pauses; creative authoring and posting continue on the existing inventory.
- **Manual override is trivial.** Want to skip a pin? Flip the row to `'failed'` or delete it. Want to regenerate? Reset to `'approved'` and the next GHA run picks it up.
- **Status is observable in one query** rather than across three logging surfaces.

## Consequences

**Positive:**
- **Each runner uses the right tool for its job.** Sharp lives where it can run; Imagen quota lives where it can be tracked daily; Pinterest OAuth lives where it's already configured. No single environment forced to satisfy all three constraints.
- **Failure isolation.** Image generation failing doesn't block creative authoring; posting failing doesn't block image generation. The status column shows where the bottleneck is.
- **Manual intervention is one SQL update.** Reset a pin, skip a pin, regenerate a pin — all single-row writes against `pinterest_pins`. No multi-system coordination needed.
- **Imagen quota safety.** The `--limit 65` flag and daily cadence give a 5-row buffer; quota burn is bounded by the workflow trigger, not by user actions.
- **Pin inventory is queryable.** "How many approved but un-generated?" and "how many generated but un-posted?" are both `count(*) where status=…` queries. Observability without dashboards.

**Negative:**
- **Three places to look when something is wrong.** If pins aren't posting, the bug could be in any of the three runners. Mitigated by the status column showing where the chain breaks — if rows are stuck at `'approved'`, GHA is the culprit; stuck at `'generated'`, Make.com is.
- **No transactional consistency across steps.** A pin can land in `'generated'` and never get posted if Make.com is down for days. The opposite of a queue with delivery guarantees — but we accept it because the runners are idempotent on retry.
- **Three deploy surfaces.** Edge Function deploy, GHA workflow file, Make.com scenario. Changes to the contract (new column, new status) have to be coordinated across all three.
- **Make.com is a vendor dependency for the final hop.** If Make.com disappears the posting layer has to be rebuilt. Acceptable because Make.com already does the Pinterest OAuth dance and posting is the simplest of the three steps to port if needed.
- **`fill-pinterest-creative` is not yet deployed** (as of May 2026 — drafts are currently inserted by hand). The status machine works without it; the slot is reserved for when the LLM-authoring step is automated.

**When to revisit:**
- **If Imagen quota gets bumped or replaced** by a different provider, only the image-gen runner changes. The state machine is provider-agnostic.
- **If Pinterest API access becomes feasible from Edge Functions** (OAuth + token storage), the Make.com hop could collapse into a fourth Edge Function. Not urgent — Make.com works.
- **If we add Instagram or TikTok pipelines,** the same status-machine-across-runners pattern should be the default. Adding a `platform` column to `pinterest_pins` (rename to `social_pins`) is cheaper than parallel tables.
- **If the GHA run starts hitting the 30-minute timeout** as pin volume grows, split into multiple smaller cron schedules rather than one daily batch. The status machine accommodates this without changes.

## Rejected alternatives

- **One unified worker that does all three steps per pin.** Rejected: forces Sharp into a runtime where it can run (rules out Edge Functions), couples Imagen quota to LLM latency, and means a Pinterest API outage stops the whole pipeline. Plus you'd have to rebuild Make.com's posting wiring.
- **A real queue (Inngest, BullMQ).** Rejected: a Postgres table with a status column does everything we need at this volume (low dozens of pins per day). The "queue" semantics we're using are step-by-step batching, not high-frequency dispatch. Adding queue infrastructure for this would be over-engineering.
- **Skip the DB and pass state via runner inputs.** Rejected: makes manual intervention require code changes, removes observability, and means failures lose context.
- **Edge Function for image generation with a different image library.** Rejected: Edge Functions can't run native binaries; pure-JS image libraries are slower and lower-quality than Sharp. Image quality matters for Pinterest CTR.
- **Single GHA workflow doing creative + image + posting.** Rejected: forces all three failure modes into one job's exit code, loses the per-step observability the status machine provides, and bakes Pinterest OAuth into the runner where it isn't already configured.
