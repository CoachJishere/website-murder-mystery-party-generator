# 0027 — Fix quarterly `refresh_blog_dates`: statement-timeout budget + ja/ko marker regexes

**Status:** Accepted
**Date:** 2026-07-01

## Context

The `Quarterly Blog Date Refresh` GitHub Action (`.github/workflows/quarterly-blog-refresh.yml`, cron on the 1st of Jan/Apr/Jul/Oct) POSTs to the Supabase RPC `refresh_blog_dates(month_num, year_num)`, which rewrites the "**Last updated: …**" marker line in every blog post's `content` to the current month, across 13 languages.

On **2026-07-01 the job failed** with HTTP 500 / Postgres `57014` — `canceling statement due to statement timeout`.

Investigation found the function is structured as **13 sequential per-language `UPDATE`s**. Each one is individually healthy (bitmap index scan on `idx_blog_posts_language`, ~420 rows/language), but `EXPLAIN ANALYZE` showed a single language's UPDATE now takes **~2.3s** — ~1s de-TOASTing and regex-scanning ~420 large `content` values, ~1.3s rewriting ~377 of them. Thirteen of those in series is **~30s**. The RPC runs as `service_role`, which has **no `statement_timeout` override** and inherits a much shorter effective limit on the REST path, so Postgres cancelled the statement mid-run. The job succeeded in prior quarters; `blog_posts` has since grown to **~5,470 rows / 119 MB**, pushing total runtime past the limit. The `blog_posts_create_pinterest_pin` trigger is `UPDATE OF status` only and does **not** fire here — no hidden amplification.

While verifying the run, two **pre-existing localization bugs** surfaced — the ja and ko marker regexes had essentially never matched real content and had been silently stale every quarter:

- **ja** — content uses a **fullwidth colon** `：` (U+FF1A): `**最終更新：2026年5月**`. The regex hardcoded an ASCII `:`, so only **1 of ~190** marker posts matched; ~189 kept old dates. (The zh-cn regex, by contrast, correctly used `：` and worked.)
- **ko** — the dominant label is **`마지막 업데이트`** ("last"), but the regex only matched **`최종 업데이트`** ("final"): only **~25 of ~364** matched; ~339 kept old dates.

So Japanese and Korean blog posts had been showing a wrong "last updated" date (a freshness/SEO signal) for an unknown number of quarters.

## Decision

1. **Give the function its own statement-timeout budget.** Add `SET statement_timeout TO '120s'` to the `refresh_blog_dates` definition. It applies only during the function's execution, ~30s of work under a 120s ceiling, comfortably within Supabase's REST/gateway caps. One line, no workflow change.
2. **Fix the ja and ko regexes** using **capture groups** that preserve each post's *existing* label, colon, and spacing and swap **only the date** — no style normalization:
   - ja: `(\*\*最終更新[：:] ?)\d{4}年\d{1,2}月(\*\*)` → `\1<year>年<month>月\2` (matches either colon).
   - ko: `(\*\*(?:최종|마지막(?:으로)?) 업데이트: )\d{4}년 \d{1,2}월(\*\*)` → `\1<year>년 <month>월\2` (matches 최종 / 마지막 / 마지막으로).
3. **Backfill the already-stale ja/ko rows for July 2026** as a one-off, targeted `UPDATE` (not folded into the migration, since it's a dated one-off, not replayable DDL): **189 ja + 364 ko** rows corrected, verified to **0 remaining stale**.

## Rationale

- **The timeout was the failure; the budget is the direct, minimal fix.** The plans are healthy — this is real work that outgrew a default limit, not a query to optimize. Raising the function's own budget is smaller and less fragile than restructuring the workflow into 13 calls or rewriting the function to batch.
- **Capture-group replaces are the safe way to touch prose.** Preserving the existing label/punctuation and swapping only the date keeps the blast radius to the date digits, avoids imposing one team's wording on another's translations, and made the dry-run before/after trivial to eyeball (consistent with the repo's cell-by-cell / narrow-blast-radius preference for prose edits).
- **Fix the localization bugs now, while the evidence is in hand.** They were only visible because the anomalous `ja:1 / ko:25` counts stood out against ~344–389 elsewhere; deferring would have re-buried them until someone happened to read a JA/KO post.

## Alternatives considered

1. **Set `statement_timeout` on `service_role` globally (`ALTER ROLE`).** Rejected: broadens the timeout for *every* service-role RPC, not just this quarterly job — a blunt, wide-blast-radius change to fix one slow function.
2. **Split the workflow into 13 per-language RPC calls (or one call per language).** Rejected for now: more moving parts in the Action, 13× the HTTP round-trips, and partial-failure states to reason about — all to solve a problem one `SET` clause solves. Kept as the escalation path if runtime later approaches the gateway cap.
3. **Rewrite the function to batch / parallelize the updates.** Rejected: premature. At quarterly cadence, 120s buys years of headroom. Batching is the right move only once the corpus grows enough that a single run genuinely can't finish in-budget (see Consequences).
4. **Normalize ja to an ASCII colon / ko to a single label as part of the fix.** Rejected: that rewrites translator-authored prose style for no reader benefit and widens the blast radius. Capture groups preserve what's there.

## Consequences

- The July 2026 refresh is **complete and verified**: 13/13 languages current, including the previously-broken ja (189) and ko (364). No stale marker rows remain in any language.
- Future quarterly runs will finish under the 120s budget and correctly update ja/ko.
- **`CREATE OR REPLACE FUNCTION` resets a function's `SET` clauses**, so the `statement_timeout` (and `search_path`) are now part of the checked-in definition; any future edit to this function must keep both clauses or the timeout regression returns silently.
- **Deferred / watch items** (logged to vault `00_INBOX/`):
  - **Growth ceiling** — ~30s today climbs with the corpus; revisit batching or per-language calls before a run approaches ~90s.
  - **Marker-format drift audit** — ja/ko drifted undetected; the other 11 languages' markers should be spot-checked against their regexes, and the workflow could assert "each language updated_count is within a sane band" so a future silent mismatch fails loudly instead of returning `1`.
  - **Non-marker posts** — a minority of ja/ko posts mention "最終更新"/"업데이트" in prose without the standard bold `**…date**` marker; these are intentionally untouched (out of scope) and simply have no refreshable date line.

## Key files

- `supabase/migrations/20260701_fix_refresh_blog_dates_timeout_and_ja_ko_regex.sql` — corrected function (timeout budget + ja/ko regexes).
- `.github/workflows/quarterly-blog-refresh.yml` — the quarterly Action (unchanged; it just calls the RPC).
- Supabase RPC `public.refresh_blog_dates(integer, integer)` — the fixed function.

## Discussion

The reported symptom was a timeout, and the tempting scope was "make the function fast" — but the plans were already healthy; nothing was pathological, the work had simply grown past a default limit. The honest fix for *that* is a bigger budget, not a cleverer query, and deliberately **not** a workflow rewrite that adds failure modes to dodge a one-line setting. The more valuable outcome came from not stopping at green: the `ja:1 / ko:25` counts in the successful run were the real find. They exposed two regexes that had been quietly wrong for quarters — a fullwidth-vs-ASCII colon and a wrong Korean word — which no timeout fix would have touched. That's the lasting lesson captured in the watch items: this job could return a "success" while silently updating almost nothing for a locale, so its next hardening is an assertion on per-language counts, not more speed.
