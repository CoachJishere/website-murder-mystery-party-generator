# 0039 — Raise the player/character cap from 32 to 35

**Status:** Accepted
**Date:** 2026-07-19

## Context

A customer (Alexandra Broadus, following [ADR-0038](docs/adr/0038-cast-size-fixed-at-generation-and-surplus-guest-handling.md)) wants a single mystery with **35 full suspect characters** for a 35-person party. The existing limit was **32**, enforced only as input validation — no database constraint, no pipeline hard-stop, and no ADR or comment explaining why 32 specifically. It is a soft, undocumented product ceiling.

Investigation found the 32 bound in six functional spots:
- `src/components/MysteryForm.tsx` — Zod `.max(32)` on `playerCount`
- `src/components/MysteryChat.tsx` — two player-count range checks (`<= 32`)
- `supabase/functions/mystery-ai/index.ts` — standalone-number validity/invalidity gates + two prompt strings ("range is 4 to 32", "between 4 and 32")
- `supabase/functions/mystery-webhook-trigger/index.ts` — primary and secondary character-extraction bounds (`charMap.size <= 32`), plus a log string

## Decision

Raise the cap from **32 → 35** at all six validation points. Keep it a soft ceiling (input validation only; no DB/pipeline enforcement added).

## Rationale

The change is trivial and fully reversible, the customer asked for it, and defending an undocumented number over a paying customer's clear request isn't worth it. 35 is only 3 above the prior ceiling, so the marginal technical risk over the already-supported 32 is small.

## Alternatives Considered

- **Keep 32, route the extra 3 as co-investigators** (32 suspects + 3 co-investigators = 35 people) — offered to the customer as the recommended option; she preferred all-suspects.
- **Split into two parallel games (~17–18 each)** — offered as the better-hosting option; declined in favour of one large game.
- **Per-customer override instead of a global cap raise** — no per-user mechanism exists; input validation gates every user's chat, so granting 35 to one customer means raising the shared cap. Accepted.

## Consequences

- Any customer can now request up to 35. The two **caveats are real and unmitigated by this change**:
  1. **Generation reliability degrades as the cast grows.** Each character is a separate Make.com child-scenario call, so 35 is the slowest, most timeout-prone generation and the most likely to need recovery (this is why the generation-monitoring system exists). Large generations should be watched.
  2. **35 all-suspects is genuinely hard to run** as a single game. For very large groups, co-investigators or parallel rooms remain the better host experience — the cap raise does not change that guidance in the Host Guide / marketing copy.
- **Deployment:** the two edge functions (`mystery-ai`, `mystery-webhook-trigger`) are NOT auto-deployed by CI and must be deployed with `supabase functions deploy` for the change to take effect end-to-end. The frontend deploys via the normal Pages workflow on push.
- Going from a 20-char to a 35-char mystery still requires a **fresh conversation** (the cast is authored into the plot; see ADR-0038) — raising the cap only lets the user type 35 in that new chat.

## Key files

- `src/components/MysteryForm.tsx`, `src/components/MysteryChat.tsx`
- `supabase/functions/mystery-ai/index.ts`, `supabase/functions/mystery-webhook-trigger/index.ts`

## Discussion

The debate was less "can we" (trivially yes) than "should we." The two caveats (generation reliability, hosting difficulty) argue for keeping the ceiling and steering large groups to co-investigators/split rooms — which is what the customer was offered first. She declined, wanting all-suspects. Given the change is cheap and reversible and the number was undocumented, we honoured the request while keeping the honest hosting guidance in the customer reply and Host Guide. If 35-character generations prove to flake in practice, revisit whether the cap should sit lower (e.g. 28–30) with co-investigators as the sanctioned overflow above that.
