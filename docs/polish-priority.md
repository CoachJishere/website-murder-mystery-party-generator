# Translation Polish Priority — Traffic-Weighted Ranking

**Generated:** 2026-05-08  
**Traffic source:** GA4 property 495925848, 90-day window (2026-02-07 → 2026-05-08)  
**Rot signal:** `regexp_matches(content, '\m\w+-\w+-\w+\M', 'g')` hyphen-chain count, max across all languages per slug  
**Score formula:** `views_90d × (max_chains > 50 ? 1.0 : 0.3)`

---

## Important caveat: GA4 path structure

The multilingual routes are `/<lang>/blog/<slug>` (e.g. `/sv/blog/...`, `/de/blog/...`) — **not** `/blog/<lang>/<slug>` as initially assumed. At the time of this audit (90-day window), GA4 was capturing only the EN-format `/blog/<slug>/` path. The combination of (a) `index.html` firing an auto `page_view` on hard load without `send_page_view: false` and (b) the SPA `RouteTracker` sending only `page_path` without `page_location` meant non-EN SPA navigations were either dropped or misattributed. Net effect: per-language traffic breakdown was not available, and language-prefixed paths showed zero traffic. All figures below reflect this EN-only data — total blog pageviews in 90d: ~103, across 36 distinct paths.

**Status:** the underlying GA4 tracking bug was fixed in `index.html` + `src/lib/analytics.ts` after this audit (see CHANGELOG). Re-run this report 1–2 weeks after the fix lands in production to capture the corrected non-EN traffic — rankings will likely shift substantially. When re-running, the audit script must look under `/<lang>/blog/...` paths, **not** `/blog/<lang>/...`.

---

## Top 20 slugs by raw traffic (any language)

| Rank | Slug | Views 90d | Max Chains | Note |
|------|------|-----------|------------|------|
| 1 | `1920s-speakeasy-murder-mystery-party-guide` | 23 | 81 | ⚠️ High rot + top traffic — not yet polished |
| 2 | `5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable` | 6 | 73 | ⚠️ High rot + traffic — not yet polished |
| 3 | `ancient-egypt-murder-mystery-party-guide` | 6 | 20 | Low rot; traffic notable |
| 4 | `5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable` | 4 | 41 | Moderate rot |
| 5 | `5-renaissance-murder-mystery-party-themes` | 4 | 50 | At rot threshold |
| 6 | `how-to-fix-overly-complex-murder-mysteries` | 4 | 26 | Low rot |
| 7 | `how-to-host-a-hollywood-murder-mystery-party` | 4 | 85 | ⚠️ Highest rot per slug + traffic — not yet polished |
| 8 | `unique-circus-murder-mystery-plot-ideas` | 4 | — | ⚠️ Orphan path — no DB match; likely old redirect slug |
| 9 | `unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime` | 4 | 42 | Moderate rot |
| 10 | `how-to-fix-confusing-murder-mystery-clues` | 3 | 28 | Low rot |
| 11 | `how-to-host-a-victorian-murder-mystery-party` | 3 | 36 | Moderate rot |
| 12 | `unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets` | 3 | 34 | Moderate rot |
| 13 | `wild-west-murder-mystery-party-planning` | 3 | 23 | Low rot |
| 14 | `5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama` | 2 | 45 | Moderate rot |
| 15 | `5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless` | 2 | 33 | Moderate rot |
| 16 | `5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover` | 2 | 42 | Moderate rot |
| 17 | `art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes` | 2 | 32 | Moderate rot |
| 18 | `best-murder-mystery-party-games-review` | 2 | 36 | ✅ In progress |
| 19 | `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets` | 2 | 77 | ⚠️ High rot; ✅ In progress |
| 20 | `cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas` | 2 | 49 | ✅ Polished |

---

## Top 20 slugs by traffic-weighted rot score

Score = `views_90d × (max_chains > 50 ? 1.0 : 0.3)`

| Rank | Slug | Score | Views 90d | Max Chains | Status |
|------|------|-------|-----------|------------|--------|
| 1 | `1920s-speakeasy-murder-mystery-party-guide` | 23.0 | 23 | 81 | ⚠️ Not polished |
| 2 | `5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable` | 6.0 | 6 | 73 | ⚠️ Not polished |
| 3 | `how-to-host-a-hollywood-murder-mystery-party` | 4.0 | 4 | 85 | ⚠️ Not polished |
| 4 | `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets` | 2.0 | 2 | 77 | ✅ In progress |
| 5 | `ancient-egypt-murder-mystery-party-guide` | 1.8 | 6 | 20 | Low rot; low urgency |
| 6 | `5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable` | 1.2 | 4 | 41 | Not polished |
| 7 | `5-renaissance-murder-mystery-party-themes` | 1.2 | 4 | 50 | Not polished |
| 8 | `how-to-fix-overly-complex-murder-mysteries` | 1.2 | 4 | 26 | Low rot; low urgency |
| 9 | `unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime` | 1.2 | 4 | 42 | Not polished |
| 10 | `how-to-fix-confusing-murder-mystery-clues` | 0.9 | 3 | 28 | Low rot |
| 11 | `how-to-host-a-victorian-murder-mystery-party` | 0.9 | 3 | 36 | Not polished |
| 12 | `unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets` | 0.9 | 3 | 34 | Not polished |
| 13 | `wild-west-murder-mystery-party-planning` | 0.9 | 3 | 23 | Low rot |
| 14 | `5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama` | 0.6 | 2 | 45 | Not polished |
| 15 | `5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless` | 0.6 | 2 | 33 | Not polished |
| 16 | `5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover` | 0.6 | 2 | 42 | Not polished |
| 17 | `art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes` | 0.6 | 2 | 32 | Not polished |
| 18 | `best-murder-mystery-party-games-review` | 0.6 | 2 | 36 | ✅ In progress |
| 19 | `cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas` | 0.6 | 2 | 49 | ✅ Polished |
| 20 | `haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense` | 0.6 | 2 | 42 | Not polished |

