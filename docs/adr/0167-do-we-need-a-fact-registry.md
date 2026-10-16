# ADR-0167: Do we need a fact registry? (the +pub shadow check decides)

- **Status:** Proposed 2026-10-16 (the question is open; Update 1 below records the first data). Becomes Accepted (registry built) or Rejected (registry not needed) when the trigger in decision 2 is met or the class stays rare.
- **Date:** 2026-10-16
- **Related:** ADR-0166 (decision 6 and Update 2: the registry blueprints are built when the data asks), ADR-0165 (leak probe, culprit-position rule), ADR-0152 (the leak probe this check complements), ADR-0103 Addendum 104 and Update 1 (the Till Death sweep where the class was found), ADR-0163 (clusters C2, C3, C4, C5, C16), ADR-0131 (the build-now-or-wait test)

## Context

A fact registry would be a canonical list inside `master_context` (`openKnowledge`: facts every guest may state, and who knows each) that the Child treats as public and the probes can check mechanically. It needs three changes: a Parent change (Parent89, the registry in the master document), a one-line whitelist change in `supabase/functions/_shared/characterContext.ts` (so the Child is allowed to see the field) and a Child change (Child69, which obeys it). Each is a Make import by Jonathan and each blurs the measurement of the change before it.

The motivating case is the Till Death Do Us Part-y package (`82241054-34c5-4827-80d2-4353da4cd529`, ADR-0103 Addendum 104): Eddie said in his Round 1 introduction "Tyson owes me $500,000, and I'm not shy about it" while Tyson's secret called the same debt hidden ("you are in debt to Eddie Millions for half a million dollars ... You will dodge, deflect, and lie to keep it buried"). No layer saw it, because the leak probe (`leakCandidates`, ADR-0152) skips every character the owner's secret names ("a character the secret itself names may legitimately know it"). That is right for private knowledge and wrong for a Round 1 introduction, which is read aloud to the whole table.

The question this ADR answers is not "is the Eddie case a bug" (it is) but "how often does the class occur, and is a registry in three layers the cheapest fix, or does a read-only check on today's packages do the job?"

## Decision

**1. Build a read-only shadow check first (`+pub`, built and deployed the same day; see Update 1).** A character a secret names may know it, but may not state it openly in a Round 1 field read to everyone (introduction, rumors) unless the owner's own open text already says it. It runs in the second pass after release (kill switch `pipeline_settings.review_pub_probe`, default on), writes OPEN findings under review version `+pub` (in `SHADOW_SUFFIXES`, so `isAutoApplyReview` never allows it and the daily open-findings email skips it), and a manual mode `pub_probe` exists with a dry run, `overrides` replay and an `only` owner filter. Sweeps record `human_verdict` on every `+pub` finding (CLAUDE.md watch, ADR-0166 shadow protocol).

**2. The trigger for building the registry (copied from ADR-0166 Update 2 and CLAUDE.md open reminder 6).** Parent89 (registry in the master document), the `characterContext.ts` whitelist change and Child69 are built and imported only when BOTH hold:
- Parent88 has its own data (two detective purchases after its import), AND
- the `+pub` shadow data plus the sweep misses show the class recurring: at least 3 real sightings in the packages since 2026-10-16 (in sweeps or `+pub` findings), OR `+pub` precision of 70 percent or more with at least 2 real findings.

When the trigger is met the AI says so, builds the blueprints and the whitelist change, and Jonathan imports. If the class stays rare, this ADR is closed as "the registry was not needed" and open reminder 6 is deleted.

**3. Parent89, Child69 and the `characterContext.ts` whitelist change are deliberately NOT built.** Reasons:
- The blueprints come from short assert-checked scripts (`temp-files/build-parent-v88.py` is the pattern; minutes to rebuild), so building them now saves nothing and risks rebuilding them when Parent88 or Child68 data changes anything they sit on (both edit the same modules and the same sheets).
- An unimported blueprint file in `temp-files/` can be imported by mistake.
- Three prompt-layer changes while Child68 (imported 2026-10-16 08:09 UTC) and Parent88 (not imported) are still unmeasured would make every before/after number unreadable (ADR-0153 Phase 0 traced past regressions to instruction conflicts, not prompt length; ADR-0166 decision 5 held Parent88 for the same reason).
- It pre-empts the question this ADR asks: with 1 strict sighting, the registry may be a three-layer answer to a one-in-a-hundred problem.

**4. What the `+pub` data will decide.**
- Recurs (trigger above met) -> build the registry. The `+pub` findings are then also the fixtures that show which facts the registry must list.
- Stays rare (fewer than 3 real sightings and `+pub` has fewer than 2 real findings after the next ~10 detective or slip packages) -> record here that the registry was not needed, keep `+pub` running in shadow as the only layer, delete reminder 6.
- `+pub` precision below 70 percent after 8 judged findings -> rewrite its instruction or drop it (ADR-0166 protocol); a registry is then even less justified, because the mechanical check it would enable would face the same retrieval problem.
- `+pub` at 90 percent real or better over 8 judged findings and 5 packages -> promote to auto-apply behind a switch (like `review_apply_fact_findings`), which is a cheaper fix than a registry and may remove the need for one.

