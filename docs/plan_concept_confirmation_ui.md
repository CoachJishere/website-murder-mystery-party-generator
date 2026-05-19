# Planning: Concept Confirmation UI before Generation

**Status:** Draft / not started
**Drafted:** 2026-05-19
**Trigger:** Fotini "Murder in the Multiverse" incident — paid customer received a generated package with the right characters but a completely invented plot because `approved_concept_message_id` had been auto-snapshotted to a thin character-list message, starving Make.com of the plot detail she'd developed across 304 messages.

## Problem

The current generation flow has no step where the user explicitly sees and confirms "this is the mystery I'm paying to have generated." The system tries to infer it:

1. `approved_concept_message_id` is auto-snapshotted to whichever assistant message most recently contained a recognized character-list header.
2. `mystery-webhook-trigger` then sends only that one message's content to Make.com as `conversationContent`.

Two failure modes have surfaced:

- **Madysn pattern (Apr 2026)**: chat pivoted from one theme to another. Without trimming to one approved message, Make.com merged both into a schizophrenic package. → motivated the original single-message approach.
- **Fotini pattern (May 2026)**: chat developed a complex plot iteratively across many messages. The single approved message captured only the character roster, not the plot. → Make.com generated with no plot context.

Each pattern wants the opposite fix. The runtime heuristic we shipped (v112, "snapshot too thin → use full conversation") catches Fotini's case heuristically but doesn't solve the underlying problem: **the system is guessing at what the user intended to lock in.**

## Goal

Before payment, show the user a single, comprehensive concept document for their mystery, and have them explicitly confirm or edit it. That confirmed document becomes the authoritative input to generation — replacing both the snapshot heuristic and the "send full chat" fallback.

## Non-goals

- Not changing the chat experience itself. The brainstorming chat stays as it is; this is a new step *between* chat and payment.
- Not removing `approved_concept_message_id`. The confirmed concept can still be persisted as a message (or as a dedicated column); either way it remains the source of truth for `mystery-webhook-trigger`.
- Not addressing how the generated package itself is reviewed/edited post-generation (separate concern).

## Proposed flow

1. User finishes chatting and clicks **Generate Mystery** (the existing button on `/mystery/chat`).
2. New step: a "Confirm Your Concept" screen appears (route `/mystery/confirm/:id`).
3. Behind the scenes, a new edge function `synthesize-mystery-concept` calls Claude (Haiku, ~80K input tokens for long chats) to produce a single comprehensive markdown document covering: title, premise, victim, killer + motive + method, full numbered character list, setting, round structure, key mechanics, awards. The output schema is the same shape as the concept document we hand-wrote for Fotini today.
4. The screen displays this doc with three options:
   - **Looks good — pay and generate** → standard purchase flow, then generation uses this doc as `conversationContent`.
   - **Edit** → inline markdown editor; user revises freely. Save → re-enter confirmation.
   - **Go back to chat** → return to `/mystery/chat/:id` to keep brainstorming. The synthesis is regenerated on next confirmation.
5. On confirm, the concept doc is persisted (insert as new assistant message + update `approved_concept_message_id`, OR new dedicated column `confirmed_concept` on `conversations`). Payment proceeds. Generation reads only the confirmed concept.

## Why this fixes both failure modes

- **Madysn pattern**: the synthesized concept naturally consolidates pivots into one coherent narrative. The user sees it before paying, so they catch any leftover drift (e.g. "wait, why is there a lake house here, we switched to circus") and edit before generation.
- **Fotini pattern**: the synthesis reads the full chat, so the concept captures iteratively-built plot detail. The user sees their actual plot reflected in the doc, confirms, generation gets the full picture.
- **Other patterns we haven't seen yet**: an explicit confirmation step gates the entire failure class — generation can never proceed against context the user hasn't seen.

## Phasing

### MVP (smallest shippable thing)

- New edge function `synthesize-mystery-concept` — input: conversation_id; output: markdown doc.
- New page `/mystery/confirm/:id` rendering the synthesized doc with `Edit`, `Confirm`, `Back to chat` actions.
- Route the existing **Generate Mystery** button from `/mystery/chat` to this confirmation step instead of straight to purchase.
- On confirm: persist as a new assistant message (re-using `approved_concept_message_id` plumbing — no schema change yet).
- English only initially. i18n for the confirmation screen UI labels, but the concept doc itself stays in the user's chat language (Claude synthesizes in whatever language the chat is in).

### Phase 2 (after MVP validates)

- Dedicated `confirmed_concept` column on `conversations` (text), separate from messages — cleaner data model, doesn't pollute the chat thread with a synthesized doc the user didn't write.
- Re-synthesize button (user can request a fresh synthesis if they want to compare).
- Synthesis quality eval — periodic check that generated mysteries match the confirmed concept (sample audit).

### Phase 3 (polish)

- Show a diff when the user clicks "Re-synthesize" so they can see what changed.
- Localize the synthesis prompt itself (currently English instruction → the model emits in chat language, but a localized instruction may be more reliable).
- Cache synthesis result for ~30 min so quick edits don't burn API budget on repeat calls.

## Design considerations

### What does the screen look like

Recommendation: full-page, two-column on desktop, stacked on mobile.

