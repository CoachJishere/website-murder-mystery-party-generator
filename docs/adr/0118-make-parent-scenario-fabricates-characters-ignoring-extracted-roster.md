# ADR-0118: Make.com parent scenario fabricated 4 of 11 characters instead of using the extracted, customer-approved roster

- **Status:** Accepted (customer package hand-fixed; root cause is outside this repo, not yet fixed)
- **Date:** 2026-09-04
- **Related:** ADR-0068/0057/0110/0069/0059 (roster extraction hardening — confirmed NOT the cause here), ADR-0009 (concept chat is ground truth, not the `additional_details` form field), `project_round_count_not_configurable` memory (a related but distinct known gap: `additional_details` never reaching `mystery-webhook-trigger` at all)

## Context

Customer purchase notification for conversation `bf336652-6bff-40de-83ca-836e24470c4e` ("The Hollingsworth Estate," $19.99, Stripe payment `pi_3UBwNJKgSd73ikMW1CG40q31`, succeeded) flagged `needs_review` with an "Empty Characters: Marcus Thorne" / "Auto-Recovery Capped" alert. The customer (Shaun) separately emailed: he had designed an 11-character roster during the concept chat and received 10 of 11 correctly, but "the hunter was changed to a priest."

Investigating the DB directly showed the actual defect was larger than either signal alone suggested: **4 of the 11 delivered characters were fabricated identities that appear nowhere in any of the conversation's 79 messages**, not just the one the customer happened to notice:

| Wrong delivered character | Should have been (customer's approved concept, message `6c8f583a...`) |
|---|---|
| Isabelle Nightshade (vampire) | Adrienne Fairweather (vampire, ambitious, overshadowed) |
| Marcus Thorne (vampire) | William Gray (vampire, forced turn, refuses human blood, secretly frees others from pacts) |
| Father Matthias (priest) | Cole Voss (monster hunter — this is what the customer flagged) |
| Holloway's Assistant (lab aide) | Everett Moss (werewolf, sycophant trying to outshine the pack leader) |

The remaining 7 characters (Cleopatra, Cornelius Ashgrave, Dr. Victor Holloway, Raven, the Werewolf/Julian Harwell, the Ghost/Marcus Sinclair, and the Zombie/Wren Sorrel) were correct. Two of those seven — the Ghost and the zombie's "Wren Sorrel" naming — initially looked like additional bugs (the customer's rough `additional_details` draft had specified a banshee named Wren Sorrel with no ghost at all) but turned out to be legitimate outcomes of the customer's own concept-chat refinement: the approved final concept (message `6c8f583a-34ba-467e-96fb-80fc54d0a2e2`, sent 2026-09-04 12:14:50, the assistant's "here's the complete concept, fully assembled" message) explicitly reassigns Wren Sorrel to the zombie and introduces "Marcus/Marcella Sinclair" as the ghost. Those are correct, not corrupted — worth noting because it's easy to over-flag "doesn't match the customer's first draft" as a bug when the concept chat legitimately evolved it since then.

**Confirming this is not the already-hardened extraction code in this repo:** `mystery-webhook-trigger/index.ts`'s `extractCharactersFromMessages`/`extractRosterFromMessage` (hardened by ADR-0068/0057/0110/0069/0059) would have picked up the correct, mostly-accurate roster from message `6c8f583a...` had it been used as the source. Instead, `approved_concept_message_id` pointed at a later, unrelated message (about the murder weapon) with no roster at all — `snapshotTooThin` correctly detected this and should have pulled the fuller transcript, which does contain the right roster.

**Smoking gun for where the fabrication actually happened:** `mystery_packages.extracted_characters` (the field populated at generation time and read by `notify-generation-issue`'s recovery path) already contains the fabricated cast — including a description for the "Werewolf" slot reading *"Moss-covered beast cursed by an ancient pact"*, a corrupted misreading of "Everett/Evangeline **Moss**" (a guest's surname) as a physical description of the werewolf. This field is populated by Make.com's parent scenario, which received the extracted roster and the transcript as hints but evidently treated them as loose inspiration rather than ground truth, inventing new characters for 4 of 11 slots. That prompt lives in the Make.com blueprint, not this repo, and was not accessible/fixable from this session (no Make.com tool access here).