---

## Already-polished slugs — status at time of audit

| Slug | Views 90d | Max Chains | Score | Status |
|------|-----------|------------|-------|--------|
| `cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas` | 2 | 49 | 0.6 | ✅ Complete |
| `how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime` | 2 | 48 | 0.6 | 🔶 Partial |
| `best-murder-mystery-party-games-review` | 2 | 36 | 0.6 | 🔶 In progress |
| `how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue` | 2 | 26 | 0.6 | 🔶 In progress |
| `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets` | 2 | 77 | 2.0 | 🔶 In progress |
| `art-museum-murder-mystery-party-guide-sophisticated-gallery-adventures-with-curators-and-priceless-masterpieces` | 0 | 63 | 0.0 | 🔶 In progress |

---

## Highest-rot slugs with zero traffic (SV-rot-only ranking would have put these first)

These are the slugs that dominated the previous SV hyphen-chain sweep but have no recorded GA4 traffic. Polish them after high-traffic targets are clear.

| Slug | Max Chains | Views 90d | Score |
|------|------------|-----------|-------|
| `fashion-week-murder-mystery-party-planning-strut-into-danger-and-style` | 373 | 0 | 0.0 |
| `creating-the-perfect-wedding-planner-character-perfect-ceremonies-and-imperfect-murders` | 340 | 0 | 0.0 |
| `5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue` | 75 | 0 | 0.0 |
| `unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party` | 74 | 0 | 0.0 |
| `art-museum-murder-mystery-party-guide-...` | 63 | 0 | 0.0 |
| `spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury` | 55 | 0 | 0.0 |
| `5-victorian-london-murder-mystery-themes-thatll-leave-you-positively-gaslit` | 53 | 0 | 0.0 |
| `how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement` | 52 | 0 | 0.0 |

---

## Recommended next-priority queue (replaces SV-rot-only ranking)

Work through these in order. Skip already-polished slugs; continue in-progress ones.

1. **`1920s-speakeasy-murder-mystery-party-guide`** — score 23.0; top traffic AND high rot (81 chains); completely absent from the current sweep. Start here.
2. **`how-to-host-a-hollywood-murder-mystery-party`** — score 4.0; highest single-slug rot at 85 chains; has real traffic.
3. **`5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable`** — score 6.0; 73 chains + 6 views.
4. **`chef-murder-mystery-themes-culinary-crimes-kitchen-secrets`** *(in progress)* — score 2.0; 77 chains + traffic; continue sweep.
5. **`5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue`** — 75 chains; zero traffic now but SV/DA/DE all heavily rotted; worth queuing after #4.
6. **`unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party`** — 74 chains; zero traffic; second SV-rot-priority after circus.
7. **`how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime`** *(partial)* — 48 chains + 2 views; finish the partial sweep.
8. **`cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas`** *(done)* — already clean, no action needed.

---

## Flags for future sessions

The following high-traffic slugs had no polish work started at time of audit and should be checked before the next sweep:

- **`unique-circus-murder-mystery-plot-ideas`** — 4 GA4 views on a path with no DB match. This is likely an old slug (pre-rename). Investigate whether a redirect from `/blog/unique-circus-murder-mystery-plot-ideas/` → current slug is in place; if not, add one.
- **`ancient-egypt-murder-mystery-party-guide`** — 6 views but only 20 hyphen chains (low rot). Possibly clean already. Worth a spot-check on the SV/DE versions before queuing for a full sweep.
- **`5-renaissance-murder-mystery-party-themes`** — 4 views, 50 chains exactly (at the threshold). SV has 50 chains (the highest of all languages for this slug); worth reviewing the SV version specifically.

---

## Methodology notes

- Traffic is **slug-level only** — at audit time, GA4 was only capturing the EN-path format `/blog/<slug>/`. Translated URLs at `/<lang>/blog/<slug>` (e.g. `/sv/blog/best-mmp-games-review`) registered as zero traffic due to a double-bug in the GA4 setup: an unconfigured auto-page_view in `index.html` plus a missing `page_location` field in the SPA route tracker. Both were patched after this audit. Re-running this report in 1–2 weeks should surface the missing ~92% of pageviews and likely reorder the priority list.
- A slug with 0 GA4 views might still have organic search impressions in GSC (not checked here — GSC data for this window was unavailable at audit time).
- The hyphen-chain regex (`\m\w+-\w+-\w+\M`) is a machine-translation rot proxy, not a fluency score. A high count means word boundaries are collapsing into compound calques; it does not detect subtle semantic errors.
- `max_chains` = worst single language version per slug. `total_chains` (available in DB) gives a cross-language rot burden but is not used in the score formula here to keep the metric simple.
