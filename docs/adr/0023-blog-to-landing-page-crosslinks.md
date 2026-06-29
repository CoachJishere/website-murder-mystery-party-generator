# 0023 — Blog→landing-page internal crosslinks via `cross_link_map.json`

- **Status:** Accepted
- **Date:** 2026-06-29

## Context

`/custom-murder-mystery-party/` is the generator-entry money page ([ADR-0020](0020-localized-static-landing-pages.md)). GSC shows it stuck at **~position 36** for the high-intent buyer query "custom murder mystery party" — 37 impressions/week and **0 clicks**.

On-page audit found the page is *already* well-optimized: title, H1, and meta all front-load the exact phrase. So the bottleneck is **internal authority + SERP CTR**, not on-page relevance. The page sits on page 4; the established lever for pushing a page up is internal links from higher-authority pages with keyword-rich anchors.

Two facts shaped the mechanism:
- **`blog_map.xlsx` → Supabase is one-directional** (`sync-blog-map.mjs`, `workflow_dispatch`-only). Editing `blog_posts.content` directly in Supabase is correct for *immediate* effect, but a manual re-sync would overwrite it.
- **Internal crosslinks have a dedicated source of truth**: `cross_link_map.json` (420 slugs) + `scripts/backfill-crosslinks.mjs`, which idempotently applies `match_text → replacement` substitutions. Until now, every entry linked **blog→blog only**. No crosslink had ever pointed at a static landing page.

## Decision

Add the **first blog→landing-page crosslinks**, treating `cross_link_map.json` as the durable source of truth and the live Supabase write as the immediate-effect mirror.

Four high-traffic posts now link to `/custom-murder-mystery-party/` with diversified anchors (2 exact-match + 2 enriched, to avoid over-optimized identical anchors):

| Source post | Anchor text |
|---|---|
| `free-murder-mystery-games-printable` | custom murder mystery party |
| `ai-murder-mystery-generator-complete-guide` | generate a custom murder mystery party |
| `best-murder-mystery-party-games-review` | custom murder mystery party |
| `best-murder-mystery-generators-online-review` | custom murder mystery party for any theme |

Each link was added as an `insertions` entry on the existing slug record in `cross_link_map.json` (with a `target_page` field marking it as a static-route target rather than a blog `target_slug`) **and** applied to live Supabase `blog_posts.content` via an idempotent `replace()` guarded by `NOT LIKE '%/custom-murder-mystery-party/%'`.

On-page, the title and meta were also tuned for CTR (meta now leads with the exact phrase verbatim); the H1 was left unchanged as it is already an exact match. See CHANGELOG 2026-06-29.

**English-only.** The target query is English and non-EN locales target their own localized queries, so only `insertions` (EN) were added — not `lang_insertions` for the other 12 languages.

## Rationale

- **Authority, not relevance, is the bottleneck.** The page already has exact-match on-page signals; what it lacks is internal links. Crosslinks from posts that already rank pass topical authority and give Google a strong relevance signal via anchor text.
- **`cross_link_map.json` is the right home.** It's git-versioned, idempotent, and re-applied by `backfill-crosslinks.mjs` after any content sync — so the links survive an xlsx→Supabase overwrite. The live Supabase write is purely for immediate effect while the next backfill isn't yet needed.
- **Anchor diversity** avoids the spam signal of four identical exact-match anchors while still reinforcing the target phrase.
- **Direct DB write is safe here** because `sync-blog-map` and `backfill-crosslinks` are both `workflow_dispatch`-only and the daily cron only publishes *new drafts* — it never rewrites existing published content.

## Alternatives Considered

- **Edit Supabase only (no JSON).** Rejected: not durable — a manual `sync-blog-map` run would silently wipe the links, and there'd be no version-controlled record.
- **Edit JSON only, run `backfill-crosslinks` to apply.** Durable, but the backfill workflow is manual and applies *all* 420 entries' insertions to the live DB — a broader write than needed for a 4-link change. Doing the JSON edit *plus* a surgical 4-row Supabase write gets both durability and immediate effect with the smallest live blast radius.
- **Rewrite title/H1/meta heavily.** Rejected: the page already front-loads the exact phrase; a heavy rewrite risks regressing a page that's only one signal short of page 2. Tuned meta for CTR and left H1 alone.
- **All-13-languages crosslinks.** Deferred: the query is English; translating anchors/`match_text` for 12 locales is speculative until non-EN demand shows in GSC.

## Consequences

- First precedent for `target_page` (static route) entries in `cross_link_map.json`; `audit-crosslinks.mjs` already categorizes non-`/blog/` routes as "other" and won't flag them as dead.
- Expectation: the page moves from page 4 toward page 2 over the coming GSC crawl cycles; CTR on impressions should rise from the meta change. Re-check in the weekly SEO digest.
- If non-EN versions of these posts later need the same links, add `lang_insertions` to the four `cross_link_map.json` entries and run `backfill-crosslinks`.

## Discussion

The main trade-off debated was **durability vs. blast radius**. The JSON is the only durable home (survives sync), but its apply path (`backfill-crosslinks`) is all-or-nothing across 420 entries. Writing the 4 rows directly to Supabase gives immediate effect with a 4-row blast radius, while the JSON edit guarantees the links come back if a sync ever clobbers them. Doing both — rather than choosing — resolved the tension. The second debate was whether to touch the on-page copy at all given the page already ranks; the conclusion was to make only the high-confidence CTR change (exact-phrase-first meta) and a minor title tweak, and explicitly *not* touch the already-optimal H1.

## Key files

- `cross_link_map.json` — 4 new `insertions` entries with `target_page: /custom-murder-mystery-party/`
- `scripts/backfill-crosslinks.mjs` — idempotent applier (re-applies after any content sync)
- `src/i18n/locales/en.json` — `customParty.seo.title`, `customParty.seo.description`, `customParty.hero.intro`
- `src/pages/CustomMurderMysteryParty.tsx` — renders the title/meta/H1 from those i18n keys

## Links

- [[01_Projects/Mystery-Maker]]
