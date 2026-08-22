# ADR-0104: Close the post-purchase free-regeneration hole

- **Status:** Accepted
- **Date:** 2026-08-22
- **Related:** ADR-0033 (payment gate on `mystery-webhook-trigger`), ADR-0044 (already-paid customers regenerate for free instead of re-paying), ADR-0088/ADR-0098 (atomic claim pattern this reuses)

## Context

Jonathan asked for an audit of whether a customer holding onto their persistent `/mystery/chat/:id` link could trigger repeated, real (Make.com + Anthropic-billed) generation runs after paying once, without paying again. Per ADR-0044, once `is_paid = true` the purchase page never sends the customer back to Stripe — instead of "Complete purchase" they get "Generate my mystery," which calls `generateCompletePackage()` (`src/services/mysteryPackageService.ts`) for free. That function has a guard: if the package's `generation_status.status` is already `'completed'` or `'in_progress'`, it returns early.

The audit found that guard was the *only* thing preventing repeat generation, and it was insufficient in a specific, concrete way — not just theoretically racy:

1. **The guard is entirely client-side.** It's a plain read-then-branch in the browser (`mysteryPackageService.ts` ~line 82): read `generation_status`, then decide whether to call the edge function. Not atomic — two tabs or two rapid clicks can both pass the check before either write lands.
2. **The server-side entry point (`mystery-webhook-trigger`) never checked generation status at all.** It only checked `conversation.is_paid` (the ADR-0033 payment gate). `verify_jwt` is disabled on this function, so anyone holding the `conversationId` — which the customer already has, from their own chat link — could call the edge function directly (fetch/curl, no frontend involved) and it would re-run the full Make.com + Claude pipeline every time, `completed` or not. There was no server-side enforcement of "already generated" whatsoever.
3. **The chat itself (`/mystery/chat/:id`) has no `is_paid` gate**, and its per-message rate limit (`mystery-ai`, 10 req/min) is keyed on the raw `Authorization` header string, which the function never validates as a real session — trivially resettable.

Item (2) was confirmed exploitable, not just theoretical: a direct `curl` to the deployed function against a real paid, `completed` conversation (`6a5cab14-a569-4de2-94f1-11bb3022601f`, purchased 2026-07-27) generated successfully before this fix — see Consequences for the reproduction, done safely against a status the guard would reject pre-fix without triggering real spend.

A production data audit (`child_generation_attempts`, cross-referenced against `auto_remediation_log` and every relevant ADR) found no evidence this has actually been exploited by a customer — every repeat-generation pattern in the data traces to a documented staff/system remediation (ADR-0057/0059/0069/0096/0097/0098). This is a close-before-it's-incident fix, not incident response.

## Decision

Two changes, both deliberately mirroring patterns already established and trusted elsewhere in this codebase rather than inventing new ones:

**1. Atomic server-side claim — `claim_package_for_generation()`.** A `SECURITY DEFINER` Postgres function, same shape as `claim_package_for_remediation()` (20260802) and the lost-ack-hardened claim in `adapt-mystery-apply` (ADR-0098): locks the target `mystery_packages` row with `SELECT ... FOR UPDATE`, then does a conditional `UPDATE` that only succeeds when the status is not `'completed'` and not a fresh `'in_progress'` (a stuck `'in_progress'` past a 20-minute TTL is reclaimable, same dead-invocation shape ADR-0098 found and fixed in `adapt-mystery-apply`). Two concurrent callers targeting the same row serialize on the row lock instead of both passing a read-then-branch check. `mystery-webhook-trigger` calls this immediately after the existing payment gate and rejects with `409` if the claim fails.

**2. Parent-level attempts log + rate limit — `generation_attempts` table.** One row per call to `mystery-webhook-trigger` (service-role calls included), recording outcome (`claimed` / `rejected_payment` / `rejected_status` / `rejected_rate_limit`). This didn't exist before — `child_generation_attempts` is per-character and only reflects calls that got far enough to reach Make.com's child scenario, so there was no visibility into the parent-trigger call itself. Backs a simple rolling rate limit (max 3 non-service-call attempts per conversation per 60 minutes) independent of the status guard, as defense in depth in case the claim itself ever has a bug.

Both are skipped entirely for service-role callers (the pre-existing `isServiceCall` bypass) — this closes the free self-serve path only, not the recovery tooling used for legitimate remediation (Lyn DiFranco's/Lydia's rebuilds, ADR-0098).

## Rationale

