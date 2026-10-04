# ADR-0143: Non-English reviewer calibration and a runtime auto-apply language list

**Status:** Accepted (auto-apply enabled for fr, de, it, pt, nl on 2026-10-04; watch the first real order in each)
**Date:** 2026-10-04
**Related:** ADR-0136 (reviewer), ADR-0138 (review before release; auto-apply was limited to English and Spanish), ADR-0135 (language pack)

## Context

ADR-0138 limited auto-apply to English and Spanish because the reviewer's precision was only measured there. Every other language was reviewed but never edited. Jonathan approved a pilot (2026-10-04): report-only reviews of six delivered packages, then a precision check.

## Pilot

Six delivered packages, reviewed with `{"mode":"one","force":true}` and nothing applied (total about 2.8 USD):

| Language | Package | Style, cast | Findings | Verified |
|---|---|---|---|---|
| French | La Voix Brisée Du Palais Garnier | detective, 7 | 10 | all 10 against the source: 9 real, 1 debatable |
| Italian | L'eredità Del Silenzio | detective, 7 | 8 | all 8: 7 real, 1 debatable (plus 2 judgment calls on secret leaks) |
| German | Tod Auf Der Alm 3000 / Glamour, Gier | slip, 4 and 8 | 16 + 24 | sample of 12 against the source: all real except one debatable timing call |
| Dutch | De Bittere Verjaardag | detective, 14 | 29 | read in full: typos, wrong article, wrong family tie, number and fact drift; no false alarm seen |
| Portuguese | Festa Fatal | detective, 17 | about 45 | read in full: amounts swapped between R$25.000 and R$30.000 in five places, stray English words ("like", "next"), agreement and syntax errors, wrong relationships |

Judged precision is about 88 to 90 percent per language on the verified items, in line with English (single-generation slips 100, wrong fact 90, cross-field 90). The replacements the model proposed were minimal and correct in the language.

**The larger finding:** non-English packages carry far more defects than English ones (8 to 45 per package against about 13 in English), including the German register drift ("Ihnen" in one character's text, "euch" in the rest) and stray English words in Portuguese. They were generated before the language pack (ADR-0135) and are exactly where automatic fixing is worth most.

## Decision

1. Auto-apply languages become a runtime setting, `pipeline_settings.review_auto_apply_languages` (comma separated, default `en,es`), checked by `languageAllowedForAutoApply`. Detection is `detectLanguage` in `review-core.ts` (stopword ratios on four introductions): best ratio 0.076 to 0.204 and runner-up at most 0.024 on 17 packages of known language, zero misses; unclear text is never allowed.
2. Enabled now: `en,es,fr,de,it,pt,nl`. Applied classes are unchanged (`single_generation_slip`, `wrong_fact`, `cross_field_contradiction`); `secret_leak`, `pronoun_drift`, `language_slip` and `other` stay report-only. The revert-on-new-defect guard is unchanged.
3. Kill switch per language: `update pipeline_settings set value='en,es' where key='review_auto_apply_languages'` (or remove a code).

## Risks and what to watch

- The apply path was only exercised end to end in English (ADR-0138 Addendum 1); the non-English path is the same code with a different language gate. The first real order in each language should be checked: `package_review_findings` statuses (`applied`, `reverted`), and read two or three applied replacements in context.
- Precision was verified on 18 findings in full and sampled elsewhere, not on every one of the roughly 130. If a bad replacement is found, disable that language first, then look.
- The 6 pilot packages are delivered and their findings are open (nothing was applied). They can be fixed by applying the open findings of the three classes; not done, because it edits content customers already have. Say if you want it.
- The pilot findings were stored with prompt version v4, so those 6 packages count as reviewed.

## Key files

`supabase/functions/review-package-quality/review-core.ts` (`detectLanguage`, `languageSample`), `index.ts` (`languageAllowedForAutoApply`), `review-core.test.mjs`.
