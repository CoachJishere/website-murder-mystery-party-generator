# ADR-0092: Reconciling Abandoned "Remove a Character" Checkouts

- **Status:** Accepted — deployed 2026-08-17. `stripe-webhook` v66, `adapt-mystery-create` v4, `send-adaptation-complete-email` v4 (unrelated rename fix bundled in). `adapt-mystery-apply`'s own header-comment rename is committed locally but not redeployed — comment-only, not worth the transcription risk of manually redeploying a 1,315-line business-critical function for zero functional change; it will ship with that file's next real edit.
- **Date:** 2026-08-17
- **Related:** [ADR-0088](0088-guest-dropout-multi-character-and-reassignment.md) (introduced the Stripe Checkout flow this fixes), [ADR-0091](0091-recast-renamed-to-remove-a-character.md) (same-day rename, unrelated but touched some of the same files)

## Context

Live-tested the "Remove a Character" flow (Jonathan, real account, real live-mode Stripe session `cs_live_...`, $5): went through the picker and confirm steps, was redirected to Stripe Checkout, then closed the browser without paying. Returning to the same mystery afterward showed a permanent "Update in progress" card with a 0%-progress bar — work that was never happening and never would.

Root-caused directly against the live batch (`mystery_adaptations` rows for batch `c52dfa06-ed60-464d-a460-21fb45c44dc0`) and the actual Stripe session (confirmed via the Stripe API: `payment_status: "unpaid"`, `status: "open"` — genuinely never paid, nothing to reconcile on Stripe's side). Found a real, general-purpose gap, not specific to this one test:

1. `adapt-mystery-create` creates `mystery_adaptations` rows at `status: 'pending'` *before* redirecting to Stripe. Nothing ever moves a row out of `'pending'` except `stripe-webhook`'s `checkout.session.completed` handler — which only fires on a successful payment.
2. Stripe does send a `checkout.session.expired` event (confirmed subscribed on the live webhook endpoint via the Stripe API), but the handler for it in `stripe-webhook/index.ts` was a literal no-op: `// Optional: track abandoned checkouts` and a `break`.
3. Stripe's default Checkout Session expiry is 24 hours — even once wired up, an abandoned session wouldn't release for up to a full day.
4. `adapt-mystery-create`'s "only one batch may be in flight per package" guard (ADR-0088, owner decision) queries for `status in (pending, paid, processing)` — so a stuck `'pending'` row doesn't just show a misleading spinner, it **permanently blocks any new removal request on that package**.
5. `GuestDropoutPanel.tsx`'s active-batch poll treats any `pending/paid/processing` row as "in flight" and renders the "Update in progress" card — which is what surfaced this as a visible bug rather than a silent one.

This combination is a real problem for any real customer who backs out of the $5 charge (closes the tab, hits back, changes their mind) — not just this test session. The feature is explicitly framed as a same-day, "guest just cancelled" emergency tool (its own explainer copy: "Best used as late as possible — ideally the day of the party"), which makes a multi-hour-to-permanent lockout a materially bad outcome, not just a cosmetic one.

## Decision

Three changes, all scoped to the `adaptation-batch:` client-reference-id branch — no change to the main party-purchase or Cold Case checkout paths:

### 1. Wire `checkout.session.expired` to release the batch

`stripe-webhook/index.ts`'s `checkout.session.expired` case now mirrors `checkout.session.completed`'s existing adaptation branch: if `client_reference_id` starts with `adaptation-batch:`, update every row in that batch from `status: 'pending'` to `status: 'failed'`, `error_message: 'checkout_expired'` — idempotent via the same `.eq("status", "pending")` guard `completed` already uses against Stripe's at-least-once delivery.

`'failed'` (not a new `'cancelled'` status) — it's honest (the request didn't succeed) and matches the existing terminal-status set (`verified`, `rolled_back`, `failed`) without a schema change. `'rolled_back'` was considered and rejected: that status implies a completed-then-reverted operation, and nothing was ever applied here to revert.

### 2. Shorten the Checkout Session's own expiry from Stripe's 24h default to 60 minutes

`adapt-mystery-create` now passes `expires_at: <now + 3600s>` to `stripe.checkout.sessions.create()` (Stripe's allowed range is 30 minutes–24 hours). Fixing (1) alone still means a silently-abandoned session (no explicit Cancel click — the common case; there's no "browser closed" webhook) doesn't unblock the package for up to 24 hours. 60 minutes was picked as a balance: long enough that a customer who actually intends to pay isn't rushed by a $5 checkout, short enough that "guest cancelled, need this working again today" isn't a multi-hour wait.

