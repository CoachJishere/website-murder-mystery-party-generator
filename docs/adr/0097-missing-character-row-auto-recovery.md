# ADR-0097: extend `notify-generation-issue`'s auto-recovery to missing character rows, not just empty ones

- **Status:** Accepted
- **Date:** 2026-08-20
- **Related:** ADR-0094 (the row-count completion gate — explicitly deferred this exact gap in its Consequences section), ADR-0096 (missing-round-content gate, the same session's other closed gap), ADR-0085/0086 (the existing empty-character auto-recovery loop this ADR extends, not replaces)

## Context

Jonathan received a `notify-generation-issue` alert for The Staged Suicide Details mid-remediation (13 of 15 characters, `emptyCharacters: 0`) and asked the natural operational question: is manually checking with an AI agent every time one of these alerts arrives the intended workflow, or should the alert either not fire, or wait longer before firing?

Traced the actual behavior: `emptyCharacters` (both before and after ADR-0096) is computed by filtering **existing** `mystery_characters` rows — `chars.filter(...)`. A roster slot that was never inserted at all (the "Miles Porman"/"Lexi Grahmn" shape from the same incident, distinct from ADR-0096's "row exists but round content is empty" shape) simply isn't in `chars` and so can never appear in `emptyCharacters`, never gets offered to the auto-recovery loop, and the alert fires immediately and unconditionally — no grace period, because there's nothing for a grace period to wait on. This is exactly the gap ADR-0094's Consequences section named and explicitly deferred: *"once a package is correctly held at `needs_review` for missing (not just empty) characters, nothing regenerates the missing rows automatically... the recovery itself... remains a manual child-webhook re-fire."*

That gap is real and was, until now, a correct description of the system — which means the honest answer to "should I be checking manually" was **yes, for this specific defect shape**, because nothing else was going to fix it. The distinguishing signal was already visible in the email (`actualCharacters < expectedCharacters` with `emptyCharacters: 0` means missing rows, not empty ones) — but requiring a human to learn and apply that heuristic every time, rather than having the system just handle it, is the actual problem worth fixing.

## Decision

Extend the existing auto-recovery loop (same `CHILD_WEBHOOK`, same 2-attempt cap, same shared $10/day spend cap, same alert-suppression-while-recovering logic) to also cover names present in `extracted_characters` with **no** `mystery_characters` row at all, not just existing rows with incomplete content.

- Compute `missingCharacters` = names in `charDescriptions` (parsed from `extracted_characters`, already built earlier in the function for the empty-row path) not present in the `mystery_characters` result set, by name.
- Merge into one `recoveryTargets = [...emptyCharacters, ...missingCharacters]` list that feeds the single existing recovery loop — same webhook call, same caps, same everything.
- Log with a distinct `defect_class: "missing_character_row"` (vs `"empty_character_content"`) so the audit trail still shows which case each recovery actually was, and widen `characterAttemptsUsed`'s cap check to span both classes (a character can't dodge the 2-attempt cap by flipping between "missing" and "empty" across retries — unlikely in practice, but the cap should hold regardless of which shape a given retry takes).
- Widen the alert-suppression condition (`emptyCharacterRecoveryLooksClean`) from `emptyCharacters.length > 0` to `recoveryTargets.length > 0`, so missing-row recovery gets the exact same "don't page a human while auto-recovery still has budget left" grace period empty-row recovery already had. This is the change that actually answers Jonathan's question — from now on, a missing-row alert only reaches him if recovery genuinely couldn't fire, or exhausted its cap, same as the empty-row case already worked.
- Added a "Missing Characters (no row at all)" row to the alert email, alongside the existing "Empty Characters" row, so the two shapes stay visually distinguishable for anyone who does end up reading a still-escalated email.

## Rationale

- **Reuses, doesn't duplicate.** The webhook, the attempt cap, the spend cap, the cooldown, and the suppression logic all already existed and already worked for the empty-row case. This is name-matching (which expected names aren't in the actual set) plus routing into the same pipeline, not a new recovery mechanism — the same "one function, not two predicates" discipline this codebase keeps re-applying (ADR-0055/56/57/94/96).
- **Confirmed the underlying webhook already handles creation, not just update.** `CHILD_WEBHOOK`'s existing comment says "Make.com's v14 child uses searchRows so a re-fire UPDATEs the existing row in place" — for a genuinely missing row, `searchRows` finds nothing, and the same scenario falls through to create it, which is exactly how the original full generation creates every row in the first place (same webhook, same payload shape). Verified empirically this session: two missing rows (Miles Porman, Lexi Grahmn) were successfully re-fired and created via this exact webhook before this ADR's code fix even existed — this ADR automates a manual action already proven to work, not a new, untested path.
- **Distinct defect_class for accurate audit history**, not because the recovery mechanics differ, but because "was this row missing or just empty" is a meaningful distinction for anyone reading `auto_remediation_log` later (e.g. characterizing how often each failure shape actually occurs).

## Alternatives Considered

- **Delay the alert email by a fixed window regardless of recoverability**, per Jonathan's second suggested option. Rejected: a genuinely unrecoverable missing-row case (e.g. no description available, or already at the attempt cap) would just sit silently longer before paging a human, for no benefit — the existing suppression-while-recovering logic already delays exactly as long as recovery is actively still possible, and no longer. A blanket delay is a strictly worse version of the targeted suppression this ADR extends.
- **Suppress the alert entirely for this defect class.** Rejected: if a missing character genuinely can't be recovered (no description in `extracted_characters`, or the 2-attempt cap is exhausted), a human still needs to know — same reasoning ADR-0085/0086 already established for the empty-row case.

## Consequences

- **Positive:** closes the exact gap ADR-0094's Consequences section named as deferred. A future missing-character-row incident will self-heal automatically in the common case (description available, within cap, budget remaining) and only page a human when it genuinely can't, matching how the empty-row case already behaved.
- **Not addressed:** why rows go missing in the first place (Make.com parent/child ack-blindness, already traced in ADR-0093) — this closes the "nothing fixes it automatically once it happens" gap, not the upstream cause.
- **Verified via `deno`-equivalent syntax check** (esbuild transpile, `deno` itself unavailable in this session) before deploying; not verified against a live re-triggered incident post-deploy, since the incident that motivated this fix was already manually resolved before the code change landed.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — `missingCharacters` computation, `recoveryTargets` merge, `defect_class`-aware logging, widened attempt-cap check, widened suppression condition, new email row
- Manually proven before this ADR's code existed: package `b5d04ea8-1e21-41b3-8e78-2f712506469f` (The Staged Suicide Details), Miles Porman and Lexi Grahmn re-fired via the same `CHILD_WEBHOOK` and payload shape this ADR now automates
