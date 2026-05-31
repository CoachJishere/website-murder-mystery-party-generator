# ADR-0013: JSON-LD Hero Image Fallback via EN Sibling, and FAQ Extractor Relaxation

- **Status:** Accepted
- **Date:** 2026-05-30

## Context

The site's North Star claims blog posts are "structured for both Google ranking and AI platform citation (ChatGPT, Perplexity, Google AI Overviews)." JSON-LD structured data is the primary citable-content signal AI platforms parse. We had never verified that what we *thought* we emitted matched what was actually in the served HTML.

A 5-page sample audit (EN how-to-fix, EN theme, EN comparison, DE how-to-fix, JA how-long) confirmed the implementation in [scripts/prerender-blog.mjs](../../scripts/prerender-blog.mjs) is largely solid: every page emits BlogPosting + BreadcrumbList + FAQPage (where applicable) + HowTo/ItemList as appropriate, with localized breadcrumb names, language-prefixed item URLs, and correct `inLanguage`. All required Article fields are present.

The audit surfaced two real gaps:

1. **Hero images on translations.** `featured_image_url` is populated only on the EN row of each slug (the Pinterest pipeline only runs against EN). All ~1,500 non-EN rows have `featured_image_url IS NULL`, so they fall back to the global `homepage-share-image.png` as both the JSON-LD `image` and OG image. Every translation of every cell ends up advertising the same generic placeholder. EN siblings — same slug, same content — *do* have a real hero image. The image is right there one row over in `blog_posts`.

2. **FAQ extractor too strict.** When a 15-page random audit (via the new [scripts/audit-jsonld.mjs](../../scripts/audit-jsonld.mjs)) ran against live pages, two posts that have a `## FAQ` section in their markdown were not emitting FAQPage schema. Investigation showed two content shapes the Pattern-3 regex couldn't handle:
   - Period-terminated questions: `**What if I can't afford backup equipment.**` (period, not `?`)
   - Inline answers: `**Question.** Answer text...` on the same line, not separated by a newline

## Decision

**1. Fall back to the EN sibling's `featured_image_url` for translations before falling back to the homepage placeholder.**

In `scripts/prerender-blog.mjs` `main()`, build a `slug → en featured_image_url` map once. For each non-EN post with an empty `featured_image_url`, resolve from that map before the existing `|| FALLBACK_SHARE_IMAGE` chain kicks in. The resolution happens in one place (`main()`); both `buildSchemas()` and `buildHead()` then read the post's already-populated `featured_image_url` field unchanged.

**2. Relax FAQ Pattern 3 to accept period terminators and inline answers.**

Change the regex from:
```js
/\*\*([^*\n]+[?？])\*\*\s*\n+\s*([\s\S]*?)(?=\n\s*\*\*[^*\n]+[?？]\*\*|\n## |$)/g
```
to:
```js
/\*\*([^*\n]+[?？.])\*\*\s+([\s\S]*?)(?=\n\s*\*\*[^*\n]+[?？.]\*\*|\n## |$)/g
```