- **Reused the claim-function shape from `claim_package_for_remediation`/`adapt-mystery-apply` instead of inventing new locking logic.** Both are already live, already-debugged (ADR-0098's Addendum 2 found and fixed a real lost-acknowledgement race in exactly this pattern), and this repo already has a documented preference for reuse over parallel implementations (see ADR-0098's own rationale for reusing `adapt-mystery-apply`'s transform logic verbatim).
- **Did the atomic UPDATE in SQL (an RPC), not via PostgREST filter syntax on the JSONB column from the edge function.** Expressing "not completed AND (not in_progress OR stuck past TTL)" correctly against a `generation_status->>'status'` JSONB path through Supabase-js's filter DSL, including correct NULL handling for packages with no status ever written, gets fragile fast. A `plpgsql` function with an ordinary SQL `WHERE` clause is both more readable and easier to verify.
- **Rate limit is a backstop, not the primary boundary.** The atomic claim is the actual fix; the rate limit exists so that a bug in the claim doesn't silently become a wide-open door again. Threshold (3/hour) is deliberately generous — it should never fire for a legitimate customer clicking generate, seeing an error, and retrying, only for something hammering the endpoint.
- **Left the client-side guard in `mysteryPackageService.ts` untouched.** It's still correct as a first-line UX check (fast, no round trip needed to show the right button state) — the fix adds the missing server-side enforcement behind it, it doesn't replace the client check.
- **Did not touch the chat's per-message auth/rate-limiting in this pass.** Flagged in the original audit as a real gap (no `is_paid` gate on `/mystery/chat/:id`, and the `mystery-ai` rate limiter is keyed on an unvalidated header string), but it's a materially smaller cost exposure than free full-package regeneration (each message is a modest Haiku/Sonnet chat call, not a full Make.com + multi-character generation run) and production data showed no signal of abuse there either. Scoped out of this ADR to keep it to the confirmed, concrete hole; worth its own pass if it becomes a real concern.

## Alternatives Considered

- **Disable self-serve regeneration entirely once `completed`; require a support-side trigger for any further regen (Option B from the original audit).** Rejected for now — it fully closes the free path but removes the customer's own retry ability and shifts every legitimate rebuild (like Lydia's *Staged Suicide Details*, or Lyn's *Cognitive Dissonance Incident* remediation) onto manual support work. The atomic claim already closes the actual abuse vector without that UX/support-load tradeoff; Option B stays on the table if evidence of active abuse ever appears despite this fix.
- **Express the guard purely in PostgREST filter syntax from the edge function**, avoiding a new SQL function. Rejected: correct NULL handling and the AND/OR nesting needed (`not completed AND (not in_progress OR stuck)`) over a JSONB path is exactly the kind of thing that reads correctly and is subtly wrong at 2am — see the note in Rationale.
- **Time-box post-purchase chat access** as part of this same fix. Rejected for scope reasons (see Rationale) — real defect, deliberately deferred to its own pass rather than bundled in under time pressure.

## Consequences

- **Positive:** the direct-call bypass — the actual hole — is closed and verified against real production data. A raw `curl` to the deployed function against a real paid, `completed` conversation (`6a5cab14-a569-4de2-94f1-11bb3022601f`) now returns `409 {"reason":"already_generated"}` before touching Make.com or Anthropic; a 4th rapid attempt against the same conversation returns `429` from the rate limiter. Both verified live post-deploy, zero real spend triggered (rejected before either guard's write path), test log rows cleaned from `generation_attempts` afterward.
- **Positive:** `generation_attempts` gives permanent visibility into this endpoint that didn't exist before — any future spike in `rejected_status`/`rejected_rate_limit` rows is a direct signal, not something that would need to be reconstructed from `child_generation_attempts` inference the way this audit had to.
- **Neutral:** a genuine double-click or two-tab race that used to silently succeed twice (wasting one generation run) now correctly returns `409` for the loser — the client's existing error toast will fire in that rare case ("generation failed") even though the actual cause is a race, not a failure. Minor UX rough edge, not customer-facing in practice since the client-side guard already prevents this in the overwhelming majority of cases; the server guard only ever fires for the race/bypass edge cases the client guard misses.
- **Not addressed — open, tracked in the original audit note:** the chat `is_paid` gate and `mystery-ai`'s header-based rate-limit weakness. No evidence of active exploitation; worth a dedicated pass if that changes.
- **Not addressed — deliberately out of scope:** Option B (fully disabling self-serve post-completion regeneration) remains available if this fix turns out to be insufficient.

## Key files

- `supabase/migrations/20260822_atomic_generation_claim_and_attempts_log.sql` — `claim_package_for_generation()`, `generation_attempts` table, applied via `mcp__supabase__apply_migration`
- `supabase/functions/mystery-webhook-trigger/index.ts` — rate limit + atomic claim + attempts logging, inserted immediately after the existing ADR-0033 payment gate; deployed via `supabase functions deploy` (CLI), confirmed live at version 127 via `mcp__supabase__get_edge_function`
- `src/services/mysteryPackageService.ts` — client-side guard, unchanged (still the first-line UX check; server now enforces behind it)
- Vault note `post-purchase-regeneration-abuse-audit-2026-08-22-mystery-maker.md` — the original audit this ADR resolves; superseded by this ADR, can close
