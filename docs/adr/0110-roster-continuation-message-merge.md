# ADR-0110: A roster split across two chat messages by an LLM output cutoff was silently truncated to the tail-only message

- **Status:** Accepted — implemented and verified live 2026-08-25
- **Date:** 2026-08-25
- **Related:** ADR-0057 (single source of truth for "what message proposes a cast" — this ADR extends that predicate rather than duplicating it), ADR-0069 (`approved_concept_message_id` never re-captures — same extraction pipeline, different failure mode)

## Context

Contact form message from a customer (Nikki Barnett, conversation `f9bf07b5-1a11-491f-8b38-96d85785f7f4`) reporting that generating her mystery "cuts down her 22-character list to 16." She had not actually purchased or generated — no `mystery_packages` row existed, `webhook_sent = false` — so this was a pre-generation chat issue, not a Make.com pipeline failure.

Reconstructed from the actual conversation transcript: she asked the concept chat to replace the cast with her own 22-character list. The assistant's reply hit its own output length limit and cut off **mid-sentence after character #16** ("...they've been shooting daggers at each other across the room all" — no closing punctuation). She asked it to continue; the assistant sent a **second, separate message** containing only characters 17-22, headed `## Character List (22 playable suspects) - CONTINUED`. The assistant then told her, incorrectly, that "the system has a maximum character limit... typically 16" — a fabrication it retracted one message later.

`extractCharactersFromMessages()` (and the `findLatestConceptMessage()` predicate it shares with the `approved_concept_message_id` snapshot per ADR-0057) always resolves to the single chronologically-latest assistant message that independently parses ≥4 characters (`MIN_ROSTER_SIZE`). The continuation message's header includes a trailing " - CONTINUED", which breaks `sectionHeaderRegex` (it requires nothing after the optional count-parenthetical), so the continuation message falls through to the header-agnostic batch parser — which still finds 6 valid character lines (17-22) and returns them as a complete roster on their own.

Verified by extracting the exact regex/logic out of `mystery-webhook-trigger/index.ts` into a standalone script and running it against her actual three candidate messages:
- Original 22-character message → parses 22 correctly.
- Truncated message → parses 16 (confirms mid-sentence LLM cutoff, not a real cap).
- Continuation message → parses 6 (17-22 only), and because it's chronologically last, `findLatestConceptMessage` returns it as "the" cast.

**Had she hit Generate in that conversation state, she would have received 6 characters — not 16, not 22 — a worse outcome than what she reported.** No customer has hit this in an actual generated package yet (verified: her conversation never triggered the webhook).

## Decision

