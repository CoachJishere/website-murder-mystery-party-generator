# ADR-0166: Retiring the hand sweep - shadow-mode checks for the creative and cross-document classes, a Parent concretizer, and a permanent sampling audit

- **Status:** Accepted 2026-10-16 (Jonathan: "write it up and start with the cheap rows, and then parent change"; "assuming parent change can be done now, otherwise we can wait until after those have data")
- **Date:** 2026-10-16
- **Related:** ADR-0163 (clusters, exit criteria), ADR-0165 (image judge, `+fact` auto-apply, Child68), ADR-0162 (concrete hidden wrongs, Parent87), ADR-0103 Addendum 104 and Update 1 (the sweep this comes from), ADR-0131 (the build-now-or-wait test)

## Context

Jonathan will never read a customer's mystery. The long-term goal is a pipeline that finds and corrects what a hand sweep finds today, without him or me reading the package. After ADR-0165 the machinery handles position claims, culprit-position spoilers, image text and (once measured) `+fact` replacements. The Till Death sweep (about 41 real defects: 11 fixed unattended, 12 found but left open, 18 never found) shows which classes are still owned by nobody:

| Class (Till Death example) | Why no layer owns it today | Decision |
|---|---|---|
| The detective script or overview claims something the sheets do not support ("Own what you have already admitted") | Every probe reads character sheets only; the shared documents are read by the per-item reviewer, not against the cast | Cheap row 1: a document-versus-cast probe (`+doc`) |
| A murderer's own scripts disagree about their own alibi (Zoya "walked past" vs "never went near") | The main review's `cross_field_contradiction` definition covers it and the model still missed it | Cheap row 2: an explicit own-alibi/own-secret line in the main prompt |
| The customer's quoted line or hint is missing from the shared script | The requirements extract finds it; nothing writes the fix, so it waits for a human | Cheap row 3: a proposed insertion (`+req2`), shadow |
| A fact one sheet calls hidden and another announces (Eddie's debt) | The leak probe skips characters a secret names | Waits for a second sighting (ADR-0131) and for the fact registry below |
| A hidden wrong left abstract when the customer's concept is vague (Benito's envelope, Collette's remarks) | Parent87 holds only where the concept gives a hook | Parent88 concretizer, built now, imported after Child68 has data |

## Decision

**1. Shadow-mode protocol for every new check.** A new check writes `open` findings under its own review version (`+doc`, `+req2`), which `isAutoApplyReview` does not allow, so it can never edit a package. Each sweep records a `human_verdict` on every shadow finding. A check is promoted to auto-apply (added to the allowlist behind a `pipeline_settings` switch, like `review_apply_fact_findings`) when at least 8 judged findings over at least 5 packages are 90 percent or more real. A check below 70 percent after 8 findings is rewritten or dropped. This is how `+fact` should have gone and is now the rule for every sweep-found class: prevent, detect in shadow, measure, promote, heal.

**2. Cheap row 1: `+doc`, shared documents against the cast.** One model call per package reads `detective_script`, `game_overview` and the evidence-card descriptions together with a compact digest of every sheet (final statement, Round 4 script, first part of the secret) and reports sentences in the documents that the sheets or the master context contradict or do not support (what a character admitted, said, did, owned, or where they stood; who is named as a witness). About 0.1 to 0.2 USD per package, validated like the other probes (the quote must appear exactly once in the named document field). Kill switch `pipeline_settings.review_doc_probe` (default `on`; findings are shadow).

**3. Cheap row 2: own-alibi line in the main review prompt.** A sentence added to the `cross_field_contradiction` definition: for the murderer and accomplice, the lie is allowed only when every field tells the same lie; a claimed alibi stated in one script and abandoned in another is a contradiction. No extra call. Checked locally on the original Zoya sheet before the deploy (about 0.03 USD).

**4. Cheap row 3: `+req2`, a proposed insertion for a missing customer quote.** When a `REQUIREMENTS` finding is a quoted line or hint (detective style) the second pass asks one small model call to rewrite one sentence of the detective script's opening statement so that it carries the quote, validates that the old sentence appears exactly once, and stores old and new sentence as an `open` finding on the document (shadow). About 0.02 USD. Promotion follows the protocol in 1.

**5. Parent88: the contents concretizer (built now, imported after Child68 has data).** Parent87 already makes `howVictimWrongedThem` a concrete fact (21 of 23 on Till Death). The two that stayed abstract were the object or words behind the wrong (what Benito's envelope held, what Collette said), because the customer's concept gave only "an envelope" and "drunken remarks". Parent88 extends the Parent87 rule in the same two Part 1 modules (171 Master Doc, 165 Character Murder): when the wrong involves an object or words, say in one clause what it contained or what was said, invented where the concept does not give it, never contradicting the customer, and the same fact in every field that mentions it. Prevention at the source, so the Children and the reviewer see one concrete fact instead of each inventing their own. Held for import until Child68 has two detective purchases, so the two changes do not blur each other's measurement; Jonathan imports.

**6. The fact registry (later, built only when the data asks for it).** A canonical list in `master_context` (`openKnowledge`: facts everyone may state, with who knows them) that the Child treats as public and the probes can check mechanically; it needs a Parent change, a one-line whitelist change in `characterContext.ts` and a Child change. *(Revised the same day after Jonathan's question, see Update 2: the Parent89 and Child69 blueprints are NOT built in advance.)*

**7. A permanent sampling audit.** Without ground truth, recall cannot be measured and silent decay cannot be seen. Even when the exit criteria (ADR-0163: recall 85 percent or more, median misses 3 or fewer) are met, 1 package in 5 gets a full hand read as an audit that feeds `package_review_misses`, never as a gate.

## Rationale

- Cost per package: `+doc` 0.1 to 0.2 USD, `+req2` about 0.02 USD, the prompt line 0 USD. Against a median paid remediation of about 1.06 USD and orders of 19.99 to 24.99.
- Shadow mode makes the first package's data useful: `+doc` is new retrieval-free reading, so its precision is unknown and must not be guessed.
- Parent88 rather than a Child rule: the vagueness is created once in the master document and then copied into every sheet; fixing it there changes one place.

## Alternatives considered

- Promote all three cheap rows straight to auto-apply: rejected; none has a measured precision.
- Skip shadow and put them in sweeps only: rejected; that is the status quo the goal is to leave.
- Import Parent88 together with Child68: rejected; two simultaneous prompt changes cannot be told apart in two packages.
- Go to zero hand reads: rejected (decision 7).

## Consequences

- Each sweep now also reads `+doc` and `+req2` findings and records verdicts (CLAUDE.md step 7c).
- `sweep_exit_metrics` and `review_performance` gain two review versions to compare.

## Key files

`supabase/functions/review-package-quality/doc-probe.ts` (+ test), `index.ts` (`docProbe`, `requirementInsert`, second-pass wiring, modes `doc_probe` and `requirement_insert`), `review-core.ts` (own-alibi line), `temp-files/build-parent-v88.py` (not committed, gitignored), `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` (Addendum 104).

## Update 1 (2026-10-16, same day): the three cheap rows built, deployed and validated; Parent88 built

**Deployed** (`review-package-quality`, `npm run test:reviewer` passes with 13 new tests): `docProbe` (`mode: doc_probe`, shadow `+doc`), `requirementInsert` (`mode: requirement_insert`, shadow `+req2`), the own-alibi line in the main prompt, shadow findings excluded from the daily open-findings email (`isShadowReview`). Both probes run in the second pass after release, default on (`review_doc_probe`, `review_req_insert`; set to `off` to stop). Neither can edit a package.

**Validation (all on the real Till Death package, replays in memory, nothing stored):**
- **Row 2, own-alibi line:** Zoya's original sheet through the real main prompt: old prompt 0 findings, new prompt 1 finding, the exact defect (`round3_script`, "I walked past the head table ...", high). One sample, same model and input. Cost 0.03 USD for both runs.
- **Row 1, `+doc`:** the original script gave 0 findings (0.07 USD). I had called the reveal line "Own what you have already admitted" wrong because Willy "admitted nothing"; that was too strict: Willy's Round 2 script says "I'll admit I was loud about it", so the original line was defensible and 0 findings is arguably right (my fix, "Own what your distraction allowed", stays: it is true either way). To measure recall I planted 3 defects (Zoya "beside Lady Pearl at the family table", Willy "at the bar beside Dylissimo", "seven names crossed out" instead of three): 3 of 3 found, each with the sheets cited as the reason, plus the "already admitted" line, 4 findings, 0 that I would call false, 0.077 USD per run. Precision beyond one package is unmeasured, which is what shadow mode is for.
- **Row 3, `+req2`:** the two real missing quotes (the victim's last words, "the night everything comes out"): both proposals valid and verbatim, cost 0.006 USD. First version failed one: the second quote chose the sentence the first had just rewritten, so its proposal would not apply on its own; fixed by letting each requirement see the opening as it stands and merging a proposal that rewrites a sentence an earlier one introduced, so every stored finding applies to the real script alone. The proposed wording is serviceable, not elegant ("a promise of a surprise that would ..."); fine for a shadow finding, worth reading before promotion.

**Parent88 built, not imported** (`temp-files/build-parent-v88.py`, gitignored). Only modules 165 and 171 change (asserted, and reversing the two edits gives Parent87 exactly); the new wording is in decision 5. Import held until Child68 has two detective purchases of data (Jonathan's "assuming parent change can be done now, otherwise we can wait until after those have data": it can be built now and is, but importing it at the same time as Child68 would blur both measurements). Rollback is re-importing Parent87.

**Cost per package (new):** `+doc` 0.07 to 0.08 USD, `+req2` about 0.006 USD when a quote is missing, the prompt line 0.

**Promotion protocol, first reading:** every sweep records `human_verdict` on `+doc` and `+req2` findings (CLAUDE.md watch). `+doc` and `+req2` become auto-apply candidates at 8 judged findings over 5 packages at 90 percent real or better.

## Update 2 (2026-10-16, later): the registry blueprints are built when the data asks, not before

Jonathan: "Shouldn't we just build those once we're ready to actually import them?" Agreed. The blueprints come from short assert-checked scripts (minutes to rebuild), so building Parent89 and Child69 now would only risk rebuilding them when Parent88 or Child68 data changes anything, leave unimported files that can be imported by mistake, and pre-empt the question of whether the registry is needed at all. So decision 6 is split:
- **Now (small, no import):** a shadow check for the Eddie-type class that works on today's packages without a registry: a character a secret names may know it, but may not state it openly in a Round 1 field (introduction, rumors) unless the owner's own open text already says it. Today the leak probe skips named characters entirely. It runs in shadow (`+pub`, never applied, never emailed), is validated by replaying the Eddie/Tyson case, and its findings are the data on how often the class occurs. Plus the ADR-0167 design note and a count of how often the class has appeared in `package_review_misses`.
- **Later, on a trigger:** Parent89 (registry in the master document), the `characterContext.ts` whitelist change and Child69 are built and imported only when BOTH hold: Parent88 has its own data (two detective purchases after its import) and the `+pub` shadow data plus the sweep misses show the class recurring (at least 3 real sightings in the packages since 2026-10-16, or `+pub` precision of 70 percent or more with at least 2 real findings). If the class stays rare, the registry is not built and ADR-0167 says so.


## Update 3 (2026-10-16, later): the `+pub` shadow check is built; the registry question moved to ADR-0167

The small read-only check named in Update 2 is deployed as `+pub` (`review-package-quality` v49, shadow, kill switch `review_pub_probe`) and validated on the Eddie/Tyson case; the count of how often the class has occurred, the registry trigger (unchanged from Update 2) and the reasons Parent89, Child69 and the whitelist change are still not built are in ADR-0167.
