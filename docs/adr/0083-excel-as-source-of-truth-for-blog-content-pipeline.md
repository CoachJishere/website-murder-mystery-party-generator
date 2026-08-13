# 0083 — Excel as source of truth for the blog content pipeline (backfilled)

- **Status:** Accepted
- **Date:** 2026-03-17 (decision made then; ADR written retroactively 2026-08-13 — see Context)
- **Supersedes / relates to:** ADR-0012 (xlsx boundary sanitization), ADR-0026 (blog sync non-destructive to published posts)

## Context

This ADR documents a decision made on 2026-03-16/17 that was never written down at the time — it's being backfilled now (2026-08-13) after an audit found it undocumented in `CHANGELOG.md` or `docs/adr/`, existing only in a gitignored `temp-files/SEO_GEO_CHANGELOG.md` that risked being lost entirely. The decision it records is not hypothetical: it's the architecture every subsequent `blog_map.xlsx` corruption-recovery entry in `CHANGELOG.md` (April–August 2026) already assumes.

**What happened:** During the March 2026 blog voice-rewrite/translation push, a propagation session (translating GEO-enriched posts into 12 languages) wrote the same Finnish "Cruise Ship" article content into random rows across nearly every language and table — corrupting roughly 573 of 754 published posts (21 of 58 EN source posts included). Root cause was never conclusively identified; the working theory was a bad row-index in a translation propagation script writing into the wrong Supabase rows.

Recovery happened in two attempts:
1. **First pass** — 23 EN posts (21 corrupted + 2 separately truncated during GEO enrichment) were restored directly from a CSV backup (`temp-files/Blog Database - Master.csv`), each put through voice-rewrite + GEO-enrichment again, and written straight back to Supabase via 21 parallel agents.
2. **Second pass** — a *second* mass-overwrite (Dutch content clobbering all 754 rows) happened during that same recovery effort. At that point the direct-agent-writes-to-Supabase model was abandoned.

## Decision

Blog content editing pivoted to an **Excel-first pipeline**:

- A single workbook (`mysterymaker_blog_master.xlsx`, later `blog_map.xlsx`) is the source of truth for all blog content edits — voice rewrites, SEO/GEO enrichment, translations.
- Claude agents read and write **only the local Excel file**, never Supabase directly, during content-editing work.
- Supabase is updated via a single, deliberate **bulk import** from the validated workbook at the end of a batch of changes, not via many small parallel writes during the work.

## Rationale

- **Removes the failure class entirely.** Both corruptions were caused by concurrent/parallel writers hitting Supabase directly with no coordination. A single local file edited synchronously, then pushed in one bulk operation, has no equivalent race window.
- **Cheap to verify before it's live.** A bad cell in Excel can be caught by a read-back/validation pass before any customer-facing row changes; a bad direct write to Supabase is already live the moment it lands.
- **Matches how the work is actually parallelized.** Voice rewrite and translation are naturally batchable (N posts × M languages) — collecting output in one file before a single sync point is a better fit than N/M independent writers racing on the same table.

## Alternatives considered

1. **Add locking/coordination around direct Supabase writes.** Rejected as more complex than the problem warranted — the whole point of parallel agents was to avoid coordination overhead; building a lock manager reintroduces it.
2. **Keep direct writes but add a verification pass after every write.** Would have caught corruption after the fact, not prevented it — and with hundreds of writes per session, per-write verification is expensive and easy to skip under time pressure.
3. **Do nothing / attribute both incidents to one-off bugs.** Rejected — two independent mass-overwrites in the same week is a pattern, not a fluke, and later `CHANGELOG.md` entries (the recurring `blog_map.xlsx` corrupt-zip / concurrent-writer incidents) show the workbook itself remained fragile under concurrent access even after this decision — meaning the *decision* was right but its own implementation still needed the tmp-write → read-back-verify → atomic-rename pattern documented later (see those CHANGELOG entries and [[feedback_makecom_blueprint_versioning]]-adjacent memory notes).

## Consequences

- **Positive:** No further mass-corruption-across-all-languages incidents recorded since March 2026. All content edits are auditable in a single file before they're live.
- **Negative:** `blog_map.xlsx` (36MB) itself became a new fragility point — numerous `CHANGELOG.md` entries from April–July 2026 document `exceljs` round-trip corruption and concurrent-writer collisions on this same file, addressed with tmp-write/read-back-verify/atomic-rename discipline rather than a further architecture change.
- **Neutral:** This ADR is a historical backfill, not a live decision point — no code changes accompany it. Its purpose is solely to give the still-operating Excel-first constraint a durable, discoverable home instead of only living in a gitignored file and institutional memory.

## Discussion

The retroactive nature of this ADR is itself the finding worth recording: a real, still-active architectural constraint (agents don't write blog content to Supabase directly) existed for five months with no durable record anyone could discover without already knowing to look in a gitignored `temp-files/` file. The fix isn't just this ADR — see the 2026-08-13 CHANGELOG entry for the broader gap (a second gitignored file, `temp-files/seo-geo-playbook.md`, held the only copy of the general SEO/GEO strategy playbook) and the process takeaway: documents written under `temp-files/` during a working session need an explicit "promote to `docs/` or vault" step before the session ends, because `.gitignore` silently strips anything under `temp-files/**/*.md`.

## Key files

- `docs/blog-content-pipeline-history-2026-03.md` — full incident timeline (corruption discovery, damage assessment table, two-attempt recovery), preserved verbatim from the original `temp-files/SEO_GEO_CHANGELOG.md`.
- `docs/seo-geo-playbook.md` — the general SEO/GEO strategy playbook, promoted from `temp-files/` the same day this ADR was written.
- `blog_map.xlsx` — the current workbook; see `feedback_makecom_blueprint_versioning` and blog-map-fragility memory notes for its ongoing round-trip-corruption gotchas.
