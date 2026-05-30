# SEO Cleanup Briefs — 5 Remaining Technical Items

*Generated 2026-05-21 after completing the KO + ZH-CN content rot regeneration (439 cells, 0 gate failures across both queues). These five briefs close the remaining technical gap to a "fully functioning SEO program" per [docs/mysterymaker_north_star.md](mysterymaker_north_star.md). Distribution channels (Pinterest live; Quora / Product Hunt / Amazon KDP / PR not yet executed) are out of scope here — those are operational work, not technical.*

## How to Use These Briefs

Each brief is self-contained — paste the fenced block into a fresh Claude Code conversation. They have no inter-dependencies, so run sequentially or fan out in parallel. Suggested priority order if doing sequentially: **1, 3, 4, 2, 5** (titles first because highest leverage; hreflang + JSON-LD before broader audits because they fix infrastructure other audits rely on).

### Model selection

| Brief | Phase | Model | Why |
|-------|-------|-------|-----|
| 1 | Script build (audit + prompt generator) | Opus 4.7 | Contained engineering, ~200 LOC |
| 1 | Per-cell title + meta regen (batched) | Sonnet | Writing-heavy, 20–40 conversations, token efficiency |
| 2 | Audit script + initial run | Opus 4.7 | Contained engineering |
| 2 | Any follow-on regen (if rot found) | Sonnet | Same writing-heavy pattern as Brief 1 phase 2 |
| 3 | hreflang audit + fix | Opus 4.7 | Single contained session |
| 4 | JSON-LD audit + schema authoring | Opus 4.7 | 1–2 sessions, may be exploratory |
| 5 | Cross-link audit + mechanical fix | Opus 4.7 | Single contained session |

The pattern mirrors what worked for the original rot-gate project: Opus built the tooling, Sonnet handled the per-cell creative work in batched conversations.

---

## Brief 1 — Title + meta_description rot audit (KO + ZH-CN)

**Estimated effort:** ~1 Opus session for tooling + 20–40 Sonnet conversations for regen.
**Leverage:** Highest. Titles are what users + AI platforms see first in search results — they outweigh body content for CTR.

```
You are working in /Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main, a Vite + TS + Supabase blog generator. North Star: 13-language coverage is a real differentiator, primary acquisition channel is blog/SEO/GEO content. Titles are what users + AI platforms see first in search results — they outweigh body content for click-through.

Context: in May 2026 we cleaned rot from the `content` column of all 842 ko + zh-cn blog rows (607 drafts + 235 published) via scripts/check-rot-signals.mjs + scripts/audit-rot-signals.mjs + scripts/generate-regen-prompts.mjs. Result: 0 gate failures across both queues. But the gate only checks `content` — the `title` and `meta_description` columns have never been audited. Likely they contain the same calque patterns (sentence-final declarative KO H2-style endings, English-syntax word order, length-truncated ZH-CN) since the same MT pipeline produced them.

Goal: audit ko + zh-cn `title` and `meta_description` columns, regenerate the failing rows in place via the same per-cell methodology we used for content.

Steps:

1. Read scripts/check-rot-signals.mjs to understand the existing five heuristics. Note the H2-specific ones (sentence-final endings, explicit pronouns) need adaptation for titles — titles are single-line, no H2 anchor. The brand-as-H2 / untranslated-English / length-floor concepts still apply.

2. Build scripts/check-title-rot.mjs that exports `checkTitle(lang, title)` and `checkMeta(lang, meta)`. Heuristics to start with:
   - Title length: 30–70 chars healthy (SEO sweet spot), flag <20 or >70.
   - Meta length: 120–170 chars healthy, flag <80 or >170.
   - Brand-as-text: "mysterymaker.party" literal in title or meta = fail.
   - Untranslated English: 4+ consecutive Latin words in title (excluding brand), 6+ in meta.
   - KO calque endings: title ending in 합니다 / 입니다 / 됩니다 / 습니다 — same pattern as H2 check.
   - KO explicit pronouns: 그들이 / 그것이 / 그것을 / etc. in title.
   - Length-vs-EN ratio: fetch the EN title for the same slug; ko title <40% of EN char-length or >180% is suspect.

3. Build scripts/audit-title-rot.mjs (clone audit-rot-signals.mjs structure). Paginate all ko + zh-cn rows, run checks on title + meta. Emit CSV at temp-files/title-audit-<ISO>.csv with columns: slug, lang, column (title|meta), value, reasons.

4. Smoke-test the heuristics on a small sample (5 known rotted slugs you already saw earlier) to confirm they fire correctly.

5. Run the full audit. Report total failures by lang × column.

6. Build scripts/generate-title-regen-prompts.mjs (clone generate-regen-prompts.mjs, --batch-size flag). Each prompt brief regenerates 10 cells' title + meta together (since they're tightly related). Per-cell loop: fetch EN title + EN meta + EN h1, draft fresh ko/zh-cn title + meta that match the EN's intent but read natural in target language, smoke-test, PATCH both columns in one row update, re-verify.

7. Fan out the batched prompts in fresh conversations (same methodology as the content regen).

8. Re-run the audit to confirm 0 failures.

9. Log CHANGELOG entry under today's date: title + meta rot cleared in ko + zh-cn.

Discipline:
- Same per-cell discipline as the content regen — no Python regex bulk, smoke-test before write, PATCH each row individually.
- Don't touch `content` — that's already clean.
- Don't touch other languages.
- Only commit the new audit + regen scripts + CHANGELOG. The temp-files outputs are gitignored.
```