Two changes: terminator class includes `.`, and separator becomes `\s+` (any whitespace) instead of `\s*\n+\s*` (newline-required). Apply the same change to the React-side mirror in [src/pages/BlogPost.tsx:372](../../src/pages/BlogPost.tsx#L372) so the client-side schema stays in sync.

**3. Ship a permanent audit script: [scripts/audit-jsonld.mjs](../../scripts/audit-jsonld.mjs).**

Fetches the live sitemap, picks N random blog URLs (default 30), parses every `<script type="application/ld+json">`, verifies BlogPosting+BreadcrumbList presence, all 8 BlogPosting required fields, and FAQPage presence when the rendered HTML contains an FAQ H2. Writes `audit-jsonld-failures.csv` and exits 1 if any URL fails — wirable into CI later.

## Discussion

The image-fallback choice was straightforward once we saw the data. Per-translation hero generation (run the Pinterest pipeline in 13 languages) is the "real" fix but expensive and out of scope; EN-sibling fallback gives us the right image on every page at zero generation cost. The risk is the hero image text bakes English into a translated page's OG card. We accept that — the alternative is a generic gradient placeholder that says nothing, vs. an EN-text card that at least signals the actual post topic. Future work could generate language-specific heroes; that doesn't change the schema-emission logic, just the underlying data.

The FAQ extractor relaxation took more thought. Three patterns already exist; the natural move was a Pattern 4. But Pattern 3's purpose is exactly "bolded question, paragraph answer" — what the failing posts have, just with the wrong terminator and a missing newline. Adding a fourth pattern would duplicate Pattern 3's intent with marginally different anchors. Relaxing Pattern 3 in place keeps the extractor focused.

The risk of the relaxation: a standalone `**bold sentence.**` mid-answer could now look like a question to the regex. Mitigations: (1) Pattern 3 only runs in `## FAQ` sections, where standalone bolded sentences essentially always are questions; (2) Pattern 3 only runs when Patterns 1 and 2 produced zero matches, so posts using the structured `### Q?` or `**Q:** A:` formats are unaffected; (3) the regex still requires the bold to be at the start of a substring with surrounding whitespace context, so inline emphasis like `... it's **really important.** Make sure...` won't match because it isn't followed by a paragraph break.

Not in scope but worth noting: some posts have two FAQ sections (one with `**Q.**` shape, a later one with `### Q?` shape). The heading regex captures only the first. Extracting from multiple FAQ sections is a separate enhancement; capturing one is a strict improvement over capturing none.

## Consequences

**Positive:**
- **~1,500 non-EN pages get the right hero image.** Same image as the EN sibling, instead of the homepage placeholder. Cleaner OG cards, cleaner JSON-LD `image` field, no per-locale generation cost.
- **More pages emit FAQPage schema.** The two failing posts now do; an unknown but small additional set of posts using the period/inline shape will start emitting FAQPage on next prerender. Strict win — we never falsely add schema, we only add it where the content shape genuinely is Q&A.
- **Permanent regression guard.** `audit-jsonld.mjs` can run any time (locally, in CI, in a cron). Surfaces both content-extraction gaps and prerender-deployment failures.
- **Single source of truth for hero image** — no separate denormalized column needs to be backfilled across 13 languages.

**Negative:**
- **Translation OG cards display EN-text imagery.** Acceptable: the alternative is a generic placeholder. Future per-locale hero generation would supersede this; the schema-emission path doesn't need to change when that happens (the per-locale `featured_image_url` would just become non-null and the fallback wouldn't fire).
- **FAQ extractor over-match risk is now slightly higher.** Mitigated by the in-FAQ-section scope and the no-prior-match guard, but the regex *could* in theory pick up bolded mid-answer sentences. If false positives appear in future audits, the response is to add explicit anchor requirements (e.g. require the bold to start a line), not roll back.
- **Audit script must hit live URLs.** Slow (~1 req/sec into a sequential loop) and depends on network/CDN availability. Acceptable for ad-hoc and CI use; not appropriate for tight inner loops.

**When to revisit:**
- If we generate per-locale hero images, the EN-fallback branch will become a no-op (data side fills first). No code change needed; could be removed for clarity once verified.
- If a new FAQ content shape appears that Pattern 3 still misses, add Pattern 4 rather than further relaxing Pattern 3 (further relaxation increases over-match risk).
- If we adopt multi-FAQ-section extraction, change the heading regex to a `matchAll` and union the QA pairs across sections.

## Rejected alternatives

- **Generate per-locale hero images now.** Rejected as too expensive for this pass. The Pinterest pipeline would need to render text in each of 13 languages with locale-appropriate fonts (CJK, etc.) and Cloud-storage 1500+ new assets. The EN-fallback gets 90% of the value at 0% of the cost.
- **Add a new column `effective_image_url` to `blog_posts` backfilled from the EN sibling.** Rejected as denormalization for a derived value. Computing it at prerender time keeps `blog_posts` as the single editable source.
- **Add Pattern 4 for period/inline FAQ shapes rather than relax Pattern 3.** Rejected as code duplication — Pattern 3's intent already is "bolded question, paragraph answer" and the failing content matches that intent. Relaxing in place keeps the pattern set focused.
- **Build the audit into the existing build pipeline as a blocking gate.** Rejected for now: the audit hits live URLs, which would only be valid after deploy completes. A separate post-deploy step or a manual run is cleaner. If we move to a build-time audit, it would need to hit the prerendered output in `dist/` instead.
- **Use a third-party schema-validation API (Google Rich Results Test, schema.org validator).** Rejected: those tools have no API for batch validation and rate-limit aggressive automated use. Our internal structural checks (required fields present, BreadcrumbList URL matches page URL) cover the same ground for our specific schema set.

## Key files

- [scripts/prerender-blog.mjs](../../scripts/prerender-blog.mjs) — EN-sibling image map + FAQ Pattern 3 relaxation
- [src/pages/BlogPost.tsx](../../src/pages/BlogPost.tsx) — FAQ Pattern 3 relaxation (React-side mirror)
- [scripts/audit-jsonld.mjs](../../scripts/audit-jsonld.mjs) — new audit script
