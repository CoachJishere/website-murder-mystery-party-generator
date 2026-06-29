# 0024. Static index.html head as the homepage SEO source of truth

- **Status:** Accepted
- **Date:** 2026-06-29

## Context

GSC shows the homepage ranking top-5 for the branded/semi-branded queries
"mystery maker", "murder mystery maker", and "mysterymaker" (~position 5, ~28
impressions/week) but converting at only ~3.6% CTR. The brief was to rewrite the
homepage title/meta to lift CTR on those queries — the brand "Mystery Maker"
(matching the `mysterymaker.party` domain) did not appear in the SERP snippet at
all.

While implementing the copy change we discovered a more fundamental problem:

- The homepage (`/`) is **not prerendered**. `vite.config.ts` contained a
  `routesToPrerender` array listing `/` and seven other routes, but **nothing
  consumed it** — there is no prerender/SSG plugin wired into the Vite build. The
  array was dead config that falsely implied the homepage was prerendered.
- The only real prerendering is `scripts/prerender-blog.mjs`, which generates
  per-post static HTML for **blog routes only**.
- Therefore the homepage ships the raw `index.html` shell, whose `<head>` still
  carried the Lovable scaffold defaults: `<title>Murder Mystery Party
  Generator</title>` and `<meta name="description" content="Lovable Generated
  Project">`. All real homepage SEO tags were injected **client-side only** by
  `src/components/Head.tsx` (react-helmet-async).

Client-side-only head tags are unreliable for this goal: social scrapers
(WhatsApp, Facebook, Slack, iMessage) never execute JS and would render "Lovable
Generated Project"; Google's first-pass crawl reads the static HTML and may index
the scaffold title before (or instead of) the JS-rendered one. For a homepage
whose entire objective is the SERP/social snippet, the static `<head>` is the
artifact that actually has to be correct.

## Decision

Make the static `<head>` in `index.html` the source of truth for the homepage's
SERP and social snippet, kept in sync with the client-side `Head.tsx` copy:

1. **Static head rewrite** — set `<title>`, `<meta name="description">`,
   `<link rel="canonical">`, Open Graph (`og:title/description/type/url/site_name/
   image`) and Twitter (`twitter:card/title/description/image`) in `index.html` to
   the new homepage copy: title `Printable Murder Mystery Kits in Minutes |
   Mystery Maker` (56 chars), description leading with the "Mystery Maker" brand.
2. **Homepage structured data** — add a static JSON-LD `@graph` with
   `Organization`, `WebSite`, and `SoftwareApplication` nodes (all named "Mystery
   Maker", `$24.99` offer). Static so Google and AI crawlers (GEO) see the brand
   entity without running JS. Deliberately **no** `aggregateRating` — there is no
   on-page numeric review dataset to back it, and a fabricated rating risks a
   structured-data penalty.
3. **Brand suffix rename** — `home.seo.brand` in `src/i18n/locales/en.json`
   changed from "Murder Mystery Party Generator" to "Mystery Maker" (the suffix
   `Head.tsx` appends as `{title} | {brand}`). Matches the domain and the new
   static head. Affects the other 4 pages using `Head` (Privacy, NotFound, 2 dev
   previews); blog/About/Custom pages set their own titles and are unaffected.
4. **Blog isolation** — extend the strip list in `prerender-blog.mjs` so blog
   pages don't inherit the homepage's `canonical`, `og:url`, `twitter:title`,
   `twitter:description`, or JSON-LD from the shared `index.html` template
   (`buildHead()` re-injects per-post versions). `og:site_name` is kept — it's
   correct site-wide.
5. **Remove the dead config** — delete `routesToPrerender` from `vite.config.ts`,
   replaced with a comment documenting how each surface's SEO is actually
   delivered.

English only — the branded-query CTR signal is English. Non-English locales keep
their existing `home.seo` strings for now.

## Rationale

- The static head is what crawlers and scrapers actually read on first contact;
  fixing it captures essentially all of the snippet/social value for the lowest
  complexity.
- JSON-LD `Organization`/`WebSite` reinforces "Mystery Maker" as a brand entity,
  which helps branded queries earn brand treatment (sitelinks/knowledge panel) and
  supports the north-star GEO goal (AI platforms citing the site).
- Keeping `Head.tsx` in place means the SPA still updates the head per-route after
  hydration; static + client values now match for the homepage, so there is no
  flicker or contradictory signal.

## Alternatives Considered

- **Wire up real SPA prerendering / SSG** (vite-plugin-ssr, react-snap, or a
  custom render step for the `routesToPrerender` set). Rejected for now: the
  homepage is highly interactive (auth state, animations, Make.com chat) and
  prone to hydration mismatches; an SSG step adds build fragility and ongoing
  maintenance. The static-head approach delivers the snippet/entity value the goal
  needs with far less risk, consistent with the founder's "set it up once, let it
  run" preference. Real SSG remains the future path if we need fully-rendered HTML
  for more routes — this ADR is the point to revisit.
- **Leave SEO client-side only** (status quo). Rejected: invisible to no-JS
  scrapers and unreliable on Google's first pass — the exact failure this change
  fixes.
- **Add `aggregateRating` to SoftwareApplication** for review stars. Deferred
  until the Trustpilot campaign yields verifiable on-page review data; fabricating
  it risks penalties.

## Consequences

- Homepage SERP/social snippets now show the branded, benefit-led copy on first
  crawl and to no-JS scrapers — directly targeting the branded-query CTR goal.
- Two places now hold the homepage head copy (static `index.html` and
  `Head.tsx`/`en.json`). They must be kept in sync by hand; the `index.html`
  comment and this ADR flag that coupling.
- Other `Head`-using pages (Privacy, NotFound, previews) now end their titles with
  "| Mystery Maker".
- Non-English locales still carry the old brand suffix and homepage copy —
  tracked as deferred follow-up.
- No build wiring was added; `npm run build` behaviour is unchanged apart from the
  new strips in `prerender-blog.mjs`.

## Discussion

The core trade-off debated was **static head vs. real prerendering**. Real SSG is
the "more correct" architecture and would let every route ship fully-rendered
HTML, but it carries real hydration and maintenance risk against an interactive
homepage, for a marginal gain over a correct static head (crawlers read the head
either way; the visible snippet is identical). Given the immediate goal (branded
CTR) and the founder's preference for low-maintenance, set-and-forget
infrastructure, the static head is the right ROI. The dead `routesToPrerender`
array was the tell that an SSG path was once intended but never finished;
removing it and documenting reality prevents the next agent from trusting it.

The second trade-off was **JSON-LD scope leaking into the shared shell**. Because
blog prerendering uses `index.html` as its template, any tag added to the static
head is inherited by ~1.5k blog pages unless explicitly stripped. We chose to
strip homepage-specific tags (canonical, og:url, twitter title/description,
JSON-LD) in `prerender-blog.mjs` — the principled parallel to the strips already
there — rather than thin the homepage schema, so the homepage keeps full entity
markup while blog pages stay pristine.

## Key files

- `index.html` — static homepage `<head>`: title, description, canonical, OG,
  Twitter, JSON-LD `@graph`.
- `src/i18n/locales/en.json` — `home.seo.title/description/brand`.
- `src/components/Head.tsx` — client-side head sync; default canonical now
  trailing-slash.
- `scripts/prerender-blog.mjs` — extended strip list isolating blog pages from the
  homepage head.
- `vite.config.ts` — dead `routesToPrerender` removed; delivery documented.