---

## Brief 2 — Audit the other 10 languages for rot

**Estimated effort:** ~1 Opus session for audit. Regen scope (and Sonnet time) depends on findings.
**Leverage:** Medium-high. The 13-language coverage is a real moat per the North Star — only works if all 13 are good.

```
You are working in /Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main. North Star: 13 languages with full parity is a real moat — only works if all 13 are actually good quality.

Context: the rot-signal gate at scripts/check-rot-signals.mjs only knows about ko + zh-cn — those were the languages the original May 2026 diagnostic flagged. Japanese was sampled and called clean. The other nine languages (es, fr, de, it, pt, nl, da, sv, fi) have never been audited. Same upstream MT pipeline produced all 13, so if ko + zh-cn were systematically rotted, the others might be too — just with different surface patterns we didn't think to check for.

Goal: audit the other 10 languages (es, fr, de, it, pt, nl, da, sv, fi, ja) with language-agnostic heuristics, then decide whether full regeneration is warranted for any of them.

Steps:

1. Build scripts/audit-multilang-rot.mjs. Heuristics that work across any non-English language:
   - Length floor relative to EN: for each (slug, lang) pair, fetch EN content length and target-lang content length. Flag if target < 50% of EN char-length (post-CJK density adjustment for ja). Set per-lang floor multipliers — Romance + Germanic langs typically 90–110% of EN length, CJK 35–50%.
   - Brand-as-H2: same as existing — mysterymaker.party literal in any H2.
   - URL-as-H2: any domain.tld pattern in headings.
   - Untranslated English run in H2: 5+ consecutive Latin words (excluding brand). This is the most universal calque signal — if a French H2 has 5 English words in a row, something's wrong.
   - English-only headings: an H2 with NO non-Latin characters at all in a non-English cell (e.g. a German cell with an H2 that's 100% English).

2. Paginate all rows for the 10 target languages. Run heuristics. Emit CSV at temp-files/multilang-rot-audit-<ISO>.csv.

3. Sample 5 random failures per language (or all, if fewer) for human inspection. Print the slug, lang, failing H2, full title.

4. Report per-language failure rate. Compare to the ko/zh-cn baseline (which had 40.6% ko / 63.7% zh-cn fail rates against the original heuristics).

5. Decide per language whether full regeneration is needed:
   - <5% fail rate: likely false positives, gate threshold may need tuning. Investigate the failures manually.
   - 5–20% fail rate: targeted regeneration of the failing cells via per-cell prompts.
   - >20% fail rate: same blanket regeneration approach as we did for ko + zh-cn.

6. If regeneration is warranted for any language(s), build a generate-multilang-regen-prompts.mjs that extends the existing pattern. Add per-language style rules where appropriate (e.g. German compound noun expectations, French word-order signals — these can be lighter than the KO calque rules since the other languages were less obviously rotted).

7. Update scripts/check-rot-signals.mjs to optionally gate other languages too. Then update the daily-publish workflow YAML to extend the language whitelist logic — or just add the additional langs to the gate's loop.

8. Log CHANGELOG entry under today's date.

Discipline:
- Audit first, don't presume rot. The Romance + Germanic langs may genuinely be clean.
- Don't touch ko + zh-cn — those are done.
- If you find rot in only 1–2 languages, scope the fix to those; don't expand surface area.
```

---

## Brief 3 — hreflang + canonical sanity audit

**Estimated effort:** ~1 Opus session.
**Leverage:** Medium. Fixes search-engine signal correctness for non-English languages.

