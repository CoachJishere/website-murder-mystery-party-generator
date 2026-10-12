# ADR-0150: The reviewer checks that the customer's requirements are carried, and re-reads each package once after release

**Status:** Accepted (shipped 2026-10-12: `review-package-quality` deployed, both levers tested live and switched on, cron job `review-second-pass` created)
**Date:** 2026-10-12
**Related:** ADR-0149 (open-findings digest and wider auto-apply), ADR-0136 (the reviewer), ADR-0138 (review before release), ADR-0103 Addendum 89 (the sweep that exposed the gap)

## Context

On the Dutch "Tijdcapsule Klas '96" package the reviewer found 11 of 19 real defects (58 percent). The biggest miss was structural: the customer's explicit climax ("Daanus" all game, "Het is dus Daan!" / "Hij is dus écht een gladjanus!", Dina's stairs memory) was in no character sheet. The reviewer reads one character at a time, so it cannot see something absent from all of them. Recall against hand sweeps is 33 to 91 percent by category (detective cross-field 33, wrong fact 55, secret leak 62).

## Decision

1. **Requirements coverage (inside the pre-release review).** When `master_context` carries the customer's list (`conversationDetailsExtraction.userRequirements` and `characterDetails`), one extra call receives that list plus every character sheet and the shared documents, and reports lines no guest-facing text carries. A scene or line the players must perform counts only if that player's own sheet gives it; the host-read documents narrating it do not. Findings are stored with `item_name` REQUIREMENTS, `field` userRequirements, category `other`, severity high for climax, reveal or central-clue lines and medium otherwise. They are never auto-applied (they need new content), and high ones feed the daily open-findings email (ADR-0149). Kill switch: `pipeline_settings.review_requirements = 'off'`.
2. **Second pass after release.** Cron job `review-second-pass` (every 5 minutes) runs `mode: second_pass` on one package released in the last 12 hours that has a finished first review and no second one. It re-reviews the already corrected text under prompt version `<version>+p2`, drops findings the first pass already recorded, skips propagation and the coverage call, and applies the auto-apply classes through the language-gated path. It runs after release so it never delays a customer. Kill switch: `pipeline_settings.review_second_pass = 'off'`.
3. **Tools:** `mode: requirements_probe` (read-only, with an optional list of phrases to strip from the character text to prove the check notices) and `mode: apply_open` (apply the open findings of the auto-apply classes for one package through the same guards).

## Evidence (live tests, 2026-10-12, Anthropic spend about 0.82 USD)

- **Coverage, positive control** (the climax phrases stripped in memory from the Dutch package): first prompt missed all three climax requirements; after tightening the rule that host-read documents never carry a player's line, it flagged all three as high. 0.15 USD, 17 seconds.
- **Coverage, negative control** (the package as it is, climax lines present): no climax finding, and six findings for customer quirks that are genuinely absent from every sheet (Bram's reebok camping story, Tom's other catchphrases, Kevin's "Pinnen" slip and truck remark, Anna's fine). Each was confirmed absent in the database. The hand sweep had not caught these. 0.14 USD.
- **Second pass** on the hand-swept Dutch package: 3 new findings, all genuine and auto-applied (a garbled phrase in Daan's script, a nonsensical overview sentence, a capsule pronoun flip). 0.32 USD, 3 of 3 correct.

## Rationale

Prevention in the Make prompts is the structural fix but has failed to hold before (customer details dropped; culprit named on a card), so the review is the safety net. Both levers are cheap (about 0.15 and 0.3 USD per package, daily cap 10 USD shared with the rest of the reviewer) against a package price of 19.99 USD, and both only ever write through the existing guarded path or create findings.

## Alternatives considered

- **A second pass before release.** Rejected: it doubles review time inside a 15-minute release window and a large cast would hit the run budget; a customer would wait on a reviewer.
- **Add the coverage call for every language to a stricter rule set.** Not needed: the check is language-neutral; it compares meaning, not words.
- **Auto-add the missing content.** Rejected: authoring new lines needs judgment (voice, which character); it stays a finding for a human sweep.

## Consequences

- Added cost per paid package: about 0.15 (coverage) plus about 0.3 (second pass), roughly 0.5 USD.
- Second-pass findings and edits land minutes after release, not before; read them before fixing during a sweep and do not mark a package swept for recall measurement if the second pass ran after your fixes.
- A package that fails the coverage call or the second pass is not held; both are best effort.
- Follow-ups not built: carrying the customer's requirements into every Child call at generation time (the prevention fix, a Make change), and making evidence cards never name the culprit.

## Key files

`supabase/functions/review-package-quality/index.ts` (`secondPass`, the requirements item, `requirements_probe`, `apply_open`), `review-core.ts` (`customerRequirements`, `coverageBlock`), `review-core.test.mjs`, `supabase/migrations/20261012200000_review_requirements_coverage_and_second_pass.sql`.
