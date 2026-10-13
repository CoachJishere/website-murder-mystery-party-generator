# ADR-0155: Catch a duplicate accomplice and a missed customer requirement before release (PROPOSED)

**Status:** Proposed (nothing built; waits on Jonathan's yes for the recurring cost in Decision 2)
**Date:** 2026-10-13
**Related:** ADR-0103 Addendum 92 (the trigger), ADR-0150 (requirements coverage), ADR-0154 (customer email on a hold), ADR-0138 (review-before-release), ADR-0153 (prompt consolidation, why the fix is not another prompt sentence)

## Context

"Blackthorn Manor" reached the customer with two problems the machinery should have handled before she saw them:

1. **A duplicate accomplice.** An innocent journalist was stored as a second `accomplice`. The gate detected it (`accomplice_role_mismatch`) and held the package, but the detector is deliberately detection-only ("nothing is coming to fix them", comment in `notify-generation-issue`), so the package sat until a human looked. A role relabel alone would not have been safe: the sheet had been written as an accomplice's and its secret named the real accomplice, so a relabel would have passed the gate and shipped the leak.
2. **A missing customer-requested role.** The approved concept promised a "substantial, fully developed co-investigator role" for Shannon with her own briefing. The package has no Shannon page (she is five silent mentions in the detective script). The ADR-0150 requirements check should report this. A `requirements_probe` on 2026-10-13 (about 0.15 USD) returned **"skipped: no customer requirements in master_context"**. `customerRequirements()` (`review-package-quality/review-core.ts`) only reads `userRequirements` or `characterDetails` string arrays from the Master Doc. Measured on the 26 paid packages created since 2026-10-01 **only 3 carry `userRequirements`** (S'more, the Dutch Tijdcapsule, Champagnens Skygge). So the requirements check, which ADR-0150 proved on the Dutch package, is silently skipped on about 88 percent of orders, and has been since it shipped on 2026-10-12.

## Decision

1. **Duplicate accomplice: heal, not just detect.** New auto-remediation class `accomplice_role_mismatch`, only for the unambiguous shape: `master_context.accompliceSelection.character` names one character, exactly one other character carries the role `accomplice`, and that other character's `master_context` entry says `isRedHerring` or is not the accomplice. Steps: (a) correct the role to the one `master_context` gives that character; (b) regenerate that one sheet through `regenerate-child-content` with the corrected role (about 0.15 USD per occurrence, same gated, reverting path as `narration_person_mismatch`), because the sheet text was written for the wrong role; (c) the gate and the reviewer then run as normal. Anything else (zero accomplices where one was asked, a name that matches nobody, two names in `master_context`) stays detection-only and escalates. Add the prefix to `WORKER_RECOGNIZED_PREFIXES` in `notify-generation-issue` so the page waits for the worker first (the KEEP-IN-SYNC rule).
2. **Requirements: do not depend on the Master Doc emitting the list.** When `customerRequirements()` finds no list, build one from the customer's own words in `user_conversation` (the brief plus the approved concept; where they conflict the approved concept wins, as the package already says) with one extra reviewer call that returns one requirement per line. Then the existing coverage call runs unchanged. Estimated cost 0.03 to 0.05 USD per order on top of the existing 0.14 to 0.15 USD coverage call (my estimate; the first run will give the real figure). Findings stay `open` for requirements (never auto-applied, as ADR-0150 says), so a missing Shannon briefing reaches Jonathan before the customer.
3. **Prove both before relying on them.** (a) Decision 2 is tested on Blackthorn Manor itself (the pre-fix package had no Shannon page; the extraction plus coverage must report it) and on the Dutch package as a negative control. (b) Decision 1 is tested on a synthetic clone of this package with a second `accomplice` role, as the ADR-0138 fixtures were (no user attached, no email).

## Rationale

Prevent, detect, heal, escalate (the North Star in ADR-0131): the gate already detects; Decision 1 adds the heal for the one shape that is safe to repair, and Decision 2 repairs a detector that was never running on most orders. Both are code and data fixes, not another sentence at the end of a Make prompt (ADR-0153).

## Alternatives considered

- **Relabel the role in SQL only (free).** Rejected: would have shipped the leak in this package (the demoted sheet's secret named Pam).
- **Ask the Master Doc prompt to always emit `userRequirements` (Parent85).** Rejected as the only fix: it already emits it on 3 of 26 and a prompt cannot be proven to hold (ADR-0142, ADR-0153). Could be added later as a second source.
- **Block release when no requirements list exists.** Rejected: would hold 88 percent of orders.
- **Make Shannon-like roles a deterministic gate (a named co-investigator must have a sheet).** Not deterministic: the concept's wording varies. Left to the coverage call.

## Consequences

- A recurring reviewer cost of roughly 0.03 to 0.05 USD per order for the extraction (Jonathan's yes needed; global rule on paid calls).
- More `REQUIREMENTS` findings will now appear on orders that were previously skipped, including ones that are not defects (the brief asks for name cards and ballots the product does not generate). They stay open and are verdict-recorded like other findings, so precision is measured before anything auto-applies.
- A duplicate accomplice becomes a 15-minute self-heal instead of a four-day hold, in the case where the shape is unambiguous.

## Key files

`supabase/functions/review-package-quality/review-core.ts` (`customerRequirements`, `coverageBlock`), `supabase/functions/review-package-quality/index.ts` (`requirements_probe`), `supabase/functions/auto-remediate-packages/index.ts` (new class), `supabase/functions/notify-generation-issue/index.ts` (`WORKER_RECOGNIZED_PREFIXES`), `supabase/migrations/20260930160000_add_accomplice_role_and_culprit_accusations_detectors.sql` (the existing detector).

## Discussion

Jonathan asked for something that catches this class up front instead of fixing each package by hand after the customer has seen it. Scoping showed two different gaps: the accomplice one is a missing repair, the Shannon one is a check that was not running. The second was the larger finding: the probe returned "skipped", which led to the 3-of-26 measurement. Jonathan approved the probe and the build direction on 2026-10-13; the recurring extraction cost is the one open question.
