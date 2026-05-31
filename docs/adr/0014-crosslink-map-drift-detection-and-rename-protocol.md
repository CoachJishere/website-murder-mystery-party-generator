# ADR-0014: Cross-Link Map Drift Detection and EN Slug Rename Protocol

- **Status:** Accepted
- **Date:** 2026-05-30

## Context

The site uses `cross_link_map.json` (420 entries) to drive `scripts/apply-crosslinks.mjs`, which inserts internal cross-links into newly published blog content. The map records, per source slug:

- `links_to`: target slug list (informational)
- `insertions`: EN insertions, each with `target_slug`, `match_text`, and a `replacement` containing a Markdown link to `/blog/<target_slug>`
- `lang_insertions[lang]`: per-language equivalents with `/{lang}/blog/<target_slug>` URLs

`apply-crosslinks.mjs` runs daily during publish. Once an insertion has been applied to a row, the target slug is baked into that row's `content` field.

A May 2026 audit (Brief 5, executed via the new [scripts/audit-crosslinks.mjs](../../scripts/audit-crosslinks.mjs)) found:

- **0** wrong language prefixes across 1,646 published cells (the brief's hypothesis that pre-rot-fix cells had `/blog/X` instead of `/{lang}/blog/X` was wrong — they're clean)
- **363 dead cross-blog links** pointing to 31 distinct slugs that no longer exist in `blog_posts`. Cause: at various points, EN rows were renamed (better SEO titles, deduplication, etc.) but `cross_link_map.json` was not updated. The map kept inserting the old slug into newly translated content, and existing content kept the old slug forever. 23 of 31 dead targets have a single unambiguous candidate substitute; 8 are ambiguous.
- **107 dead anchors** across 38 non-EN cells (translated link text slugged differently than the H2 it points to). Not a map issue — a translation-drift issue.
- **6 dangling `links_to`** entries under one unpublished source slug (latent only).

The drift cause is structural: slug identity is denormalized across three places — the DB row, the map, and the already-applied content — and we had no gate to detect it.

## Decision

**1. Ship the audit as a CI gate.**

[scripts/audit-crosslinks.mjs](../../scripts/audit-crosslinks.mjs) checks every published row for:
- cross-blog links whose target slug doesn't exist in DB (any status) — **dead target**
- cross-blog links whose language prefix doesn't match the row's language — **wrong prefix**
- same-page anchors that don't resolve to any H2 slug on the page — **dead anchor**

The script writes a CSV and three JSON files to `temp-files/` and prints per-language aggregates. It is non-destructive and re-runnable.

**2. Backfill: rename old targets to new across content + map.**

For the 23 unambiguous dead targets, [scripts/fix-dead-targets.mjs](../../scripts/fix-dead-targets.mjs) rewrites `/blog/<old>` and `/{lang}/blog/<old>` → `/{lang}/blog/<new>` across all live `blog_posts.content`, patching each row individually with before/after counts. The same rename pass updates `cross_link_map.json` so future `apply-crosslinks` runs use the new slug.

The 8 ambiguous dead targets and 107 dead anchors are surfaced as per-cell review files; humans decide per case.

**3. EN slug rename protocol — going forward.**

When renaming an EN blog slug, the renamer must run `fix-dead-targets.mjs` with the explicit `--rename <old>=<new>` argument *in the same PR*. The script:
- Updates all live content references in all 13 languages
- Updates `cross_link_map.json` (`links_to`, `target_slug`, `replacement` URLs in both `insertions` and `lang_insertions`)
- Re-runs `audit-crosslinks.mjs` and asserts zero dead targets before exit

The renamer also adds the redirect: old slug → new slug, via the existing redirect mechanism (`scripts/buildSafeRedirects.mjs`).

**4. CHANGELOG and weekly check.**

`audit-crosslinks.mjs` is added to the weekly rot-check rotation alongside `audit-rot-signals.mjs` etc. so drift surfaces within a week if the protocol is skipped.

## Rationale

- **Why not derive target lists from DB at apply-time?** The map's value is the *insertion text* (the `match_text` / `replacement` pair authored to read naturally in context). Deriving target lists from DB would still leave the natural-language replacement strings to maintain, and the rename problem reappears in the URL portion of the replacement. The drift is in the URL embedded in `replacement`, not in `links_to` — moving target lists into a generated artifact would not fix it.
- **Why script-driven rename rather than a DB-level slug FK?** The slug is canonical in `blog_posts` already. The issue is that already-applied content has the old slug baked in as a string. No FK system would have rewritten that string; only a content-rewrite pass does.
- **Why not auto-fix the ambiguous targets?** When multiple candidate substitutes exist, picking the wrong one creates a worse SEO/UX outcome than leaving the dead link. The audit surfaces them, the renamer chooses.
- **Why not auto-fix dead anchors?** Dead anchors are a translation problem — the H2 was rewritten or the link text was slugged independently. Either can be the correct fix depending on which reads better. Per the operating principle ("translations need human judgment, mechanics don't"), this stays manual.

## Alternatives Considered

- **Move cross-link map into the DB.** Would centralize slug references but requires migrating 420 entries × ~5 insertions × 13 languages and reworking apply-crosslinks. Doesn't actually prevent drift, just changes where it lives.
- **Block EN slug renames entirely.** SEO improvements regularly call for slug edits; this would block legitimate work. Not viable.
- **Run audit-crosslinks on every PR.** Considered, but most PRs don't touch content. Weekly cadence catches drift before it ages while keeping CI green and fast for typical commits.

## Consequences

- New maintenance surface: `audit-crosslinks.mjs` + `fix-dead-targets.mjs` must keep pace with the map schema.
- EN slug renames now have a checklist step (run fix-dead-targets). If the renamer forgets, the weekly audit catches it within 7 days. CHANGELOG entry on rename is the audit trail.
- Backfilling the 363 existing dead links restores 363 internal-link-equity transfers that were previously dropping into 404s. Net positive for topical-authority signals to search engines.

## Discussion

The original brief assumed prefix mechanics (`/blog/X` vs `/{lang}/blog/X`) were the cross-link rot. They weren't — the May 2026 regeneration project covered that already. The audit caught a different, larger problem (renamed-slug drift) by accident. This is the second time in 2026 that an audit script written for hypothesis A has surfaced unrelated problem B (the May JSON-LD audit also went this way — see [ADR-0013](0013-json-ld-image-fallback-and-faq-extractor-relaxation.md)). The lesson is to make audit scripts wide rather than narrow: check every dimension that's cheap to check, not just the one you came for.

The choice between auto-fixing the 23 unambiguous renames and surfacing them for review was resolved in favor of auto-fix because the substitute is a deterministic longest-common-prefix match against a small candidate set, with the renamer (the maintainer who edited the EN slug) being the same person reviewing the fix output. If we ever grow to multiple maintainers, we'd want a confirmation step.

## Key files

- [scripts/audit-crosslinks.mjs](../../scripts/audit-crosslinks.mjs) — the audit
- [scripts/fix-dead-targets.mjs](../../scripts/fix-dead-targets.mjs) — the backfill + rename protocol
- [scripts/apply-crosslinks.mjs](../../scripts/apply-crosslinks.mjs) — the daily insertion driver (unchanged)
- [cross_link_map.json](../../cross_link_map.json) — the source of truth for insertions (updated by fix-dead-targets)
