# ADR-0067: Split the character-style "Final Statement" into a Final-Statements denial and a separate Reveal confession

- **Status:** Accepted
- **Date:** 2026-08-06
- **Related:** ADR-0064 (roster-count drift), ADR-0037 (round-intent hints, guard directive)

## Context

Raleigh (same customer as ADR-0063/0064, "Murder At Camp Pine Shadow") followed up: *"the character scripts have the final statement of the murderer as a confession so that would indicate no reveal... It sort of makes it so there's no reveal? Am I reading it wrong?"*

She was reading it exactly right. Checked her actual generated content plus 3 other paid, completed character-style packages — the pattern is systemic, not a one-off generation defect:

- Every character's `final_guilty`/`final_accomplice` field is headed `## FINAL STATEMENT`, matching the "Final Statements" round name exactly, and is a full, unconditional, first-person confession ("I did it. I poisoned Sky's smoothie...") with zero staging cue about timing.
- The AI-generated `detective_script`'s "THE REVEAL" section — the *next* round — is written as if the confession hasn't happened yet: *"I am asking you to confess... [The murderer (player) reads their confession aloud]."*

Two independently-generated pieces of content (the character's own script, and the detective's script) disagree about when the confession happens. Nothing tells a host or player to hold the character's "Final Statement" back — its own section header matches the round it would naturally be read in, which is one round too early.

Traced the root cause to the Make.com child blueprint's "Call 4: Guilty Scripts" prompt (`MM Live - Child (Unified)19...`): rounds 2-4 are explicitly instructed to deny ("admit motive/knowledge/opportunity but DENY committing murder"), but `finalGuilty`'s own schema description breaks that pattern: *"[3-4 paragraph confession revealing motive, method, timing — the dramatic reveal moment]"* — labeled "the dramatic reveal moment" despite being generated for the Final Statements round, one step before the actual Reveal. "Call 5: Accomplice Scripts" has the same shape (`finalAccomplice`: "reveal accomplice role only at the very end if at all").

Jonathan's bar for the fix: **no improvisation, ever, at any `script_type`.** A "figure out what to say when you get there" workaround was rejected outright — if a customer selects the full-script option, the character should always know exactly what to read and when, with nothing left to invent, even under point-form (which is "more" improvised by nature but should never be the *only* thing standing between a player and a blank moment).

## Decision

Split what was one overloaded field into two, each with an unambiguous single moment to be read:

1. **`final_guilty` / `final_accomplice` (repurposed, same column names):** becomes a proper scripted **denial** for the Final Statements round — structurally the same job `final_innocent` already does (stick to the cover story, deflect), just written for someone who is actually guilty. Read during "Final Statements," same as every other player, nothing withheld, nothing improvised.
2. **`reveal_confession_guilty` / `reveal_confession_accomplice` (new columns, + `_pointform` variants):** the actual scripted confession — full detail on motive, method, timing (guilty) or the helping role (accomplice) — used only when the Detective/Investigator specifically calls on that player during "The Reveal." This is exactly the moment the detective script's existing `[reads their confession aloud]` cue already expects; it just never had real content to point at before.

No innocent counterpart: innocent characters are never called on to confess, so there's no `reveal_confession_innocent`.

### What changed, concretely

