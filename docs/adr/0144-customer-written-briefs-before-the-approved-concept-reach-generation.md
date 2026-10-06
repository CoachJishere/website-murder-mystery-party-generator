# ADR-0144: Customer-written briefs before the approved concept now reach generation

**Status:** Accepted (code committed; edge function NOT yet deployed, see Consequences)
**Date:** 2026-10-06
**Related:** ADR-0059 (concept plus everything after it), ADR-0069 (stale snapshot), ADR-0097 (windowed excerpts), ADR-0122 (50K message cap), the Fotini "Multiverse" thin-snapshot guard in `mystery-webhook-trigger`

## Context

"El Último Trago" (conversation `e0806547-4229-4ab9-a7f4-6f75c3fb1ed6`, 21 players, Spanish, paid USD 24.99, 2026-10-06) was written by a customer who pasted a 42,225-character canon into the concept chat at message 9: two homicides (Paulina kills Juanpa, Verónica kills Consuelo), a 500/100/400 litre tequila fraud, a UV-ink ledger, a closed list of five poison buyers, ghost phases, knowledge walls and a "Golden Rule" that no single clue may identify the culprits. The chat invited it ("paste your detailed prompt, split it if long") and replied that it would treat the canon as untouchable.

Generation never saw it. `mystery-webhook-trigger` sends the approved concept message plus everything after it (ADR-0059) and nothing before it, on purpose: pre-snapshot assistant drafts contaminated a package once (Madysn, April 2026). The concept approved at message 17 was the AI's 4,103-character cast list; the only guard that widens context ("snapshot too thin") requires the snapshot to be under 3,000 characters. So `mystery_packages.user_conversation` was 8,504 characters, and the delivered package has none of the canon's load-bearing facts (searched: no "500", "400", "litros", "funeraria", "Buena Muerte", "somnífero", "orfanato"; "Libro Negro" once, in an evidence card). The customer wrote twice (email and contact form) that "half the important narrative is missing".

It is not a one-off. A corpus check of paid, non-test conversations since 2026-06-01 found about 24 with a pre-snapshot user message of 4,000 characters or more; in most the concept restated it faithfully, but at least three lost a brief 2x or more the size of the concept that reached generation (The Raven And The Rose 18.7K vs 4.9K, Attendance For Dinner 15.2K vs 6.3K, El Último Trago 42.2K vs 4.1K).

A related, smaller instance of the same shape on the same day: "The Roslyn's Clay And The Cracked Foundations" lost a short family-joke instruction ("riding about town like mad hamsters", "weave it into a script") and most of its fringe cast, because they were short user messages before the snapshot and the concept's own write-up omitted them. That case is NOT fixed by this ADR (see Alternatives).

## Decision

1. New shared module `supabase/functions/_shared/conversation-briefs.ts`: `selectPreSnapshotBriefs` picks user-role messages strictly before the approved snapshot with at least 4,000 characters; if together they exceed 50,000 characters the oldest are dropped first. `formatPreSnapshotBrief` labels each one as the customer's own brief, source material, with an explicit tie-break: where it conflicts with the approved concept, the approved concept wins.
2. `mystery-webhook-trigger` prepends the selected briefs (chronologically) before the approved concept in `conversationContent`, inside the existing approved-snapshot branch only. The thin-snapshot full-conversation fallback is untouched (it already sends everything).
3. Offline test `scripts/__tests__/preSnapshotBriefs.test.mjs` (15 checks, in `npm run test:roster`) covers the live shapes, the assistant-draft exclusion, the threshold edges, ordering, the cap and the wiring.

## Rationale

The contamination risk that justified "nothing before the snapshot" comes from assistant drafts and from iteration the concept already reflects. A long block the customer typed or pasted themselves is a different object: it is their source document, the concept chat actively solicits it, and the concept is a lossy restatement of it. The 4,000-character floor keeps ordinary iteration ("make it Victorian") out; the tie-break handles a brief that later chat partly superseded; the 50,000 cap keeps the payload inside what Make has demonstrably handled (55,687 characters on "Murder By Copy").

## Alternatives considered

- **Raise the thin-snapshot threshold (3,000 to, say, 6,000).** Falls back to the full conversation, which reintroduces every pre-pivot draft. Rejected: wrong tool, and the next customer lands at 6,001.
- **Always send the full conversation.** The Madysn failure, reversed.
- **Include all pre-snapshot user messages.** Would have rescued Roslyn's short requests, but is where pre-pivot contamination lives ("Chirag is a doctor, 42" was later changed). Left for a later look; the real fix for short requests is the concept-writing step carrying them, not the trigger.
- **Make the concept chat refuse to approve a concept that omits a pasted brief's key facts.** Right idea, bigger change, not done here.
- **Do nothing, refund.** Does not help the next customer.

## Consequences

- Orders with a pasted brief get a larger Parent input (up to about 50K more characters); `user_conversation` stores it, and re-fires still window it (`buildConversationExcerpt`).
- This does NOT make two-homicide stories possible. The generation pipeline has one victim, one murderer and an optional accomplice, fixed rounds, and no ghost phase; a canon like this one will come out as its closest single-murder form even with the full brief. The ADR records the input gap, not a capability.
- **Deployment is a separate step and has not been done** (git push does not deploy edge functions). It changes the live purchase path, so it waits for Jonathan's go. Verify after deploy with `get_edge_function` and `verify_jwt` preserved.
- Open: a reviewer finding rewrote a customer-requested phrase (see ADR-0103 Addendum 84); the reviewer has no access to the customer's verbatim requests.

## Key files

`supabase/functions/_shared/conversation-briefs.ts`, `supabase/functions/mystery-webhook-trigger/index.ts`, `scripts/__tests__/preSnapshotBriefs.test.mjs`, `package.json`, `.gitignore`.

## Discussion

The first instinct was to widen the thin-snapshot guard, since the customer's snapshot was only 1,100 characters over it. Checking what the guard falls back to showed it would trade one failure for the other; the question became what is safe to include from before the snapshot, and the answer was "what the customer wrote, if it is long", because that is the only thing the concept is a summary of. Whether to deploy now was left to Jonathan: it is the live purchase path, and the same order's regeneration depends on it.
