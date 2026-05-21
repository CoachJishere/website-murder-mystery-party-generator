# ADR-0010: Per-Slug Rot-Signal Gate in the Daily-Publish Workflow

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made May 2026, captured retroactively)

## Context

The blog is localized across 13 languages. Translations are produced by an upstream MT pipeline and synced into the DB as draft rows; a GitHub Actions daily-publish workflow flips drafts → published.

In early May 2026 we discovered that **`ko` (Korean) and `zh-cn` (Simplified Chinese)** translations were systematically rotted across the entire queue. The failure shape was specific and reproducible:

- **Length floor breaches:** rotted translations were ~4,500–7,000 chars where healthy translations of the same source ran ~6,800–15,800 chars. (CJK density makes lower lengths normal; the rotted ones were below even that floor.)
- **Brand-as-H2:** literal `## mysterymaker.party — N tips` constructs. The MT model translated everything *around* the brand string and left the URL fragment as a heading rather than localizing it.
- **URL-as-H2:** the same shape for non-brand URLs (e.g. `## host.com — guide`).
- **Untranslated English runs in H2s:** 5+ consecutive English words sitting inside an otherwise localized heading. Source-language spans the MT skipped.
- **KO-specific calques:** declarative sentence-final endings (`합니다`, `입니다`, `있습니다`) inside H2s where healthy KO uses noun phrases or `~하는 법 / ~하는 방법`. Explicit pronouns (`그들이`, `그것이`) where KO drops them by default.

These were not edge cases — 439 cells were affected. The MT failure mode was systematic and language-pair-specific.

The choice space for handling this:

1. **Blanket exclusion** — turn off `ko` and `zh-cn` publishing entirely until the upstream pipeline is fixed. (The pre-May default.)
2. **Manual triage** — review each cell by hand and publish what looks good.
3. **Automated gate at publish time** — encode the failure signals as a script, run it per slug per language at publish time, hold back any cell that trips a signal.
4. **Fix at the source and republish everything** — re-run the MT pipeline with better settings, ignore the existing rot, treat it as transient.

We also needed the gate to be **decoupled from the fix.** Regenerating 439 cells is a multi-week effort. We needed `ko` and `zh-cn` to flow back into the daily-publish pipeline incrementally — healthy cells out the door immediately, rotted cells held back until regenerated — without an all-or-nothing flip.

## Decision

**Encode the rot signals as a per-language `checkLanguage(lang, content)` function in `scripts/check-rot-signals.mjs`. The daily-publish workflow invokes it per slug per language and holds back any cell that fails. Both languages re-enter the publish pipeline conditionally, not by blanket toggle.**

Concrete shape:

- **Five signals**, codified as predicates:
  1. **Length floor** — `LENGTH_FLOORS = { ko: 7000, 'zh-cn': 5500 }`. Conservative — well below healthy translations, well above rotted samples.
  2. **Brand-as-H2** — `mysterymaker.party` literal in any H2.
  3. **URL-as-H2** — any `domain.tld` literal in any H2 that isn't the brand.
  4. **Untranslated English in H2** — 5+ consecutive Latin-alphabet words in any H2 (excluding the brand string).
  5. **KO-specific calques** — sentence-final declarative endings; explicit pronouns.
- `checkLanguage(lang, content)` returns `{ pass: bool, length, reasons: [...] }`. Reasons are human-readable strings — the failing H2, the breach amount.
- **Workflow integration:** `.github/workflows/publish-daily-blog.yml` calls the script per slug per language. Fail → cell stays draft. Pass → cell flips to published.
- **Auditability:** `scripts/audit-rot-signals.mjs` runs the same predicates across the whole queue on demand, for status reporting ("how many drafts are still gated").
- **The script is the spec.** No external config, no DB-stored rules — the predicates live in code where they can be diffed and reviewed.

**Asymmetric tolerance: false positives are recoverable, false negatives are not.** A healthy translation held back is fixable (regenerate or relax the floor). A rotted translation shipped live is on the public site, hurts SEO, and embarrasses the brand. Floors are deliberately set conservative.