**A secondary, smaller finding that turned out NOT to be a bug:** `auto_remediation_log` showed two "escalated" outcomes for Marcus Thorne and one for Holloway's Assistant, and content changed ~30 seconds after the second "escalated" row — initially this looked like a hidden fallback-write-after-giving-up bug. It is not. Per `notify-generation-issue/index.ts:491`, every dispatch to the Make.com `CHILD_WEBHOOK` is unconditionally logged `outcome: "escalated"` on send — the log's semantics are "dispatched, fire-and-forget, next sweep confirms" (comment at line 330-331), not "gave up." The content appearing shortly after is the designed async flow, not a hidden second attempt. It replayed the same wrong `extracted_characters` entry it was given, faithfully — the recovery system isn't at fault here, it just inherited the bad seed.

## Decision

1. **Hand-wrote full replacement content** for the 4 wrong characters (background, secret, relationships, introduction, rumors, round 2-4 questions + innocent/guilty branches + pointform mirrors, final statement + branches, accusations, reveal-confession) directly via SQL, matching the schema/tone of the 7 correct characters. This was written by Claude in-conversation (not a separate metered API call) using the customer's approved concept-chat roster and the rich cross-references the other 7 correct characters already made to these 4 identities by name (rumors and round-questions already addressed "William Gray," "Adrienne Fairweather," "Everett Moss," and "Cole Voss" as real characters — those names just didn't have character cards to answer to, which was a harder-blocking bug than cosmetic mismatch: players would have hit a dead end asking a question addressed to someone not in their character set).
2. **Corrected `mystery_packages.extracted_characters`** to the true roster, so any future auto-recovery cycle on this package pulls the right identity instead of re-propagating the fabrication.
3. **Verified clean**: `package_completion_blocking_defects()` returns null; `list_packages_with_meta_text_leak()` and `list_packages_with_victim_mismatch()` return no rows for this package; no character content references the 4 old fabricated names (confirmed before the fix, so no cross-character scrub was needed).
4. **Package status flipped** to `completed`; `conversations.has_complete_package`/`is_completed` set true.
5. Did **not** attempt to fix the Make.com blueprint itself — outside this repo, no tool access to it in this session. Flagged as open work below.

## Rationale

- Neither existing productized tool fit this repair. The "Remove a Character" feature (`adapt-mystery-apply`) only deletes a character (and reassigns guilt if forced) — it cannot add a correct replacement back, so it can't restore a customer to their paid player count. `regenerate-child-content`/`regenerate-parent-content` explicitly whitelist writable fields and exclude `character_name`/`character_role` — they can polish existing identity, not redefine it. Building new tooling for a single-incident repair wasn't justified; hand-writing matched content was faster and lower-risk than extending either function's scope.
- Confirmed via SQL before writing anything that none of the 7 correct characters, nor `game_overview`/`detective_script`/`evidence_cards`, referenced the 4 wrong fabricated names — meaning no cross-character scrub of stale references was needed, which significantly de-risked a hand-patch versus a full regenerate.
- A full package regenerate was considered and rejected for now: re-triggering generation without first fixing the Make.com parent prompt would likely just fabricate a *different* wrong cast, since the root cause (the parent scenario ignoring its own extracted-roster hint) is still live.

## Alternatives Considered

- **Re-trigger full generation via `mystery-webhook-trigger`.** Rejected for immediate use — the underlying Make.com prompt bug that caused this is still present; regenerating now carries real risk of producing a different fabricated cast rather than a fix.
- **Use `adapt-mystery-apply`'s removal+reassignment flow to delete the 4 wrong characters.** Rejected — this tool only removes; it has no mechanism to add 4 correctly-named replacements back, which would leave the customer with 7 characters against an 11-player purchase.
- **Ask Jonathan to fix the Make.com blueprint first, hold the customer fix until then.** Rejected for this incident given explicit direction to get the customer sorted first and investigate systemic risk after — the customer had a live, playable-but-wrong package sitting in `needs_review` for hours.