```
You are working in /Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main. North Star: 13-language coverage opens non-English markets. Search engines need correct hreflang tags to surface the right language version per user.

Context: blog_posts has rows in 13 lowercase language codes (en, es, fr, de, it, pt, nl, da, sv, fi, ja, ko, zh-cn). On 2026-05-10 a phantom row with uppercase 'zh-CN' was discovered and demoted (commit 94e64a0). That bug suggests hreflang generation logic may be fragile. Per slug, the site should emit exactly 13 hreflang link tags, all pointing to the lowercase canonical URLs.

Goal: audit the live site's hreflang + canonical tag emission across all 13 languages, surface any inconsistencies, fix the worst offenders.

Steps:

1. Build scripts/audit-hreflang.mjs. For each (slug, lang) row in blog_posts with status='published':
   - Fetch the rendered HTML at https://mysterymaker.party/{lang}/blog/{slug} (where en uses /blog/{slug} not /en/blog/{slug} — verify by inspection).
   - Parse out all <link rel="alternate" hreflang="..."> tags from the <head>.
   - Parse the <link rel="canonical"> tag.
   - Verify: exactly 13 hreflang entries, all 13 expected langs present (lowercase), no duplicates, no uppercase, no orphan langs. Canonical points to the same-language URL.
   - Also check the x-default hreflang entry — should point to the English version.

2. Run the audit across a representative sample first (50 slugs × 13 langs = 650 fetches with throttling). Emit temp-files/hreflang-audit-<ISO>.csv with: slug, lang, n_hreflang, missing_langs, extra_langs, canonical_lang, canonical_url, issues.

3. Aggregate findings. Likely categories:
   - Slugs where one lang's row is draft but others are published → that lang missing from hreflang (might be intentional, but should verify).
   - Slugs with phantom uppercase rows still leaking into hreflang.
   - Slugs with broken canonical (e.g. canonical pointing to /en/ from a /ko/ page).
   - Sitemap inclusion mismatch (sitemap.xml should have all 13 entries per published slug too — diff against sitemap).

4. Fix logic in whatever source the hreflang generation lives in. Likely candidates: src/components/BlogLayout.tsx, src/lib/seo.ts, or wherever the per-page SEO head tags are computed. Could also be in build-time prerender (scripts/prerender-blog.mjs).

5. Re-deploy, re-run the audit, confirm clean.

6. Verify sitemap.xml: count URLs per language, should be roughly equal across published slugs. Look for /zh-CN/ (uppercase) leaks.

7. Bonus: submit the updated sitemap to GSC + IndexNow as a one-shot push (existing scripts: submit-sitemap-gsc.mjs, submit-indexnow.mjs).

8. CHANGELOG entry.

Discipline:
- Read-only audit first. Don't change anything until you've understood the failure modes.
- If the hreflang logic is generated at build time vs runtime, find out before editing.
- Don't refactor the SEO head tags broadly; surgical fixes only.
```

---

## Brief 4 — JSON-LD structured data verification

**Estimated effort:** 1–2 Opus sessions.
**Leverage:** High for GEO (AI citation). The North Star explicitly cites "AI platform citation (ChatGPT, Perplexity, Google AI Overviews)" as a target.

```
You are working in /Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main. North Star: "structured for both Google ranking and AI platform citation (ChatGPT, Perplexity, Google AI Overviews)." JSON-LD structured data is the primary signal AI platforms use to identify citable content.

Context: the North Star claims blog posts are GEO-optimized for AI citation, but we've never verified the structured data is actually emitted correctly per page. Required schemas for the blog: Article (or BlogPosting), BreadcrumbList. Highly desirable: FAQPage on cells with Q&A blocks (most "how to fix" cells have them). Optional: ImageObject for hero images, Organization for the publisher.

Goal: audit what JSON-LD is currently emitted, identify gaps, ensure every published blog page emits valid Article + BreadcrumbList minimum, with FAQPage where applicable.

Steps:

1. Sample 5 blog URLs across different languages (mix of how-to-fix, theme, comparison cells). Fetch each, extract JSON-LD blocks from <script type="application/ld+json">. Validate each block with Google's Rich Results Test schema — at minimum it should parse as valid JSON and have @context, @type.

2. For each schema type expected:
   - Article / BlogPosting: must have headline, author, datePublished, dateModified, image, publisher, mainEntityOfPage.
   - BreadcrumbList: must reflect actual nav (Home > Blog > [slug]).
   - FAQPage: if the page has a FAQ section (look for `## FAQ` or H2s phrased as questions), must emit mainEntity array with Question + Answer pairs.

3. Find where JSON-LD is currently emitted. Likely candidates: src/components/BlogLayout.tsx, src/lib/seo.ts, scripts/prerender-blog.mjs, or via a React Helmet wrapper.

4. Identify gaps:
   - Pages without Article schema → fix mandatorily.
   - Pages without BreadcrumbList → fix.
   - Cells with FAQ blocks but no FAQPage schema → fix (high-leverage for AI Overviews + rich results).
   - Image fields missing → fill from blog_posts.featured_image_url.

