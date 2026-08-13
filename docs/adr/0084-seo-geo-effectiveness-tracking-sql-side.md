# 0084 — SEO/GEO effectiveness tracking: durable snapshots + retroactive backfill (SEO/SEO-analytics side only)

- **Status:** Accepted
- **Date:** 2026-08-13
- **Supersedes / relates to:** ADR-0018 (weekly SEO/GEO digest pipeline), ADR-0045 (lever diagnostic), [[project_seo_geo_documentation_audit_aug13]] memory note

## Context

Following the 2026-08-13 SEO/GEO documentation audit (`docs/seo-geo-playbook.md` rescued from `temp-files/`), Jonathan asked whether we can tell if the playbook's recommendations are actually working for mysterymaker.party, and whether that can be done retroactively.

Investigation found:
- `scripts/fetchSeoWeeklySnapshot.mjs` already computes a rich weekly snapshot — GSC (position/CTR/clicks/impressions by query and page), GA4 (sessions/engagement), and a GEO proxy signal (`fetchAI()`: sessions referred from chatgpt.com, perplexity.ai, claude.ai, gemini.google.com, etc.) — but writes it to a gitignored local file (`temp-files/seo-weekly-snapshot.json`) that gets **overwritten every run**. No historical time series has ever been retained.
- Google's own APIs retain the underlying data for a meaningful lookback window (GSC ≈ 16 months, GA4 aggregated reports for the property's lifetime), so the raw numbers for past dates still exist at the source even though we never captured them ourselves. This makes **retroactive analysis of the traditional-SEO/GA4 signals possible**, bounded by each API's retention.
- True GEO "citation" confirmation (was mysterymaker.party the literal source an AI Overview or ChatGPT answer quoted) was never logged by anyone, has no retroactive API, and building it forward would require either a paid third-party citation-tracking tool or scripted calls to metered LLM APIs — out of scope here per the standing rule that paid/metered API usage needs explicit sign-off first. Jonathan scoped this ADR to the free, already-authorized-data side only; citation tracking is a separate future decision if he wants to pursue it.
- `blog_posts.updated_at` plus the dated entries already in `CHANGELOG.md` / `docs/blog-content-pipeline-history-2026-03.md` give us known intervention timestamps to correlate against (e.g. the March 14–17, 2026 voice-rewrite + GEO-enrichment pass — the playbook's own most specific testable claim, since it directly implements the Princeton GEO paper's "add stats/citations" recommendation the playbook cites).

## Decision

1. **New table `seo_performance_snapshots`** (Supabase) stores every snapshot — both future weekly runs and one-off historical backfills — as a JSONB blob matching the shape `fetchSeoWeeklySnapshot.mjs` already produces, tagged with `source` (`weekly_live` | `backfill`) and, for backfill rows, an `intervention_name`/`intervention_phase` (`pre`/`post`) pair.
2. **`fetchSeoWeeklySnapshot.mjs` gets one additive change**: after writing the local JSON (unchanged, still consumed by `generateSeoDigest.mjs`), it also inserts the same snapshot into the new table. No existing behavior changes.
3. **New script `scripts/backfillSeoHistory.mjs`** takes a small hardcoded list of known past interventions (seeded with the March 2026 GEO enrichment) and, for each, re-runs the same GSC/GA4 query helpers already in `fetchSeoWeeklySnapshot.mjs` against historical date windows before and after the intervention date, writing `pre`/`post` rows into `seo_performance_snapshots` and printing a delta summary.
4. **Explicitly out of scope:** any AI-citation-confirmation tracking. If Jonathan wants that later, it needs its own ADR and explicit sign-off on whatever paid tool/API it requires.

## Rationale

- **Reuses working code instead of rebuilding it.** The GSC/GA4 query logic, auth, and the CTR/lever classifier already exist and are already tested against production data weekly — the gap was persistence, not data access.
- **Free and immediately retroactive within Google's own retention window.** No new cost, no new permission needed — same service account, same read-only scopes already granted for the weekly digest.
- **JSONB over a normalized schema** because the snapshot shape is still evolving (new sections get added to the fetcher periodically, e.g. `fetchSiteHealth`) — a rigid column-per-metric table would need a migration every time the fetcher gains a field. The one-time cost is that ad hoc SQL queries against nested JSON are clunkier than plain columns; acceptable for a low-volume (weekly) analytics table.
- **Doesn't touch the live digest pipeline's behavior** — the Supabase write is additive and independently try/catch'd, matching the existing pattern where each snapshot section degrades to a logged error rather than failing the whole run.

## Alternatives considered

1. **Store historical snapshots as committed JSON files in `docs/`** (like `docs/seo-digests/*.html` already does for the narrated emails). Rejected as the primary store — it works for human-readable archives but is awkward to query/aggregate for delta analysis; the digest HTML archive continues to serve its existing purpose unchanged.
2. **Normalized per-metric columns/tables** (e.g. a `daily_query_position` table). More queryable, but the fetcher's output shape isn't stable enough yet to commit to a fixed schema; revisit if this table sees enough use to justify it.
3. **Skip persistence, just re-run backfill queries live whenever someone asks "did X work."** Rejected — defeats the point of retroactive analysis being cheap and repeatable, and GSC/GA4 retention is a shrinking window (today's "16 months back" recedes every day), so capturing what we can now is strictly better than deferring.

## Consequences

- **Positive:** future weekly runs build a real time series for free; the backfill mechanism itself is verified working end-to-end against live GSC/GA4 data. (The first backfill case study, March 2026 GEO enrichment, turned out confounded by an unrelated content-corruption incident in the same window — see 2026-08-13 CHANGELOG entry — so it doesn't yet answer whether the playbook's core GEO claim held. A cleaner intervention needs to be picked for that read.)
- **Negative:** `seo_performance_snapshots` will need occasional manual cleanup/archival once it accumulates years of weekly rows (not yet, but worth remembering — same shape of problem as `blog_map.xlsx` growing unbounded).
- **Neutral:** does not answer the GEO-citation question Jonathan originally asked about in full — only the traffic-referral proxy, not literal citation confirmation. That gap is real and documented above, not silently dropped.

## Discussion

The scoping conversation (SEO-only vs. also building GEO-citation tracking) came down to the paid-API constraint: citation tracking is technically the more interesting number, but every practical way to get it costs money per check, and that spend needs its own explicit go-ahead rather than riding in as a side effect of "let's track effectiveness." Splitting the ADR this way means the free, immediately-buildable half isn't blocked waiting on a budget conversation.

## Key files

- `supabase/migrations/20260813_seo_performance_snapshots.sql` — new table.
- `scripts/fetchSeoWeeklySnapshot.mjs` — additive Supabase persistence.
- `scripts/backfillSeoHistory.mjs` — historical backfill against known interventions.
- `docs/seo-geo-playbook.md` — the claims this table lets us start checking against real data.
