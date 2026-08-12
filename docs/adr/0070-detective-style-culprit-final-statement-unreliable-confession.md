# ADR-0070: Detective-style culprit final statements unreliably confess

- **Status:** Accepted
- **Date:** 2026-08-08
- **Related:** ADR-0067 (character-style final-statement/reveal split — explicitly did not touch this format), ADR-0041 (identity-conflict detector, same read-only-backlog pattern)

## Context

Customer support check on a specific paid order (`princesslea82886@gmail.com`, "Death At The Blackthorn Wedding", $24.99, purchased 2026-08-07) surfaced what first looked like the ADR-0067 bug: the murderer's `final_statement` was a full confession that named the accomplice, seemingly one round before the intended reveal. On investigation this package is `mystery_style = 'detective'` (predetermined-culprit format), which ADR-0067 explicitly did not touch — in this format, "Final Statements" *is* the reveal round by design (confirmed against `temp-files/MM Live - Child (Detective-Style).blueprint.json`: no separate "Reveal" round exists, and the murderer's `finalStatement` field is meant to branch via `[IF MURDERER]/[IF ACCOMPLICE]/[IF SUSPECT]` into a confession, an admission, or a denial respectively).

Comparing the actual generated content against that template turned up a different, real bug: the role-conditional branching is unreliable.

