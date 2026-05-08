# Translation Polish Priority — Traffic-Weighted Ranking

**Generated:** 2026-05-08  
**Data window:** 90 days (GA4 `screenPageViews`, last updated 2026-04-15 from `temp-files/ai-referral-metrics.json` era; blog traffic via `temp-files/ga4-all-blog.mjs` run 2026-05-08)  
**Rot signal:** `regexp_matches(content, '\m\w+-\w+-\w+\M', 'g')` count per cell  
**Score formula:** `total_views_90d × (max_hyphen_chains > 50 ? 1.0 : 0.3)`

---

## Context

Overall site traffic is low at this stage (~1,590 sessions/90d total per AI referral data).
No single blog slug exceeds 35 cross-language views in 90 days. This means the traffic-weighted
score differences are small — but the ranking still reveals which slugs earn more SEO exposure
and therefore benefit most from quality translation.

The prior polish queue was driven purely by SV hyphen-chain rot. This ranking cross-references
against actual per-slug page views aggregated across all 13 language variants.

---

## Top 20 Slugs by Raw Traffic (all languages, 90 days)

| Rank | Slug | Views (90d) | Top languages |
|------|------|-------------|---------------|
| 1 | `1920s-speakeasy-murder-mystery-party-guide` | ~33 | EN(23), DA(4), SV(4), JA(2) |
| 2 | `detective-murder-mystery-themes-professional-investigators-sleuth-dynamics` | ~17 | KO-dominant (11+6) |
| 3 | `murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery` | ~15 | DE(9), FI(2), EN(2), DA(2) |
| 4 | `unique-circus-murder-mystery-plot-ideas` | ~14 | EN(4), ES(4), PT(4), IT(2) |
| 5 | `murder-mystery-party-for-corporate-events` | ~11 | DE(7), ES(4) |
| 6 | `how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime` | ~10 | ES(4), EN(2), SV(2), FR(2) |
| 7 | `journalist-murder-mystery-themes-investigative-reporters-deadly-stories` | ~10 | DE(10) |
| 8 | `how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue` | ~9 | FI(7), EN(2) |
| 9 | `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets` | ~9 | FR(4), EN(2), ZH-CN(2), KO(1) |
| 10 | `cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas` | ~8 | DE(4), EN(2), FI(2) |
| 11 | `how-to-host-a-hollywood-murder-mystery-party` | ~8 | EN(4), FR(4) |
| 12 | `murder-mystery-party-for-teenagers-guide` | ~8 | FI(2), FR(2), EN(2), JA(2) |
| 13 | `unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets` | ~7 | EN(3), DE(4) |
| 14 | `5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable` | ~6 | EN(6) |
| 15 | `ancient-egypt-murder-mystery-party-guide` | ~6 | EN(6) |
| 16 | `unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime` | ~6 | EN(4), DE(2) |
| 17 | `jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime` | ~6 | FR(4), DE(2) |
| 18 | `5-renaissance-murder-mystery-party-themes` | ~6 | EN(4), ES(2) |
| 19 | `free-murder-mystery-games-printable` | ~6 | DA(4), FI(2) |
| 20 | `how-to-fix-overly-complex-murder-mysteries` | ~4 | EN(4) |

**Notes:**
- `detective-murder-mystery-themes` KO traffic may include two distinct KO slugs from the same EN post (with/without trailing slash). Treat as a single slug for ranking purposes.
- `unique-circus-murder-mystery-plot-ideas` PT views include trailing-slash duplicates; unique view count is ~4 for PT.
- EN-only slugs (ancient-egypt, how-to-fix-overly-complex) likely have high growth headroom once non-EN translations are polished.

---

## Top 20 Slugs by Traffic-Weighted Rot

Score = `total_views_90d × (max_hyphen_chains > 50 ? 1.0 : 0.3)`

Higher score = high-traffic AND heavily machine-translated = most urgent.