### 3. Immediate unblock for the affected package

Manually updated the two stuck rows (package `ffea7320-ba7e-48a3-a5c2-9fcf2ba8112a`, batch `c52dfa06-ed60-464d-a460-21fb45c44dc0`) to `status: 'failed', error_message: 'checkout_expired'` directly — same end state (2) and (1) would have produced automatically, just not waiting up to an hour for it. Confirmed zero remaining non-terminal rows for that package afterward.

## Rationale

- **Fixing at the webhook layer, not the frontend**, because the frontend's poll is a symptom (it's honestly reporting what the DB says) — the DB never having a way to leave `'pending'` for an abandoned checkout is the actual bug. A frontend-only fix (e.g. a client-side timeout before showing "in progress") would still leave the package permanently locked server-side.
- **Reused `completed`'s exact branch shape** (`client_reference_id` prefix check, idempotent `.eq("status", "pending")` guard, multi-row batch update) rather than inventing a different pattern for `expired` — this file already has one proven idempotent-update shape for exactly this kind of Stripe-event-to-batch-update mapping.
- **60 minutes, not 30** (Stripe's minimum): a customer stalling on entering card details, or getting momentarily distracted, shouldn't have their in-progress checkout invalidated out from under them for a purchase this cheap and this infrequent.
- **Did not touch the explicit-Cancel path** (clicking "Cancel" on Stripe's own page redirects to `cancel_url`, currently just `window.location.href` with no batch-release call) — Stripe already sends `checkout.session.expired` for that case too eventually, and this fix already gets that down to ≤60 minutes. A dedicated instant-cancel endpoint would close the gap between "clicked cancel" and "60 minutes later," but that's additional surface (a new authenticated-or-not endpoint reachable from a public redirect) for a gap now measured in tens of minutes, not hours — not pursued here.

## Alternatives Considered

- **A `pg_cron` sweep for stuck `'pending'` rows**, mirroring `sweep_stuck_needs_review_packages`. Rejected outright — this repo requires explicit owner sign-off before enabling any cron touching paid packages or unattended spend (`20260729_schedule_auto_remediate_packages.sql`, cited in ADR-0088's own "explicitly deferred" list). The webhook-driven fix needs no new cron.
- **Do nothing, rely on the existing 24h Stripe expiry once wired up.** Rejected — still leaves a real "guest cancelled, need this working again *today*" customer locked out for up to a day, defeating the feature's own stated purpose.
- **New `'cancelled'` status distinct from `'failed'`.** Rejected as unnecessary schema churn — `'failed'` + a descriptive `error_message` already distinguishes this case from any other failure mode for anyone reading the row, without widening `AdaptationStatusValue` or `TERMINAL_STATUSES` in `adaptationService.ts`.

## Consequences

**Positive:** an abandoned checkout now self-heals within an hour instead of never (or 24h once `expired` is wired), and the customer-facing "in progress" card stops lying about work that isn't happening.

**Negative:** a customer who takes longer than 60 minutes to complete a legitimate $5 checkout (interrupted, distracted, slow connection) will see their session invalidated and need to restart the removal flow from the picker. Judged an acceptable trade against the alternative (a stuck package for up to 24h) for a checkout this simple and this cheap.

**Not addressed:** the explicit-Cancel path still takes up to 60 minutes to release rather than releasing instantly on the Stripe-redirect-back — see Rationale above. If real customers hit this often (support volume, not just this single test), a dedicated cancel-and-release call on `cancel_url` is the natural follow-up.

**Verification:** confirmed via direct Stripe API read that the specific abandoned session was genuinely `unpaid`/`open` before touching anything (no risk of double-processing a session Stripe considers paid). Confirmed via the webhook endpoint's `enabled_events` that `checkout.session.expired` is actually subscribed and will reach this handler. Manually verified zero remaining non-terminal `mystery_adaptations` rows for the affected package after the fix. Not verified: an actual live 60-minute abandoned-checkout-to-`expired`-webhook round trip (would require either waiting an hour or Stripe's CLI event-trigger tooling, neither available in this session) — the code path mirrors `completed`'s already-proven pattern closely enough that this is judged low-risk, but it's the one part of this fix that hasn't been observed firing for real.

## Key files

- `supabase/functions/stripe-webhook/index.ts` (`checkout.session.expired` handler)
- `supabase/functions/adapt-mystery-create/index.ts` (`CHECKOUT_EXPIRY_SECONDS`, `expires_at`)
