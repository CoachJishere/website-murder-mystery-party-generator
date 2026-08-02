# ADR-0059: Send the approved concept message *plus everything after it*

- **Status:** Accepted
- **Date:** 2026-08-02
- **Related:** ADR-0057 (snapshot selection), Madysn Apr 2026, Fotini May 2026

## Context

An audit of every paid purchase in the 35 days to 2026-08-02 found that ADR-0057 — which fixed snapshot *selection* — did not close the stale-concept class. Three delivered packages were built from a superseded concept by a different mechanism:

| Conversation | Purchased | Later assistant msgs | What was lost |
|---|---|---|---|
| Black Swan Society | 2026-07-26 | 13 | setting moved to Victorian; institution renamed off "Morehouse"; Savannah plot thread added |
| Adelaide Crane | 2026-07-24 | 10 | Camille's illegitimacy backstory; Patricia's salad-bar motive and marriage ultimatum; paternity-test clue |
| The Masked Betrayal | 2026-07-27 | 2 | "these must exonerate all but Alex Monroe, Rhiannon Sterling and Jules Ashford" |

In all three the customer kept refining **in prose** — no later message restates the cast list. ADR-0057 selects the latest message that *parses into a roster*, so it correctly picks the same message the old code did. Verified against all three conversations: the fixed selector returns the identical stale message. ADR-0057 fixed the renamed-header variant and nothing more.

The delivered payload was therefore just that one message: 6,026 chars out of a 37,553-char conversation for Black Swan; 6,782 out of 46,062 for Adelaide Crane.

A guard for this already existed and never fired. `snapshotTooThin` was added after Fotini's "Multiverse" (May 2026) and requires `approved_len < 3000`. These snapshots are not *thin* — they are full ~6KB concept messages that are simply *stale*. Across 8 paid conversations with post-snapshot activity in 60 days, it fired **zero** times. It tests the wrong property.

The May 2026 note framed this as an unresolved tension with two failure modes needing opposite fixes:

- **Madysn (Apr 2026)** — a theme pivot (lake-house → circus). Sending the full conversation let the planning prompt latch onto the abandoned draft. Needs *narrow* context.
- **Fotini (May 2026)** — iterative plot development spread across many messages. Sending one message starved the prompt of detail. Needs *wide* context.

## Decision

Send the approved concept message **and every message after it**, ordered chronologically. Messages *before* the snapshot remain excluded.

```ts
const approvedAt = new Date(approvedMsg.created_at).getTime();
const afterSnapshot = messages
  .filter(m => new Date(m.created_at).getTime() > approvedAt)
  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
conversationContent = [`AI: ${approvedMsg.content}`, ...afterSnapshot.map(fmt)].join("\n\n---\n\n");
```

`snapshotTooThin` is retained unchanged: when the snapshot is a thin roster-only message, the plot detail may lie *before* it too, so that case still escalates to the full conversation.

## Rationale

**The two failure modes are not actually opposed — they are asymmetric about the snapshot.** Messages before it may be superseded drafts, which is exactly the contamination the narrow design exists to prevent. Messages after it cannot be: the customer wrote them later, on top of a cast they had already approved. Widening in that one direction carries no Madysn risk and recovers all the Fotini detail. The tension recorded as unresolved in May was an artifact of treating "context width" as one dial rather than two directions.

Verified on the real conversations — probes absent from the old payload and present in the new one:

| | Victorian | Savannah | illegitimacy | salad bar | paternity |
|---|---|---|---|---|---|
| old (snapshot alone) | – | – | – | – | – |
| new (+ later messages) | present | present | present | present | present |

Payloads grew 6,026 → 20,467 and 6,782 → 19,888 chars, both far below the ~255KB the function already sends comfortably.

## Alternatives Considered

- **Widen `snapshotTooThin` to a staleness test** (e.g. later content > N chars → send full conversation). Rejected as the primary fix: it still sends pre-snapshot drafts, reintroducing Madysn, and it needs a threshold nobody can justify. The Masked Betrayal's decisive refinement was ~3KB across 2 messages, so any threshold high enough to be conservative would have missed it.
- **Always send the full conversation.** Reverts the Madysn fix outright. Rejected.
- **Re-snapshot at purchase rather than generation.** Doesn't help — the same prose-refinement pattern happens before purchase too (Adelaide Crane's revisions spanned two days *before* she paid).
- **Have the model re-emit a consolidated concept after each refinement.** Would make ADR-0057's parser sufficient, but it is a prompt/product change with its own failure modes, and it cannot help conversations that already exist.

## Consequences

- Post-snapshot refinement now reaches the generator. All three identified cases would have been built correctly.
- Payloads grow for conversations with post-snapshot activity — in the observed population, roughly 3x, to ~20KB.
- Pre-snapshot drafts remain excluded, so Madysn-class contamination is unchanged.
- `snapshotTooThin` still covers the case where detail sits before a roster-only snapshot.
- **Does not repair the three already-delivered packages.** Those need repointing/regeneration, which is a separate, paid operation and an owner decision.
- **The Masked Betrayal case exposes a second issue this does not fix:** the assistant told the customer her exoneration constraint "gets generated in your full package", which was a promise the pipeline had no way to keep. Prompt-level honesty about what chat can and cannot commit to is out of scope here.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `conversationContent` assembly
- `docs/adr/0057-select-concept-snapshot-by-parse-not-header.md` — selection, the other half
- `00_INBOX/concept-snapshot-wrong-message-2026-08-02-mystery-maker.md` — audit findings

## Discussion

The uncomfortable part of this ADR is that ADR-0057 shipped hours earlier with language implying it closed the stale-concept class. It did not. It fixed one variant — a later draft that restates the roster under a header the allow-list didn't know — and the audit then found three cases of a variant it cannot reach. The lesson is not that ADR-0057 was wrong but that "fixed the bug the customer reported" was mistaken for "fixed the class", and only a systematic sweep distinguished the two.

Worth noting how close this came to never being found: the structural scan the audit ran first came back completely clean, because no other conversation had a renamed header. Had the audit stopped there — which a reasonable reading of "is this isolated?" might have — all three cases would have stayed invisible. The semantic pass, reading each conversation's actual final intent against what shipped, is what found them. That is expensive and does not scale, which argues for a detector: post-snapshot assistant content above some volume is a cheap signal that correlates well here (14K and 12.8K chars for the two severe cases, 3.2K for the mild one, ≤1.4K for every clean one).
