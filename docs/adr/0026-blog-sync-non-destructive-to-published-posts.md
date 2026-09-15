# 0026 — `sync-blog-map` is non-destructive to published posts (DB is source of truth)

**Status:** Accepted
**Date:** 2026-06-29

## Context

The blog is the primary acquisition channel (north star). Its content lives in two places:

- **`blog_map.xlsx`** — a 36MB workbook, one row per slug × 13 languages, historically treated as the "source of truth."
- **Supabase `blog_posts`** — what the live site actually renders.

`scripts/sync-blog-map.mjs` (a `workflow_dispatch`-only GitHub Action — no cron) pushes xlsx → DB. Step 2 of that script **UPDATEs every already-published row's `title`/`content`/`meta_description`/`meta_keywords` from the workbook.**

In practice the team does **not** edit the workbook for live posts. Published content is edited **directly in Supabase**:

- Repeated SEO title/meta rewrites (the changelog is full of "rewrote title/meta directly in DB, all 13 langs" campaigns).
- Blog→landing-page crosslinks injected into `content` and re-applied by a *separate* script ([ADR-0023](0023-blog-to-landing-page-crosslinks.md)), not present in xlsx.

A 2026-06-29 reconciliation of `best-murder-mystery-party-games-review` exposed the gap concretely: the live EN row (title, meta, **and a 25,816-char body**) had diverged entirely from the stale ~22k-char workbook copy. A read-only parity audit then found this is the norm, not the exception — essentially every published slug has drifted, because the DB is where real edits land.

Consequence: **a single manual `sync-blog-map` run would silently revert months of direct-in-DB SEO work and strip all injected crosslinks across the entire acquisition channel.** Today the only thing preventing that is "remember not to run the sync, or remember to re-run the crosslink backfill afterward" — tribal knowledge, not a guardrail.

## Decision

Make `sync-blog-map.mjs` **non-destructive to published posts by default.**

- Step 2 (overwrite published rows from xlsx) is **gated behind `SYNC_OVERWRITE_PUBLISHED=true`** and is **off by default**.
- The default run now only does its genuinely useful job: **seed/refresh draft rows** (Steps 3–4) for the daily publish queue. Published posts are left exactly as they are in the DB.
- The deliberate escape hatch remains for the rare, reviewed case where someone genuinely wants to force the workbook over live content.

This codifies: **`blog_map.xlsx` seeds new drafts; the live DB is canonical for anything already published.**

## Rationale

- **Protects the acquisition engine.** The blog is the main growth channel; silently reverting its SEO state is the highest-impact failure mode available here. A guardrail beats a remembered rule.
- **Default-safe, capability-preserving.** Nothing is lost — the overwrite path still exists, it just has to be asked for explicitly. Reversible in one env var.
- **Smallest durable change.** One conditional removes the footgun permanently, versus an endless backfill of 420 slugs into a fragile 36MB workbook that would drift again the next time someone edits the DB.
- **Matches reality.** The workflow is already DB-first; the script was the last artifact still assuming xlsx-is-truth.

## Alternatives considered

1. **Backfill all 420 slugs into xlsx so the sync becomes a no-op.** Rejected: re-derives a fragile workbook against a moving target (the DB changes daily via crosslinks/SEO edits), so it drifts again immediately. Treats the symptom, not the cause. The workbook's known round-trip-corruption fragility makes mass writes risky.
2. **Make the sync a true field-level merge (preserve DB title/meta/crosslinks, take only genuinely-new xlsx fields).** Rejected for now: more logic, more failure modes, and it still has to guess which side "wins" per field. The flag delivers the same protection with near-zero complexity; a merge can come later if a real need appears.
3. **Delete/disable the sync entirely.** Rejected: the draft-seeding pipeline (Steps 3–4) is still valuable for the daily publish queue. Only Step 2 is harmful.
4. **Leave it, rely on "don't run it."** Rejected: that's the current state — an unguarded footgun one manual dispatch away from wiping the channel.

## Consequences

- A default `sync-blog-map` run no longer touches published posts — it logs that it skipped them and how to override. The 2026-06-29 `best-games-review` fix (and every other direct-DB edit) is now safe regardless of who runs the sync.
- Pushing a genuine workbook edit to a *published* post now requires `SYNC_OVERWRITE_PUBLISHED=true` — a deliberate, reviewed action.
- Draft seeding / daily publish queue behaviour is unchanged.
- The xlsx↔DB parity audit and any mass backfill are no longer urgent — the revert risk they were guarding against is removed at the source. (A pipeline-aware audit is still available if a true drift list is ever needed.)
- **Known housekeeping:** ADR numbering currently has two `0025-` files from concurrent work; this ADR took `0026` to avoid a third collision. Renumber in a cleanup pass if desired.

## Key files

- `scripts/sync-blog-map.mjs` — Step 2 gated behind `SYNC_OVERWRITE_PUBLISHED` (default off).
- `.github/workflows/sync-blog-map.yml` — `workflow_dispatch`-only trigger (unchanged).
- [ADR-0023](0023-blog-to-landing-page-crosslinks.md) — the crosslink injection that the old behaviour would have stripped.

## Discussion

The tempting move was the comprehensive one — reconcile all 420 drifted slugs back into the workbook so the two sources match. The session showed why that's the wrong instinct: the "drift" looked like a 420-row emergency but was mostly expected pipeline output (injected crosslinks + transforms), and even a perfect backfill re-drifts the moment the next DB edit lands. The durable fix isn't synchronizing two sources of truth — it's **demoting one of them**. Once the DB is canonical for published posts, the workbook only needs to be right for *drafts that haven't shipped yet*, which is exactly what it's good at. The flag preserves the old behaviour for the rare intentional reseed, so nothing is lost and the change is fully reversible.

## Addendum (2026-09-14) — the flag itself was still a blast-radius-blind footgun

A corpus-wide re-check (triggered by finding `murder-mystery-party-character-ideas`'s xlsx row had a stale, unrelated title/meta while acting on the weekly SEO digest) confirmed this ADR's original diagnosis has fully played out: **209/300 (70%) published EN titles and 297/300 (99%) by content length now differ** between xlsx and live Supabase. This is the expected, by-design result of this ADR's own model, not a new incident — flagging it here only because the *scale* changes the risk calculus on the escape hatch below.

`SYNC_OVERWRITE_PUBLISHED=true` alone was still enough to fire the full Step 2 overwrite with **zero preview** of what it would actually change, despite Consequences above calling it "a deliberate, reviewed action" — there was no way to actually review anything before it ran. With drift this total, a well-intentioned reseed for some unrelated reason (e.g. "I just want to push this one xlsx fix live") would have silently reverted ~200+ posts of accumulated SEO/voice/GEO work in one pass.

**Fix:** `scripts/sync-blog-map.mjs` now computes a real diff (rows that would actually change vs. already-identical no-ops) before writing anything, prints the count and the first 20 affected slugs, and refuses to proceed unless re-run with `SYNC_OVERWRITE_CONFIRM_COUNT=<N>` matching that count exactly — a dry-run-then-confirm two-step, CI-compatible (no interactive prompt needed). Default (unset) behavior — skip published rows — is unchanged; this only hardens the override path this ADR already gated. The one historical sync run (2026-04-03) predates this guard entirely, so nothing has exercised either the original flag or this addendum's confirm-count check against real data yet.

Full trail: CHANGELOG 2026-09-14, vault `01_Projects/Mystery-Maker/changelog.md` same date.
