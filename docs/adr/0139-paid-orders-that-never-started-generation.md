# ADR-0139: Paid orders that never started generation (detector, rescue, and the orphan-package bug in the service path)

**Status:** Accepted
**Date:** 2026-10-04
**Related:** ADR-0043/0044 (entry gate, already-paid path), ADR-0104 (rate limit and claim), ADR-0118, ADR-0123, the 2026-08-30 Staša orphan-row incident (comment in `mystery-webhook-trigger`)

## Context

"Murder By Copy" (conversation `f71e2d1a-545a-4bad-a6c2-078f58a4c9bc`, 5 players) was paid at 2026-10-04 00:12 UTC and sat for 7 hours 22 minutes with no package. Nothing alerted: no `generation_attempts` row, no `mystery_packages` row, health check blind to it.

Root cause (verified in code and data):

1. **Generation is started only by the customer's browser.** The Stripe webhook marks the order paid and sends the notification email but never starts generation. The post-payment page (`MysteryView`, `?purchase=success`) shows a "Generate my mystery" button; `handleGeneratePackage` calls `mystery-webhook-trigger`. Every other paid order in the last 45 days (about 35) has a non-service `generation_attempts` row 12 to 90 seconds after `purchase_date`, i.e. the customer clicked at once. This customer reached the page (`display_status` was set to `purchased` there) and never clicked. The only earlier case is "The Gilded Cage" (2026-09-15, 4 seconds between payment and last update).
2. **Second bug found while re-firing it:** the service-role branch of `mystery-webhook-trigger` skips `claim_package_for_generation`, so for a conversation with no package yet there is no row to look up, Make receives `package_id: null`, and Make's blank-id "early save" upserts INSERT orphan rows. The re-fire produced three `mystery_packages` rows (characters in one, title in another, detective script in a third). The browser path never shows this because the claim creates the row first. The same code comment documents this exact race for the 2026-08-30 order.

## Decision

1. **Detector:** `list_paid_unstarted_orders(min_age_minutes, max_age_hours)`: paid, no package row, and no `generation_attempts` row at all (so a customer who clicked, even unsuccessfully, is never double-started).
2. **Rescue:** edge function `rescue-unstarted-orders` on a 2-minute cron starts each hit (at most 3 per run, orders older than 3 minutes, newer than 72 hours) through `mystery-webhook-trigger` and emails support@ one alert per order. If the trigger refuses (for example `needs_more_info`) it records a `rescue_failed` / `rescue_needs_more_info` attempt so it is never retried every 2 minutes, and the alert says a human must act.
3. **Trigger fix:** for a service-role call on a conversation with no package row yet, run `claim_package_for_generation` first (creates the row), exactly as the customer path does. Re-fires on existing packages still bypass the claim.
4. **Health-check false positive (GitHub issue #3):** `name_background_mismatch` flagged "Camp Counselor Willow" vs background "Counselor Willow Byrd" (customer rename in Edit Mystery). Pairs that share two or more name words of 3+ letters are now treated as the same person. A real generator mismatch shares at most a surname. S'more cleared; "The Hollingsworth Estate" (renamed to "Werewolf"/"Zombie", no shared words) still flags and was left alone as a separate shape.

## Alternatives considered

- **Start generation from the Stripe webhook at payment time.** Fastest, but it removes the customer's last chance to finish the concept (the entry gate), runs before the success redirect, and would need the claim to be race-safe against a simultaneous click. Rescue after 3 minutes gets the same outcome for the 5 percent who leave, with no race with a normal click.
- **Auto-start in the browser on `?purchase=success`.** Helps only customers who reach the page; this one did reach it. Not sufficient alone; may still be worth adding for a better experience (open).
- **Do nothing and rely on support emails.** Rejected: a customer waited 7 hours with no signal on our side.

## Consequences

- A paid order that is never started now starts within about 5 minutes and Jonathan is emailed (per order, so the customer-facing note is not forgotten).
- Orders needing human action (`needs_more_info`, trigger failure) are surfaced once, not looped.
- `generation_attempts.outcome` gains the values `rescue_failed` and `rescue_needs_more_info` (free text column, no constraint).

## Operating it

- Check by hand: `select * from list_paid_unstarted_orders(3, 72);`
- Rescue log: edge function logs for `rescue-unstarted-orders`; per-order alert email.
- Kill switch: `select cron.unschedule('rescue-unstarted-orders');`

## Key files

`supabase/migrations/20261004120000_rescue_unstarted_paid_orders.sql`, `supabase/functions/rescue-unstarted-orders/index.ts`, `supabase/functions/mystery-webhook-trigger/index.ts` (service-role claim), `supabase/migrations/20261004130000_name_background_mismatch_ignore_shared_name_words.sql`.