5. Implement fixes. Test on a single page first via the browser dev console + Google's Rich Results Test (https://search.google.com/test/rich-results).

6. Verify across all 13 languages — the schemas should be present with localized fields where applicable (headline, description in target language; URLs in target-language paths).

7. Build scripts/audit-jsonld.mjs as a lightweight ongoing check: fetches N random published pages, validates each emits the required schemas. Output: pass/fail count + a CSV of failures.

8. Re-deploy, run audit, confirm clean.

9. CHANGELOG entry.

Discipline:
- This is a high-leverage SEO + AI-citation move — don't half-ship. If you find Article is present but FAQPage is missing, fix FAQPage in the same pass.
- Don't add schemas that don't reflect actual content (e.g. don't claim FAQPage if the page doesn't have an FAQ section).
- Test against Rich Results Test before claiming done.
```

---

## Brief 5 — Cross-link bidirectionality + lang-prefix consistency

**Estimated effort:** ~1 Opus session.
**Leverage:** Medium. Internal link equity distribution + topical authority signaling to Google.

```
You are working in /Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main. North Star: blog content is the primary acquisition engine. Internal cross-links distribute link equity, signal topical authority to Google, and keep users on-site across the funnel.

Context: scripts/apply-crosslinks.mjs runs daily on the published slug to insert internal cross-links per cross_link_map.json. The May 2026 rot-regeneration project fixed link conventions (/blog/X → /{lang}/blog/X, anchors translate to match localized H2s) in the regenerated cells, but the ~80+ already-live cells in the other 11 languages predate that fix and may have wrong conventions baked in.

Goal: audit cross-link conventions across all live blog content, surface inconsistencies, fix mechanically (this is link/anchor mechanics, not translation work, so a script is appropriate).

Steps:

1. Build scripts/audit-crosslinks.mjs. For every published row in blog_posts:
   - Extract all internal links matching [text](/...).
   - Categorize: cross-cell blog link (/{lang?}/blog/...), same-page anchor (#...), other internal (/...).
   - Verify per-row:
     * Every cross-cell link is prefixed with the row's language code: e.g. ko row should have /ko/blog/X, not /blog/X or /en/blog/X.
     * Every same-page anchor points to an actual H2 in the row's content. Anchor text should match the H2 text's kebab-case slug in the same language.
     * No dead anchors (anchor text doesn't match any H2).

2. Emit temp-files/crosslink-audit-<ISO>.csv: slug, lang, n_links, n_wrong_prefix, n_dead_anchors, sample_issues.

3. Aggregate by language. Expectation: ko + zh-cn are clean (we just fixed them); the other 11 may have issues.

4. For mechanical fixes (wrong lang prefix), build scripts/fix-crosslink-prefixes.mjs that processes a list of (slug, lang) and rewrites /blog/X → /{lang}/blog/X. This IS appropriate for a script — it's deterministic find/replace, no judgment, fully reversible.

5. For dead anchors (anchor doesn't match any H2), the fix is harder — either the anchor needs updating to match the H2 or the H2 was renamed/removed. Surface these per-cell for human review; don't auto-fix.

6. Also verify cross_link_map.json itself:
   - Bidirectionality: if slug A is in slug B's link list, is slug B in slug A's? Not a hard requirement but worth checking the distribution.
   - All slugs in the map exist in blog_posts.
   - No dangling references.

7. Run the prefix-fix script across the affected slugs. PATCH each row individually. Test on 1 slug first, verify in browser before bulk.

8. Re-run audit to confirm clean.

9. CHANGELOG entry.

Discipline:
- Prefix-fix is a mechanical script, that's fine. Dead-anchor fix requires per-cell judgment, surface those for review.
- Don't modify cross_link_map.json itself unless you find dangling slugs (orphan references).
- Test on 1 slug before bulk processing.
```

---

## When All Five Are Done

The technical SEO foundation matches the North Star's "fully functioning SEO program" bar:

- ✅ Content rot cleared (already done — 439 cells regenerated May 2026)
- ✅ Title + meta rot cleared (Brief 1)
- ✅ All 13 languages audited and gated for ongoing rot prevention (Brief 2)
- ✅ hreflang + canonical signals correct for international SEO (Brief 3)
- ✅ JSON-LD structured data emitting cleanly per page + per language for AI citation (Brief 4)
- ✅ Cross-link conventions consistent across all languages (Brief 5)

The remaining North-Star-aligned work is **distribution channel execution** — Quora, Product Hunt, Amazon KDP, PR pitches. Those are operational, not technical, and they're per the founder preference for "set it up once, let it run" channels. Out of scope for this batch.
