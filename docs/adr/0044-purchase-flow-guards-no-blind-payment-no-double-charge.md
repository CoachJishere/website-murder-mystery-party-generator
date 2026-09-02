# 0044. Purchase-flow guards: no payment before a previewable concept; paid customers generate free

**Status:** Accepted

**Date:** 2026-07-26

## Context

Diagnosing the "Victorian mansion - 32 Players" incident (ADR-0043) surfaced *how* the customer reached a broken generation: she **paid before any mystery concept existed.**

The intended purchase flow is: chat → the AI generates a concept (premise + named victim + character list) → the purchase page shows that concept as a **preview** → the customer pays → generation fires. Jenny instead clicked "Generate" in the chat while the AI was still asking clarifying questions (message 4 of 4 was *"what's the occasion?"*). That routed her to `/mystery/purchase/:id`, which **has no guard requiring a concept** — its CTA (`handlePurchase`) goes straight to Stripe. She paid for a mystery that did not exist yet, generation fired on an empty conversation, and the pipeline produced placeholder junk.

Reviewing that page for the recovery also confirmed a second, latent hole: the purchase page **only knows how to send a customer to Stripe.** There is no already-paid path — so any customer who returns to `/mystery/purchase/:id` (to regenerate, or via the chat's Generate button after paying) is shown "Complete purchase" again and can be **double-charged.**

Both holes sit on the same page and are two sides of one principle: *payment and preview are out of order.*

## Decision

Two guards on `src/pages/MysteryPurchase.tsx`, co-located with the existing preview parsing so "is there a previewable concept" and "is the customer allowed to pay" use the **same signal** (`parsedDetails.characters.length`, the exact data the preview renders) and cannot drift:

1. **No payment before a previewable concept (fixes buying blind).** When the conversation is **unpaid** and no concept can be parsed (`parsedDetails.characters.length === 0`), the "Complete purchase" CTA is replaced with a "Back to design" action and a message: *your mystery isn't ready to preview yet — finish it in chat first.* A customer can only reach Stripe once there is a real concept on screen to preview.

2. **Already-paid → generate free (fixes double-charge).** When `mystery.is_purchased` is true, the CTA becomes **"Generate my mystery"**, which calls `generateCompletePackage(id)` directly and navigates to `/mystery/:id` — never Stripe. If the concept still isn't finished, `generateCompletePackage` returns the ADR-0043 `needs_more_info` sentinel and the customer is told to finish the chat (the entry gate is the backstop for the paid path).

New user-facing strings use `t(key, { defaultValue })` English fallbacks so no locale files are blocked on this change (translation is a follow-up).

## Rationale

- **Same-signal co-location.** Guarding on `parsedDetails.characters` — the very data the preview card renders — means "you can see a preview" and "you may pay" are guaranteed consistent. A separate concept-detection heuristic (e.g. a header regex) would risk drifting from what the preview actually shows (cf. the paired-regex hazard).
- **The paid path can't be false-blocked.** The already-paid branch doesn't gate on concept parsing at all — it delegates to `generateCompletePackage`, whose entry gate (ADR-0043) already keys on the full extraction result (multi-locale regex + Claude fallback). So a paid customer with an odd-format or non-English concept still generates.
- **One page, both fixes.** Payment ordering is a single concern; fixing it in one place keeps the flow legible.
- **Self-serve recovery for Jenny.** With these guards, the incident customer recovers herself and authentically: finish the concept in chat → preview it here → "Generate my mystery" (free) — no re-charge, and she shapes her own mystery rather than us inventing it. This was chosen over white-gloving (us authoring + regenerating) precisely because it fixes the flow for everyone, not just her.

## Alternatives Considered

- **Guard the chat's "Generate" button instead.** Blocking in `MysteryChatCreator.handleGenerateMystery` gives earlier feedback, but its concept detection is an English-only header regex — a false negative would wrongly block a legitimate non-English customer from paying at all. The purchase page is the authoritative payment gate and uses the broad preview parser, so the guard lives there. (A lightweight chat-side hint can be added later without risk once it shares the broad parser.)
- **White-glove Jenny (author concept + regenerate for her).** Considered and spend-approved, then set aside: it fixes one customer, invents her creative content for her, and costs a full 32-player generation. The flow fix fixes the class and lets her self-serve.
- **Auto-redirect already-paid customers off the purchase page.** Rejected — the preview is exactly what a returning paid customer wants to see before generating; we keep the page and change only the CTA.

## Consequences

- **Positive:** no customer can pay for a mystery that doesn't exist yet, and no paid customer can be double-charged. Returning paid customers get a clean "generate" affordance. Jenny recovers self-serve with no re-charge.
- **Watch:** the "previewable concept" test is `parsedDetails.characters.length > 0`; if the preview parser (`parseCharacters`) ever regresses, the unpaid CTA would over-block (fail safe — blocks payment, doesn't take money wrongly). New strings are English-fallback until localized.
- **Follow-up:** localize the new keys (`purchase.buttons.generateAlreadyPaid`, `purchase.notReadyToPreview`, `purchase.toasts.startingGeneration`, plus `mysteryView.toasts.conceptIncomplete` from ADR-0043) across the 13 locales.

## Discussion

The instinct during recovery was to white-glove Jenny — generate it for her so she "just opens her profile and sees the mystery." That's simplest for her, but it (a) costs a full 32-player generation, (b) has us inventing 32 characters she never chose, and (c) leaves the flow hole open for the next customer. The realization that she had *bought a mystery before she knew anything about it* reframed the fix: the problem isn't Jenny's package, it's that payment can happen before a preview exists and that paying customers have no free generate path. Fixing those two guards fixes the class and turns the recovery into an authentic self-serve flow. Chosen over white-glove for exactly that reason.

## Key files

- `src/pages/MysteryPurchase.tsx` — both guards on the CTA; `handleGenerateAlreadyPaid`; import of `generateCompletePackage`.
- `src/components/MysteryChatCreator.tsx` — `handleGenerateMystery` (:169) routes chat → purchase; unchanged (guard deliberately not placed here — see Alternatives).
- `src/services/mysteryPackageService.ts` — `generateCompletePackage` (entry gate + `needs_more_info` sentinel, ADR-0043).
- Related: [ADR-0043](0043-gate-generation-on-concept-completeness.md) — the generation-side gate + completion invariant + detector this flow fix complements.

## Addendum (2026-08-31): theme-suggestion bullets false-matched as a character roster, paid for zero concept

The "Watch" note above anticipated `parseCharacters` **over-blocking** (a regression that fails safe). It didn't anticipate the opposite: the parser **false-matching** unrelated content as a roster and **under-blocking** — which is exactly what happened.

**Incident:** Hannah Winter (`ebb3aa77-7b27-4c6d-8e12-98abd2cb0b6c`, $19.99, 10 players) sent one message, received the assistant's standard theme-clarifying reply, and purchased ~2.5 minutes later — before ever picking a theme. `conversations.title` never left its placeholder (`"Mystery - 10 Players"`); `mystery_packages` ended up `needs_more_info` / `concept_incomplete` (ADR-0043 correctly refused generation) with zero characters.

**Root cause:** the assistant's clarifying reply includes an illustrative bullet list of theme options:

```
- **1920s Speakeasy** – bootleggers, jazz singers, mob bosses
- **Space Station** – crew, scientists, a mysterious malfunction
- **Tropical Resort** – wealthy guests, scandal in paradise
- **Victorian Manor** – aristocrats, secrets behind closed doors
```

`scanForRoster`/`scanWholeMessageForRoster`'s header-agnostic fallback (added for the "###" subsection and non-English-header cases, see the code comment above) is pure shape-matching: any 4+ consecutive `**Bold** – text` lines pass, with no check that the content is actually about characters. These four theme examples matched perfectly, parsed as four "characters" (`1920s Speakeasy`, `Space Station`, ...), satisfied `parsedDetails.characters.length > 0`, and the guard in this ADR let real Stripe checkout through with zero concept designed. The generation-side gate (ADR-0043) caught it after the fact because it requires an actual `CHARACTER LIST`-style header (multi-locale) — it has no shape-only fallback, so it isn't exposed to this false positive.

**Blast radius check:** of 154 historical paid conversations, only 5 ever kept a placeholder title (never got a real one) — this one, plus 4 from Oct–Nov 2025. Spot-checked one of the older four: different mechanism (the chat API errored out 4 times in a row, never produced real content — not this parsing bug). So this exact false-positive is newly identified, not a long-running leak, but "customer reaches checkout with zero concept" as a class has slipped through at least twice via different bugs in ~10 months.

**Fix (`src/pages/MysteryPurchase.tsx`):** `scanForRoster` and `scanWholeMessageForRoster` now take the conversation's `player_count` and only trust a shape-only match when its size is plausible for the game actually being built (`isPlausibleRosterSize`): unchanged behavior (still just needs the pre-existing 4-line floor) for `player_count <= 8`, but for larger games requires the match to be at least half the requested roster. A bare 4-item match for a 10-player game no longer passes. Threaded through both call sites (`mergeRosterContinuations`'s continuation-anchor detection and the final `latestRosterMsg` selection/extraction) so an implausible match can't win either as an anchor or as the final result.

**Known residual gap, accepted deliberately:** for `player_count <= 8`, size alone can't distinguish a real small roster from this exact false-positive shape (both can legitimately be 4 items) — closing that fully would need content-based signals (e.g. "is this describing a person or a setting"), which risks the same English-only trap ADR-0057/ADR-0073 already hit once (`CHARACTER_LIST_HEADERS` needs 13-locale coverage; a bespoke content classifier would need the same). Not built, given this is the first observed instance of this specific pattern and the existing floor already worked correctly for every other historical case. Revisit if it recurs at a small player count.

**Customer resolution:** Hannah's conversation and `is_paid` flag are untouched — she can return to the same chat (no route currently guards it) and finish choosing a theme; the purchase page already treats her as paid (`mystery.is_purchased`) so returning to `/mystery/purchase/:id` won't re-charge. Separately noted: `MysteryView.tsx` (the page a paid customer actually lands on) has no link back to `/mystery/chat/:id` at all — only the pre-purchase page does. A customer in this exact state has no in-app way to discover she needs to go back to chat; not fixed here, flagged for follow-up.

**Update (2026-09-02):** she never returned to this chat. Jonathan refunded this order directly and she repurchased fresh (the "second mystery" covered in ADR-0103 Addenda 8/9 and ADR-0106 Addendum 3), so the "customer can resume" plan above never actually happened. This conversation's `conversations.is_paid` was still `true` days later — stale, since the order was refunded — which meant it was still showing up as a live sale on the homepage's `RecentSalesPopup` widget (`get_recent_public_sales` requires `is_paid = true`), still carrying its placeholder title. Surfaced when Jonathan asked whether that exact title was visible on the homepage. Fixed by setting `is_paid = false` on this conversation (`ebb3aa77-7b27-4c6d-8e12-98abd2cb0b6c`) to match the actual refunded state; confirmed it dropped out of `get_recent_public_sales`. Scoped to this one row, not a general fix — this codebase has no automated refund→`is_paid` sync (refund revocation is currently a manual, case-by-case action, same as the no-soft-hide-flag gap noted for completed packages), so a future refund would need the same manual check unless that's built.
