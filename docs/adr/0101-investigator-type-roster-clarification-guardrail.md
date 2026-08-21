# ADR-0101: Concept chat clarifies investigator-type rosters before building them

- **Status:** Accepted
- **Date:** 2026-08-21
- **Related:** ADR-0095 (bracketless extracted-characters parse shape), ADR-0098 (Remove-a-Character incident, same customer session), ADR-0064 (roster-count guardrail — same append pattern reused here)

## Context

A customer designed a 27-player mystery concept in the free concept chat: 12 "investigator" characters (Homicide, Forensics, State Police, etc.) plus 15 real suspects. The chat built out full descriptions for all 27 and promised "full scripts... for all 27 players." The product's data model only supports `character_role` values `murderer`, `accomplice`, `suspect`, `redHerring` — there is no "investigator" role, and nothing in the generation pipeline produces individual content for that character type. The purchase broke and had to be manually rebuilt around just the 15 real suspects (ADR-0095 and the 2026-08-20 CHANGELOG entries have the full incident and rebuild).

The product already has a real mechanism for this: extra guests who play alongside the suspects, asking questions and roleplaying in character, but with no individually generated script, secret, or hidden identity — they're guests, not generated characters, the same mechanism `conversations.player_count` already accounts for (see ADR-0064's Discussion on guest headcount vs. character count being allowed to diverge). Nothing in the concept-chat system prompt told the model to reach for that mechanism instead of inventing a fictional "investigator" character type — the same class of gap ADR-0064 found and fixed for "optional/scalable characters," just a different invented framing.

## Decision

Added a fourth unconditional guardrail to `supabase/functions/mystery-ai/index.ts`, appended to `systemPrompt` after all branch logic runs — same placement and same reason as ADR-0064's two existing guardrails there (roster count, round count): `MYSTERY_FREE_PROMPT`, an opaque Supabase secret not in git, is the dominant production path for standard (non-intrigue) murder mysteries, so a fix that only touches the four inline templates would miss the majority of customers.

> CRITICAL: If the user's concept describes some players as detectives, investigators, police officers, forensics, or a similar investigating-professional role — presented as a DISTINCT character type from the suspects, not just flavor for how suspects behave (every mystery has "everyone plays amateur sleuths trying to solve it"; that alone is not this case) — pause before building or expanding any character list, even if this means one more exchange than the usual clarifying-question limit. Clarify warmly and briefly: every individually scripted character in this game is a SUSPECT, with their own secret, motive, and personal connection to the case — there is no separate "investigator" character type, and nothing generates a script, secret, or hidden identity for one. People who want to play detectives, police, or forensics instead join as extra co-investigator guests who roleplay the role and ask questions alongside everyone else, but without their own generated character — the same mechanism already used whenever a group is larger than the character list. Confirm how many of their players should be full scripted suspects versus co-investigator guests before generating or expanding any character list that mixes the two.

Deliberately scoped narrow: it targets concepts that propose investigator-type characters as a *distinct player category* (explicit professional-investigator framing applied to a subset of the roster), not mysteries where "detective" is just genre flavor for how every suspect behaves during play. The existing `format_guidance` block's single Inspector/Detective *host* rule (`mystery-ai/index.ts`) already covers the one-NPC case and was left untouched — this is a different failure mode (a whole invented character type, not a single host role leaking into the list).

## Rationale

- **Prevention only, no detector.** Unlike ADR-0064 (which paired its guardrail with `detect-roster-mismatches.mjs`), this failure mode is not currently detectable after the fact from stored data — a delivered package with all-suspect characters and a lower count than the chat conversation implied looks identical to a customer who simply changed their mind about player count. Building a detector would require parsing free-text chat history for investigator-type language, a much higher false-positive surface than ADR-0064's structural roster-count comparison. Deferred; if this recurs, worth revisiting.
- **Clarify early, before the list exists, rather than correcting after.** The original incident shows the damage is done once 27 full character descriptions exist and have been promised as "full scripts" — walking that back after the fact is a worse customer experience than asking one extra question up front. This is why the guardrail explicitly permits exceeding the chat's normal one-clarifying-question budget for this specific case.
- **Reuse the existing co-investigator mechanism rather than inventing new copy.** `conversations.player_count` already diverging from character count for exactly this reason (ADR-0064) meant the guardrail could point the model at a real, already-supported path instead of just saying "don't do that."

## Alternatives Considered

- **Regex/keyword detection in the edge function code** (mirroring the `hasExplicitPlayerCount` pattern already in the file) to conditionally include this instruction only when investigator language is detected, rather than appending it unconditionally on every turn. Rejected for consistency: the two existing guardrails in this same append block (roster count, round count) are unconditional text that the model only acts on when relevant, and that pattern is simpler to maintain than adding a fifth regex-driven branch to an already-dense conditional block.
- **Editing only the inline templates.** Rejected for the same reason ADR-0064 rejected it: `MYSTERY_FREE_PROMPT` is the dominant production path for standard murder mysteries and isn't editable from this file, so an inline-only fix would silently not run for most customers.

## Consequences

- Live chat behavior changes for every future customer whose concept proposes investigator-type characters as a distinct category — deployed with explicit owner approval (Jonathan, 2026-08-21) before shipping, per the standing rule that customer-facing prompt changes need a preview and sign-off.
- No automated test coverage exists for prose prompt content in this codebase (same limitation ADR-0064 noted) — verified by hand-authored transcript review, not a live API call, per the standing no-unapproved-metered-spend rule. Should be spot-checked against a real conversation next time an investigator-type concept comes through.
- If a customer insists on an investigator character type after the clarification, the guardrail tells the model to keep restating that individually generated characters can only be suspects — it does not attempt to build any partial/hybrid support for the role.

## Key files

- `supabase/functions/mystery-ai/index.ts` — new unconditional guardrail, appended after the roster-count and round-count guardrails from ADR-0064

## Discussion

The main design question was where in the conversation flow this should fire. The chat's existing `clarifying_question_decision` blocks (pre-concept and first-message branches) already budget "at most 2 questions total" before generating — adding a third, separate clarifying dimension there would have meant threading investigator-detection logic through multiple branches and reconciling it with an existing question-count cap written for a different purpose. Following ADR-0064's precedent — append unconditionally after all branch logic determines the base prompt — sidesteps that entirely: the instruction applies regardless of which branch or external prompt produced `systemPrompt`, explicitly overrides the question-count cap for this one case, and doesn't require modifying the four inline templates' own decision logic. The tradeoff is the same one ADR-0064 accepted: this guardrail can't be unit tested the way the parsing/detector code can, so its effectiveness rests on the model correctly judging "distinct investigator character type" vs. "detective is just flavor" from the instruction's own examples, verified here only by hand-reviewed transcripts rather than a test suite.
