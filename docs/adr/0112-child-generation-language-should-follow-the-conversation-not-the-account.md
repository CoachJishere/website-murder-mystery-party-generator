# 0112: Child-generation language should be detected from the conversation, not read from the account's `profiles.language`

## Status
Accepted — implemented 2026-08-29 (see Implementation note below)

## Date
2026-08-28

## Context

Sweep of rsappel17@gmail.com's "De Bittere Verjaardag: Moord In Villa Limoncello" (`eb0f3f1d-c404-49bb-8c7c-6daa135faa15`) found that all 14 delivered characters' full content (introductions, backgrounds, relationships, secrets, round scripts, accusations, final statements) was in English, while `game_overview`, `detective_script`, and `master_context` were correctly in Dutch — matching the customer's actual concept-chat language (every message in the conversation was in Dutch).

The two generation stages diverge because they resolve language differently:

- **Parent generation** (game_overview, detective_script, master_context) is built from `conversationContent` — the raw text of the customer's approved concept message(s) — and the model simply continues in whatever language that text is written in. No explicit language instruction needed or given; it works because the actual Dutch text is right there in the prompt.
- **Child generation** (all per-character content) resolves an explicit `language` parameter from `profiles.language` (`mystery-webhook-trigger/index.ts` lines ~822-838) and forwards a full language name (e.g. "Dutch") to every child-scenario Claude call. This was a deliberate fix (ADR-0093, 2026-08-19/20) for a *different* failure mode: the child prompt used to ask the model to *detect* the language from context, which broke whenever the conversation contained foreign-flavored proper nouns or a foreign setting (e.g. an English mystery set in a Spanish resort) — the model would sometimes generate in the wrong language despite the customer actually writing in English. Explicitly forwarding a resolved language name fixed that.

The gap: `profiles.language` is an account-level setting — most plausibly the language of the site UI the customer happened to be browsing at signup or in their profile settings — not a record of what language they actually typed their concept in during this specific conversation. This customer's profile read `"en"` (likely from browsing the English-language site) despite writing every single message in Dutch. Parent generation, which just follows the conversation's actual text, got it right. Child generation, which trusts the account flag instead, got it wrong for every one of the 14 characters.

This is functionally a second bug in the same family ADR-0093 was fixing (the child scenario producing content in the wrong language relative to what the customer actually wrote), just from the opposite direction: ADR-0093 fixed "model guesses wrong despite the account/conversation language being knowable," this is "the explicit signal itself doesn't reflect the conversation."

## Decision (proposed, not yet implemented)

Resolve child-generation language from the conversation's own detected language, with `profiles.language` as a fallback only when the conversation itself is inconclusive (e.g., very short, or genuinely mixed/ambiguous) — not as the primary signal. Two implementation shapes to choose between, deliberately left open pending Jonathan's input rather than picked here:

- **(a) Cheap heuristic reuse.** `mystery-webhook-trigger` already builds `conversationContent` (the approved concept message text) before calling the child scenario. Run the same "does this look like language X" signal parent generation implicitly relies on — e.g. a fast langdetect-style check, or a single cheap Claude Haiku classification call — against that same text, and use its result as the primary `languageName` input instead of the profile lookup.
- **(b) Structural consistency check instead of independent detection.** Since parent generation already reliably lands in the customer's actual language (this incident confirms it), read the language back out of the *already-generated* `game_overview`/`master_context` (which exist by the time child generation runs) rather than re-deriving it from raw conversation text a second time — guarantees parent and child can never disagree, by construction.

Either way, `profiles.language` moves from "the signal" to "the fallback when conversation-derived detection has no confident answer" (e.g., a conversation with too little natural-language text to classify).

## Rationale