## (a) How often has the Eddie-type class appeared?

Counted 2026-10-16 from `package_review_misses` (156 rows; keyword filter over `note` and `exact_quote` for public/openly/announced/volunteer/hidden-but, then every hit read by hand) and from ADR-0103 Addenda 1-104 (grep for the same words, then read). Keyword filters miss rows, so every figure is a lower bound.

| Shape | Packages | Where | Would `+pub` see it? |
|---|---|---|---|
| **Strict Eddie-type:** a fact one sheet's secret treats as hidden, stated openly in ANOTHER sheet (or a public fact called secret) | **1** | Till Death Do Us Part-y, 2026-10-16, C5 (Addendum 104). Zero before it in 156 misses and 104 addenda | Yes (Update 1) |
| **Same-sheet cousin:** a sheet's own public script or final statement volunteers what its OWN secret says to bury (C3) | 5 packages (Update 2 corrects the first count of 3) | Murder By Copy 2026-10-04 (Darion; Brenda by design), Addendum 83; Lip Sync For Your Life 2026-10-13 (Ginger, Calamity, Tommy), Addendum 94; The Last Slice 2026-10-14 (Robin, fixed), Addendum 98; Xorg package 33540b65 2026-10-14 (Don Ramon, regenerated); 59f93ee0 2026-10-03 (Daisy, low) | No (it reads other sheets); owned by nobody (C3), usually "debatable" ("own the small thing" reads as design) |
| **Document cousin:** a guest-facing document names hidden facts (C16) | 3 packages (Update 2 corrects the first count of 2) | 178de25c (2026-10-13, rewritten by hand), a03fcc0e (2026-10-13, Parent83 partly holds), 30c8252a (2026-10-14, predates Parent83) | No; owned by Parent83 and `+doc` |

So the strict class has one sighting in the whole record; the cousins are five and three (Update 2). A registry would address the strict class and, in principle, the same-sheet cousin (a secret checked against a list of open facts), but the cousin is mostly judged debatable, not defective. That is the reason to measure before building.

## Rationale

- Cost: `+pub` is one small call per owner that has candidates, measured at about 0.0065 USD per owner and 0.1165 USD for the 23-character Till Death package (18 owners, 52 sentences), less for smaller casts. A registry costs three imports, three measurements and ongoing prompt length.
- A read-only check works on every package already in the corpus and on the next order; the registry only helps orders created after its Parent and Child are imported.
- The decision rule is the same one ADR-0131 and ADR-0166 use: cheap and deterministic detection first, structural prevention when the data shows a class that recurs.

## Alternatives considered

- Build Parent89 and Child69 now: rejected (decision 3).
- Never build the registry: premature; the class may recur once packages are larger and Parent87 makes more facts concrete (more facts to disagree about).
- Fix by making the leak probe stop skipping named characters: rejected; the instruction would then flag every legitimate private knowledge sentence in rounds 2 to 4. Restricting to Round 1 introduction and rumors is what makes the named-character case checkable.
- Run `+pub` as a gate: rejected; shadow protocol (ADR-0166 decision 1), precision unknown.

## Consequences

- Each sweep reads `+pub` findings and records `human_verdict` (CLAUDE.md watch line).
- Reminder 6 in CLAUDE.md now tracks the trigger instead of waiting for a kickoff tab.
- `review_performance` and the shadow-check promotion data gain a third version.

## Key files

`supabase/functions/review-package-quality/leak-probe.ts` (`namedRound1` option, `PUBLIC_ROUND1_FIELDS`, `PUB_INSTRUCTIONS`, `pubPromptText`, `pubCandidates`), `index.ts` (`pubProbe`, second-pass hook, mode `pub_probe` and its mode whitelist), `review-core.ts` (`SHADOW_SUFFIXES`), `leak-probe.test.mjs` (6 new tests), `review-core.test.mjs` (1 extended), `mode-whitelist.test.mjs` (4 tests, Update 2), `docs/adr/0166-retiring-the-sweep-shadow-checks-and-concretizer.md` (Update 2), `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` (Addendum 104).

## Discussion

Jonathan's question that led here (ADR-0166 Update 2): "Shouldn't we just build those once we're ready to actually import them?" The agreed answer was to split decision 6 into a small read-only check now and the blueprints on a trigger. The design choice inside `+pub` was retrieval. The leak probe finds candidate sentences by words shared with the secret; Eddie's sentence ("Tyson owes me $500,000, and I'm not shy about it") shares none with Tyson's secret ("in debt to Eddie Millions for half a million dollars"). For a named character the candidate set is already tiny (two fields of a few characters), so a sentence that names the owner is enough, and a sentence that does not needs two shared stems. The cost of that choice is more owners per package than `+leak`'s rare-word match gives (18 of 23 on Till Death); at 0.0065 USD each that is accepted for a shadow check whose point is to measure.

## Update 1 (2026-10-16, same day): `+pub` built, deployed and validated

