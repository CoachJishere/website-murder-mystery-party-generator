# ADR-0132: Sitewide seasonal sale banners (Halloween/holiday) built as a separate mechanism from the personal welcome discount

- **Status:** Accepted
- **Date:** 2026-09-29
- **Related:** [ADR-0004](0004-welcome-discount-per-user-promo-codes.md) (welcome discount design), [ADR-0119](0119-welcome-discount-race-condition-and-checkout-visibility.md) (welcome discount race/checkout-visibility fix)

## Context

Jonathan wanted a Halloween sale banner (20% off all mysteries) to encourage sign-ups, initially framed as similar to the existing post-signup welcome discount. Mid-discussion he clarified the actual intent was broader: **anyone** visiting the site during the sale window should see and get the 20% off — new visitors, existing account holders who never bought, and returning customers who already bought before — not just brand-new signups within their first 7 days.

The existing discount system (`useWelcomeDiscount.ts` / `WelcomeDiscountRibbon.tsx` / `profiles.welcome_promo_code`) is structurally the wrong shape for that: it's per-user, generated only after signup (fire-and-forget call from `SignUp.tsx`), expires 7 days from account creation, and is explicitly suppressed once `hasPurchased` is true. It has its own known fragility — ADR-0119 fixed a real race condition in this exact path. Bolting a "also apply to everyone, always, regardless of signup/purchase state" exception onto that system would mean threading new conditionals through code already flagged as delicate, for a feature with completely different semantics (a blanket marketing sale vs. an individual retention lever).

Jonathan created two Stripe promo codes directly in the Stripe Dashboard: `HALLOWEEN20` (redeem_by Oct 31, 11:59pm) and `HOLIDAY20` (redeem_by Dec 31, 11:59pm) — both flat 20% off, not stacked with anything. No Stripe MCP access was available in this session to verify these programmatically.

## Decision

Built a separate, stateless mechanism that doesn't touch the welcome-discount code path:

