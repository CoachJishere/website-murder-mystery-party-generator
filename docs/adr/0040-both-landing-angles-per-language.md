# 0040 — Both landing angles in every language (custom on /custom, corporate on /office)

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Two static landing pages exist, built on the ADR-0020 localized-landing pattern:

- **`/custom-murder-mystery-party`** ([ADR-0020](0020-localized-static-landing-pages.md)) — localized to all 13 languages. But the *angle* is split: **EN serves the custom-party angle**, and the **12 non-EN locales serve the corporate / team-building angle** ("Eventi Aziendali", "Firmenevents", "Eventos de Empresa", …). That was deliberate in ADR-0020: at the time the only proven ranking was the Italian corporate query "miglior intrattenimento murder mystery per eventi aziendali" (avg pos ~3.3), so the localized page was written to the corporate angle to convert it.
- **`/office-murder-mystery-party`** ([ADR-0022](0022-office-murder-mystery-landing-page.md)) — the dedicated corporate/team-building buyer page, but **English-only** (`LANGS = ["en"]`). The `/:lang/office-…` routes are registered but canonical always resolves to EN and only one EN `<url>` is in the sitemap.

This produces three problems:

1. **Angle/URL mismatch by language.** A German buyer searching for a *custom/private* murder mystery lands on `/de/custom-murder-mystery-party` and gets corporate copy; a German buyer searching for a *corporate* one has no German office page. Every market is served exactly one of the two angles, never both.
2. **hreflang dishonesty on the custom cluster.** The `/custom-…` hreflang cluster groups EN (custom copy) with 12 locales (corporate copy) as if they were translations of one another. They are not content-equivalent — a low-grade quality signal.
3. **Structural drift bug.** The EN `customParty.body` later gained a "How to…" section (`howToHeading`, `howToStep1/2/3`, `howToCta`, `howToCtaEnd`). Those 6 keys were **never added to the 12 locale files** (verified: missing in all 12). Those pages currently render the **English** how-to block via i18next fallback → mixed-language pages.

Jonathan's call (2026-07-21, vault note `custom-vs-corporate-landing-localization-2026-07-21`): **every market gets BOTH pages** — custom copy on `/custom-…` ×13 and corporate copy on `/office-…` ×13.

The load-bearing risk: the localized **corporate** copy is what *ranks* the Italian query at ~pos 3.3, and it lives at the **custom** URL. This work changes what that URL serves.

## Decision

Bring both angles to all 13 languages, so each URL is content-equivalent across its own hreflang cluster:

| URL | Angle | Languages (after) |
|---|---|---|
| `/custom-murder-mystery-party` | Custom party / game | 13 (custom copy) |
| `/office-murder-mystery-party` | Corporate / team-building | 13 (corporate copy) |

Three reviewable slices:

1. **Localize `officeParty.*` into the 12 non-EN locales** by translating the EN `officeParty.*` key set (44 keys — richer than the corporate block: 4 benefits, lunch/after-work formats, remote note, 4 feature cards, 4 FAQs, related-links). The existing localized corporate `customParty` blocks are used **only as a terminology/tone reference** (e.g. IT "eventi aziendali", DE "Firmenevents"), not copied — their key structure differs. Then flip `LANGS` in `OfficeMurderMysteryParty.tsx` to all 13, move the sitemap entry from `staticPages` into `localizedStaticPages`, and add the per-language route-file loop (mirrors the custom page exactly).
2. **Replace the 12 locales' corporate `customParty` blocks with translated custom copy** (translate EN `customParty.*`, custom angle) **and add the 6 missing how-to keys** in the same edit, closing the drift bug. The custom page's `LANGS`/route/sitemap plumbing is already 13-language and unchanged.
3. **Redirects: none — because no URL changes.** See "Redirect strategy" below. (Confirmed by Jonathan 2026-07-21: "relocate + monitor", no 301.)

### hreflang clusters become content-equivalent per language

After this change each cluster is honest: the `/custom-…` cluster is 13 genuine translations of the custom angle; the `/office-…` cluster is 13 genuine translations of the corporate angle. `x-default → EN`, `zh-cn → zh-Hans` mapping preserved on both. The pre-existing content mismatch in the custom cluster is resolved as a side effect.

### Redirect strategy (the deliberate departure from the vault note)

The vault note and the kickoff brief both describe this as a "URL migration needing 301s." **On inspection it is not a URL migration — it is a content relocation at stable URLs, so no 301 is applicable, and a 301 would be actively harmful.** Enumerating every URL before/after:

- `/{lang}/custom-…` ×12 — **exists before, exists after.** Content changes corporate → custom. Not removed. 200 both times.
- `/{lang}/office-…` ×12 — route registered before (canonical→EN, not in sitemap); **added** to the sitemap with its own canonical + hreflang after. Additive; nothing removed.
- EN URLs on both pages — unchanged.

No URL 404s. The repo's only redirect machinery (`buildSafeRedirects.mjs`, `buildSlugRedirectMap.mjs`, in-app blog fallback) is blog-slug-specific and has no bearing here. A 301 from `/{lang}/custom-…` → `/{lang}/office-…` would destroy the very custom page this work builds.

The Italian pos-3.3 risk is therefore **not** a dead-URL risk (which a 301 fixes) but a **content-relocation re-ranking** risk: the corporate query's best-matching URL moves from `/it/custom-…` to `/it/office-…`. That transfers by relevance + internal linking, not by redirect. Mitigations:

