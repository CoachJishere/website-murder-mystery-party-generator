# ADR-0119: Welcome discount could go unseen due to a signup-to-purchase-page race, with no way to tell why afterward

- **Status:** Accepted
- **Date:** 2026-09-05
- **Related:** `project_welcome_discount` memory (7-day 20% off, Stripe coupon `co18EYxp`), [ADR-0033](0033-payment-protection-trigger-guards.md)-adjacent (payment/discount state integrity)

## Context

Jonathan asked for a sweep of the last two weeks of full-price ($24.99) purchases to understand why customers weren't using the 20%-off welcome discount. Of 8 such Stripe charges (2026-08-22 to 2026-09-05, verified via the Stripe API against the live account), 5 were same-session buyers who converted 36 minutes to 17 hours after signup — and at purchase time, all 5 still had a genuinely valid, unredeemed promo code sitting in `profiles.welcome_promo_code` with `welcome_promo_expires_at` well in the future. Confirmed directly against Stripe (`GetPromotionCodes`) for one of them: `active: true`, `times_redeemed: 0`, `expires_at: null` at the Stripe level (the 7-day window is enforced only app-side). The other 3 purchases were genuinely slow (15-24 days out) with an expired code — not the concern here.

Tracing the checkout path (`src/pages/MysteryPurchase.tsx`) found the discount is applied by appending `&prefilled_promo_code=<code>` to a Stripe Payment Link URL, conditional on client-side React state (`useWelcomeDiscount`). Two separate mechanisms could produce a full-price charge despite a genuinely active code:

1. **Stripe's own semantics.** Per Stripe's docs, `prefilled_promo_code` "enter[s] a promotion code on the payment page automatically. Your customer can still edit this field" — it is a prefill, not a forced discount. Confirmed `allow_promotion_codes: true` is actually set on the live payment link (`plink_1SEyy1KgSd73ikMWEre3xO6b`), so the parameter isn't silently inert.
2. **A real race condition in this repo.** `SignUp.tsx` invokes `generate-welcome-discount` non-blocking (fire-and-forget, no `await`) immediately after signup. `useWelcomeDiscount.ts` fetched `profiles.welcome_promo_code` exactly once on mount, with no retry. A customer whose purchase-page mount raced ahead of that async write would see `hasDiscount: false` for the rest of that browser session — full price shown, no discount badge, no `prefilled_promo_code` param at all — even though the DB row populated moments later. Nothing in this session's own account of what it did would re-check.

There is no historical way to tell which of the two explains any specific one of the 5 past purchases: `trackBeginCheckout` didn't record whether a discount was present at click time, so the client-side state at the moment of each of those 5 purchases is unrecoverable now.

## Decision

1. **Closed the race condition.** `useWelcomeDiscount.ts` now retries the `profiles` fetch up to 4 times (500ms/1s/2s/3s backoff, ~6.5s total ceiling) if no promo code is found on the first attempt, before concluding the customer genuinely has none. A cancellation flag guards against a late-resolving retry setting state after unmount.
2. **Added forward-looking diagnosability.** `trackBeginCheckout` now takes a `hasDiscount` boolean and logs it as `has_discount` on the `begin_checkout` analytics event, and reports the actual price shown (`$19.99`/`$24.99`) instead of always hardcoding `$24.99`. Any future full-price purchase can be checked against this event instead of re-deriving client state from Stripe/DB archaeology.
3. **Did not touch mechanism #1** (Stripe's prefill-not-force semantics) — no code change available to force-apply a promo code through a Payment Link; the retry fix addresses the one failure mode this repo actually controls.

## Rationale

- The retry window (~6.5s max) is negligible against the actual `generate-welcome-discount` completion time (normally sub-second) and doesn't meaningfully delay page render for a customer who never had a welcome discount at all — they just pay the same handful of fast, cheap queries before the hook gives up and shows full price as before.
- A synchronous/`await`ed promo-code generation at signup was considered and rejected for this pass: it would fully close the race but couples signup latency to an edge function call on the critical path, a larger behavior change than this bug warrants. The retry is the smaller, reversible fix; revisit synchronous generation only if retries prove insufficient in practice.
- Logging `has_discount` on `begin_checkout` was chosen over deeper instrumentation (e.g. logging the actual Stripe Checkout URL or promo code) — it's the minimum needed to answer "was the discount client-side-visible at click time" for any future sweep, without carrying a promo code value through analytics.

## Alternatives Considered

- **Do nothing, treat as one-off**: rejected — 5 of 8 full-price purchases in a 2-week window sharing this exact shape (fast conversion + still-valid unused code) is a pattern, not noise, and the underlying fire-and-forget/no-retry gap is a plain defect regardless of how many past purchases it explains.
- **Move promo-code generation into a DB trigger on user creation** (eliminates the race by construction, no edge function round-trip at all): a stronger fix, but a bigger schema/architecture change than this sweep's finding justified on its own; worth a future ADR if the retry ceiling still isn't enough.

## Consequences

**Positive:**
- A customer whose purchase-page load narrowly beats promo-code generation now gets a second (through fifth) chance to pick it up within the same page session, instead of silently losing the discount for good.
- Future sweeps of full-price purchases can check `has_discount` on `begin_checkout` directly instead of reconstructing client-side state from `profiles`/Stripe after the fact.

**Negative:**
- Does not address Stripe's own prefill-is-editable behavior — a customer could still theoretically clear the field at checkout, though this is unverified as an actual occurrence (no browser-level telemetry exists to confirm either way).
- Retry ceiling (~6.5s) is a guess based on typical edge-function latency, not a measured SLA — if `generate-welcome-discount` is ever slower than that under load, the race reopens.

**Neutral:**
- The 3 genuinely slow-converting customers (15-24 days, real expiry) are unaffected by this fix — that's a separate "is 7 days the right window" product question, not a bug.

## Key files

- `src/hooks/useWelcomeDiscount.ts` — retry logic
- `src/lib/analytics.ts` — `trackBeginCheckout` now takes `hasDiscount`
- `src/pages/MysteryPurchase.tsx` — passes `hasDiscount` at the call site
- `src/pages/SignUp.tsx` — the non-blocking `generate-welcome-discount` invocation this races against (unchanged)

## Discussion

The investigation started from a wrong assumption: the sweep request framed all full-price purchases as "missed the discount window," implying slow deciders. The data showed the opposite dominant shape — fast deciders with a discount that was never surfaced or applied, not a discount they knowingly passed up. That reframing is what pointed at the client-side fetch/race rather than the checkout page's own UX. Chose the retry as the fix that survives being wrong about which of the two mechanisms (Stripe prefill semantics vs. the race) actually explains historical cases, since it's cheap, reversible, and strictly improves the one failure mode this repo can control either way.