1. **`src/lib/seasonalSaleConfig.ts`** — a static config listing both sales (id, Stripe promo code, UTC start/end timestamps) and `getActiveSeasonalSale()`, a pure function of `Date.now()`. No DB reads, no auth dependency.
2. **`src/components/SeasonalSaleRibbon.tsx`** — sitewide banner, rendered in `App.tsx` alongside (not inside) the auth-gated routes, visible to logged-out visitors. Static "Ends October 31" / "Ends December 31" text rather than a live countdown.
3. **`WelcomeDiscountRibbon.tsx`** self-suppresses (`getActiveSeasonalSale()` check) while a seasonal sale is active, so a visitor never sees two ribbons advertising the same 20% via two different mechanisms.
4. **`MysteryPurchase.tsx`**: introduced `effectiveDiscountActive = hasDiscount || !!seasonalSale`, used for the on-page discounted-price display and for `trackBeginCheckout`'s `has_discount` analytics flag (matching ADR-0119's intent — that flag should reflect whatever discount state was actually visible at click time). The checkout-URL builder prefers the seasonal promo code over the personal welcome code when both would apply (they're never meant to stack).
5. Added `seasonalSale.{halloween,holiday}.{ribbon,purchase}.*` i18n keys to all 13 locale files, mirroring the existing `welcomeDiscount.*` structure. Copy was written to avoid second-person address entirely (no "you"/"Sie"/"tú" pronoun), sidestepping the formal/informal register-consistency class of bug already tracked for character dialogue in this project.

## Rationale

- **Separate mechanism over extending the existing one**: the welcome-discount system's core assumptions (one code per account, generated post-signup, gated on no prior purchase) are exactly the properties the seasonal sale needs to *not* have. Reusing it would mean special-casing away most of its logic for two months a year — more fragile than a small independent config.
- **Seasonal code takes priority, no stacking**: Jonathan was explicit the Halloween/holiday discount is a flat 20%, not additive with the welcome discount. Since both are currently the same percentage, "prefer seasonal when active" is behaviorally equivalent to "20% off, one code, whichever applies" with no price-calculation logic needed.
- **Static end-date text, not a countdown timer**: countdown timers read as genuine urgency over hours/a few days; a multi-week sale window advertised with a ticking countdown reads as manufactured urgency and risks looking stale/wrong to a return visitor. Matches how the personal welcome ribbon already handles day-scale time (`Nd Nh` format) vs. what a month-scale sale needs (a fixed date).
- **UTC-anchored end timestamps instead of naive local-time comparison**: comparing against `new Date('2026-10-31T23:59:59')` would evaluate in each visitor's own browser timezone, which drifts the effective cutoff by many hours depending on where the visitor is relative to Jonathan's actual Stripe account timezone. A visitor west of Madrid would see the banner (and get a prefilled promo code) for several hours *after* Stripe's real `redeem_by` had already passed — full checkout page shows a discount, Stripe silently drops the code, customer pays full price with no explanation (the exact ADR-0119 failure mode, new instance). Anchoring the config's `endsAt` to a fixed UTC instant computed from Europe/Madrid CET avoids that for every visitor simultaneously.

## Alternatives Considered

- **Extend `useWelcomeDiscount`/`profiles.welcome_promo_code` to also cover non-authenticated and repeat customers**: rejected — conflates two different discount semantics in one already-fragile code path; see Context.
- **A single Stripe coupon applied automatically without a customer-visible code, via a server-side Checkout Session** (rather than `prefilled_promo_code` on a static Payment Link): not available — the main purchase flow uses a hosted Stripe Payment Link (`MysteryPurchase.tsx`), not a server-side session-creation call, and building that is out of scope for this feature.
- **Live countdown timer for the sale window**: rejected, see Rationale.

## Consequences

**Positive:**
- The sale is visible to logged-out visitors — the actual funnel point Jonathan wanted to influence — without any change to signup flow or account state.
- Works identically for brand-new visitors, existing accounts, and repeat customers, matching the "anyone, regardless of signup or purchase history" requirement.
- Zero risk to the welcome-discount code path; that system's existing tests/behavior/known-fragile-areas are untouched.
- No new DB tables, edge functions, or Stripe API calls — the whole feature is a static config plus three call sites.

**Negative:**
- `endsAt` timestamps assume Jonathan's Stripe account timezone is Europe/Madrid — unverified since no Stripe API access was available this session. If wrong, the banner could show the sale as active slightly past Stripe's actual cutoff (bounded to at most a few hours given the CET assumption, not the many-hours drift naive local-time parsing would have allowed).
- Two hardcoded promo code strings (`HALLOWEEN20`, `HOLIDAY20`) with hardcoded dates — if either code is ever regenerated in Stripe with a different string or date, `seasonalSaleConfig.ts` needs a manual update; nothing enforces they stay in sync automatically.
- A customer who already has a personal welcome discount active loses that specific promo code's visibility while a seasonal sale is running (same 20%, no net effect on price, but the two are literally different Stripe promo code strings).

**Neutral:**
- No schema change. `getActiveSeasonalSale()` can be extended to a third/fourth entry for future sales without any structural change.

## Key files

- `src/lib/seasonalSaleConfig.ts` — new; sale windows + `getActiveSeasonalSale()`
- `src/components/SeasonalSaleRibbon.tsx` — new; sitewide banner
- `src/components/WelcomeDiscountRibbon.tsx` — self-suppression while a seasonal sale is active
- `src/pages/MysteryPurchase.tsx` — `effectiveDiscountActive`, checkout-URL promo prefill priority, price display, `trackBeginCheckout` flag
- `src/App.tsx` — mounts `SeasonalSaleRibbon`
- `src/i18n/locales/*.json` (all 13) — `seasonalSale.halloween.*`, `seasonalSale.holiday.*`

## Discussion

The scope changed mid-conversation in a way worth preserving: the first framing ("advertise the welcome discount before signup") would have been a much smaller change — just make the existing personalized ribbon visible pre-auth. Jonathan's follow-up ("anyone... regardless of if it's a new sign up or not... even if someone had created the account") ruled that out, because the welcome discount is fundamentally per-account and single-use-window. That's the point where this became a new, independent mechanism rather than a visibility tweak to the old one. Worth remembering for the *next* seasonal sale request: check whether "sitewide, no account gating" is still the intent before reaching for `useWelcomeDiscount` again.

## Addendum 1: site-wide outage from the initial deploy (2026-09-29, ~23 min)

The first deploy of this feature took the entire site down for every visitor (desktop and mobile) for about 23 minutes (~20:29–20:53 UTC), not just the banner. `SeasonalSaleRibbon.tsx`'s i18next `defaultValue` was written as a backtick template literal, carrying over the `${{discountedPrice}}` / `${{originalPrice}}` placeholder text verbatim from `WelcomeDiscountRibbon.tsx` — but that source is a plain double-quoted string, where `${{...}}` is inert. In a template literal, `${` starts real JS interpolation, so `${{discountedPrice}}` evaluated as `${ {discountedPrice} }` — an object-shorthand expression referencing an undefined identifier — throwing `ReferenceError: discountedPrice is not defined` on every render. There was no error boundary above `SeasonalSaleRibbon` in the tree (it's mounted at the top of `AppRoutes`, outside `<Routes>`), so the whole React tree failed to mount — a blank `#root`, not a missing banner.

Local verification before the first deploy (`tsc --noEmit`, `eslint`, a plain `npm run build`) caught nothing, because this is a runtime error, not a type or syntax error — the string is syntactically valid JS. The gap: verification checked that the code *compiles*, not that it *renders*. Once Jonathan reported mobile was blank, the actual root cause was found in minutes by reproducing against the **live site** with Playwright (mobile-emulated context, a `pageerror` listener) rather than re-reading the diff — the stack trace pointed straight at the exact file, line, and expression.

**Fix**: escape the `$` (`\${{discountedPrice}}`), re-verify against a fresh local production build with the same Playwright check (confirms zero page errors and correct rendered banner text) *before* redeploying, then re-verify the live site the same way post-deploy. All confirmed clean on both mobile and desktop emulation.

**Takeaway for future sessions**: a genuine pre-deploy check for a new user-facing component needs to include an actual render — `tsc`/`eslint`/`build` all being clean is necessary but not sufficient. This project's tools already include Playwright (used for other e2e checks); reaching for a headless-browser smoke render before calling a UI change "done," not just after a report comes in, would have caught this before it ever reached production.