Add `mergeRosterContinuations()`: before any extraction runs (including the `approvedMessageId` lookup), fold a continuation message's content onto the end of the assistant message immediately preceding it, whenever the continuation message's first numbered character line starts above 1 (e.g. "17." not "1."). Real rosters this system generates always start numbering at 1 — a message starting higher is never a legitimate from-scratch cast, only ever a continuation of the message before it, so this is a safe structural signal (same principle as `isPlaceholderCharacterName` and ADR-0057's "structure not wording" precedent).

```ts
function firstCharacterNumber(content: string): number | null {
  for (const line of (content || '').split('\n')) {
    const m = line.trim().match(/^(\d+)\.\s+(?:\*\*.+?\*\*|[A-Za-z])/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function mergeRosterContinuations(messages: any[]): any[] {
  const sorted = [...(messages ?? [])].sort((a, b) =>
    new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  let prevAssistantIndex = -1;
  const merged = sorted.map((m) => ({ ...m }));
  for (let i = 0; i < merged.length; i++) {
    const m = merged[i];
    if (!(m.role === 'assistant' || m.is_ai)) continue;
    const firstNum = firstCharacterNumber(m.content || '');
    if (firstNum !== null && firstNum > 1 && prevAssistantIndex !== -1) {
      merged[i].content = `${merged[prevAssistantIndex].content || ''}\n\n${m.content || ''}`;
    }
    prevAssistantIndex = i;
  }
  return merged;
}
```

Called once, at the top of `extractCharactersFromMessages()`, so `findLatestConceptMessage()`, the primary header re-parse, and the secondary bold-line fallback all see the merged content — one fix point instead of three.

Verified against Nikki's real conversation (before/after, `test_full_pipeline.mjs`, deleted after use): before the fix, `findLatestConceptMessage` resolves to the continuation message and extracts 6 characters; after the fix, the same call resolves to the same message (now carrying the merged content) and extracts all 22, with no name collisions between the two halves.

## Rationale

- **Fixes the actual mechanism, not just this one customer's case.** Any concept chat reply that gets cut off by an output-length limit and is continued in a follow-up message hits this same bug; it isn't specific to a 22-character cast.
- **Single fix point, consistent with ADR-0057.** Folding at the top of `extractCharactersFromMessages` means the `approvedMessageId` lookup, the fallback `findLatestConceptMessage` scan, and the secondary bold-line parser all inherit the fix without three separate patches that could drift.
- **Structural signal, not wording-dependent.** Detecting "starts above 1" doesn't depend on the model's continuation phrasing ("CONTINUED", "cont.", "(more)", or nothing at all) ever staying consistent — same reasoning ADR-0057 used to reject a header-wording allowlist.
- **No merge risk on real replacement lists.** A from-scratch roster (like her earlier 22-list "exchange" request) always starts at 1, so it's never merged backward into an unrelated prior draft.

## Alternatives Considered

- **Broaden `sectionHeaderRegex` to tolerate trailing text like "- CONTINUED".** Would make the continuation message match the header path, but doesn't solve the actual problem — it would still be evaluated as a complete, replacement 6-character roster instead of being merged with the message it continues.
- **Increase the chat's max output tokens so a 22-character list never needs to be split.** Doesn't fully close the gap (any cast large enough will eventually hit some limit) and doesn't fix already-split conversations like Nikki's; complementary but not a substitute for handling the split when it happens.
- **Merge based on explicit continuation phrasing ("CONTINUED" in the header).** Rejected for the same reason ADR-0057 rejected a header wording allowlist — model phrasing for "this is a continuation" will keep drifting across languages and rewordings.

## Consequences

- **Positive:** A concept chat reply that gets cut off mid-roster and continued in a follow-up message no longer loses the earlier characters when the customer generates. Closes a distinct failure mode from the Make.com pipeline shortfalls in ADR-0093/0094/0108/0109 — this one happens before generation is ever triggered.
- **Deployed and verified live** 2026-08-25 (`supabase/functions/mystery-webhook-trigger/index.ts`); confirmed via `mcp__supabase__get_edge_function` that the deployed source includes the fix.
- **Not addressed:** the AI concept chat itself still has no visibility into (and can fabricate claims about) backend generation limits — it should never assert a specific technical cap it cannot verify. Worth a follow-up to the chat's system prompt; out of scope for this ADR, which fixes the extraction bug the fabricated "16" claim happened to coincide with.
- **Not addressed:** whether a customer's roster could ever legitimately split across *more than two* messages (e.g., a second continuation cut off again). The fix only merges a continuation into the single immediately-preceding assistant message; a three-way split would need the merge to chain, which the current sort-and-scan structure already supports (each continuation merges into whatever now sits at `prevAssistantIndex`, which itself may already be a merged message) — not separately tested, but not expected to break.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `mergeRosterContinuations()`, `firstCharacterNumber()`, wired into `extractCharactersFromMessages()`
- `docs/adr/0057-...md` — the single-source-of-truth predicate this ADR extends
- Contact form ticket, Nikki Barnett, 2026-08-25 — the incident this fix traces to

## Discussion

The customer never actually triggered generation, so this bug was caught pre-incident rather than found via a post-purchase sweep — worth noting as a case where a support/contact-form message surfaced a real defect before it reached a paying customer's actual package, not after.

The AI's own hallucinated "typically 16" explanation is a separate, softer problem worth flagging on its own: the concept chat has no real visibility into backend generation behavior, but volunteered a specific, plausible-sounding, and wrong technical claim rather than saying it didn't know. It self-corrected one message later without being shown evidence it was wrong, which is a good sign the underlying model will own a mistake when pressed, but the system prompt doesn't currently instruct it to avoid asserting backend limits in the first place. Not fixed here.

## Addendum 1 (2026-08-25): a second, independent parser on the pre-purchase preview page had the same failure shape and its own separate root cause

Nikki replied that generation was still showing 16 characters after she'd pasted her complete 22-character list in a single message. She had not paid yet, so "Generate Mystery" for her only ever navigates to `/mystery/purchase/:id` (`src/pages/MysteryChat.tsx`'s `handleGenerateFullMystery`) — the checkout preview page, which never calls `mystery-webhook-trigger` at all. This ADR's fix, being server-side only, could not have touched what she was actually looking at.

