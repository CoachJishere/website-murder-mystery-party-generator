# 0022 — Office murder mystery landing page (buyer-intent money page, English-only at launch)

- **Status:** Accepted
- **Date:** 2026-06-29

## Context

GSC shows the query **"office murder mystery party"** rising from zero to ~20 impressions/week at **avg position ~35** — there is no dedicated page, so the generic `/custom-murder-mystery-party` page and the informational blog post `/blog/murder-mystery-party-for-corporate-events/` are the only things ranking, both weakly, for a high-intent corporate query. The adjacent terms "corporate murder mystery" and "team building murder mystery" share the same buyer intent and the same gap.

Two assets already touch this cluster:
- **The corporate blog post** (`murder-mystery-party-for-corporate-events`, recently rewritten) — an informational HowTo guide. Good for top-of-funnel "how do I run one" reading, not a transactional landing page.
- **`/custom-murder-mystery-party`** ([ADR-0020](0020-localized-static-landing-pages.md)) — a buyer page, but generic; it doesn't speak to the office/team-building buyer or carry the exact query phrasing.

The brief: own the unserved high-intent corporate segment with a dedicated buyer-focused landing page at `/office-murder-mystery-party/`, not another blog post.

## Decision

Add a **new static buyer landing page** at `/office-murder-mystery-party/`, built on the ADR-0020 landing-page pattern (i18n copy, `<Helmet>` SEO, FAQPage JSON-LD, generator CTA) — but with two deliberate scope choices:

1. **English-only at launch.** Unlike ADR-0020 (which shipped all 13 languages), this page ships English only. Copy lives in `officeParty.*` in `src/i18n/locales/en.json`; `LANGS = ["en"]` in the component and a single English `<url>` in the sitemap. The `/:lang/office-murder-mystery-party` route is still registered and canonical always resolves to the EN URL, so language-prefixed hits fall back to English content without forking duplicate indexable URLs.
2. **Money page + supporting content, not a replacement.** The landing page is the transactional target (CTA → `/mystery/create`); the existing corporate blog post stays as the informational guide. They cross-link: landing → blog (deeper guide) and blog hub + custom page → landing. This is a deliberate money-page/supporting-content hub, not cannibalization.

Page content (≈1,045 visible words, target 900–1200): H1 + intro answering "can we run a murder mystery at the office?", team-building benefits, lunch-hour vs after-work formats, guest-count flexibility, at-a-glance feature cards, generator CTA, and a 4-Q&A FAQ mirrored 1:1 into FAQPage schema.

- **Title:** `Office Murder Mystery Party — Team Building for Any Group`
- **Meta:** `Run a murder mystery party at the office — a team-building game that fits a lunch hour or after-work and scales to any group size. Build yours in minutes.`

Internal links added from `/custom-murder-mystery-party`, the blog hub (`BlogIndex.tsx`), and the footer.

## Rationale

- **The query is English and brand-new.** ADR-0020 localized to all 13 because it was converting a *proven* top-3 Italian ranking. Here the demand is a zero-history English query at position ~35 — there is no evidence of non-English demand yet, so translating into 13 languages now is speculative work against an unproven term. The ADR-0020 "plumbing is fixed, only translation scales" logic still holds *structurally*, but the translation spend isn't justified until the English page proves the segment.
- **hreflang stays honest.** Emitting 13 hreflang alternates that all point at English content would be a false signal. English-only `LANGS` + canonical→EN keeps the SERP signal truthful and avoids duplicate-content forks.
- **Buyer page beats another blog post for high intent.** A transactional landing page with a direct CTA captures "office murder mystery party" intent better than an informational post; keeping both, cross-linked, serves both funnel stages and concentrates internal-link equity on the money page.
- **Reuses a proven pattern.** The page mirrors `CustomMurderMysteryParty.tsx` (Helmet, FAQPage schema, i18n keys, generator CTA) — no new dependencies, low review surface.

## Alternatives considered

- **Ship all 13 languages now (strict ADR-0020 parity):** rejected for launch — speculative translation cost against an unproven, English-only query. The page is built so this is a later expansion (add locale blocks + grow `LANGS`/sitemap), not a rewrite.
- **Just expand the corporate blog post / add an office section to `/custom-murder-mystery-party`:** rejected — neither owns the exact high-intent query as a dedicated buyer page; a focused URL with matching title/H1/FAQ is the stronger ranking and conversion play.
- **Localized slug (`/office-...` translations):** rejected — same reasoning as ADR-0020 (diverges from `/:lang/<same-slug>` convention); moot while English-only.
- **Redirect/merge the corporate blog post into the new page:** rejected — the post serves informational intent and has its own (multi-language) footprint; keep both and link them.

## Consequences

- New EN-only URL `/office-murder-mystery-party/` exists, is in the sitemap, and resolves to 200 on GH Pages (added to the static-route fallback loop in `generate-sitemap.mjs`).
- `officeParty.*` exists **only in `en.json`**; other locales fall back to English via i18next. This is the first static landing page that intentionally diverges from the all-13-locales norm — flagged in code comments.
- **Localization is a clean follow-up**, not a refactor: translate `officeParty.*` into the other locales, grow `LANGS` in the component, and move the sitemap entry from `staticPages` into `localizedStaticPages`.
- Cannibalization risk between the landing page and the corporate blog post is managed by intent separation + internal linking; watch GSC to confirm the landing page (not the blog post) becomes the ranking URL for the buyer queries.
- Verification is post-deploy: GSC position/CTR for "office murder mystery party" (and the corporate/team-building terms) over ~3–4 weeks against the position-~35 / 20-impr/wk baseline.

## Key files

- [src/pages/OfficeMurderMysteryParty.tsx](../../src/pages/OfficeMurderMysteryParty.tsx) — new buyer landing page (EN-only `LANGS`, Helmet + FAQPage schema)
- [src/App.tsx](../../src/App.tsx) — `/office-murder-mystery-party` + `/:lang/` routes
- [src/i18n/locales/en.json](../../src/i18n/locales/en.json) — new `officeParty` section (English only)
- [scripts/generate-sitemap.mjs](../../scripts/generate-sitemap.mjs) — English `staticPages` entry + static-route fallback
- [src/pages/BlogIndex.tsx](../../src/pages/BlogIndex.tsx), [src/pages/CustomMurderMysteryParty.tsx](../../src/pages/CustomMurderMysteryParty.tsx), [src/components/Footer.tsx](../../src/components/Footer.tsx) — internal links

## Discussion

The live tension was ADR-0020 consistency ("ship all 13") vs. scoping to English. ADR-0020's own rationale resolved it the other way *because that page was converting a proven foreign-language ranking*; this page is chasing a brand-new English query with no foreign-language signal, so the same "plumbing is cheap" argument doesn't compel paying 12 translation blocks up front — and emitting 13 hreflang alternates over English bodies would actively mislead Google. The accepted cost is a documented divergence from the 13-locale norm for one page, made reversible by leaving the `/:lang/` route and i18n structure in place so localization is additive. The second call — keep the corporate blog post rather than merge — trades a small cannibalization risk for serving both funnel stages, mitigated by pointing internal links at the landing page so it accrues the authority.

## Links

(vault copy) [[01_Projects/Mystery-Maker]]