**Deployed** (`review-package-quality` v49, `verify_jwt` true, `npm run test:reviewer` passes with 6 new tests and 1 extended; commit eb75852a). One slip found during validation: the manual-mode whitelist in `index.ts` (the `mode` ternary) did not list `pub_probe`, so the first call fell through to the default sweep path (it returned an empty result and reviewed nothing); fixed and redeployed (v47 to v48 for the whitelist, v49 for the later `only` filter).

**Validation (replays in memory, nothing stored; total spend 0.133 USD of the 0.8 USD approved):**
- **Positive:** Tyson's ORIGINAL secret (recovered from the earlier sweep transcript; it differs from today's only in "you are in debt to Eddie Millions for half a million dollars on top of it" and "keep it buried") via `overrides`, owner limited to Tyson: 1 finding, `Eddie Millions | introduction`, high, quote "Tyson owes me $500,000, and I'm not shy about it.", explanation "announces the hidden $500,000 debt ... Tyson's open text never mentions it", with a valid softer replacement. 0.0081 USD.
- **Negative control:** same original secret, but Tyson's own introduction overridden to say "Yes, I owe Eddie Millions half a million dollars, and he tells the whole room about it": 0 findings. 0.0085 USD. So a named character stating what the owner also says openly is not flagged.
- **Real current package, all 18 owners, nothing overridden:** 18 calls, 52 sentences, 0 findings, 0.1165 USD. Tyson's secret now says the debt is openly known, so 0 is the correct answer for the case itself, and no other owner produced a false positive. This is 0 false positives out of 0 findings on one package: it shows the check is quiet on a package that was swept by hand, not that its precision is good.
- Not measured: recall beyond the one motivating case (there is no second labelled example), and behaviour in other languages (the instruction asks for same-language rewrites; untested).

**Trigger status (what must happen before the registry is built):** (1) Parent88 is not imported; Child68 has 0 of the 2 detective purchases it needs (checked 2026-10-16: no package created since its import at 08:09 UTC), and Parent88 then needs its own two. (2) The class has 0 recurrences since the motivating case (the Eddie case itself is not counted as a recurrence) and `+pub` has 0 real findings to date. The AI raises this at each session start via CLAUDE.md reminder 6.

## Update 2 (2026-10-16, later): independent review, corrections and hardening

A fresh-conversation review re-derived the build from git, the deployed function list, `auto_remediation_log` and the transcript. What held: scope (9 files, no Parent89, Child69 or `characterContext.ts` change, no secret), no import after Child68, v49 with `verify_jwt` true, the 18-owner dry run, spend exactly the three logged rows (0.133 USD), `+leak` unchanged with `namedRound1` off, `+pub` shadow-only. What was wrong or thin, and what was done:

- **Replay re-run with the verbatim original** (Jonathan's yes, 0.0167 USD, in memory, nothing stored). Positive: Eddie's "Tyson owes me $500,000" flagged, high, same as the builder. Control (Tyson's introduction states the debt): the debt sentence was NOT flagged, but the call returned one other finding, medium, on Eddie's "Gino knew about it ... his big surprise could blow up this marriage and the family money" (a hint at the hidden affair, not a statement of it). DECIDED: record it as a debatable finding, not a failure; the instruction says a hint is not a finding, so it is also a first precision data point against the check (1 debatable out of 1 control). The builder's "control = 0" used different control wording. Total live evidence is still one positive and one debatable control, so precision and recall stay unmeasured.
- **Counts corrected** (above): same-sheet cousins are 5 packages (the `package_review_misses` C3 rows), document cousins 3 (C16). The strict class is still 1: the nearest other row (Jazz-Jo and Ingrid, b18f6a86, 2026-10-12) is a non-named speaker in Round 2, which `+leak` covers, not this check. The decision (measure before building) is unchanged.
- **Test claims:** "7 new tests" was 6 new plus 1 extended. The unit-test fixture for Tyson's secret was an abridgement; it is now the verbatim original. Nothing tested `index.ts`, where the only slip of the build occurred, so `mode-whitelist.test.mjs` (4 tests, in `npm run test:reviewer`) fails if any handled mode is missing from the whitelist line, checks `pub_probe` is paid only with `paid:true`, that the second pass uses the `review_pub_probe` switch and swallows errors, and that a replay (`overrides` or `only`) never stores findings. Verified by removing `pub_probe` from the whitelist in a scratch copy: the test fails with the mode named.
- **CLAUDE.md:** reminder 6 said v48 (now v49); the C5 passive query now covers 2026-10-16 onwards excluding the Eddie row (it started at 2026-10-17 and would have missed a same-day recurrence); the shadow-check lettering is (a) to (e) in order. The vault copy of this ADR was missing the v49 wording and was rebuilt.
- **Not changed, on purpose:** (1) an unknown `mode` still falls through to the default paid sweep path; the callers of this function are not in the repo migrations, so rejecting unknown modes could break a cron, and the new test covers the failure that actually happened. (2) `review_pub_probe` is still default on (about 0.0065 USD per owner, 0.12 USD on a 23-character package). Jonathan's 0.8 USD approval covered validation only, so whether it stays on, or is switched off until he says yes, is his decision and is asked in the session that made this update.