`src/pages/MysteryPurchase.tsx` runs its own, entirely independent character parser (`parseCharacters`), duplicated from the server's logic by convention rather than by shared code — its own comments already reference ADR-0057 awareness. Its message-selection loop requires the SAME message to match both a Premise-style header (`##\s*(?:PREMISE|GAME OVERVIEW|...)`) and a Character-List-style header (`##\s*(?:CHARACTER LIST|...)`), and picks the most recent message satisfying both. Walked Nikki's actual message history newest-to-oldest and confirmed by running the real regex against her real messages: every message after her original full concept either lacked a Premise header (the 17-22 continuation, the Alex Nash rename, her final plain-text "here's the complete 22" confirmation) or lacked bold-formatted names entirely (that confirmation only bolds one of 22 entries, so even a header-agnostic bold-line scan finds nothing on it). The loop fell all the way back to the truncated 16-character message from this ADR's original incident — the exact same message, for a different structural reason.

**Immediate unblock:** inserted one clean, correctly-formatted assistant message into her conversation (proper `## Premise` + `## Character List (22 players)` headers, all 22 names bold-numbered, including her Alex Nash rename) — verified against both the client preview parser and the server extraction logic before inserting, both returning the correct 22. This is a manual, customer-specific recovery action, not a code fix; documented here per the incident trail, not because it's a repeatable pattern.

**Code fix:** ported this ADR's decision to `MysteryPurchase.tsx` — added `firstCharacterNumber`, `scanForRoster` (a standalone version of the file's existing `scanWholeMessageForRoster` closure), and `mergeRosterContinuations`, then decoupled character-roster selection from `detailedMessage`'s combined Premise+CharacterList requirement: after merging continuations, the roster now comes from the most recent (post-merge) message that independently scans to ≥4 characters, regardless of whether that same message also happens to carry a Premise header. `detailedMessage` (and its Premise/overview extraction) is untouched — this only fixes which message the *character count* is read from.

One structural difference from the server-side fix worth noting: naive content concatenation on merge does NOT work for this file's section-scoped regex path (`characterSection = content.match(characterSectionsPatterns[0])`), because a continuation message's own `## Character List... - CONTINUED` header becomes a premature stop boundary for the lazy `[\s\S]*?(?=##|$)` match — the section-scoped extraction on merged content would still only find the first half. The header-agnostic `scanForRoster` (no `##` awareness at all) doesn't have this problem, so the merge-and-select logic here always reads through `scanForRoster`, never through the section-scoped path.

Verified end-to-end: `npx tsc --noEmit` clean, `vite build` clean, and the exact regex logic re-run against Nikki's real message set confirms 22/22 post-fix (was 16/22 via the old premise-coupled selection). Not yet re-tested against Nikki's actual live page load (the manual message insert unblocks her regardless of whether this code deploys in time).

**Not addressed:** this is now three independent implementations of "parse a cast out of chat messages" in this codebase (`mystery-webhook-trigger`, `MysteryPurchase.tsx`, and whatever `mystery-ai`'s own chat-side awareness amounts to) — the exact paired-predicate-drift shape this project has been burned by before (ADR-0055/56/57). Consolidating into one shared, single-sourced implementation (e.g. an edge function the preview page calls instead of parsing client-side) was considered and rejected here only for scope/time reasons — this fix keeps the two implementations independently correct on today's data, not merged. Worth a follow-up ADR if a third such drift incident occurs.

## Key files (Addendum 1)

- `src/pages/MysteryPurchase.tsx` — `firstCharacterNumber`, `scanForRoster`, `mergeRosterContinuations`, decoupled character selection in the `fetchMysteryAndMessages` effect
- `src/pages/MysteryChat.tsx` — `handleGenerateFullMystery`, confirms unpaid customers never reach `mystery-webhook-trigger`
- Nikki Barnett's conversation `f9bf07b5-1a11-491f-8b38-96d85785f7f4` — manually inserted confirmation message, id `5ada887b-31da-409d-84f6-9def677ab6dd`
