# ADR-0117: Concept chat's "Generate Mystery" reminder is now mandatory every turn, not a soft suggestion

- **Status:** Accepted
- **Date:** 2026-08-31
- **Related:** ADR-0101 (same append-block placement pattern, same `contentBoundaries` mechanism), ADR-0064 (unconditional-guardrail precedent this follows)

## Context

While building a P&L/CAC analysis (not originally a bug hunt), non-paying August conversations turned out to have a skewed cost shape: 53% of non-paying conversations were 4 messages or fewer (quick browsing, as expected), but the 19% of conversations with 10+ messages accounted for 55.5% of total non-paying message volume. Reading the 3 longest non-paying August conversations directly from `messages` (84, 68, and 48 messages) showed they were not aimless "kicking the tires" — two were genuine, specific, hours-long real-event planning sessions ("60th birthday weekend getaway," a personal-birthday dystopian-fairy-tale concept), and none of the three users had ever paid, in this or any other conversation.

Locating exactly where each of these three sessions died turned up a consistent pattern: the "hit Generate Mystery" reminder — instructed only as a soft "mention"/"remind" in the `contentBoundaries` block appended to every concept-chat system prompt — appears early, then vanishes:

- **"The Vanishing Vintage" (84 msgs):** CTA present at messages 2, 4, 6, 8, 10, 14, 36, 61 — then **zero mentions for the last 23 messages**, including the assistant's own "ENHANCED FINAL VERSION" moment and a final "does this feel right?" with no CTA attached.
- **The wuxia/PVE concept (68 msgs):** CTA mentioned once, at message 4-5, then **silent for the remaining 63 messages**.
- **"The Gilded Crown Conspiracy" (48 msgs):** CTA at message 8, then silent for 35 messages, recovering only at 44/46/48.

A pre-existing mechanism already tried to address long-conversation drop-off (`mystery-ai/index.ts`, "Soft conversion nudge for long conversations (100+ messages)"), but its threshold (100+ messages) never fired for any of the three real cases (84, 68, 48 — all under 100), and its wording is itself soft ("when it feels natural... don't block or pressure them").

## Decision

Changed the CTA instruction inside the shared `contentBoundaries` block (`supabase/functions/mystery-ai/index.ts`) from a soft, skippable suggestion to a hard per-turn requirement:

> Old: "After presenting or refining the mystery concept, mention what the package includes: ..."
>
> New: "MANDATORY, every single response in this conversation, with no exceptions: end your reply with a short reminder of the 'Generate Mystery' button. This applies to message 2 and to message 50 alike — do not let this fade out as the conversation gets long or the user keeps adding worldbuilding/lore details. Vary the wording naturally each time so it doesn't feel copy-pasted, but always include the substance: ..."

`contentBoundaries` is appended unconditionally in every refinement-mode code path — both `applyDatabasePrompt()` (the `MYSTERY_FREE_PROMPT` Supabase secret, the dominant production path for standard murder mysteries) and the inline fallback templates (intrigue mode, no-database-prompt fallback) — so this single edit covers all of them, same reasoning as ADR-0101/ADR-0064's unconditional-append precedent.

The pre-existing 100+ message soft nudge was left in place, unchanged — now redundant for the cases it was meant to catch (any conversation reaching 100 messages is already well past the new mandatory-every-turn floor), but harmless.

## Rationale

- **Fixes the specific failure shape found in real data, not a hypothetical one.** The two test cases below were built to reproduce the exact patterns read out of `messages` (a `continue`-loop conversation with no CTA in recent history, and a post-"final version" one-more-tweak request) rather than a generic long-conversation simulation.
- **Verified live before shipping**, per the standing no-unapproved-metered-spend rule — explicit go-ahead obtained first, with a cost estimate (~$0.10/call), then 2 real Anthropic API calls run against the live `mystery-ai` endpoint (using its `system` override to test the new prompt text without needing to deploy first):
  - **Test A** (35-message fabricated conversation, 16 rounds of bare "continue" with no CTA in between): response closed with the CTA verbatim, and the model also self-corrected the repetitive-continue pattern unprompted.
  - **Test B** (7-message fabricated conversation reproducing the "ENHANCED FINAL VERSION → one more small tweak" moment where Vintage's real CTA went silent): response closed with the CTA again.
  - Total verification cost: 2 calls, both under the $0.10/call estimate.
- **Deliberately does not address a second, distinct failure mode found in the same transcripts.** "The Vanishing Vintage" reached a fully-built concept, was told plainly and explicitly (mid-conversation, message 61) exactly what buying unlocks, and still didn't convert — that reads as payment/commitment hesitation, not a missing reminder, and a prompt-side fix can't touch it. Not addressed here; flagged as a separate open question (see Consequences).

## Alternatives Considered

- **Just lower the existing 100-message threshold.** Rejected — the observed decay happens well under 100 messages (as low as message 5 of 68), so a lower threshold would still be arbitrary and could still be crossed by drift. A per-turn requirement has no threshold to tune.
- **Move the reminder to the UI (a persistent banner/toast after N messages) instead of the prompt.** Deferred, not rejected — this is a real complementary option (the "Generate Mystery" button already renders unconditionally in `MysteryChat.tsx` after the first AI reply, so the button being present was never the gap). Out of scope for this fix; worth revisiting if the prompt-level fix alone doesn't move the needle.
- **A hard message-count paywall or gate** (e.g., force a purchase decision after N messages). Explicitly rejected after reading the transcripts — the longest, most expensive non-paying sessions were also the most specific, highest-intent ones (real event, real names, real dates); gating on message count would hit the best prospects hardest, not filter out low-intent browsing.

## Consequences

- Live for every future concept-chat customer, standard and intrigue mysteries alike, deployed `mystery-ai` v175 (from v174) with `verify_jwt: false` preserved.
- No change to what content the AI is allowed to generate (the "never generate game-ready content" rules are untouched) — only to how consistently it reminds the user the option exists.
- Does not address the cart-abandonment pattern (concept finished, CTA seen, still no purchase) surfaced in the same investigation — that likely needs a pricing/checkout-side look once Stripe API access is connected, not a chat-prompt change.
- No automated test coverage exists for prose prompt content in this codebase (same limitation as ADR-0101/0064) — verified here via 2 targeted live API calls reproducing the exact failure transcripts, a stronger check than transcript-review-only but still not regression-tested; worth a spot-check against a real long conversation next time this file changes.

## Key files

- `supabase/functions/mystery-ai/index.ts` — `contentBoundaries` block (the CTA reminder instruction), appended unconditionally across all refinement-mode branches.

## Discussion

The investigation that surfaced this didn't start as a bug hunt — it started as a P&L question about why August's Anthropic COGS-to-revenue ratio looked worse than prior months, which led to separating true per-unit generation cost (fine, in line with historical average) from CAC-shaped concept-chat spend (real, but expected at a 9.8% conversion rate), which led to asking whether long non-paying chats were low-effort browsing or something worth understanding. Reading the actual transcripts rather than just the aggregate counts is what turned up the CTA-decay pattern — the aggregate `mentions_generate_cta` counts per conversation (8, 4, 2 respectively) looked unremarkable on their own; only mapping those mentions to message position (`row_number() over (partition by conversation_id order by created_at asc)`) revealed they all cluster early and go silent, rather than being evenly spread.

The two live test cases were deliberately built to match the *shape* of the real failures (bare "continue" loop; post-"final version" tweak) rather than being generic stress tests, so a pass on both is reasonably strong evidence the fix addresses the specific thing that was observed — not just "the model can produce this string when asked directly."
