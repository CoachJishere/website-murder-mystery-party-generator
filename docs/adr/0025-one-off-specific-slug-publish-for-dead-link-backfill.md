# 0025 — One-off specific-slug publish workflow for dead-link backfill

- **Status:** Accepted
- **Date:** 2026-06-29

## Context

An internal-link audit found **9 dead internal links** on the live site — links
in published EN posts pointing at `/blog/<slug>` targets that are still in
`draft` status. Crosslinks are injected at publish time (ADR-0021), so a
published source post that links to a not-yet-published target produces a live
404 until that target ships.

The daily publish workflow (`publish-daily-blog.yml`) publishes exactly **one**
draft per day, chosen by link-graph importance (`pick-next-draft.mjs`). That is
the correct steady-state cadence, but it cannot expedite a *specific* set of
slugs. The 9 dead links span **8 distinct draft targets**, and the two highest
business-priority ones (`murder-mystery-picnic-party-guide`, in-degree 10;
`murder-mystery-party-clue-board-game-theme`, in-degree 9) are not even next in
the importance queue — `picnic` ranks #3 behind two other in-degree-10 drafts
(`the-ultimate-escape-room-…`, `murder-mystery-party-for-15-players`). Waiting
for the queue to organically reach all 8 would leave dead links live for weeks.

All 8 target drafts were verified complete and publishable (EN 12k–23k chars,
proper H2 structure, snippet blocks, clean endings; all 13 languages clear the
rot-gate length floors).

## Decision

Add a **manual, explicit-slug-list workflow** —
`.github/workflows/publish-specific-slugs.yml` — that publishes a named list of
slugs through the **identical gated pipeline** the daily workflow uses:
per slug → apply cross-links (13 langs) → rot-signal gate (EN always ships,
non-EN held if rotted) → PATCH `status`/`published_at` for passing langs →
Priority-5 TOC; then once for the batch → regenerate `llms.txt` → IndexNow
(per-slug, 13 URLs each) → GSC sitemap ping → dispatch `deploy.yml` to
prerender.

Publish all **8** dead-link targets (the 5 named in the request plus the 3 the
audit surfaced: `murder-mystery-party-haunted-asylum-theme`,
`murder-mystery-party-for-mardi-gras-…`, `murder-mystery-party-carnival-dark-circus`).
**Strip zero links** — every target is a complete draft, so publishing both
fixes the dead link and preserves the designed internal-link equity.

**Also add a cross-link target guard** (`scripts/_crosslink-target-guard.mjs`,
used by both `apply-crosslinks.mjs` and `backfill-crosslinks.mjs`): a
cross-link is only inserted once its target page is actually **published**.
This was required for correctness — the 8 batch posts contain 9 cross-links to
*other* still-draft targets, so a naive publish would have fixed 9 incoming
dead links while creating 9 new outgoing ones (net zero). The guard suppresses
those until the targets go live. To let intra-batch links resolve, the one-off
workflow publishes the whole batch first, then applies cross-links.

The guard is a **systemic** fix, not specific to this backfill: it permanently
stops the daily publisher (and any backfill run) from ever emitting an internal
link to a draft page. This is the root cause of the dead-link churn ADR-0021
was built to drain.

## Rationale

- **Publish over strip.** Stripping a link discards finished content *and*
  planned link equity to mask a symptom. Every target is a complete, gate-
  passing draft, so publishing strictly dominates.
- **Reuse, don't reimplement.** The new workflow calls the same scripts
  (`apply-crosslinks`, `check-rot-signals`, `apply-p5-tocs`,
  `generate-llms-txt`, `submit-indexnow`, `submit-sitemap-gsc`) and dispatches
  the same `deploy.yml`. Only the orchestration loop differs.
- **Don't touch the proven daily path.** A separate workflow leaves
  `publish-daily-blog.yml` untouched (zero regression risk to the steady-state
  cadence). Once a slug is published here it simply drops out of the remaining-
  drafts set the daily picker reads — the two never conflict.