- **Migration** `20260806_add_reveal_confession_fields.sql`: 4 new `mystery_characters` columns.
- **Make.com Child blueprint**, duplicated per project convention (`temp-files/`, always duplicate the current newest rather than edit in place): `MM Live - Child (Unified)19-...` → `MM Live - Child (Unified)20-RevealConfessionSplit.blueprint.json`.
  - "Call 4: Guilty Scripts" (`finalGuilty`): reworded to explicitly demand the same deny posture as rounds 2-4 ("NOT a confession... do not have the character admit guilt, describe the murder method, or break down"). Added `revealConfessionGuilty` to the output schema, carrying the original "dramatic reveal moment" confession instruction, explicitly scoped to "ONLY when the Detective specifically calls on this character during The Reveal."
  - "Call 5: Accomplice Scripts": same treatment for `finalAccomplice` / new `revealConfessionAccomplice`.
  - Both calls' Supabase upsert modules got the new mapper keys (`reveal_confession_guilty`/`reveal_confession_accomplice`).
  - `max_tokens` bumped 4000 → 5000 on both calls (headroom for the added field; JSON must complete cleanly per the prompt's own `critical_json_rules`).
- **Make.com Parent blueprint**, same duplication convention: `MM Live - Parent49 (...)` → `MM Live - Parent50 (Reveal-Confession Split).blueprint.json`. Verified via full structural diff (parsed-object comparison, not just byte diff) that only the two intended strings changed — a 4.5MB→2.8MB file size drop from the JSON re-serialization was confirmed to be a pure encoding/whitespace artifact, not data loss.
  - "Detective Script (R1)" (Character Based - Murder) and "Investigator Script (R3)" (Character Based - Intrigue) — the two routes generating `detective_script` for character-style mysteries — had their Final Statements narration softened: "or, if guilty, begin to crack" (which implied cracking might start here) → explicit framing that Final Statements is still denial for everyone, confession is saved for The Reveal. "THE REVEAL" section itself needed no change — it was already written correctly assuming the confession hadn't happened yet; the bug was entirely that nothing upstream honored that assumption.
  - Detective-style routes (0 and 2) were not touched — that format's culprit is predetermined and out of scope for this fix.
- **`generate-pointform-summaries` edge function:** added the two new fields to `ROLE_VARIANT_FIELDS`. No other change needed — the summarizer already reads whatever's populated on a character generically; adding the field names was sufficient for point-form coverage.
- **`MysteryPackageTabView.tsx`:** new fields rendered after `final_guilty`/`final_accomplice`, in Reveal position. `ROUND_INTENT` hints updated: `final_innocent`'s hint (shared display point for the character-style Final Statements block) no longer says "or, if you're guilty, make your confession"; new hints on the two `reveal_confession_*` fields state plainly they're read only if the Detective calls on that player, and only during The Reveal. `CHARACTER_FIELD_LABELS` and the `MysteryCharacter` interface got the new fields too.
- **Bonus fix, same code path:** `buildCharacterGuideContent` (the downloadable character-guide text) never included any `_accomplice` round script at all — a player who drew the accomplice slip got an incomplete download for rounds 2-4. Unrelated to this ticket but directly adjacent code already being touched; fixed in the same pass.
- **`HostGuideTemplate.tsx`:** the "Final Statements" round description and the "should NOT confess too early" hosting tip both got `isCharacterBased`-conditional rewording to state the two-stage structure explicitly, rather than leaving hosts to infer it. "THE REVEAL" line was already accurate and untouched.

### Explicitly out of scope

- **Backfill.** This fixes new generations only. Already-completed packages (Raleigh's included) keep the old single-confession structure until separately regenerated — a scoping decision for a follow-up, not resolved here.
- **Detective-style mysteries.** Predetermined-culprit games were not part of the reported confusion and weren't touched.
- **Deploying the blueprints live.** Both duplicated blueprints are staged in `temp-files/`, not yet imported/activated in Make.com — that's a separate deploy step.

## Rationale

- **Structural fix over instructional fix.** The obvious quick patch — tell hosts "save the guilty final statement for the reveal" — was available and rejected. It reproduces the exact failure this whole investigation started from: a host guide telling people to do something the generated character content doesn't actually support (per ADR-0064's finding that "optional characters" was an unbacked promise). A field that structurally can't be read at the wrong time beats an instruction hoping it won't be.
- **Mirrors `final_innocent`'s existing job rather than inventing a new shape.** The denial `final_guilty`/`final_accomplice` now perform is not a new content type — it's the same "defend your position" job innocent characters' final statement already does. Consistency with an existing, working pattern rather than a bespoke new mechanic.
- **The bug was already self-contradicting within its own prompt.** Call 4's own intro sentence says guilty scripts should be "85-90% similar to the innocent scripts... DENY committing murder" — `finalGuilty`'s own schema line broke that pattern it was introduced under. The fix makes the field consistent with the instruction already governing its siblings, not a new policy invented from scratch.

## Alternatives Considered

- **Reword only the character page's section header/timing note, keep one field.** Rejected per Jonathan's explicit instruction: this is exactly the "figure it out when you get there" pattern that requires improvisation, which the fix needed to eliminate entirely, not relabel.
- **Cut the "Final Statements" round for the guilty player, skip straight from Accusations to The Reveal for them.** Rejected: rounds are run live, together, as a group; silently skipping one player's turn in "Final Statements" would itself be a metagame tell (why didn't they get called on?).
- **Give the guilty player nothing to read during Final Statements, let them improvise a denial.** Rejected outright per Jonathan: "no improvisation, ever, even under point form."

## Consequences

- Character-style mysteries generated after this blueprint goes live get a genuinely two-beat structure: a scripted denial at Final Statements, a scripted confession at The Reveal — matching what the detective script already narrates.
- **Not yet live.** The edited blueprints exist only as local files in `temp-files/`; they need to be imported into Make.com and the scenario pointed at the new version before any real generation uses this fix. Until then, new character-style purchases still generate the old (buggy) structure.
- Existing packages (including Raleigh's) are unaffected by this change and still have the old confession-as-final-statement content; a backfill/regeneration decision is deferred.
- `max_tokens` increases on Calls 4/5 have a small per-generation cost implication (more output tokens allowed, not necessarily used) — not expected to be material given the packages already run well under the previous 4000 cap per the field sizes observed in production data.

## Key files

- `supabase/migrations/20260806_add_reveal_confession_fields.sql`
- `temp-files/MM Live - Child (Unified)20-RevealConfessionSplit.blueprint.json` (not yet deployed)
- `temp-files/MM Live - Parent50 (Reveal-Confession Split).blueprint.json` (not yet deployed)
- `supabase/functions/generate-pointform-summaries/index.ts`
- `src/components/MysteryPackageTabView.tsx`
- `src/components/HostGuideTemplate.tsx`
- `src/interfaces/mystery.ts`
- `src/services/mysteryPackageService.ts`

## Discussion

The investigation is worth recounting because the actual bug was one field's schema description drifting out of sync with its own module's stated intent — a smaller-scale instance of the "one concept expressed twice, updated independently" pattern ADR-0057 named at a bigger scale (chooser vs. reader; here, the intro sentence's "deny" instruction vs. the `finalGuilty` field's own contradicting "confession" instruction, inside the *same* prompt). It's a reminder that this class of drift isn't unique to code with two files — it happens within a single prompt when one field's description gets written for a purpose (in this case, seemingly authored under the assumption that "Final Statement" was the reveal moment) that the surrounding instructions never actually intended.

The `finalInnocent` field's existing description — "[3-4 paragraph emotional defense, theory about who really did it]" — was the model used for the new `finalGuilty`/`finalAccomplice` denial wording, deliberately kept parallel rather than reinvented, so a host reading three characters' Final Statements side by side gets a consistent tone regardless of which slip anyone actually drew.