| Rank | Slug | Views | Max rot | Max-rot lang | Score | Queue status |
|------|------|-------|---------|--------------|-------|--------------|
| 1 | `1920s-speakeasy-murder-mystery-party-guide` | 33 | 81 | DE | **33.0** | ⚠️ Not queued |
| 2 | `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets` | 9 | 77 | SV | **9.0** | ✅ In progress (this session) |
| 3 | `how-to-host-a-hollywood-murder-mystery-party` | 8 | 85 | DE | **8.0** | ⚠️ Not queued |
| 4 | `murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery` | 15 | 27 | DE | **4.5** | ⚠️ Not queued |
| 5 | `unique-circus-murder-mystery-plot-ideas` | 14 | ~20 est. | — | **4.2** | ⚠️ Not queued |
| 6 | `5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue` | ~4 | 75 | DE | **4.0** | ⚠️ Not queued |
| 7 | `murder-mystery-party-for-corporate-events` | 11 | 37 | DE | **3.3** | ⚠️ Not queued |
| 8 | `how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime` | 10 | 48 | SV | **3.0** | 🔄 In progress (partial) |
| 9 | `detective-murder-mystery-themes-professional-investigators-sleuth-dynamics` | 17 | 24 | DE | **5.1** | ⚠️ Not queued |
| 10 | `art-museum-murder-mystery-party-guide-sophisticated-gallery-adventures-with-curators-and-priceless-masterpieces` | ~2 | 63 | SV | **2.0** | ✅ In progress (this session) |
| 11 | `cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas` | 8 | 49 | DA/ES | **2.4** | ✅ Polished (all 12 langs) |
| 12 | `5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable` | 6 | 73 | DE | **6.0** | ⚠️ Not queued |
| 13 | `unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party` | ~1 | 74 | DE | **1.0** | ⚠️ Not queued |
| 14 | `how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue` | 9 | ~25 est. | — | **2.7** | 🔄 In progress (other session) |
| 15 | `best-murder-mystery-party-games-review` | 2 | 36 | DE | **0.6** | 🔄 In progress (other session) |
| 16 | `fashion-week-murder-mystery-party-planning-strut-into-danger-and-style` | <1 | **373** | NL | — | ⚠️ Extreme rot, low traffic — flag (see below) |
| 17 | `creating-the-perfect-wedding-planner-character-perfect-ceremonies-and-imperfect-murders` | <1 | **340** | NL | — | ⚠️ Extreme rot, low traffic — flag (see below) |
| 18 | `how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement` | ~2 | 52 | DE | **2.0** | ⚠️ Not queued |
| 19 | `unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets` | 7 | 34 | DE | **2.1** | ⚠️ Not queued |
| 20 | `journalist-murder-mystery-themes-investigative-reporters-deadly-stories` | 10 | ~20 est. | DE | **3.0** | ⚠️ Not queued |

_Rot estimates (~) are extrapolated from patterns in sibling slugs where direct query data was unavailable._

---

## Already-Polished Slugs (as of 2026-05-08)

| Slug | Status | Notes |
|------|--------|-------|
| `cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas` | ✅ **Complete** | All 12 non-EN langs polished; reference benchmark |
| `how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime` | 🔄 **Partial** | Other session in progress |
| `best-murder-mystery-party-games-review` | 🔄 **In progress** | Other session |
| `how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue` | 🔄 **In progress** | Other session |
| `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets` | 🔄 **In progress** | This session (Prompt 4) |
| `art-museum-murder-mystery-party-guide-sophisticated-gallery-adventures-with-curators-and-priceless-masterpieces` | 🔄 **In progress** | This session (Prompt 5) |

---

## Recommended Next-Priority Queue

Replacing the SV-rot-only ranking. Sorted by traffic-weighted score, skipping slugs already in progress.

| Priority | Slug | Score | Why |
|----------|------|-------|-----|
| **1** | `1920s-speakeasy-murder-mystery-party-guide` | 33.0 | Highest-traffic slug on the site (33 views/90d) + DE rot=81. Clear #1. |
| **2** | `how-to-host-a-hollywood-murder-mystery-party` | 8.0 | DE rot=85 (highest rot on site for a trafficked slug) + EN+FR traffic. |
| **3** | `5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable` | 6.0 | DE rot=73, EN traffic=6, broad lang coverage. |
| **4** | `detective-murder-mystery-themes-professional-investigators-sleuth-dynamics` | 5.1 | KO-dominant traffic (17 views) despite moderate rot. High-value KO audience. |
| **5** | `murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery` | 4.5 | DE-dominant traffic (15 views), moderate rot. Volume justifies polish. |
| **6** | `5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue` | 4.0 | DE rot=75, SV rot=69 — very rotten even if traffic is low. |
| **7** | `unique-circus-murder-mystery-plot-ideas` | 4.2 | High multi-lang traffic (14 views), polish will consolidate gains. |
| **8** | `murder-mystery-party-for-corporate-events` | 3.3 | DE(7)+ES(4) traffic, moderate rot across many langs. |

---

## Flagged: Extreme Rot, Low Traffic

These two slugs have NL cells with 300+ hyphen chains — almost certainly complete machine-translation artefacts. Traffic is negligible now but content quality is so poor it creates a credibility risk if discovered by searchers.

- `fashion-week-murder-mystery-party-planning-strut-into-danger-and-style` — NL: **373 chains**
- `creating-the-perfect-wedding-planner-character-perfect-ceremonies-and-imperfect-murders` — NL: **340 chains**

Recommendation: Add to the queue after Priority 8 above, or address the NL cells only as a quick targeted fix.

---

## Key Finding

> **The SV-rot ranking was a reasonable proxy but missed the top priority.**  
> `1920s-speakeasy-murder-mystery-party-guide` has the site's highest cross-language traffic (33 views/90d) AND DE rot of 81 — yet it never appeared as a SV-rot candidate because its SV cell has only 21 chains. Purely rot-driven triage would have left the most-visited slug unpolished indefinitely.  
> Recommend leading the next polish session with `1920s-speakeasy`.