- **Honour the prerender requirement.** A raw `UPDATE status='published'` would
  skip the rot gate (risking rotted non-EN translations going live) and the
  prerender (leaving posts as HTTP 404 for crawlers). The full pipeline is the
  only correct publish.

## Alternatives Considered

1. **Raw SQL status flip via the Supabase tool.** Fastest, but skips the rot
   gate and prerender — the documented failure mode. Rejected.
2. **Add a `slugs` input to `publish-daily-blog.yml`.** Reuses downstream steps
   but its inline bash is single-slug throughout; reworking it risks the daily
   path for a one-off need. Rejected in favour of an isolated workflow.
3. **Dispatch the daily workflow N times.** Publishes by importance order, so it
   would ship `the-ultimate-escape-room-…` and `party-for-15-players` ahead of
   the requested targets, and would never reach `drinks` (in-degree 3, rank #44)
   within a reasonable number of runs. Rejected.
4. **Publish only the 5 named slugs.** Leaves dead links at 3, missing the
   stated goal of 0. Rejected — the audit's other 3 targets are equally
   complete drafts.

## Consequences

- Dead internal links go from 9 → 0 once the workflow runs and `deploy.yml`
  prerenders the 8 newly-published slugs.
- 8 slugs are published ahead of their organic importance-queue position. This
  is consistent with ADR-0021's purpose (drain dead links); the daily queue
  continues unaffected for the remaining ~199 drafts.
- The workflow is reusable for any future "publish these specific slugs now"
  need (e.g. seasonal posts, future dead-link backfills).
- Non-EN languages that fail the rot gate at run time are held back (EN still
  ships), so the dead links — which are EN-site — are resolved regardless.
- **Deferred links (the guard's trade-off):** the 9 cross-links from the batch
  to still-draft targets are *not* inserted now. They are recovered the next
  time `backfill-crosslinks.mjs` runs after those targets publish (the guard
  makes backfill safe to run anytime — it only ever inserts links to live
  pages). Recommend running `backfill-crosslinks.mjs` periodically (e.g.
  monthly, or after the daily queue drains) to progressively fill deferred
  links. A missing internal link is a small, recoverable equity cost; a 404 in
  the acquisition engine is not — so deferring is the correct default.

## Key files

- `.github/workflows/publish-specific-slugs.yml` — the new one-off workflow
- `.github/workflows/publish-daily-blog.yml` — steady-state daily publisher (unchanged)
- `scripts/_crosslink-target-guard.mjs` — **new** shared guard (parse target, fetch published set, skip draft targets)
- `scripts/apply-crosslinks.mjs`, `scripts/backfill-crosslinks.mjs` — **modified** to use the guard
- `scripts/pick-next-draft.mjs`, `scripts/check-rot-signals.mjs`,
  `scripts/apply-p5-tocs.mjs`, `scripts/submit-indexnow.mjs`,
  `scripts/generate-llms-txt.mjs` — reused pipeline steps
- `cross_link_map.json` — link-insertion source / in-degree source

## Discussion

The core trade-off debated was **publish-vs-strip** and **scope (5 vs 8)**.
Stripping was rejected because all targets are finished content; the dead links
are a publish-ordering artifact, not a content-quality problem. Scope was
widened from the 5 requested slugs to all 8 dead-link targets because the
stated goal was "dead links → 0," and the audit showed the 5 covered only 6 of
the 9 links. The remaining 3 targets (`haunted-asylum`, `mardi-gras`,
`carnival-dark-circus`) are complete drafts, so there was no reason to leave
them as 404s.

The mechanism debate (raw SQL vs reuse the pipeline) was settled by the
prerender requirement encoded in `publish-daily-blog.yml`: publishing without a
deploy leaves crawler-facing 404s, which on an SEO-acquisition blog is the worst
outcome. The isolated-workflow approach was chosen over modifying the daily
workflow to keep the proven path untouched while parallel feature work is in
flight.