## Consequences

**Positive:**
- **Incremental recovery.** Healthy `ko`/`zh-cn` cells flow back into the publish queue immediately. Rotted ones stay drafts until regenerated. No big-bang regen + republish required.
- **The gate is self-sustaining.** Once the regen backlog is cleared, the gate becomes a no-op in steady state — but continues to silently catch any future MT regression. Free insurance against the failure mode recurring.
- **Predicates are auditable.** A reviewer can read `check-rot-signals.mjs` and understand exactly what's being blocked. No black-box ML classifier, no opaque thresholds.
- **Symmetric tooling.** The same `checkLanguage` function powers (a) the publish-time gate, (b) the audit script, (c) the per-cell smoke test that regen prompts run before PATCHing. One source of truth.
- **Conservative floors are explicit.** The numbers are in the code with a comment explaining what they're calibrated against (rotted samples vs. healthy median). Future tuning is a one-line edit.

**Negative:**
- **False positives are real.** Healthy translations that happen to use a flagged construct (e.g. a translator who deliberately wrote a sentence-final KO header for stylistic reasons) get held back. We accept this as the cost of asymmetric tolerance. Mitigation: a held-back cell can be inspected and the gate's reasoning explained; if the signal is wrong for that cell, the predicate can be refined.
- **The gate only checks the signals it knows.** New MT failure modes (e.g. a future model that produces a different shape of rot) will not be caught. The gate is calibrated against the *observed* May 2026 failure mode and will need extension if the pipeline ships new shapes of rot.
- **Couples publish workflow to a Node script.** The daily-publish runner needs a Node toolchain. Acceptable since it already runs JS for blog-map sync; minimal added footprint.
- **Predicates encode language judgment in regex.** The KO-specific calques in particular are linguistic claims (sentence-final endings, pronoun usage). A native-speaker review of those rules would strengthen confidence; we wrote them from rotted-vs-healthy sample comparison rather than from a linguist's input. Documented in the code comments; revisit if a native speaker flags a wrong call.
- **Length floors are language-pair-specific magic numbers.** Adding a sixth or seventh problem language means adding a floor for it, calibrated against samples. There's no general "this is too short" predicate — every language has its own.

**When to revisit:**
- **If the MT pipeline is replaced or significantly retuned,** re-run `audit-rot-signals.mjs --status=published` against the new output to validate that the existing predicates aren't producing false positives on healthy new output. Recalibrate floors if needed.
- **If a new language ships and surfaces a different failure mode,** add predicates rather than building a parallel gate. One source of truth.
- **If the regen backlog is cleared and stays at zero for 90+ days,** the workflow could in principle drop the gate. Recommend against it — the cost is one script invocation per cell, the benefit is permanent protection against the failure recurring.
- **If false positives become disruptive** (translators report consistent legitimate-cell holds), refine the offending predicate rather than loosening the floor. The point is to catch real rot, not to clear a queue.

## Rejected alternatives

- **Blanket exclusion of `ko` and `zh-cn`.** Rejected as the steady-state answer. Holds back healthy cells alongside rotted ones, removes the language entirely from the publish queue, and gives no path to incremental recovery. Acceptable as a stopgap; the gate replaces it.
- **Manual triage of every cell.** Rejected at 439 cells. Even at 30 seconds per cell that's 3.5 hours of human eyeball time, doesn't scale to the next failure mode, and isn't reproducible. The predicates encode the same judgment a human reviewer was making.
- **Fix at the source and trust new MT output blindly.** Rejected as the *only* defense. We can and should improve the MT pipeline, but trusting the new output without a gate means the next regression ships silently. The gate is the failsafe regardless of how good the upstream gets.
- **Manual block-list of bad slugs.** Rejected: doesn't scale, requires maintenance, and gives no signal about *why* a slug is blocked. The reasons field on the gate's output tells you precisely what failed.
- **Use an ML classifier to score translation quality.** Rejected at this scale and complexity. The specific failure mode is well-described by deterministic predicates; introducing an ML layer adds opacity and infrastructure for marginal precision gain.
