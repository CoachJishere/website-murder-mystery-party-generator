# 0045 — Diagnose the SEO lever (copy vs authority) before the digest recommends it

- **Status:** Accepted
- **Date:** 2026-07-27
- **Supersedes / relates to:** ADR-0018 (weekly SEO/GEO digest), ADR-0024 (homepage title/meta rewrite)

## Context

The weekly SEO digest (ADR-0018) exists to hand Jonathan copy-paste action prompts for the biggest organic-search opportunities. Its "quick wins" are computed in `scripts/fetchSeoWeeklySnapshot.mjs` and narrated into an email by an LLM in `scripts/generateSeoDigest.mjs`.

Three consecutive digests recommended **title/meta rewrites on pages that were already optimized** (see CHANGELOG 2026-07-27: the review-post title, the `/custom-murder-mystery-party` money page, and the 2026-cluster post were each already done). The 2026-07-27 investigation of `/custom-murder-mystery-party` made the failure mode concrete: the page sits at avg position 18.7 with two target queries on page 2 ("custom murder mystery game" pos 8.5, "custom murder mystery party" pos 14.5). The page is *already* well-targeted on-page — so another copy rewrite is not the lever; **authority/internal-links** is. Yet the digest kept prompting copy rewrites.

Root cause, located exactly:
- `fetchSeoWeeklySnapshot.mjs` quick-wins filter is **query-dimension only** and hardcodes `reason: "…title/meta rewrite"` whenever `ctr < 2%`, and `"one nudge from page 1"` for position 5–15 — with no knowledge of which page ranks or whether that page already targets the query.
- The generator SYSTEM_PROMPT lists "title/meta rewrite, new page, internal links, schema" as possible actions but gives the model **no diagnostic** for choosing between them, so it parrots the snapshot's `reason`.

Jonathan's pushback sharpened the requirement: it is **not** "page 2 ⇒ always links." Copy sometimes *is* the lever — even on page 1, if a result under-clicks for its rank. The digest needs to distinguish the two, and flag "both" when both apply.

## Decision

Introduce a **two-axis lever diagnostic** in the fetcher and make the generator lever-aware.

**Axis 1 — CTR gap (copy / SERP-appeal).** For each candidate query, compute `ctrGap = actualCTR − expectedCTR(position)`. `expectedCTR` comes from a **self-calibrating curve**: the median CTR of our own queries bucketed by rounded position, falling back to a static GSC-aggregate curve for buckets with < 5 queries. A materially negative gap means the result under-clicks for where it ranks → **copy** is a lever, *regardless of position* (this is how "copy matters sometimes" survives).

**Axis 2 — position band (relevance + authority).** Page 1 (≤ 10) vs page 2 (11–20) vs near-miss (5–10).

**Lever verdict** per quick win (`quickWins[].lever`):
- `both` — page 2 **and** under-clicking → needs rank (authority) *and* copy.
- `links` — page 2 but CTR is normal for the rank → authority/internal-links problem; **copy rewrite explicitly disallowed**.
- `copy` — page 1 but under-clicking → title/meta appeal; the action prompt must first verify the query isn't already in the page's title (stale-prompt guard).
- `links` (near-miss) — position 5–10 with healthy CTR → small authority nudge.
- `watch` — near expected on both axes → monitor, not surfaced as an action.

The fetcher also pulls a `['query','page']` GSC dimension so each quick win carries its **ranking page** (`quickWins[].rankingPage`) — a "links" recommendation is useless without naming the page to link to and from. The **on-page relevance check** ("is the query actually in that page's title/H1?") is deferred to the fresh-chat action prompt, where an agent can fetch the live page — deliberately kept out of the cron to avoid fragile HTML parsing in an unattended job.

The generator SYSTEM_PROMPT gains a **LEVER DIAGNOSIS** block that: routes each verdict to the right action shape; forbids recommending a title/meta rewrite for a `links`-verdict page-2 query; and requires `copy` prompts to verify on-page targeting before rewriting.

## Rationale

- **It answers the actual question per-opportunity, every week.** The two axes separate the two confounded effects (the ADR-0024 homepage read was inconclusive precisely because CTR *and* position moved together — the CTR-gap axis is designed to hold position constant).
- **Self-calibrating curve > industry constants.** Murder-mystery SERPs (rich results, competitors) have their own CTR shape; median-of-our-own-data adapts, and logging `ctrGap` weekly accumulates the evidence to tune thresholds over time.
- **Deterministic where it must be, LLM where it helps.** The lever math is pure and testable; the fragile "read the live page" step stays in the human-in-the-loop prompt.
- **Directly kills the observed failure.** A `links` verdict cannot emit a copy rewrite, so the three-in-a-row stale-prompt pattern cannot recur for authority-bound page-2 pages.

## Alternatives considered

1. **Static industry CTR curve only.** Simpler, but wrong for our niche and can't improve. Kept as the *fallback* for thin buckets, not the primary.
2. **Fetch each ranking page in the cron to check title/H1 targeting.** More precise verdicts, but fragile (HTML changes, timeouts) in an unattended job and slow. Deferred the relevance check to the action prompt instead.
3. **Binary "page 2 ⇒ links" rule.** Rejected — it's the oversimplification Jonathan flagged; it would misclassify a page-1 under-clicker as "no copy needed."
4. **Do nothing / keep trusting the LLM narrator.** Rejected — the naive `reason` string is the thing the LLM parrots; the fix has to change the data, not just the prose.

## Consequences

- One extra (free, read-only) GSC round-trip per run for the `['query','page']` pull.
- Quick-win objects gain `expectedCtr`, `ctrGap`, `lever`, `rankingPage`; `reason` now reflects the lever. Any downstream consumer of the snapshot sees richer quick wins (additive, non-breaking).
- The digest will start emitting **internal-link / authority** actions (with named source pages + anchor text) where it previously emitted copy rewrites — the intended behavior change.
- Thresholds (`ctrGap` floor, bucket min-count) are first-pass; the ADR expects them tuned once a few weeks of logged `ctrGap` accumulate.

## Discussion

The debated trade-off was **where to draw the copy/links line**. A pure position rule is easy but wrong; a pure CTR rule ignores that a page-2 page with *normal* CTR simply can't be clicked more without ranking higher. The resolution — treat CTR-for-position and rank as independent axes and let "both" be a first-class verdict — came directly from Jonathan's point that copy can matter on page 1 too. We accepted first-pass thresholds over waiting for a perfect calibration because the fetcher now logs `ctrGap` every week, so calibration is a cheap future follow-up rather than a blocker.

## Key files

- `scripts/fetchSeoWeeklySnapshot.mjs` — expected-CTR curve, `['query','page']` pull, lever classifier, enriched `quickWins`.
- `scripts/generateSeoDigest.mjs` — LEVER DIAGNOSIS block in SYSTEM_PROMPT; softened "what an action means" brief.
- `scripts/__tests__/leverClassifier.test.mjs` — offline unit test of the pure classifier (no network, no paid API).