- Both URLs stay live and 200; the corporate copy lands on a *better-matched* URL (exact `/office-…` slug + corporate H1/title) than it had.
- Reciprocal internal links already exist (`customParty.officeLink` → office page; `officeParty.related.customLink` → custom page) and are now localized, concentrating the corporate anchor text on the localized office URL.
- Resubmit the sitemap to GSC on deploy so Google re-crawls both clusters promptly.
- Post-deploy: watch the Italian corporate query against the pos-3.3 / ADR-0020 baseline; accept a short re-ranking window.

## Rationale

- **Serve intent, not an accident of launch order.** The angle-by-language split was a launch-time shortcut, not a considered UX; every market genuinely has both custom and corporate demand.
- **hreflang honesty.** Content-equivalent clusters are the correct signal; the current mixed cluster is a latent quality drag ADR-0020 accepted only because localizing the second angle wasn't yet scoped.
- **Fix the drift bug where it already has to be touched.** The 12 custom blocks are being rewritten anyway; adding the 6 how-to keys in the same edit is free and ends the mixed-language render.
- **No 301 because there is nothing to redirect.** Correctly diagnosing this avoids shipping a redirect that would break the custom page — the single highest-risk mistake available here.
- **Plumbing is already paid.** Both pages are i18n-aware with `/:lang/` routes; office just needs `LANGS` grown + sitemap moved, exactly the "clean follow-up" ADR-0022 anticipated.

## Alternatives considered

- **301 `/{lang}/custom-…` → `/{lang}/office-…`** (as the brief's step (c) suggested): **rejected** — the source URL is not being retired; it must keep serving the new custom page. A 301 would 404-by-proxy the custom page in 12 languages.
- **Leave the office page EN-only, only fix the custom angle + how-to drift:** rejected — leaves every non-EN market with no corporate page and the office page conspicuously half-localized; doesn't deliver the "both angles everywhere" goal.
- **Copy the existing localized corporate `customParty` blocks straight into `officeParty`:** rejected — key structures differ (office page has benefits/formats/remote/4-FAQ that the corporate block lacks); a straight copy would leave office pages missing ~14 keys → English fallback. Translate the EN office key set instead, reusing terminology.
- **Machine-translate via a paid API:** rejected — global rule (no paid/metered API without explicit sign-off) and the 13-language UI/blog quality bar; translate manually.
- **Localized slugs** (`/it/festa-con-delitto-aziendale`): rejected — diverges from the `/:lang/<same-slug>` convention (same call as ADR-0020/0022).

## Consequences

- `officeParty.*` exists in all 13 locale files with an identical key set; `OfficeMurderMysteryParty.tsx` `LANGS` = 13; office page joins `localizedStaticPages` in the sitemap with per-language route files + reciprocal hreflang.
- `customParty.*` in the 12 non-EN locales now carries custom-angle copy **and** the 6 how-to keys; the corporate copy formerly there is superseded (its intent lives on at the office URL).
- Three `LANGS`/`LOCALIZED_LANGS` lists (custom component, office component, sitemap) are now all 13 — the duplication ADR-0020 flagged persists; still comment-flagged, still not abstracted.
- **Re-ranking window** on the Italian corporate query while Google re-crawls; monitored against the pos-3.3 baseline. If it drops and doesn't recover on the office URL within ~3–4 weeks, revisit (e.g. stronger internal linking, or reconsider whether the corporate angle should also remain at the custom URL for IT specifically).
- Translation volume: 12 locales × (44 office keys + 34 custom keys) ≈ 936 strings, translated manually to the existing bar.

## Discussion

The one genuine decision was the redirect. The brief and the vault note both framed this as an ADR-0020-scale URL migration and called for 301s + hreflang + sitemap "done together or the ranking is lost." Re-deriving the before/after URL set showed that framing is wrong: no URL is retired, so there is no 301 to write, and the 301 the brief implied would have broken the custom page in 12 languages. The real risk is narrower — a proven ranking's best-matched URL relocates — and its correct mitigation is internal linking + prompt re-crawl + monitoring, not a redirect. Surfacing this (rather than dutifully shipping a harmful 301) is the load-bearing move; it was raised with Jonathan before implementation. The second call — translate the EN office key set rather than repurpose the existing corporate blocks — fell out of the key-tree diff: the structures aren't compatible, so "reuse the copy" would silently ship half-English office pages. Terminology reuse (borrow "eventi aziendali" etc.) keeps the corporate ranking's proven phrasing without inheriting the wrong key shape.

## Key files

- [src/pages/OfficeMurderMysteryParty.tsx](../../src/pages/OfficeMurderMysteryParty.tsx) — flip `LANGS` to 13, add OG_LOCALE map, canonical resolves to URL lang
- [src/pages/CustomMurderMysteryParty.tsx](../../src/pages/CustomMurderMysteryParty.tsx) — no code change (plumbing already 13-lang); copy changes are in locale files
- [src/i18n/locales/*.json](../../src/i18n/locales/) — 12 new `officeParty` blocks; 12 rewritten `customParty` blocks (custom angle + 6 how-to keys)
- [scripts/generate-sitemap.mjs](../../scripts/generate-sitemap.mjs) — move `office-murder-mystery-party` from `staticPages` into `localizedStaticPages`; it inherits the hreflang loop + per-language route-file loop
- [src/App.tsx](../../src/App.tsx) — no change; `/:lang/office-murder-mystery-party` already routed

## Links

- Related: [ADR-0020](0020-localized-static-landing-pages.md) (localized static landing pages), [ADR-0022](0022-office-murder-mystery-landing-page.md) (office landing page, EN-only at launch)
- (vault copy) [[01_Projects/Mystery-Maker]]