- Left/top: the rendered markdown doc, scrollable. Section headers (Premise, Victim, Killer, Character List, etc.) are anchor links.
- Right/bottom: a sticky card with the three actions (Confirm, Edit, Back to chat) and a short helper line: "This is exactly what we'll send to the generator. Anything missing? Edit it or go back to chat."

### Edit mode

A textarea/markdown editor that loads the same content. Don't try to build a structured editor — markdown is fine and matches the format the synthesizer emits. Save persists the edited version, re-renders the read view.

### Where the concept lives

For MVP: persist as a new assistant message with role `assistant`, content = the confirmed concept, then update `approved_concept_message_id`. This re-uses the existing extraction pipeline and the v112 thin-snapshot heuristic (won't fire because the doc will be substantial). Zero edge function changes needed.

For Phase 2: dedicated `confirmed_concept` column to avoid mixing user-confirmed synthesis with the chat thread.

### Payment ordering

Two options:
- **Confirm → pay → generate**: standard. User confirms, then pays.
- **Pay → confirm → generate**: user pays first, then sees the synthesis to confirm. Riskier — if they confirm something they don't like and the package is wrong, they've already paid.

Recommend **confirm → pay**. The confirmation step IS the contract: "this is what you're paying for."

### Cost & latency

- Synthesis API call: Haiku 4.5, ~80K input tokens for long chats, ~5K output. ~$0.10 per generation.
- Latency: ~10-15 seconds for a long chat. Acceptable for an explicit "I'm ready" step. Show a loading skeleton.
- Edits don't re-call the API (user edits locally). Only the initial synthesis costs.

### i18n

- All UI labels go through `react-i18next` (existing pattern, 13 langs).
- The synthesized doc body is in the chat's language (Claude emits in whatever language the input is in — already verified for our existing chat AI).
- One open question: do we need to localize the section headers (`Premise`, `Victim`, etc.) the synthesizer emits? If we don't, a French chat will get a doc with English headers and French body. Address in Phase 3.

## Edge cases

| Case | Behavior |
|---|---|
| User edits the doc, then clicks "Back to chat" | Discard edits with a confirm dialog. |
| User has chatted but never developed a plot | Synthesis returns a thin doc. UI shows a note: "Your concept looks incomplete — consider going back to chat to flesh out the plot." Allow proceed anyway. |
| Synthesis API fails | Fall back to current behavior (the v112 heuristic). Surface a warning banner: "We couldn't generate a clean concept summary, but you can review your chat instead." Show a "Continue to payment" button that proceeds with current logic. |
| User has already paid (existing customers) | They don't go through this flow. Confirmation gates new generations only. |
| User wants to regenerate an existing package (e.g. plot mismatch like Fotini) | They get the confirmation step; the synthesized concept reflects the latest chat. This is the long-term version of what we hand-fixed today. |
| Character count in synthesized doc differs from form-captured `player_count` | The v113 auto-sync handles this — extraction at generation time wins. No action needed here. |

## Open questions

1. **Persist as message vs. column?** MVP uses message; Phase 2 considers a column. Decide whether the doc should ever appear in the chat scrollback (probably no — confusing).
2. **What if the user edits the doc to be inconsistent (e.g. names 17 characters in the prose but only lists 15 in the numbered roster)?** Validation at submit time? Or trust the user and let extraction handle the count?
3. **Should we synthesize iteratively as the user chats, or only on demand at confirmation time?** On-demand is simpler; iterative gives a live preview but burns API budget.
4. **Do we keep the v112 thin-snapshot heuristic** once confirmation is live? Probably remove it — there should never be a "thin snapshot" case once the user is forced to confirm a substantive doc. Defer that cleanup to Phase 2.
5. **Pricing implications?** If a user lands on confirmation, edits the doc to add 10 characters (going from 12 to 22 players), do they pay more? Check current pricing model — if tier-based on player count, the confirmation page may need a "your price is now $X" line.

## Estimated effort

Rough order-of-magnitude only:

- Edge function `synthesize-mystery-concept`: 0.5 day
- New page `/mystery/confirm/:id` (display + edit modes): 1-1.5 days
- Wire up route from existing Generate button: 0.5 day
- Persist + plumb through to `mystery-webhook-trigger`: 0.5 day (mostly testing)
- i18n labels for confirmation screen: 0.5 day
- Total MVP: **~3-4 dev days** end-to-end.

Phase 2 (column migration, re-synthesize button, eval): another 1-2 days.

## Decision needed before starting

- Confirm-then-pay vs. pay-then-confirm (recommendation: confirm first).
- Persist as message vs. new column for MVP (recommendation: message).
- Whether to remove the v112 heuristic when this ships (recommendation: keep until eval, then remove in Phase 2).

## Related work

- v111 (May 19 2026): null-deref + non-standard header fixes. [CHANGELOG](../CHANGELOG.md#2026-05-19)
- v112 (May 19 2026): thin-snapshot heuristic + structured error logging.
- v113 (May 19 2026): `player_count` auto-sync, replacing the strict 400 validation.
- The Fotini incident memory: [project_fotini_may2026.md](../../.claude/projects/-Users-jonathanmiller-CascadeProjects-website-murder-mystery-party-generator-main/memory/project_fotini_may2026.md) (not in repo).
