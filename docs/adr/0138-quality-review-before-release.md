# ADR-0138: Quality review before release (reviewing phase)

**Status:** Accepted, rolled out 2026-10-04
**Date:** 2026-10-04
**Related:** ADR-0103 (sweep), ADR-0136 (LLM reviewer), ADR-0077 (hold behind the building screen), ADR-0106 (single ready email)

## Context

Two purchases on 2026-10-03 (Hedberg Hollow, S'more Heist) passed every gate and detector and still carried 19 and 17 real defects; a hand sweep found them. The reviewer already existed but ran about 20 minutes AFTER the customer was emailed, in report-only mode, so every defect reached the customer first. Jonathan's goal: high quality mysteries without manual sweeps; he is fine with a longer, honestly communicated generation time ("people want expectations managed") and with the LLM cost.

## Decision

1. **A `reviewing` phase between the gate and delivery.** `validate_package_characters()` (the BEFORE UPDATE trigger that already gates the transition into `completed`) now, when the gate passes, sets status `reviewing` instead of `completed` if `pipeline_settings.quality_review_release` applies (`off` default, `test_only` = `conversations.is_test`, `on`), the package was never delivered (`ready_email_sent_at` is null) and not yet released (`quality_review_released_at` is null). Holding the transition holds the ready email, because that email is fired by the transition into `completed` (ADR-0106).
2. **Review, apply, release.** Cron `review-release-queue` (every minute) calls `review-package-quality` with `{mode:"release_queue"}`: it runs the review (or reuses an existing one), applies the open findings of the classes in `pipeline_settings.review_auto_apply_classes` (default `single_generation_slip, wrong_fact, cross_field_contradiction`, the classes with 100 percent judged precision so far; `secret_leak`, `pronoun_drift`, `language_slip`, `other` are never auto-applied), then calls `release_package_after_review()`, which re-runs the gate through the same trigger and sets `completed`. The existing auto-apply guard is kept: a replacement that introduces a new blocking defect is reverted and the finding marked `reverted`. Pointform bullets that quote the same span verbatim are updated too.
3. **The reviewer never holds a customer.** A review that fails, is partial, errors, is cost-capped or runs past `review_max_minutes` (15) releases the package anyway and sends one alert; `release_stuck_reviewing_packages()` (cron, every minute) is the DB-side safety net at `review_max_minutes + 5`.
4. **Auto-apply is limited to English and Spanish packages** (stopword test on a sample of introductions) because the reviewer's precision is only measured for those; other languages are reviewed and logged but not edited.
5. **Customer experience.** `reviewing` reuses the existing "Final quality checks" phase of the building screen (95 percent, never 100 until released), now with an honest description ("a careful read-through and automatic fixes, usually adds 3 to 5 minutes") and the sentence "we'll also email you the moment it's ready". The client treats `reviewing` exactly like a held `needs_review`: it never force-completes from content, never auto-corrects the status, and the generation-timeout timer is cleared so support is not falsely alerted. Time estimates in all 13 locales were rewritten from measured data (paid packages since 2026-08-01, page tiers: small ≤10, medium 11-18, large 19-28, xlarge 29+; p90 27, 48, 50, 48 minutes; plus about 5 for the review): small "about 15 to 25 minutes, occasionally up to 35", medium "about 20 to 35, occasionally up to an hour", large "about 25 to 45, occasionally up to an hour", xlarge "about 35 to 50, occasionally up to 75". Marketing copy that says "in minutes" (titles, meta, FAQ, llms.txt) was NOT changed.
6. **Only first delivery is reviewed.** Adaptations and other re-completions (ready email already sent) pass straight through.

## Why this shape

- One interception point (the trigger) covers every path to `completed` (Make's own write, `promote_complete_packages`, `heal_completed_packages`, the self-heal worker).
- Reusing `needs_review`'s client handling instead of a new screen kept the frontend change to a few conditionals.
- Cost and latency: the review takes about 70 seconds for 16 characters and costs 0.4 to 0.8 USD per package; detectors do not reduce that cost (the reviewer reads the whole package either way), they reduce heal spend and risk.

## Testing (manual, no API spend; Jonathan asked for it)

Synthetic fixtures cloned from an is_test package (no user attached, so no email can be sent), flag `test_only`: (1) completion write is intercepted into `reviewing`, no email, no completion time; (2) hand-written findings of four classes: the slip and the wrong-fact were applied (and the pointform quote kept in step), the `secret_leak` stayed open, a replacement that introduced a blocking defect was reverted; package released as `completed`, ready-email slot claimed, gate clean; (3) a package whose review never started within 15 minutes was released by the edge function with one alert and no API call; (4) a package stuck for 25 minutes was released by the DB safety net; (5) the real page rendered in Chromium: held shows the building screen at 95 percent with "Final quality checks", no content and no console errors; after release it shows the tabs. The language gate was checked on seven languages (EN and ES allowed; FR, DE, IT, PT, NL skipped). Fixtures were deleted.

## Operating it

- Kill switch: `update pipeline_settings set value='off' where key='quality_review_release';` (takes effect for the next completion; packages already `reviewing` are released by the queue or the safety net).
- Stop auto-apply only: `update pipeline_settings set value='' where key='review_auto_apply_classes';`.
- A package visible as `reviewing` for more than 20 minutes means the queue and the safety net both failed: check cron `review-release-queue` and `release_stuck_reviewing_packages()`.

## Consequences and open items

- Customers now wait about 3 to 5 minutes longer on average and up to 15 in the worst case; support emails about generation time should fall because the estimates now cover the slow tail.
- Defects of classes that are not auto-applied (innocents hinting at the solution, confessions) are still delivered and logged as `open`; they are the input for new detectors (see the scoreboard).
- Non-English packages get the review but no auto-apply until calibrated.
- The 11 older slip-confession rows and the marketing "in minutes" wording are untouched.

## Key files
`supabase/migrations/20261004110000_quality_review_release_pipeline.sql`, `supabase/functions/review-package-quality/index.ts`, `src/pages/MysteryView.tsx`, `src/services/mysteryPackageService.ts`, `src/interfaces/mystery.ts`, `src/i18n/locales/*.json`

## Addendum 1 (2026-10-04): first real purchase through the pipeline ("Murder By Copy", slip, 5 players, English)

Timeline (UTC): generation 08:00 to 08:08 (8 minutes), gate held it (`needs_review`: Amber missing round content, Sheila missing four branch headers); free header heal 08:13 (0.00 USD); Amber regenerated 08:20 (0.15 USD, logged `escalated` although the gate then passed, worth a look at why); `reviewing` 08:22; review done 08:23:29 (5 findings, 0.27 USD); released and ready email 08:23:32. Total heal and review cost about 0.42 USD. All 5 findings were auto-applied (2 wrong-fact/cross-field, 3 single-generation slips: "a week later" in a one-night game, garbled brace line, "an humiliating", "months" vs weeks, a Flin Flon transfer contradicting the introduction), none reverted. Gate clean afterwards; slip-confession, meta-text and victim-mismatch detectors 0. Checklist items 1 to 3 held; item 4 (no browser-timeout alert) and 5 (customer saw "Final quality checks") were not observable from the server. Child56's effect (no named helper in reveal confessions) not exercised: no accomplice in this game. This package also exposed ADR-0139 (the order sat unstarted for 7 hours before generation was re-fired by hand).

**Clarification (same day, after reading the code):** the Amber row logged `escalated` is by design, not a failed heal. `notify-generation-issue` re-fires the missing character's Make child scenario fire-and-forget and logs `escalated` with a flat 0.15 USD cost, because the outcome is only known at the next sweep; the gate was clean two minutes later. The manual sweep of this package scored the reviewer at 5 findings, all real, against 8 misses (4 hard, 4 debatable); see ADR-0103 Addendum 83.