## Consequences

- Shaun's package now has the correct 11-character roster with full, cross-consistent content. Not yet re-verified by the customer or by an actual full playtest — worth a spot-check if he responds again.
- **The actual root cause is still open and unfixed.** Whatever step in the Make.com parent scenario populates `extracted_characters`/the initial character cast needs review — it's fabricating identities instead of treating extracted roster hints as authoritative. This session had no Make.com tool access to inspect or patch the blueprint directly.
- **Scope check performed:** searched all of `mystery_characters` for the 4 fabricated names and the "secretly building a rival faction" boilerplate phrase. Found only this package's 4 rows, plus one unrelated, coincidental "Marcus Thorne" in an unrelated April 2026 package with a different theme (not evidence of a shared template — different content entirely). This looks like an isolated incident, not an active mass-defect, but the underlying mechanism (a Make.com LLM step overriding structured hints) could recur on any future order and has no detector watching for it specifically — existing detectors (`list_packages_with_meta_text_leak`, `list_packages_with_victim_mismatch`, `list_packages_with_unresolved_victim_name`) don't check "does this character's name appear anywhere in the source conversation," which is the actual signature of this bug class.
- No new detector was built for "character name absent from source transcript" — flagged as a candidate follow-up, not built here (single incident, uncertain recurrence rate, would need care to avoid false positives on names the concept chat itself invented mid-conversation, like "Marcus Sinclair" was for the Ghost).
- The pre-existing `notify-generation-issue` "escalated" log label is misleading in isolation (reads as failure, actually means "dispatched") — not changed here since it's working as designed, but worth knowing when reading `auto_remediation_log` in future sweeps: an "escalated" `regenerate_character:X` row followed shortly by an `updated_at` bump on that character is the normal successful path, not a hidden fallback.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — roster extraction (confirmed correct, not the cause)
- `supabase/functions/notify-generation-issue/index.ts` — auto-recovery dispatch to Make.com `CHILD_WEBHOOK`, reads `mystery_packages.extracted_characters` as the sole identity source, cannot override an existing-but-wrong row's identity
- `supabase/functions/adapt-mystery-apply/index.ts`, `supabase/functions/regenerate-child-content/index.ts`, `supabase/functions/regenerate-parent-content/index.ts` — evaluated and ruled out as fix vehicles
- Make.com "parent" scenario blueprint (not in this repo) — actual root cause, not inspected this session

## Discussion

The investigation went through several false leads before landing on the real cause, worth recording since each one changed the estimated scope:

1. First pass (DB-only) suggested 4 wrong characters — correct in the end, but arrived at via a wrong intermediate theory (assumed the original `additional_details` roster was ground truth throughout).
2. A repo-wide trace confirmed this repo's roster extraction is not at fault, and surfaced that the actual `approved_concept_message_id` pointed at the wrong (rosterless) message — but `snapshotTooThin` should have compensated for that, so this alone doesn't explain the fabrication.
3. Reading the full concept-chat roster message revealed two of the "wrong-looking" characters (Ghost, Zombie/Wren Sorrel) were actually correct per the customer's own approved refinement — inflating the apparent scope to 6 wrong characters before this was caught. Cross-referencing every other character's rumors/questions (which already named Gray/Fairweather/Moss/Voss correctly) both caught this error and confirmed the true scope was 4.
4. `mystery_packages.extracted_characters` — checked almost as an afterthought — turned out to contain the smoking gun (the "Moss-covered beast" corruption), which is the strongest evidence of exactly where the fabrication happens (a Make.com LLM step, not this repo's deterministic extraction).

Jonathan's framing throughout was right to insist on this order: get the customer correctly sorted first using the tool that's actually needed (not whichever tool was assumed at the start — this feature was called "Recast" until ADR-0091 renamed it to "Remove a Character" on 2026-08-17, and regardless of name it turned out to be the wrong tool shape for this repair), then treat the systemic Make.com investigation as separate follow-up work rather than blocking the customer fix on it.
