# ADR-0075: Autonomous fix-and-verify loop for health-check detector false positives

- **Status:** Proposed
- **Date:** 2026-08-11
- **Related:** ADR-0051 (shift-left generation integrity, the closed-loop precedent this borrows from), ADR-0061 (wire child-content regenerator into closed loop), ADR-0064/0068 (roster-count detector + its parser dependency), ADR-0067/0070 (final-statement confession-leak detectors, both hit false positives this same day)

## Context

One morning's health-check run (`.github/workflows/health-check.yml` on issue #3) produced four alerts. All four were manually triaged in the same session. Three turned out to be **detector/pipeline bugs, not customer-content bugs**:

1. **Roster mismatch, "The Host Herself" (approved=11, actual=12).** The ADR-0063/ADR-0068 parser fix had been written, tested, and documented as shipped in `CHANGELOG.md` — but the actual code (`supabase/functions/mystery-webhook-trigger/index.ts`, its regression test, and the ADR files themselves) had never been committed to `main`. CI kept re-parsing the approved snapshot with the old, pre-fix regex and finding a phantom mismatch against an already-correctly-delivered package. Separately, the fixed source had also never been deployed to the live Supabase edge function, even though `main` said otherwise — two different "documented as done, not actually done" gaps in the same incident.
2. **Confession leak, two packages.** `list_packages_with_final_statement_confession_leak`'s regex had no negation guard, so it matched a confession phrase embedded inside a denial ("...doesn't mean I poisoned anyone"). Both flagged rows were correct, in-character denials.
3. **Roster mismatch, "Death At The Birthday Bash" (approved=22 portion).** The parser counted two AI-invented placeholder lines (`[RESERVE CHARACTER - Brian's Alternate]`) as real characters.

