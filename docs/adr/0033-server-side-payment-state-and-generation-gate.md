# 0033. Payment state is server-side only; generation requires payment

## Status

Accepted

## Date

2026-07-03

## Context

A focused security review of the checkout/payment flow (July 2026 pre-expiry hardening pass) confirmed two independent revenue holes:

1. **Client-side payment marking.** On return from Stripe, `MysteryPurchase.tsx` and `MysteryView.tsx` reacted to the `?purchase=success` URL parameter by directly updating `conversations.is_paid = true` from the browser. The RLS UPDATE policy on `conversations` is row-scoped only (`auth.uid() = user_id`) with no column restrictions — so any signed-in user could run that same update from the browser console and mark their own mystery as paid without paying. The INSERT policy had the same gap (a row could be inserted pre-marked paid).
2. **Unauthenticated generation.** `mystery-webhook-trigger` (verify_jwt disabled) accepted any `conversationId` and triggered the full Make.com + AI package generation with **no payment check and no ownership check**. Since the tab-display logic unlocks package content when characters exist (regardless of `is_paid`), calling this endpoint directly was a complete free-package path — and also let anyone re-trigger (and thereby wipe/regenerate, via the pre-generation character cleanup) another user's package if they knew its conversation UUID.

The Stripe webhook already sets `is_paid`/`purchase_date` server-side with the service role on `checkout.session.completed` (signature-verified), so the client-side write was pure UI optimism, not a load-bearing part of payment.

## Decision

Three layers, deployed 2026-07-03:

1. **DB trigger `protect_payment_columns_trg`** (migration `protect_payment_columns_on_conversations`): a `BEFORE INSERT OR UPDATE` trigger on `conversations` that, when the caller is `anon` or `authenticated`, silently reverts `is_paid`/`purchase_date` to their old values (or `false`/`NULL` on insert). `SECURITY INVOKER` is load-bearing — `current_user` must reflect the API role. Service role (Stripe webhook, admin tooling) is untouched. *Silent revert* rather than an exception so the already-deployed frontend keeps working unchanged (its write becomes a no-op for those columns).
2. **Payment gate in `mystery-webhook-trigger` (v118)**: after fetching the conversation, return `402` unless `conversation.is_paid` is true or the caller presents the service-role key as bearer token (escape hatch for recovery/internal tooling). Verified live: unpaid conversation + anon key → 402, no side effects.
3. **Frontend cleanup** (`MysteryView.tsx`, `MysteryPurchase.tsx`): the `?purchase=success` handler no longer writes `is_paid`; it polls (up to 5 × 1.5 s) for the webhook-set value instead, then proceeds. `display_status: "purchased"` is still written client-side (cosmetic, not access-controlling). **Not yet deployed — ships with the next push.** Until then the live site's write is harmlessly stripped by the trigger, and the Stripe webhook still lands `is_paid` (it fires at payment time, before the customer finishes the redirect, in the typical case).

## Rationale

- Defense in depth with the DB as the floor: even if a future frontend or edge function regresses, `anon`/`authenticated` roles physically cannot set payment state.
- The trigger + poll approach required no synchronized deploy: DB fix now, function deploy now, frontend whenever the next push happens — no window where a paying customer breaks.
- Gating generation on `is_paid` (rather than adding JWT ownership checks) matches how the product actually works: generation is only ever user-initiated after purchase. The service-key bypass preserves the established recovery pattern (agents re-triggering generation for support cases).

## Alternatives Considered

1. **RLS `WITH CHECK` restricting columns.** Postgres RLS cannot compare NEW vs OLD in `WITH CHECK`, so "any column except is_paid" isn't expressible there. Rejected on capability, not preference.
2. **Column-level privileges** (`REVOKE UPDATE` table-wide, `GRANT UPDATE (col…)` for the allowed set). Cleaner in principle, but requires enumerating and maintaining the full allowed-column list for every future feature — one forgotten `GRANT` breaks an unrelated flow. The trigger touches only the two protected columns and can't break new features.
3. **Raising an exception instead of silently reverting.** Would have errored the already-deployed frontend's post-purchase update, showing failures to real paying customers until the next frontend deploy. Silent revert kept the fix zero-downtime; revisit to "raise" once the patched frontend has been live for a while.
4. **Enabling verify_jwt + ownership check on the trigger function.** Larger blast radius on a function with a regression history (see Fotini incident, May 2026), and verify_jwt alone wouldn't help — the anon key is a valid JWT. The in-function is_paid gate is smaller and directly targets the hole.
5. **Webhook-side ownership validation** (cross-checking Stripe customer email against the conversation owner before marking paid). Reviewed and deliberately deferred: `client_reference_id` is attacker-influenceable in the Payment Link URL, but exploiting it requires a full-price payment, and the Cold Case product is already separated by `metadata.product`. Recorded as accepted risk.

## Consequences

- Verified: impersonated authenticated user updating `is_paid` → write succeeds but value stays `false`; privileged update still works; unpaid generation call → 402; paid path code is unchanged.
- The frontend patch is local-only until the next commit+push. Until then there is a rare race: if a Stripe webhook is delayed past the customer's redirect, the customer may see an unpaid state until refresh (previously the optimistic client write masked this). Webhooks typically land before redirects complete.
- Recovery/internal tooling that re-triggers generation for unpaid/test conversations must now send `Authorization: Bearer <service-role-key>` (or set `is_paid` first via service role).
- A future legitimate need for client-written payment-adjacent columns must go through an edge function, not a widened trigger exception.
- Remaining accepted risks, documented here: no ownership check between payer and conversation (costs full price to abuse); refunds/chargebacks don't auto-revoke `is_paid`; CORS wildcard on stripe-webhook is irrelevant in practice (signature-verified, server-to-server).

## Discussion

The main debate was fix ordering under the constraint that frontend deploys ride git pushes (which happen on request) while DB/function changes apply instantly. Any fix that *errored* client payment writes would punish real customers mid-window, so the trigger strips instead of rejects, trading loud failure for zero downtime. The generation gate debated `is_paid` vs full ownership auth; `is_paid` was chosen because it closes the money hole with one conditional in a fragile, regression-prone function, whereas JWT plumbing there is a bigger change for marginal extra protection (a paid attacker re-triggering someone else's generation still requires knowing their conversation UUID — unguessable).

## Key files

- Migration: `protect_payment_columns_on_conversations` (applied 2026-07-03 via MCP)
- `supabase/functions/mystery-webhook-trigger/index.ts` — payment gate (deployed v118)
- `src/pages/MysteryView.tsx`, `src/pages/MysteryPurchase.tsx` — poll-instead-of-write (local, pending push)
- `supabase/functions/stripe-webhook/index.ts` — the sole legitimate `is_paid` writer
- `docs/adr/0032-rpc-surface-lockdown-and-form-abuse-caps.md` — companion hardening pass
