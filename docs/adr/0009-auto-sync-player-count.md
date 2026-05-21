# ADR-0009: Auto-Sync `player_count` From Extracted Characters, Don't Reject Mismatches

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made May 2026, captured retroactively)

## Context

`conversations.player_count` is captured from the user's opening chat message ("a mystery for 12 players") at conversation creation. It is **set once** at creation and never refreshed.

Users routinely revise the character count during chat. They ask for more characters, swap roles, remove duplicates, add a detective, drop the inspector. The form-captured opening number drifts away from the actual count by the time they hit Generate.

`mystery-webhook-trigger` independently extracts the character list from the approved concept message (regex first, Claude fallback if the regex finds nothing) to build the per-character payload. So at generation time we have two values:

- **`conversations.player_count`** — what the form thought the user wanted at chat start.
- **`extractedCharacters.length`** — what the approved message actually contains.

Until May 2026 the function compared the two and returned **HTTP 400** on mismatch, on the assumption that a mismatch meant extraction had gone wrong.

This assumption was wrong. The Fotini "Multiverse" incident (May 19 2026) demonstrated the failure mode concretely: a 304-message conversation where the character count drifted 15 → 20 → 19 → 17 across iteration, while `player_count` stayed at 15. Extraction worked correctly — it found 17 characters because there *were* 17 characters — but the strict equality check rejected the request as an extraction error. The customer paid, hit Generate, and saw a 400. This was misclassifying user iteration as a system bug.

The choice space:

1. **Keep strict equality** and treat mismatches as 400 errors. (The pre-May behavior.)
2. **Add tolerant equality** (`Math.abs(extracted - form) <= 2` or similar) to allow for the inspector and small drift, still 400 outside that band.
3. **Auto-sync** — trust the extracted count as authoritative and write it back to the DB, proceed with generation.
4. **Prompt the user to confirm** — interactive resolution before payment.

## Decision

**Auto-sync `player_count` from the extracted character count whenever they differ. The approved concept message is the authoritative source of truth.**

Concrete behavior in `mystery-webhook-trigger`:

- After regex/Claude extraction produces `extractedCharacters` and we have a numeric `player_count`, if `extractedCharacters.length > 0 && extractedCharacters.length !== player_count`:
  - Log the drift (`[PlayerCount] Drift detected: form=X, extracted=Y. Syncing player_count → Y.`).
  - Attempt a DB update of `conversations.player_count` to the extracted count. **Best-effort** — DB write failure does not block generation.
  - Update the in-memory `conversation.player_count` and `playerCount` variables to the extracted value.
  - Proceed to build the payload using the extracted count.
- The old "400 on mismatch" branch is removed entirely. There is no strict-equality validation gate.

**Underlying premise:** the approved concept message is what the user agreed to generate from. Whatever character count it contains is, by definition, the intended count. The form value is upstream artifact, not ground truth.

## Consequences

**Positive:**
- **Iterative users are no longer punished.** Anyone who revises character count during chat — common pattern — gets the generation they paid for. Their changes flow through cleanly.
- **Form value self-heals.** Downstream code (UI, emails, analytics) reading `player_count` post-sync sees the right number. The stale-form-value problem fixes itself at generation time.
- **Single source of truth.** The approved message is canonical for the character list *and* the count. Two derived values can't disagree because we don't compute the count twice.
- **No new user-facing surface.** No confirmation modal, no warning toast. The fix is invisible to users in the modal case.
- **Reduces support load.** The class of "I paid but got 400" tickets caused by player-count drift goes to zero.

**Negative:**
- **Silent correction of user intent.** If extraction is genuinely wrong (e.g. the regex picked up text it shouldn't), we will write a wrong count to the DB and generate with it. Mitigated by the regex → Claude fallback chain and the cross-validation that already exists (claude-upgrade path when regex finds significantly fewer than `player_count`). The remaining risk is asymmetric: extraction over-counting is rare; under-counting is what the upgrade path handles.
- **Best-effort DB write means transient drift is possible.** If the sync update fails (network blip, RLS hiccup), the in-memory value is correct for this request but the DB still shows the old number until the next sync. Acceptable — the next generation attempt will sync again, and downstream uses of the stale DB value are recoverable.
- **No audit trail for the change.** We log it in the edge function but don't write a row anywhere capturing "player_count was X, became Y at time T." If we need this later (e.g. for refund or dispute investigations), it's reconstructible from edge function logs within Supabase's retention window but not durable beyond that.
- **Encodes a policy choice in webhook code rather than a validation gate.** A future maintainer might add a strict check back, not realizing it was deliberately removed. The inline comment at the sync block documents this; this ADR backs it up.

**When to revisit:**
- **If extraction-error cases (regex/Claude returning wrong counts) start producing customer complaints,** revisit the asymmetric trust assumption. Could add a sanity band (e.g. reject if extracted differs from form by >10x) without re-introducing strict equality.
- **If we add a structured "set character count" UI element** in chat, the form value could be made authoritative again — but then the form value would have to update on every user revision, not just at conversation creation. That's a different shape of fix; this ADR remains correct for the current free-form-chat flow.
- **If audit trail for `player_count` changes becomes needed** for refunds/disputes, add a `conversation_audit_log` table rather than reintroducing strict-equality gates.

## Rejected alternatives

- **Keep strict equality and return 400.** Rejected. The Fotini incident proved this misclassifies user iteration as system error. Strict equality assumes the form value is ground truth, which it isn't — it's a one-time capture from chat opener.
- **Tolerant equality (`abs(extracted - form) <= 2`).** Rejected as a half-measure. It would have caught the inspector + flexibility band that already lives in the cross-validation logic (lines around `minExpected = playerCount - 2`), but not Fotini's 15 → 17 drift. The threshold is arbitrary and doesn't track real user behavior.
- **Prompt user to confirm on mismatch.** Rejected for the modal case. Adds friction at the exact moment the user expects payment to "just work" (they've just clicked Generate). The mismatch isn't surprising or risky from the user's perspective — they know they iterated; we're the ones with stale data.
- **Reject 400 + send a clarifying error message to the UI.** Better than the old behavior but worse than auto-sync. Pushes a system-internal data-quality problem onto the user as a UX problem. Auto-sync resolves it without involving them.
- **Use the form value, ignore the extracted count.** Rejected on the same grounds as strict equality: the form value is upstream and stale. Generating with the wrong count produces a worse outcome than generating with the right count + a stale DB row.