- Parent generation is the existing proof that language-from-conversation is more reliable than language-from-account for this product: it has never needed an explicit language parameter and gets it right by construction.
- `profiles.language` reflects UI/account state that can legitimately diverge from a specific conversation's language — a customer can browse the English site and chat in Dutch, or vice versa, and nothing about that is unusual or malformed on their part.
- ADR-0093's original problem (foreign proper nouns confusing in-context detection) is real, but the fix traded one failure mode for a different one rather than closing the gap — it moved from "sometimes wrong when the model guesses from ambiguous context" to "reliably wrong whenever the account setting disagrees with the actual conversation," which is arguably a larger and more predictable failure surface for any multi-lingual site user.

## Alternatives Considered

- **Do nothing; treat this as a one-off (the customer's profile happened to say "en").** Rejected: the failure mode is structural (account setting vs. conversation content can diverge for any customer who browses the site in one language and writes concepts in another), not specific to this customer — it will recur.
- **Fix `profiles.language` itself to sync more aggressively from conversation activity.** Considered but likely worse: `profiles.language` is presumably also used elsewhere (transactional email locale, per `project_email_localization_may2026` memory) where the account-level UI-language meaning is probably the *correct* signal to use. Overwriting it from one conversation's content risks breaking those other uses instead of just fixing generation.

## Consequences

**Positive:**
- Removes a whole class of "package host content is in the wrong language" defects for customers whose account-level language setting doesn't match what they actually type.

**Negative:**
- Whichever detection approach is chosen adds either a dependency (langdetect-style library) or an extra Claude call (cheap, but non-zero cost and latency) to the generation critical path — needs Jonathan's sign-off given the "no paid API calls without explicit permission" standing rule extends to any new always-on spend, not just one-off scripts.
- Shape (b) (read language back from already-generated parent content) is architecturally cleaner but couples child generation's language resolution to parent generation having already run and produced usable text — needs to confirm this ordering is always guaranteed in the current pipeline before committing to it.

## Key files
- `supabase/functions/mystery-webhook-trigger/index.ts` (lines ~822-838, the `profiles.language` lookup; `conversationContent` construction nearby)
- `docs/adr/0093-explicit-language-parameter-for-child-generation.md` (the fix this proposal extends/corrects)

## Discussion

Found via ADR-0103's sweep ritual, not reported by a customer — the customer never saw a broken package (the sweep caught and fixed it before delivery). Flagged as a proposal rather than implemented directly per the project's "propose an ADR before code for non-trivial architectural changes" convention: this is a change to how language is resolved for every future non-English (or account-language-mismatched) customer, not a narrow bug patch, and the two implementation shapes above have real tradeoffs (cost/latency vs. an ordering dependency) that are Jonathan's call, not something to default silently.

## Implementation note (2026-08-29)

Picked shape **(a)**, not (b) — investigation before implementing found (b) was never actually a live choice. `mystery-webhook-trigger/index.ts` fires a single webhook to Make.com's Parent scenario and returns immediately; `game_overview`/`master_context` don't exist yet at that point (they're written later, inside Make.com's own run, by the Parent scenario itself, which only afterward chains to the Child scenario). The only place a "read language back from parent output" check could live is inside Make.com's blueprint (Parent's send-to-child modules, or the Child scenario itself querying the DB) — not something a change to this repo's edge function can do.

