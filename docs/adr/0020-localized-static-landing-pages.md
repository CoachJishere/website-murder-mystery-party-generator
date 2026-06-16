# 0020 — Localized static landing pages (per-language routes + in-page hreflang)

- **Status:** Accepted
- **Date:** 2026-06-15

## Context

GSC showed the Italian query "miglior intrattenimento murder mystery per eventi aziendali" at **avg position 3.3 with 15 impressions but 0 clicks**. Root cause: there was no Italian version of the corporate landing page. The only corporate-relevant page, `/custom-murder-mystery-party` ([src/pages/CustomMurderMysteryParty.tsx](../../src/pages/CustomMurderMysteryParty.tsx)), was hardcoded English with a raw `<Helmet>`, an English-only canonical, no `/:lang/` route, and an English-only sitemap entry. Google ranked the English page for the Italian query, so Italian searchers saw an English snippet and didn't click.

Until now the site localized two kinds of content differently:
- **Blog posts** — fully localized: `/:lang/blog/...` routes, 13-language DB rows, hreflang alternates emitted by the sitemap.
- **Static marketing pages** (`/custom-murder-mystery-party`, `/showcase`, `/support`, `/privacy`) — English-only, single route, no localized variants.

This is the first time we localize a *static* (non-blog, non-DB) marketing page. That needed a repeatable pattern decision, not a one-off.

## Decision

Establish a **localized static landing page** pattern and apply it to the corporate page across **all 13 languages**:

1. **Route**: add `/:lang/custom-murder-mystery-party` next to the un-prefixed EN route in [src/App.tsx](../../src/App.tsx). The component reads the `lang` param and syncs i18n on mount (same pattern as `BlogIndex.tsx`).
2. **Copy in i18n**: move all page strings into a `customParty.*` section in every `src/i18n/locales/*.json`. The FAQ JSON-LD is generated from the translated strings so the visible FAQ and the schema can't drift.
3. **SEO meta**: keep `<Helmet>` (not the shared `Head` component) so each language sets its own exact `<title>`. `Head` force-appends `| {brand}`, which would push titles past Google's ~60-char truncation. Canonical and `og:locale` resolve from the URL language; **in-page hreflang alternates** are emitted for all 13 languages + `x-default`→EN.
4. **Sitemap + indexability** ([scripts/generate-sitemap.mjs](../../scripts/generate-sitemap.mjs)): a `localizedStaticPages` group emits one `<url>` per language with reciprocal hreflang + `x-default` (mirrors the blog-post block), and per-language `dist/<lang>/<path>/index.html` route files are written so GitHub Pages returns 200 (not 404) before the SPA router takes over.
5. **`zh-cn` → `zh-Hans`** mapping in every hreflang emission point (in-page and sitemap), matching the existing blog convention.

**Ship all 13 languages, not Italian-only.** The route/hreflang/sitemap/route-file plumbing is identical regardless of language count; only translation work scales with N.

## Rationale

- **Convert a proven ranking.** A top-3 position with 0 clicks is almost entirely a SERP-snippet problem. An Italian title/meta over an English body underperforms and invites Google to rewrite the snippet, so the body is localized too — on-page relevance reinforces the title/meta.
- **Plumbing cost is fixed; translation is the only variable.** Once the page is i18n-aware with a `/:lang/` route and a 13-language hreflang/sitemap loop, adding 12 more languages is just 12 translation blocks. Given that, shipping all 13 (vs. Italian-only) costs only translation effort and avoids a half-localized section.
- **Consistency + latent demand.** The rest of the site (UI + ~1,800 blog rows) is uniformly 13-language. Corporate murder mystery is a real market in DE/FR/etc.; those languages had no page to rank, partly *why* only Italian surfaced.
- **Helmet over `Head`** preserves exact title length per language — the load-bearing SERP element here.
- **hreflang only advertises languages with genuine native copy.** Because all 13 are really translated, listing all 13 in hreflang is correct (no false alternates pointing at English).

## Alternatives considered

- **Italian + English only** (smallest blast radius): rejected — leaves the page section inconsistent with the 13-language site, and the plumbing cost is the same as doing all 13.
- **SEO meta only, English body** under the Italian URL: rejected — thin/mismatched content for Italian buyers, weaker quality signal, and Google may rewrite the snippet anyway.
- **Reuse the `Head` component**: rejected for this page — its forced `| {brand}` suffix bloats the title past truncation; we lose exact per-language title control.
- **Localized slugs** (e.g. `/it/murder-mystery-eventi-aziendali`): rejected for now — diverges from the established `/:lang/<same-slug>` blog/about convention and complicates the sitemap/hreflang loop; not worth it for the first localized static page.
- **hreflang in-page only OR sitemap only**: emit in both, matching how the blog already behaves (sitemap is the primary signal; in-page is belt-and-suspenders).

## Consequences

- New per-language URLs `/<lang>/custom-murder-mystery-party/` exist, are in the sitemap with reciprocal hreflang, and resolve to 200 on GH Pages.
- The `customParty` i18n section now exists in all 13 locale files (25 keys each). Future copy edits to this page are translation edits across 13 files, not code edits.
- **Two `LANGS` lists must stay in sync**: `LANGS` in `CustomMurderMysteryParty.tsx` and `LOCALIZED_LANGS` in `generate-sitemap.mjs`. A comment in each flags this. A future refactor could share one constant.
- This pattern is now the template for localizing the remaining static pages (`/showcase`, `/support`) if/when they earn non-English demand.
- Verification is post-deploy: GSC CTR for the Italian query over ~2–3 weeks against the 15-impression / 0-click / position-3.3 baseline.

## Key files

- [src/pages/CustomMurderMysteryParty.tsx](../../src/pages/CustomMurderMysteryParty.tsx) — i18n-aware page, lang-aware Helmet + hreflang
- [src/App.tsx](../../src/App.tsx) — `/:lang/custom-murder-mystery-party` route
- [src/i18n/locales/*.json](../../src/i18n/locales/) — new `customParty` section in all 13 files
- [scripts/generate-sitemap.mjs](../../scripts/generate-sitemap.mjs) — `localizedStaticPages` hreflang group + per-language route files

## Discussion

The live decision was Italian-only vs. all 13. The instinct was to scope tight to the one market with a proven query, but re-deriving the cost inverted it: the engineering (route, hreflang, sitemap group, route-file loop) is paid once and is language-count-agnostic, so "Italian-only" saves nothing structural — it only defers 12 translation blocks while leaving a conspicuously half-localized page on an otherwise uniformly 13-language site. The remaining risk is translation quality, but there's an established 13-language bar (UI + blog) to match, and hreflang is only honest because every listed language is genuinely translated. The one durable cost accepted is the duplicated `LANGS`/`LOCALIZED_LANGS` constant across component and build script; flagged with comments rather than prematurely abstracted.

## Links

(vault copy) [[01_Projects/Mystery-Maker]]