The fourth alert (Birthday Bash's underlying 20-vs-17 character gap) was a **judgment call**, not a mechanical bug: whether three real, named, explicitly-requested party guests were missing content from an already-delivered, already-paid package, requiring an assessment of customer impact with no clean automated signal (see the 2026-08-11 CHANGELOG entry — resolved by checking whether the customer had already been contacted, not by re-running a parser).

All three mechanical cases shared a common verification property: **the flagged row's real database content is ground truth, and re-running the current (or a proposed) piece of logic against it produces a single unambiguous, checkable answer.** There is no interpretation required — either the count matches or it doesn't, either the regex still fires on the real string or it doesn't. This is a categorically different situation from the fourth alert, where "is this actually a problem" cannot be derived from data alone.

This ADR proposes closing the loop on the first category only, reusing the pattern this codebase already runs in production for content defects (ADR-0051/0061: detect → claim → fix → re-verify → release, bounded by a spend cap, logged for audit) — applied one layer up, to the health-check's own findings about its detectors and pipeline code, never to delivered customer content.

## Decision

Build a bounded, auditable loop that:

1. **Triggers** on a health-check alert (today: a GitHub issue comment; the loop would hook the same underlying check output before/instead of posting to the issue, or react to it).
2. **Classifies** each finding via a fixed, non-negotiable rule — not a model's in-the-moment judgment: an alert is eligible for autonomous handling only if **all** of the following hold:
   - The proposed fix is confined to detector/pipeline code — `supabase/functions/**`, `supabase/migrations/**` (SQL detector functions only, not schema/data migrations), or `scripts/**`.
   - Verification is possible by re-running the current or proposed logic against the flagged row's **actual, already-existing** database content and comparing to a value derivable from that same data (e.g., actual character count, actual regex match) — not a value requiring interpretation of intent, tone, or customer expectation.
   - The fix does **not** write to `mystery_characters`, `mystery_packages`, or any other customer-delivered-content table.
   - No un-pushed/un-deployed drift is itself in question in a way that can't be resolved by comparing `git log`/`get_edge_function` against `main` (i.e., "was this actually shipped" is answerable, not "should this have been shipped this way").

   Anything failing any of these — including every case that requires reading a chat transcript for intent, or that touches delivered content — is excluded by construction and continues exactly as today: posted, left for a human.

3. **Verifies before touching anything**: pulls the flagged row's real content, runs the candidate fix against it in isolation, confirms (a) the specific flagged case now resolves and (b) the full existing regression suite (`scripts/__tests__/conceptSnapshot.test.mjs`, any SQL detector self-tests) still passes.
4. **Applies** the fix via the same mechanisms used manually today — `git commit`/`push` for source, `apply_migration`/`deploy_edge_function` for what's live in Supabase — never skipping the "is it actually deployed" check that caused incident #1 above.
5. **Re-verifies live**: re-runs the actual detector (the SQL function or `scripts/detect-roster-mismatches.mjs`) and confirms the specific alert clears.
6. **Logs unconditionally**: a CHANGELOG entry plus a structured row in a new `detector_remediation_log` table (mirroring `auto_remediation_log`'s shape: what fired, what was classified, what changed, before/after verification, outcome) — every run, whether it auto-fixed, escalated, or found nothing actionable. A closing comment on the GitHub issue keeps Jonathan passively informed without requiring action.
7. **Circuit breaker**: a fixed cap on autonomous fixes per day (proposed: 2, matching the conservatism of ADR-0051's $5/day content cap in spirit, not dollars). Any alert on a **file that was auto-fixed in the last 7 days** escalates instead of auto-fixing again — a repeat hit on the same file within that window means the earlier fix didn't actually stick, and re-applying blind is more likely to compound a misdiagnosis than resolve one.

## Rationale

- **The classification rule is the whole safety story, so it has to be structural, not judgment-based.** Today's four alerts prove a topic-based rule ("roster-count alerts are mechanical") is wrong — alert #1 and #3 were both roster-count alerts, and #3 mechanically resolved to a smaller-but-still-real gap requiring judgment underneath. The rule above classifies by *what verification is possible*, not by alert type, which is why Birthday Bash's placeholder-line portion qualifies (verifiable by re-parsing) while its 20-vs-17 portion does not (no data-derivable "correct" answer exists).
- **Reuse over invention.** ADR-0051's loop is already live, already trusted, already has a cap-and-log discipline Jonathan has seen work (verified end-to-end per the 2026-08-10 CHANGELOG entry). This is the same shape at a different layer, not a new kind of autonomy.
- **Verify-before-apply is non-negotiable given today's near-miss.** Incident #1 above happened specifically because "the CHANGELOG says it's done" was trusted without checking `git log` and the live edge function. An autonomous loop that trusted its own prior action log the same way would repeat exactly that failure. Every apply step re-derives truth from source/deployment state, never from its own or another session's prior claims.

## Alternatives Considered

- **Classify by alert type instead of verification shape** (e.g., "roster-mismatch and confession-leak alerts are always mechanical"). Rejected: directly contradicted by today's evidence (Birthday Bash was a roster-mismatch alert with a judgment call underneath it).
- **Use an LLM judgment call to classify mechanical vs. escalate.** Rejected for the same reason ADR-0070 rejected an LLM-judge detector: keeps the loop free to run without incurring API cost or introducing non-determinism into the one step (classification) that most needs to be predictable. A fixed rule over file paths and verification shape is auditable in a way a model's classification isn't.
- **No cap, rely on the classification rule alone.** Rejected: the classification rule is new and unproven in production; a small daily cap plus the same-file-repeat escalation costs little and bounds the blast radius of a classification bug while the rule is still being trusted.
- **Skip the loop, keep everything manual.** Rejected as the default going forward for the narrow mechanical class specifically — today's three mechanical fixes were each ~15-30 minutes of investigation that reached the same conclusion every time ("re-run the current logic against the real row, compare, fix, verify"), which is exactly the kind of repetitive, low-judgment work worth automating. Kept as the answer for everything outside the narrow class.

## Consequences

- **Positive:** the class of alert that cost real triage time today (three of four alerts, all resolving to "detector/pipeline was stale or wrong") could close without a human in the loop, while the one alert that actually needed judgment still reaches Jonathan.
- **Negative / open:** the classification rule is unproven — it needs to run against a backlog of past health-check alerts (the issue #3 history) to sanity-check it doesn't misclassify anything before it's trusted live. Proposed as a validation step before shipping, not a reason to defer indefinitely.
- **Negative / open:** requires a new `detector_remediation_log` table/migration and wiring into `health-check.yml` or a new scheduled Action — not yet built, this ADR is the design only.
- **Neutral:** does not change anything about the existing ADR-0051 content-remediation loop; this is a parallel, narrower loop for a different class of problem (detector code vs. delivered content).

## Key files

- `.github/workflows/health-check.yml` — trigger point
- `scripts/detect-roster-mismatches.mjs`, `supabase/migrations/20260810_add_is_test_flag_and_harden_health_check_detectors.sql` — the two detector mechanisms this loop would fix
- `supabase/functions/auto-remediate-held-packages/` (or equivalent) — existing ADR-0051 loop, the pattern this borrows
- Not yet created: `detector_remediation_log` migration, the classifier/loop implementation itself

## Discussion

The instinct after fixing three false alarms in one sitting is to conclude "most of these are just noise, automate the noise away." The Birthday Bash alert is the reason that instinct needs a harder edge than "alert type": it looked identical in shape to the other roster-mismatch alert, and only decomposing it into "parser bug" (fixable) plus "possible content gap" (not fixable by a parser change) revealed that a single alert can contain both a mechanical and a judgment component at once. Any classification rule built from this incident has to be able to say "part of this is auto-fixable, the rest isn't" rather than making one call per alert — which is why the rule above is phrased as a per-*fix* eligibility test, not a per-*alert* one. A future alert that looks purely mechanical could still hide a Birthday-Bash-shaped judgment call underneath; the discipline that catches it is the same one that caught it today — read the actual flagged content before trusting the count.
