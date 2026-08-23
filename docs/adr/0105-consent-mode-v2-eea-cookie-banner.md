# ADR-0105: Google Consent Mode v2 + cookie banner for EEA/UK/CH traffic

- **Status:** Accepted
- **Date:** 2026-08-23
- **Related:** ADR-0102 (PostHog key missing from the actual deploy pipeline — same "site is static GH Pages, not the linked Vercel project" fact this ADR also depends on)

## Context

No cookie-consent banner or CMP exists anywhere on the site. GA4 (`G-XGD48X4ZQS`) and the Google Ads base tag (`AW-18406526278`) both fire unconditionally from `index.html`, with zero consent gating, on all traffic. This was flagged while building the first Google Ads Search campaign (`00_INBOX/google-ads-followups-2026-08-23-mystery-maker.md`): real EEA traffic is confirmed via GA4 country data (Netherlands 225 sessions/90d, Germany 127, France 126, Spain 120, Sweden 104, Italy 103, Denmark 88, Belgium 63, Austria 55), and the site is already fully translated into 13 languages, so this is a real, intentional market — not incidental spillover that could be argued away.

Two things make the correct implementation less obvious than "add a banner":

1. **The site is a static SPA, not a server.** `index.html` is a static shell shipped via GitHub Pages (confirmed in ADR-0102's investigation — a `vercel.json` exists in this repo but the Vercel project it's linked to is *not* what serves `mysterymaker.party`; `.github/workflows/deploy.yml` → GitHub Pages is the real deploy target). There is no edge middleware, no SSR, and no server-side request handler available to do IP-based geo-detection ourselves.
2. **"Geo-scope to EEA if feasible" naturally suggests IP geolocation**, but doing that ourselves would mean either a paid/metered third-party geo-IP API (ruled out by standing instruction — no metered APIs without explicit permission, and it would be a pre-consent network call to a new third party, which undercuts the point of a consent banner) or a heavy client library. Neither is proportionate to what's actually needed here.

## Decision

