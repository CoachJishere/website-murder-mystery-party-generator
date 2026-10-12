# ADR-0149: A daily check for packages released with unresolved reviewer findings, and wider reviewer auto-apply

**Status:** Accepted (shipped and extended 2026-10-12, see Update 1: `review-package-quality` deployed, settings changed, cron job 19 created; the first scheduled run is 2026-10-13 07:30 UTC)
**Date:** 2026-10-12
**Related:** ADR-0136 (the reviewer, Addendum 8 and the North Star alerting rule), ADR-0138 (review before release), ADR-0143 (non-English auto-apply), ADR-0103 Addendum 89 (the sweep that prompted this)

## Context

"Compleet Overzicht - de Tijdcapsule Van Klas '96" (NL detective, purchased 2026-10-06) was complete, gate-clean and released with its ready email, yet a sweep six days later found more than ten defects. Jonathan asked why no generation note arrived and how to stop having to sweep to catch things.

Findings from the data (14 paid packages released since the pipeline went live on 2026-10-04):
- No alert is by design: the generation alert fires only when a package is held or stuck. The reviewer found 11 issues on this package, applied 6, and left 5 open; nothing told anyone (`REVIEW_DIGEST` off, per the alerting rule).
- 10 of the 14 packages were released with open findings (about 83 of about 121). Since the reviewer went live: 22 high-severity and 216 medium findings sit open.
- Judged precision is 95 to 100 percent in every category of `review_performance`, so the open findings are mostly real.
- Why findings stay open: (a) classes never auto-applied (`secret_leak`, `language_slip`, `pronoun_drift`); (b) Danish and Swedish packages are outside `review_auto_apply_languages`, and the language detector (`C.detectLanguage`) did not know either language, so adding them to the setting alone would have done nothing; (c) a cross-field fix whose replacement is longer than the sanity limit; (d) the customer-wording guard (by design, and probably why the Round 4 card finding stayed open: the customer wrote "de camera en de la").

## Decision

1. **Daily open-findings check.** `review-package-quality` gains `mode: open_digest`, run by cron job `review-open-findings-digest` at 07:30 UTC. It looks at packages released in the last 26 hours and emails support@ once per UTC day only if any carries open findings with no `human_verdict` at or above `pipeline_settings.review_open_digest_min_severity` (default `high`; `medium` or `off` also valid). Silence means nothing qualifies. Recording a verdict (the sweep protocol already does this) removes a finding from the check.
2. **Auto-apply `language_slip`** (added to `review_auto_apply_classes`). Replacements read in the data were all correct (for example "of [NotebookLM]" to "or", "pairs met" to "pairs with", an untranslated materials line).
3. **Auto-apply for Danish and Swedish** (added to `review_auto_apply_languages`), with da and sv added to the language detector using only words that differ between the two languages so the 2x margin separates them. Checked against all 124 packages since 2026-08-01: every existing language detects exactly as before, and the one Danish and one Swedish package go from "unclear" to da and sv. The open Danish and Swedish replacements read were all genuine grammar fixes (gender, tense).
4. **Not changed:** `secret_leak` is NOT auto-applied (see Alternatives), and `pronoun_drift` has no judged findings yet.

## Rationale

- The alerting rule (North Star, 2026-10-03) allows email only for what the system could not resolve itself. A high-severity finding left open at release is exactly that, and high findings are rare (22 across all packages so far), so the email is infrequent. Counts and medium findings stay in the database for sweeps.
- Every change is a runtime setting or a read-only check; the revert-on-new-defect guard and the customer-wording guard still apply to everything auto-applied.

## Alternatives considered

- **Auto-apply `secret_leak` (proposed, then dropped after reading the replacements).** Of the ones with a non-empty replacement, about two in nine were judged debatable (for example a rewrite that changes who knows what), and several suggestions were empty (delete a sentence), which the sanity check rejects anyway. A leaked hint left in is bad but not broken; a bad rewrite applied silently is worse. Stays with the digest and the sweep.
- **Hold a package when a high finding remains.** Rejected: it would delay a paying customer on a reviewer opinion; the pipeline was deliberately built never to hold a customer on a reviewer problem (ADR-0138).
- **A daily email with counts for every package, or per package.** Rejected: contradicts the alerting rule and would be ignored within a week. The threshold setting lets Jonathan lower it to medium if he prefers.
- **Retroactively apply the open findings on already delivered Danish, Swedish and French packages.** Not done: it edits customer-visible content in bulk; offered separately with a preview.

## Consequences

- Medium-severity findings (216 so far) still depend on the sweep. This does not close the recall gap: the reviewer cannot see a missing customer requirement, and recall against hand sweeps is 33 to 91 percent by category. Next levers (not built, need Jonathan's yes because they are paid): give the reviewer the customer requirements list, and a second pass after applying.
- Kill switches: `update pipeline_settings set value='off' where key='review_open_digest_min_severity'` stops the email; `review_auto_apply_classes` and `review_auto_apply_languages` can be edited back with one UPDATE each; `select cron.unschedule('review-open-findings-digest')` removes the job.
- First things to read: after the first Danish or Swedish order, look at `package_review_findings` (`applied`, `reverted`) and 2 or 3 applied replacements in context, as ADR-0143 requires for any newly enabled language.

## Discussion

Jonathan asked three questions: why no generation note, why a sweep still finds so much, and how to automate. The honest answer was that the machinery said "fine" because every signal was about generation failures, while the reviewer's unresolved output went nowhere. Of the four levers offered (stop releasing silently, apply more of what the reviewer finds, close the recall gap, prevent at the source), he approved the first two. While implementing the second, the data showed the language detector was the real blocker for Danish and Swedish and that `secret_leak` replacements were not good enough to apply unattended, so those two points differ from the proposal as first described.

## Key files

`supabase/functions/review-package-quality/index.ts` (`openDigest`, `mode: open_digest`), `review-core.ts` (`openDigestEmail`, da and sv stopwords), `review-core.test.mjs`, `supabase/migrations/20261012180000_review_open_findings_digest_and_wider_autoapply.sql`.

## Update 1 (2026-10-12): retroactive apply on delivered packages

Jonathan approved applying the open findings on the delivered Danish, Swedish and French packages. Backups of every text field of all three packages and their findings were taken first (`temp-files/backup-retro-apply-2026-10-12.json`, gitignored local copy), then `mode: apply_open` ran per package through the guarded path (language gate, sanity check, customer-wording guard, revert if a new defect appears): Champagnens Skygge (DA) 31 applied, Sammanfattning: Murder Under Golden Star (SV) 7 applied, La Malédiction Du Rang Du Vieux (FR) 2 applied, 0 reverted. The gate and the meta-leak, pointform-language and missing-header detectors are clean on all three. 13 applied replacements were read in context (all genuine grammar, gender and tense fixes; one removed clue recaps from a Danish reveal that appeared on no evidence card). Left open as outside the auto-apply classes or failing the sanity check: 7 pronoun_drift, 4 secret_leak, 1 slip.