Even granting Jonathan's offer to import a redrafted blueprint (same draft-here/import-by-Jonathan workflow as ADR-0093), (b) still doesn't remove a detection step — it only changes what text gets detected (parent's already-correct output vs. the same `conversationContent` parent generation already relies on successfully today). Those are equivalent signals, since parent's own correctness already depends on `conversationContent` being reliable. Meanwhile (b) reintroduces exactly the failure class ADR-0093's Addenda 3–5 spent days debugging: a `language`-shaped field silently resolving wrong (there, empty) inside Make's multi-module blueprint chain. Given no reliability gain and real added risk, (a) was the clear choice.

Implemented in `supabase/functions/mystery-webhook-trigger/index.ts`:
- New `detectConversationLanguage(conversationContent)` function (added after the `LANGUAGE_NAMES`/`DEFAULT_LANGUAGE_NAME` constants): a single Claude Haiku (`claude-haiku-4-5-20251001`) classification call against a 3,000-character sample of `conversationContent`, constrained via `system` prompt to output only one of the 13 supported locale codes or `"unknown"`. Same raw-`fetch` + `ANTHROPIC_API_KEY` pattern already used by this file's `extractCharactersWithClaude`. Returns `null` on any failure (no API key, non-2xx, unparseable/unrecognized output) rather than throwing.
- The language-resolution block was moved from before `conversationContent` is built to after it (it needs that text as input), and reordered: `detectConversationLanguage(conversationContent)` is now the primary signal; `profiles.language` is consulted only when detection returns `null`; `DEFAULT_LANGUAGE_NAME` ("English") remains the final fallback when there's no `userId` either.
- Cost: one Haiku call per generation, ~500-1000 input tokens + ~10-20 output tokens ($1/$5 per MTok) — on the order of $0.001-0.002/generation. Approved by Jonathan 2026-08-29 given the standing no-paid-API-without-permission rule.

Deployed via `supabase functions deploy mystery-webhook-trigger --project-ref mhfikaomkmqcndqfohbp` (v131). Confirmed `verify_jwt: false` preserved post-deploy (unchanged from pre-deploy setting).

**Not done this session:** no live customer generation was re-run to verify detection accuracy end-to-end (e.g. a synthetic Dutch-language conversation through the real pipeline) — this fix has not yet been exercised against a real or synthetic non-English/account-mismatched customer since deploying. Recommend verifying on the next non-English sweep (ADR-0103) or a deliberate test conversation before considering this fully closed.

## Addendum (2026-08-29): this fix does not close every non-English-generation gap — a separate, confirmed template bug remains in evidence_cards

Jonathan asked directly whether this ADR made non-English generation systemically clean. It doesn't, fully — checking surfaced a genuinely separate bug this ADR doesn't touch: `regenerate-parent-content`'s evidence_cards prompt has a hardcoded English instructional line missing the `*[bracket]*` convention that lets every other stage direction in the same prompt survive translation intact (17 other instances correctly stay English in real non-English output; this one didn't, because it wasn't shaped the same way). This is the exact root cause of the mixed-language leak patched by hand in ADR-0103 Addendum 4. Fixed directly (added the missing brackets) — see CHANGELOG 2026-08-29 for the fix, deployment, and the matching live Make.com blueprint bug found and drafted (Jonathan imported the corrected "MM Live - Parent61" blueprint the same day) alongside it. That fix is unrelated to this ADR's language-*source* problem (account setting vs. conversation) — it's a language-*consistency* problem within a single generation call — but both surfaced from the same "does this actually work for the next non-English customer" question, so noting it here for anyone reading this ADR looking for the full picture.

Also confirmed while investigating: `regenerate-child-content` and `regenerate-parent-content` had no explicit language parameter at all, relying on already-in-language master_context/conversation/anchor-field text for implicit grounding (the same principle that makes parent generation reliable without one). Closed same day — see the second addendum below.

## Addendum 2 (2026-08-29): closed the `regenerate-child-content`/`regenerate-parent-content` gap too — not a Make.com change, zero added cost

Jonathan asked to tackle the remaining open item and whether it required a Make.com scenario update. It didn't — both functions are pure Supabase edge functions (the repair/regeneration safety net behind `auto-remediate-packages` and manual re-fires), no blueprint involved.

Fix: added an explicit language-consistency rule to each, grounded in text already present in their prompts (master_context for `regenerate-parent-content`, master_context + this character's own established fields for `regenerate-child-content`) — no new API call, no added cost.

Caught and corrected a mistake before deploying: the first draft of `regenerate-parent-content`'s rule read "translate everything, zero exceptions" — which would have broken the file's own already-correct, already-verified convention (20 `*[bracketed]*` stage directions meant to stay in English regardless of package language, the same convention the evidence_cards fix above relies on). Corrected to translate all prose while explicitly carving out that bracket convention. `regenerate-child-content` has no equivalent convention (its own brackets are fill-in placeholders per its existing `NO_META_TEXT` rule, not stage directions), so its rule is a plain blanket instruction with no carve-out needed.

Deployed: `regenerate-parent-content` v11, `regenerate-child-content` v11, `verify_jwt: true` preserved on both.

**Not done at the time:** neither fix was tested against a real or synthetic non-English regeneration. Closed same night — see Addendum 3.

## Addendum 3 (2026-08-29): full live verification, and one more real bug found in the process

Jonathan: "keep going and keep investigating and making fixes and running tests until you get this to 100%." Ran a real German test mystery through the complete initial-generation pipeline (concept → `mystery-webhook-trigger` → Make Parent → Make Child), with the account deliberately set to `profiles.language: "en"` to re-create the exact original bug scenario.

**First attempt surfaced a false alarm, not a bug.** Using a service-role bearer token to bypass the payment gate also bypasses `claim_package_for_generation` — the RPC that creates the initial `mystery_packages` row. With no row for Make's Parent scenario to find on its first search, all 21 of its `upsertARecord` steps (every one correctly, consistently referencing that same search result — a well-designed pattern) independently created a fresh row instead of updating one, and the run eventually hit a `[400]` DLQ failure before finishing. Traced fully via Make's API (execution logs, DLQ bundle inspection, full blueprint module trace) before concluding this was self-inflicted: real customers are never service-role-authenticated, so they always hit `claim_package_for_generation` first and never see this. Re-ran with the anon key (matching real customer auth, and unnecessary to bypass anyway since the test conversation already had `is_paid: true`) — completed cleanly in ~18 minutes, exactly one package row, full German content throughout, evidence_cards bracket convention intact, correct murderer role assignment matching master_context's selection.

**Closed the two other open items from Addendum 2's list:**
- `adapt-mystery-create` — read the actual code; it's purely eligibility-check + Stripe checkout, shares none of `adapt-mystery-apply`'s scrubbing logic. Nothing to fix.
- `mystery-ai`'s missing language directive on the dominant `MYSTERY_FREE_PROMPT` path (flagged as "open" in a concurrent session's memory note earlier tonight) — already fixed and deployed by that same session before this check (commit `ff3d8f5`, live as v174, confirmed via `git log` and `supabase functions list`).

**Found one more real, reproducible bug testing the repair path directly.** Built a minimal synthetic package (German master_context, one character with English placeholder content) and called `regenerate-child-content` directly — failed twice in a row with "Bad control character in string literal in JSON," a different bug than anything this ADR was about. Root cause: this file's own `parseJsonResponse()` repair pass only handles apostrophe/quote slips; it has no handling for raw literal newlines inside JSON string values, a failure shape `parse-claude-json` (a separate function) already fixed months ago via a proven `escapeControlCharsInStrings()` string-aware escaper that never got ported here — the standalone-function-drift pattern this codebase has hit before, just for JSON parsing instead of models or language. Ported the exact function. Deployed `regenerate-child-content` v12, `verify_jwt: true` preserved.

Re-verified after that fix: regenerating the character's `introduction` field correctly came back in fluent German — while the character's *other* field (`background`) was still the stale English placeholder, confirming the language rule genuinely prioritizes master_context over stale sibling content, not just correlation with already-correct fields. Separately called `regenerate-parent-content` directly (not via the Make blueprint) to regenerate `evidence_cards` from the same German master_context — fully German body text, bracket convention correctly preserved, independently confirming that fix too.

Re-checked the ADR-0103 corpus sweep for any `mystery_adaptations` activity since Addendum 5 — none.

**Status: every fix from this entire investigation (Recast's two bugs, this ADR's language-source fix, the evidence_cards bracket fix in both the edge function and the live Make blueprint, and both `regenerate-*` language rules) is now independently verified against real Claude output, not just deployed.** All test data created for these verifications was deleted afterward.

## Links
- Related: ADR-0093 (explicit language parameter for child generation — the fix this corrects a gap in), ADR-0103 Addenda 4 and 5 (the sweep findings that surfaced and systemically fixed this)