**Consent-critical compliance logic uses Google's own built-in Consent Mode v2 `region` parameter — no home-grown geo-IP needed at all.** `gtag('consent', 'default', {...})` accepts a `region` array of ISO 3166-1 alpha-2 codes; Google's ad/analytics tag infrastructure (which already knows the visitor's IP-derived region as a normal part of ad serving) applies that specific default only inside the listed regions and falls back to any broader default outside them. Two `default` calls are issued in `index.html`, before any `gtag('config', ...)` call:

```js
gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
  region: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'],
  wait_for_update: 500,
});
```

This is the authoritative, compliance-critical layer, and it works correctly for every visitor regardless of whether our own banner-visibility heuristic below gets it right.

**The React banner's show/hide decision is a separate, non-authoritative UX heuristic**, since Google's `region` param only controls Google's own tag behavior — it tells our own UI nothing. `src/lib/consent.ts` guesses likely-EEA/UK/CH via `Intl.DateTimeFormat().resolvedOptions().timeZone` against a static IANA-timezone list (zero network calls, zero cost, works offline). If the guess says EEA/UK/CH, or if timezone detection fails/is unavailable, the banner shows (safe default: show when uncertain). If the guess says elsewhere, no banner — matches the `granted`-by-default behavior outside the region list, so there's no mismatch between "you saw a banner" and "your defaults were actually denied."

Because the two layers are independent, a mis-classified visitor (timezone heuristic says non-EEA, but Google's IP-based region detection says EEA) still gets `denied` defaults from the `region` param — they just don't see a banner explaining it. That's an acceptable-risk direction: the failure mode is "occasionally under-explains to an EEA user who is nonetheless correctly defaulted to denied," never "an EEA user gets tracked without consent because our heuristic missed them."

**Persistence and re-application:** a saved choice (`localStorage['mm_consent_v1']`, `{ analytics, ads }`) is read and applied via a synchronous `gtag('consent', 'update', ...)` call in the same `index.html` `<head>` script block, immediately after the `default` calls and before the GA/Ads `config` calls — so returning consenting visitors aren't stuck denied every visit, and no consent-critical logic waits on React mounting.

**Two user-facing categories**, not four raw Consent Mode signal names: **Analytics** (`analytics_storage`) and **Advertising** (`ad_storage` + `ad_user_data` + `ad_personalization`, toggled together). There are exactly two tags on the site (GA4, Google Ads) and no feature uses the finer-grained signals independently — four checkboxes for signals nothing separately controls would be complexity with no corresponding user choice behind it. No toggle for "Necessary" — nothing on the site currently sets consent-gated storage for strictly-necessary purposes, so a fake always-on toggle would be decorative.

**Reopen path:** a "Cookie Settings" link in `Footer.tsx` (footer.links section, next to Privacy Policy) dispatches a `window` CustomEvent (`mm:open-consent-settings`) that `ConsentBanner` listens for, re-showing itself (in Customize mode) regardless of any prior dismissal. Chosen over a Context provider because the only cross-component need is "tell the already-mounted banner to reopen" — a one-line event is proportionate; a Context/provider layer added to `App.tsx` for a single fire-and-forget signal would be the over-engineered version.

**Copy translated into all 13 existing locales** (`src/i18n/locales/*.json`, `consent` namespace), following the existing `react-i18next` convention already used by `footer`/`common`/etc. These are AI-translated, not native-speaker reviewed — same caveat already standing on other localization work in this repo (e.g. the Host Guide i18n rollout, ADR-0090) — but GDPR-banner phrasing ("Accept All" / "Reject All" / "Customize" / "Necessary" / "Analytics" / "Advertising") is about as standardized and low-ambiguity as translated UI copy gets.

**Privacy Policy got a new "Cookies" section** (`src/pages/Privacy.tsx`) disclosing the categories and linking to the reopen control, since GDPR expects the privacy policy to describe this. Scoped narrowly: that page is pre-existing English-only, un-i18n'd boilerplate (no `react-i18next` usage at all, unlike the rest of the site) — bringing the whole page into the translation system is a separate, larger effort out of scope here; the new section matches the page's existing (English-only) pattern rather than introducing a partial i18n island on one page.

## Rationale

- **`region`-scoped Consent Mode defaults over a home-grown geo-IP check** — Google already operates the exact IP-based region detection this problem needs, as an existing part of how it serves ads/analytics; duplicating that ourselves (a paid API, or a heavier client geo library) would be strictly worse on cost, accuracy, and privacy (a pre-consent third-party network call) for a solved problem.
- **Timezone heuristic only gates UI visibility, never the actual consent default** — this keeps the one home-grown, gameable piece (VPNs, misconfigured OS locale) out of the compliance-critical path entirely. Getting the banner's visibility heuristic wrong is a UX quality issue; it can never become a compliance issue, because the `region` param already enforces the correct default independently.
- **Static IANA timezone list, not `navigator.language`** — browser language reflects the user's language preference, not their location (a Spanish-speaking tourist in Berlin with `es` set, or an EEA resident who prefers English), and this site's whole install base already skews toward viewing pages in non-native languages via the existing 13-locale i18n system. Timezone is a closer (if still imperfect) proxy for physical location.
- **Two categories, not four raw signals** — see Decision; matches the actual number of independently-controllable things on the site.
- **`wait_for_update: 500`** — gives the consent banner (or a synchronous `localStorage` reapply) half a second to signal before Google's tags proceed with the default state, per Google's own Consent Mode v2 implementation guidance; long enough to not race a same-tick reapply, short enough not to visibly delay tag behavior for the common case.

## Alternatives Considered

- **Global default-denied for everyone, no geo-scoping at all.** The simplest possible compliant implementation, and the vault follow-up note explicitly allowed this as a fallback. Rejected as the primary choice because it's not actually necessary — the `region` param solves the "who needs this" question for free — and it would add banner friction to the ~91%-of-revenue US market (`project_sales_signals_jul2026` memory) for no compliance benefit.
- **Client-side IP geolocation via a third-party API** (ipapi.co / ipinfo.io style). Rejected: metered/paid API usage requires explicit permission per standing instruction, adds an external dependency and a pre-consent network call to a new third party, and Google's `region` param already covers the compliance-critical half of this for free.
- **Server-side/edge geo-detection (Vercel Edge Middleware, Cloudflare Workers, etc.)** Rejected: the site doesn't actually run on the infrastructure that would make this available — it's a static GitHub Pages deploy (see Context, and ADR-0102) — so this would mean standing up new infrastructure for a problem the client-side `region` param already solves.
- **Four separate toggles matching the raw Consent Mode signal names** (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`). Rejected as complexity without a corresponding real choice — nothing on the site sets these independently of the two-tag (GA4 / Ads) split.
- **React Context/provider for the reopen-banner signal.** Rejected in favor of a single `CustomEvent` — see Decision.

## Consequences

- **Positive:** EEA/UK/CH visitors (per Google's own IP-based region detection, not our heuristic) now get `denied` analytics/ad storage defaults until they actively consent — closes a real, previously-unmitigated compliance gap on live traffic that included hundreds of EEA sessions/90d.
- **Positive:** No new paid service, no new third-party network call, no new infrastructure. The one new client-side dependency is a static timezone-to-region lookup table already in the JS runtime (`Intl`).
- **Positive:** Returning visitors who already chose don't get re-prompted — saved choice reapplies synchronously before any tag config call.
- **Neutral:** The banner-visibility heuristic (timezone) is best-effort and gameable (VPNs, spoofed locale); accepted because it only ever affects whether a banner is *shown*, never whether consent is actually defaulted to denied for real EEA/UK/CH visitors — see Rationale.
- **Neutral:** Consent copy across 13 locales is AI-translated, not native-speaker reviewed, consistent with existing open items on other localization work in this repo (Host Guide i18n, non-English checkout copy).
- **Not addressed — deliberately out of scope:** real purchase conversion tracking (`purchase` event to GA4/Ads from `/payment-success`) — item 2 from the same follow-up note, unrelated to consent plumbing, tracked separately.
- **Not addressed:** full i18n of `Privacy.tsx` beyond the new Cookies section — pre-existing gap, not introduced or worsened by this change.

## Key files

- `index.html` — consent `default` (with `region` scoping) + saved-choice reapply, before `gtag('config', ...)` calls
- `src/lib/consent.ts` — consent state types, storage, `gtag('consent','update', ...)` wiring, timezone-based EEA/UK/CH heuristic, reopen event
- `src/components/ConsentBanner.tsx` — banner UI (Accept All / Reject All / Customize), mounted globally in `App.tsx`
- `src/components/Footer.tsx` — "Cookie Settings" reopen link
- `src/pages/Privacy.tsx` — new Cookies section
- `src/i18n/locales/*.json` — `consent` namespace (13 locales) + `footer.links.cookieSettings`

## Discussion

The main trade-off debated was how literally to take "geo-scope to EEA/UK/CH if reasonably feasible" given the site's actual (static, GH Pages) hosting reality rules out doing IP geolocation ourselves without adding a paid API or new infrastructure — both of which standing instructions and repo conventions push against for a problem this narrow. Recognizing that Google's own `region` parameter on `gtag('consent','default',...)` was built for exactly this scenario (regionally-scoped defaults without the site operator running their own geo-IP) resolved it: it gives the "reasonably feasible" geo-scoping the task asked for, without any of the cost/infrastructure/privacy downsides of a home-grown geo-IP path, and without the alternative of falling back to the blanket "deny everyone globally" option. The remaining design question — how to decide banner *visibility* (a separate concern from the consent default itself) — was settled by choosing the cheapest available signal (`Intl` timezone) and deliberately keeping it out of the compliance-critical path, so a wrong guess there degrades UX, never compliance.
