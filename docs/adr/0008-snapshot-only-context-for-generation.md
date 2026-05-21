# ADR-0008: Snapshot-Only Context for Mystery Generation

- **Status:** Accepted, contested (see "When to revisit")
- **Date:** 2026-05-21 (decision made April 2026, captured retroactively; tension surfaced May 2026)

## Context

When the user clicks Generate, `mystery-webhook-trigger` builds a payload for Make.com that includes a `conversationContent` field — the textual context the parent and (downstream) child scenarios condition the mystery on. The question is **what to send**.

Two extremes:

- **Full conversation.** Every user/AI message concatenated. High fidelity, but includes everything the user ever tried, including abandoned themes, prior character drafts, and reversed decisions.
- **Single approved message.** The content of `conversations.approved_concept_message_id` only — the specific AI message the user clicked "approve" on to lock in the concept.

Both extremes have produced real customer-visible failures:

**The Madysn case (April 2026 — drove the original decision):** the user's chat pivoted from a lake-house mystery to a circus mystery. The full conversation contained both. When we passed the full conversation to Make.com, the generator blended the two themes, producing a mystery that was neither cleanly lake-house nor cleanly circus. Pivots in chat are common; old-theme contamination from full-conversation context is the dominant failure mode for users who iterate on theme.

**The Fotini case (May 2026 — surfaced the tension):** the user's 304-message conversation iteratively built a specific plot — a riddle system, a bribe mechanism for one character, a specific killer motive (archaeologist, void essence poison, dimensional keystones), a hidden-identity twist. None of these details lived in any single message. The "approved concept" message we snapshotted was a clean character list at 1,816 characters, vs. a full conversation at 312,006 characters. Make.com generated a mystery with the right characters but a completely different plot. The customer emailed asking how to fix it.

The two failure modes call for opposite fixes. There is no current heuristic that distinguishes them.

The April decision — taken in response to Madysn — was: **send only the approved concept message.** That choice is what shipped, and it is what's in production. It works for the modal case (theme pivots / single-shot users) and fails for iterative plot-builders.

## Decision

**Send only the content of `approved_concept_message_id` as `conversationContent`.**

- `mystery-webhook-trigger` resolves `approved_concept_message_id` to a single message and sends its content as `conversationContent`.
- The full conversation is **not** sent. Per-character chat excerpts (added May 2026) bundle name-matched messages per character, which recovers *some* iterative detail at the character level, but does not recover plot-level detail spread across many messages.
- The product surface that controls what gets snapshotted is the "approve concept" UX in chat — the act of approving a message is, structurally, the act of choosing the snapshot.
- This decision is **contested**: the Fotini incident demonstrates that the modal-case optimization actively harms a measurable minority of users. Documented here so a future revisit does not start from scratch.

## Consequences

**Positive:**
- **Pivots don't contaminate generation.** Users who change theme mid-chat (the more common pattern) get clean output matching their final intent.
- **Payload is small and predictable.** Snapshot messages are typically 1–3KB; full conversations can be 300KB+. Smaller payloads mean faster Make.com runs, less prompt-cost burn, fewer truncation surprises.
- **Single source of truth for "what gets generated."** The approved message is identifiable in the DB, replayable, debuggable. "What did we send to Make.com?" reduces to "look at this message ID."
- **Per-character excerpts (added May 2026)** layer on top of the snapshot to recover *some* iterative detail at the character level. This is a partial mitigation for the Fotini failure mode without abandoning the snapshot design.

**Negative:**
- **Iterative-plot users lose detail.** Users who refine a plot across many messages rather than approving a single rich concept message will have their refinements discarded. The generator only sees the snapshot, and the snapshot may be a clean character list rather than the rich plot the user built.
- **No detection of "you've changed a lot since the snapshot."** If the user keeps chatting after approving — adding characters, revising motives, layering twists — none of that reaches Make.com. The UI does not warn them; they discover the mismatch only after generation.
- **Failure mode is silent and post-purchase.** The user has paid by the time they see the mismatch. Recovery requires manual SQL intervention to re-point `approved_concept_message_id` and reset the package for retry.
- **Encourages "approve early, refine later" anti-pattern.** Users who approve a concept and then keep iterating are pushed into the failure mode. The product surface doesn't make the "approval = snapshot" semantics visible.

**When to revisit:** *(this decision is genuinely contested — list is concrete on purpose)*

- **Build a heuristic that widens context when the snapshot is small relative to the post-snapshot conversation.** Rough shape: if snapshot < 3KB and conversation since snapshot > 30KB, include the post-snapshot conversation as supplementary context. Captures Fotini-shaped iteration without un-fixing Madysn-shaped pivots. Cost: complicates the payload, has to be tested against multiple historical cases.
- **Surface "what we're sending to the generator" before payment.** A preview UI showing exactly which message(s) will be sent, with an option to broaden, lets the user make the call. Cost: real UX work; risk of overwhelming the modal user with a decision they don't have context to make.
- **Add a "lock in changes since last approval" CTA** that reminds users mid-chat that their iteration isn't yet snapshotted. Cheaper than a full preview UI; visible without being a blocking decision.
- **Move snapshot semantics into the chat agent itself** — have it explicitly say "I'm capturing this version as your approved concept" with an undo. Makes the model boundary visible in the conversation.
- **Build per-customer recovery tooling** for the Fotini case so support doesn't need SQL. Doesn't change the decision, but reduces the cost of being wrong.

If iterative-plot cases exceed ~5% of generations or generate disproportionate support load, the heuristic-widening option is the cheapest first move and should be the next ADR. Until then, the modal case wins.

## Rejected alternatives

- **Send the full conversation.** Rejected by the Madysn incident. Theme pivots are the more common failure mode and full-conversation context contaminates them. The Fotini case is real but a measurable minority; rebuilding around it would re-introduce the larger problem.
- **Concatenate snapshot + all messages since snapshot.** Plausible — this is essentially the "heuristic-widening" revisit option. Not chosen as the day-one decision because it requires a confidence threshold (when is "since snapshot" too noisy to include?) and we have not yet quantified the Fotini case's prevalence.
- **No snapshot — generate from a structured form.** Rejected as a larger product direction. The free-form chat is the product; structuring it removes the differentiation. Could be revisited as an optional "structured mode" for users who want determinism over flexibility.
- **Send the last N messages as a sliding window.** Rejected: arbitrary cutoff, no semantic meaning. Either ends up too narrow (worse than snapshot for iterative plots) or too wide (worse than snapshot for pivots), depending on N.