- **Header/staging-note branch never fires** (checked 15 packages, 15/15 failures): every murderer and accomplice statement uses the generic suspect header (`**YOUR FINAL STATEMENT**` / "Read this when called upon during final statements") instead of the template's `**YOUR CONFESSION**` / `**YOUR ADMISSION**` variants with their special timing notes. Two packages out of the full sample ("Murder At The Velvet Rose," "Murder In Candy Kingdom") *did* get the correct header, proving the branch can fire — it just doesn't reliably.
- **Content-level failure, more serious:** in a meaningful fraction of packages, the model doesn't just mislabel the header — the murderer's own `final_statement` content is a flat denial ("that's not me," "I would never," pointing suspicion elsewhere) instead of a confession. Since detective-style has no separate reveal round, a denial here means **the package ships with no scripted solution at all** — nothing in any character's printed material ever states who did it or how. In two read packages ("The Audit Anomaly," "The Case Of The Stolen Golden Flamingo") *neither* the murderer nor the accomplice confesses anything.
- A related variant: the murderer confesses correctly and explicitly names their accomplice by name, but the accomplice's own `final_statement` is a flat denial that contradicts the murderer's account in the same round (e.g. "Murder At The Coronation": murderer says "Scribe Inkwell provided lookout and helped stage the scene"; Scribe Inkwell's own statement: "That person is not me. I am a clerk... Nothing more.").

### Scope, quantified

Built a keyword heuristic (denial phrases present, confession/admission phrases absent — see the detector migration for exact patterns) and ran it against all 60 completed detective-style packages, excluding one pre-existing, unrelated, unpaid test package (`177a75ce-...`, "Death In The Spotlight," 25 characters with 15 tagged `murderer` and 9 tagged `accomplice` — a `character_role` assignment corruption, not a content bug, out of scope here).

**15 packages flagged, all paid, purchased 2026-04-22 through 2026-08-07** (i.e., this has been live for months, not a recent regression):
- 11 where the murderer's own final statement denies instead of confessing.
- 4 where the murderer confesses correctly but explicitly names an accomplice whose own final statement denies it.

Every flagged row was manually read in full to confirm against the heuristic. One flagged row ("Death At The Velvet Rose") is a confirmed false positive — Max Sullivan's statement is a genuine confession; the regex tripped on "I didn't kill O'Malley for pleasure, and I didn't kill Victor for pleasure," a denial-shaped clause embedded inside a confession. A parallel manual read for the false-negative direction found one confirmed miss ("Death At Thornfield Manor") where a genuine denial ("If I am guilty of anything, it is of being too trusting... But murder? No. That is not who I am.") was almost excluded by the coincidental phrase "I am guilty of" before the detector's confession-keyword list was narrowed. Net: roughly a quarter of paid detective-style packages carry this defect; the true count could be a few points higher or lower than 15 given heuristic limits on both sides.

## Decision

1. **Ship a permanent, read-only SQL detector** (`list_packages_with_unconfessed_culprit`, see companion migration) so this class of defect is visible going forward instead of only discoverable by a customer complaint or a manual audit like this one. Same pattern as the ADR-0041 identity-conflict detector: heuristic, escalate-only, no status mutation, meant to be read by a human before any action is taken.
2. **Root-cause fix (Make.com detective-style blueprint prompt) and customer remediation (the 14-15 already-affected paid packages) are explicitly deferred to follow-up work**, not resolved by this ADR. This ADR's job is diagnosis, quantification, and making the defect durably visible — matching the ADR-0067 precedent of separating "we understand and can detect this" from "we have shipped the fix and backfilled."

## Rationale

- **Detect before fix, same as every other detector in this codebase** (ADR-0016, ADR-0041, ADR-0055): a backlog function ships fast and starts paying down risk immediately, while the actual prompt fix (which touches a live Make.com blueprint used by every detective-style generation) deserves its own scoped change and testing pass rather than being rushed alongside the investigation that found it.
- **Heuristic, not perfect, and that's an accepted tradeoff**: exact natural-language confession-vs-denial classification isn't something a regex can do with 100% precision. The identity-conflict detector (ADR-0041) already established the precedent in this codebase of shipping a keyword heuristic with a documented false-positive/negative rate rather than blocking on unattainable precision — this detector follows the same bar, and is escalate-only (a human reads the flagged `final_statement` before acting), so the cost of an occasional false positive is low.

## Alternatives Considered

- **Skip the detector, go straight to the blueprint fix.** Rejected: the blueprint fix needs its own investigation (why does the branch fire correctly ~75% of the time and not the rest — is it a prompt-clarity issue like ADR-0067's, or model non-determinism that a stronger prompt can't fully eliminate?) and shouldn't block on that before at least being able to see the problem going forward.
- **Build an LLM-judge detector instead of a keyword heuristic** for higher accuracy. Rejected for now: matches project precedent (existing detectors are all keyword/structural heuristics, not LLM calls) and keeps the detector free to run in the health-check workflow without incurring API cost or a paid-API permission ask.

## Consequences

- **Positive:** this defect class — a detective-style package shipping with no working reveal — is now visible via a callable function instead of requiring another manual audit like this one to rediscover it.
- **Negative / open:** the 14-15 already-affected paying customers are not yet remediated by this ADR. Anyone who already ran their event may have hit a dead end at the reveal moment with no guidance in their materials.
- **Negative / open:** the underlying Make.com "MM Live - Child (Detective-Style)" blueprint prompt is unchanged — new detective-style purchases will keep hitting this at roughly the same rate until the prompt is fixed.
- **Neutral:** the false-positive/false-negative rate of the heuristic (documented above and in the migration file) means the detector's count is a signal to investigate, not an exact affected-customer count — each hit should be read, not auto-acted-on.

## Key files

- `supabase/migrations/<timestamp>_detect_unconfessed_detective_culprit.sql` (companion migration, `list_packages_with_unconfessed_culprit`)
- `temp-files/MM Live - Child (Detective-Style).blueprint.json` (root cause, not yet fixed)
- `docs/adr/0067-split-final-statement-into-denial-and-reveal-confession.md` (sibling bug in the other format, for comparison)

## Discussion

The instinct on first read was to assume this was the ADR-0067 bug recurring — same round name ("Final Statements"), same shape of symptom (murderer's own material undermines the intended reveal timing). It wasn't; it turned out to be a different defect in a different game format with a structurally different round design, and conflating the two would have led to a wrong fix (there's no "reveal_confession" split to build here — detective-style never had two rounds to desynchronize in the first place). The lesson generalizes: "looks like a bug we already have an ADR for" is a hypothesis to verify against the actual blueprint/schema for the specific format in play, not a conclusion to act on — `mystery_style` silently forks two very different generation pipelines that happen to produce content under the same column names (`final_statement` etc.), and a fix scoped to one can be entirely inapplicable, or actively wrong, for the other.

The quantification step (checking all 60 packages instead of stopping at "yes, your specific customer's package is broken") is what turned this from a one-customer support answer into something worth an ADR: a single anecdote could have been a one-off generation fluke, but a ~25% hit rate spanning four months of purchases is a standing defect that will keep affecting new customers until the prompt itself is fixed.

## Update 2026-08-11: root-cause fix location was wrong — corrected

Jonathan clarified the live wiring: Parent calls exactly one webhook for all 4 routes, and that webhook is `Child (Unified)`, not `Child (Detective-Style)`. Confirmed independently in this ADR's own thread and, separately, in the same day's ADR-0074 Sonnet-5-upgrade correction — two different investigations landed on the same fact. `Child (Detective-Style)` is a pre-unification leftover (see "Child Scenario Unification & Parent Fix", Apr 2026) that nothing live calls. The blueprint fix staged against it (`Child (Detective-Style)2/3`) does nothing for production and should not be imported.

`Child (Unified)` turns out to carry its own, independently-written detective-style prompt track (modules 401/405/409, "Call 1-3") — never derived from or kept in sync with the standalone file. The real root cause lives in module 409 ("Call 3: Round Scripts"), the only call that outputs `finalStatement`, and it's more precise than this ADR's original "Rounds 2-4 lying-momentum" theory:

1. `content_coherence_rules`'s ACCOMPLICE COHERENCE rule: "NEVER script the accomplice to accuse, incriminate, or turn on the murderer in any round" — no exception for `finalStatement`. A standing instruction against the accomplice ever admitting anything, with nothing scoping it away from the one field where it needs to not apply.
2. The `finalStatement` schema field's bracketed guidance names murderer and "innocents" only — accomplice behavior there is never specified at all, so it falls through to defect (1) with nothing to override it.

Together these fully explain the "murderer confesses and names the accomplice, accomplice denies it anyway" pattern this ADR found — more directly than the original theory, and without requiring a "does the model even see this file" assumption that turned out false.

**Fix shipped as `Child (Unified)25-DetectiveFinalStatementFix`** (built on `24-PreParseDelay`, the newest at the time; verified via structural diff to touch only module 409, nothing else in the file): the ACCOMPLICE COHERENCE rule now scopes its "never turn on the murderer" instruction to Rounds 2-4 explicitly and states the reverse for `finalStatement`; the `finalStatement` schema field now gives murderer/accomplice/suspect each explicit, separate guidance; added a post-schema self-check instruction (re-read your own `finalStatement` for denial language before finishing), same technique ADR-0067 used. **Not yet imported into Make.com.**

Unaffected by this correction: the detector (`list_packages_with_unconfessed_culprit`) and the 14 hand-patched paid packages — both are independent of which blueprint file generates future content.

**Key files, corrected:**
- `temp-files/MM Live - Child (Unified)25-DetectiveFinalStatementFix.blueprint.json` — actual root-cause fix (not yet imported)
- ~~`temp-files/MM Live - Child (Detective-Style)*.blueprint.json`~~ — dead code, not invoked by anything live, no further changes needed here

Same lesson as this ADR's own Discussion section, one layer deeper: confirming a file *exists* and *matches the symptom* is not the same as confirming it's the file actually running in production. The fix for that isn't "read more carefully" — it's "ask which webhook is live before editing," which is now the standing instructions.

## Update 2026-08-11 (later same day): live-tested, one regression found and fixed, now verified working

Tested `Child (Unified)25` end-to-end by calling the child webhook directly against a disposable test package (`is_test=true`, never a real customer — `f0f0fa7a-...`, conversation `a84fde72-...`), with a 3-character detective mystery (Vivian Cross/murderer, Tom Reyes/accomplice, Nora Blake/red herring).

**First result: the two content fixes worked, but Call 3 started failing to parse for both characters.** Both `parse-claude-json` calls returned 422 ("Unterminated string in JSON"). Pulled the raw Anthropic response directly from Make's execution log for both characters: in both cases the JSON was missing its closing `"}` — cut off immediately after a complete, well-formed final sentence, with `stop_reason: "end_turn"` (not `max_tokens`, so not a token-budget truncation). The actual `finalStatement` content itself, as far as it went, was correct in both cases (Vivian's read as a genuine confession in progress, Tom's as a genuine admission in progress) — the fix's actual target was working, but something was stopping the model from emitting the closing JSON syntax.

**Root cause: the post-schema self-check instruction I'd added** ("before finalizing, re-read this character's own finalStatement... rewrite it if needed") — an extra review/possible-rewrite step positioned at the exact point the model needed to instead close out a long JSON object. Working theory: the model treats the self-check as the last task, satisfies it internally, and never returns to emit the closing punctuation. 2-for-2 failure rate across both characters, not consistent with random flakiness.

**Fix: `Child (Unified)26-DropSelfCheckTruncationFix`**, built on 25, verified via structural diff to touch only this one instruction: replaced the self-check with a plain instruction to close the string and object immediately after writing `finalStatement`, with no review/rewrite step. Re-tested against the same two characters — both landed cleanly (`round2_script` through `final_statement` all populated), and the content is exactly right: Vivian's `final_statement` is a full confession naming Tom's specific help; Tom's is a full admission naming Vivian as the killer, explicitly not a denial.

**`Child (Unified)26` is the version to import/keep live**, not 25 — 25 has the truncation regression. The two actual root-cause fixes (ACCOMPLICE COHERENCE carve-out, `finalStatement` schema role guidance) are unchanged from 25 and confirmed working by this test.

**Not fixed, noted for awareness, not blocking:** the `finalStatement` header in this Unified prompt has always been the generic `**YOUR FINAL STATEMENT**` for every role (no conditional header logic exists in this call, unlike the old standalone file) — cosmetic staging-note gap, not the content bug this ADR is about. Could be a small follow-up.

**Test data:** the disposable test package/conversation (`is_test=true`) is left in place for reference rather than deleted — excluded from all detectors and customer-facing views by the existing `is_test` mechanism (ADR-0072).

## Update 2026-08-12: `Child (Unified)26` confirmed live; one real backlog bug found and fixed, one false-positive backlog entry corrected

The scheduled health check flagged 2 packages: "The Case Of The Stolen Golden Flamingo" (`accomplice_denies_despite_named`, Marina Splash) and "Ghosts Of The Past: A Halloween Reunion Murder" (`accomplice_denies_despite_named`, Parker/Petra Wolfe). Investigating both surfaced three things worth recording.

**1. `Child (Unified)26` is confirmed live in production, not just live-tested.** The same day's incident, "Contamination: Death At The Infection Control Expo" (customer `chelseagirrior@gmail.com`), was a fresh detective-style package generated 2026-08-12 — its murderer (Sage Malhotra) and named accomplice (Devon Cross) both read as genuine, correctly-branched confession/admission pairs (Devon: *"I helped Sage that morning... I created the window, and I hid the evidence, and Chelsea is dead because of choices I helped make possible."*). This is exactly what the 25/26 fix targeted, working correctly on live traffic, closing the "not yet imported" uncertainty this ADR's history left open. (The cosmetic gap — generic `**YOUR FINAL STATEMENT**` header for every role — is still present, unchanged, still not blocking.) The `docs/generation-guardrails.md` import ledger never got a row for this fix; added one below so this confirmation is discoverable without re-deriving it.

**2. "The Case Of The Stolen Golden Flamingo" was a real, unpatched bug — not one of the "documented false positives" the 2026-08-11 changelog entry assumed.** That entry, wiring this detector into health-check, said it "re-verified the detector still returns the same 3 known rows (the documented false positives)" without actually re-reading each one — an assumption, not a verification, of exactly the kind [[project_stale_snapshot_never_recaptures]] already warns about. Marina Splash's `final_statement` was a flat, unambiguous denial ("I didn't steal the Flamingo... that's something I would never do") directly contradicting the murderer Coconut Chris's own confession, which named her specifically: *"Marina helped me get it out of there; she thought we were building a story together. She didn't know the whole truth going in, and that's on me, not her."* This package is one of the original 15 flagged in this ADR's initial audit (created 2026-08-01, inside the audit's scope) — Chris's statement shows signs of already being hand-patched (proper `**YOUR CONFESSION**` header, polished prose matching the other 14 patches), but Marina's wasn't, making this very likely the "1 of 15" the original hand-patch pass missed. **Hand-patched in place** to an in-character admission consistent with Chris's account (she helped move the statue believing it was for a viral "discovery" moment, didn't know about the insurance angle or that it was a real theft for profit) — same template (`**YOUR ADMISSION**` / *"Read this after the murderer confesses"*) used for the other 14.

**3. "Ghosts Of The Past" is a confirmed false positive — a new instance of the same class this ADR already documented for "Death At The Velvet Rose."** Parker/Petra Wolfe's `final_statement` is a genuine, unambiguous admission of conspiracy (*"I worked with someone who did... I was the one who made it possible. And I would do it again."*), not a denial. The detector's denial regex matched the clause "But I didn't kill Reese/Raven" (literally true — Riley did the killing — but embedded inside a confession), and none of the confession-keyword exclusions happened to match Parker's specific phrasing ("I worked with," "we planned," "I made it possible" vs. the regex's "I helped," "I admit," "I provided," etc.). Consistent with this ADR's original rationale (keyword heuristic, not perfect, escalate-only, human reads before acting) — not a case for expanding the regex further.

**Systemic gap closed:** the acknowledgment mechanism built 2026-08-11 (`acknowledged_health_alerts`) was, per its own migration comment, supposed to be honored by every detector — but only the roster-mismatch script (check 12) actually queried it. `list_packages_with_unconfessed_culprit` (check 14) never did, so both this ADR's own known false positive (Velvet Rose) and any new one (Ghosts Of The Past) would have kept re-alerting every 6 hours for as long as they stayed inside the detector's 30-day window, rather than being silenceable like check 12's findings. Fixed: the function now excludes any `package_id` acknowledged for `detector = 'unconfessed_culprit'`; both Velvet Rose and Ghosts Of The Past are now acknowledged with notes. See `supabase/migrations/20260812_unconfessed_culprit_honor_acknowledged_alerts.sql`.

**Key files, this update:**
- `supabase/migrations/20260812_unconfessed_culprit_honor_acknowledged_alerts.sql` — acknowledgment-honoring `CREATE OR REPLACE`, 2 new acknowledgment rows
- Hand-patch applied directly via SQL `UPDATE` to `mystery_characters.final_statement` for Marina Splash (package `33671764-71f9-488a-bed7-9afc712b0051`)
