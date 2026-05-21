# ADR-0004: Per-User Single-Use Promo Codes for the Welcome Discount

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made April 2026, captured retroactively)

## Context

mysterymaker.party gets roughly 3–5 new signups per day, but the signup-to-purchase conversion rate is low. A bounded, urgency-driven welcome offer is a standard lever for new-user activation: 20% off for the first 7 days after signup, then it disappears.

The mechanism choices for delivering that discount, in roughly ascending complexity:

1. **A single shared Stripe coupon code.** One code (e.g. `WELCOME20`), shown to every new user, valid forever or until manually disabled.
2. **A single coupon with manual UTM gating.** Same as 1 but only "shown" to users who arrived via a tracked signup link; coupon itself is still globally redeemable if leaked.
3. **Per-user single-use promotion codes generated at signup.** Each user gets a unique code, tied to a single underlying Stripe coupon, with an expiration timestamp enforced server-side.
4. **Client-side discount math.** Apply the price reduction in the frontend and pass an adjusted amount to Stripe.

The discount also needs to:
- Be visible across the site (sticky ribbon) without prompting the user to copy/paste anything.
- Drive urgency via real, server-enforced deadlines (not "fake" countdowns that reset).
- Survive being shared on Reddit / discount-aggregator sites.
- Allow reminder emails ("48h left", "final hours") on Day 5 and Day 7.

## Decision

**Per-user, single-use Stripe promotion codes, generated at signup, with server-side expiry tracking.**

Concrete shape:

- **One underlying Stripe coupon: `co18EYxp`** (20% off, one-time). Coupons aren't customer-facing in this design — they're the discount math. The customer-facing artifact is the promotion code.
- **`generate-welcome-discount` Edge Function** fires at signup (email + Google OAuth paths both call it). Creates a unique Stripe promotion code restricted to one redemption, linked to coupon `co18EYxp`, with `expires_at = now + 7 days`.
- **Persisted on `profiles`:**
  - `welcome_promo_code` (the code string, used by the purchase page).
  - `welcome_promo_expires_at` (timestamp, used by ribbon, reminder cron, and as the source of truth for whether the offer is still live).
  - `discount_reminder_day5_sent`, `discount_reminder_day7_sent` (idempotency for the reminder cron).
- **Fire-and-forget at signup.** The Edge Function call is not awaited by the auth flow — promo code generation is not allowed to slow down signup. If it fails, the ribbon won't appear; the user is no worse off than before this feature existed.
- **`WelcomeDiscountRibbon` component, mounted in App.tsx.** Site-wide, reads from `profiles.welcome_promo_expires_at`. Disappears silently after expiry or once the user has purchased.
- **Purchase page auto-applies the code** to the Stripe Payment Link URL via query parameter. User never sees the code as a string they need to copy.
- **Day 5 + Day 7 reminder emails** via `send-discount-reminders` Edge Function, triggered by `pg_cron` daily at 09:00 UTC. Idempotent via the `discount_reminder_dayN_sent` flags.

## Consequences

**Positive:**
- **Codes can't be shared.** Single-use redemption means a Reddit post of "use code ABC123" only helps the first stranger to find it; the originating user can no longer use it. Limits the discount to its intended audience without any blocklist or detection logic.
- **Deadlines are real.** `welcome_promo_expires_at` is server-stored at issuance; the countdown ribbon and reminder emails all reference the same column. The user can't gain time by clearing localStorage or changing their clock.
- **Stripe enforces the discount math.** No client-side trust required, no parallel pricing code in the frontend that could disagree with the checkout total.
- **Reminder cron is straightforward.** Each daily run is a single query: profiles where expiry is N days out and the corresponding `reminder_dayN_sent` flag is false.
- **Easy to audit.** A row on `profiles` either has an active code or doesn't; Stripe dashboard shows all issued codes under the parent coupon.

**Negative:**
- **One Stripe API call per signup.** Adds a soft dependency on Stripe availability at signup time. Mitigated by making the call fire-and-forget — if Stripe is down, signup still succeeds, the user just doesn't get a ribbon. Worst case is silent loss of the offer for that user; we accept it given signup volume.
- **Code proliferation in Stripe.** Every signup creates a promotion code, even users who never come back. After ~12 months this is thousands of codes. They're cheap (Stripe doesn't charge for promotion codes) and don't affect performance, but if it ever became a problem a cleanup job on expired codes is trivial.
- **Two columns on `profiles` purely for the reminder dedupe** (`day5_sent`, `day7_sent`). Mild schema noise. The alternative — a separate `welcome_discount_events` table — was rejected as over-engineered at this scale.
- **Tied to Stripe.** If we ever switch payment processors the per-user promo-code mechanism has to be rebuilt against the new processor's API. The columns on `profiles` are generic enough to survive, but the Edge Function is Stripe-specific.

**When to revisit:**
- **If signup volume crosses ~100/day,** consider batching promo code generation or moving it to a queue rather than fire-and-forget per signup. At 3–5/day this is not a concern.
- **If conversion data shows the discount isn't moving the needle,** the whole feature can be removed by deleting the ribbon, the Edge Functions, and the cron — the columns can stay on `profiles` as dead weight or be dropped in a later migration. Decision should be A/B'd before removal.
- **If we want to extend the offer mechanism to other lifecycle moments** (e.g. "win-back" discount for users who lapsed), the same shape (unique code + expiry column + ribbon component + reminder cron) generalizes. A second ADR should capture that extension rather than overloading this one.

## Rejected alternatives

- **Single shared coupon code (`WELCOME20`).** Rejected: leaks to discount aggregators immediately, no per-user expiry, no way to send a personalized "your discount expires in 48h" email because we don't know when "your" started. The single-use property is the whole point.
- **Client-side discount math.** Rejected outright. Untrusted, and Stripe is the source of truth for what the customer is actually charged — divergence between displayed and charged amount is a category of bug we don't want.
- **Code shown as a string for the user to copy/paste at checkout.** Rejected: every step of friction at the checkout boundary measurably reduces conversion. Auto-apply via the Payment Link URL means the code is invisible to the user; they just see the discounted price.
- **No expiry, indefinite welcome offer.** Rejected: removes urgency, which is the activation mechanism we're buying with the discount. A permanent discount becomes the new price.
- **A separate `welcome_discount_events` table for reminder dedupe.** Rejected: two boolean columns on `profiles` are cheaper and adequate. Revisit if we add a third or fourth reminder, or other event types.
