# ADR-0152: Free deterministic heals for section labels and renamed characters, and a cross-sheet secret check, so fewer defects need a sweep

**Status:** Accepted. Labels and roster heals live and switched on 2026-10-13; Child62 built, awaiting Jonathan's import; the paid secret check is built and OFF (needs a yes for a measured probe)
**Date:** 2026-10-12
**Related:** ADR-0103 Addendum 90 (the sweep that exposed it), ADR-0135 (Child language pack), ADR-0136/0138/0149/0150 (the reviewer), ADR-0069 (stale approved concept, prose-only drift), ADR-0103 Addendum 80 (free heals), North Star "Autonomous Quality"

## Context

The sweep of "Champagnens Skygge" (Danish slip, 17 characters) changed about 120 values although the package was complete, gate-clean and had passed the reviewer. Jonathan's question: how do we stop having to sweep for this? The reviewer scorecard (`select * from review_performance`) says where the system is blind:

| Class | Reviewer recall | What it means |
|---|---|---|
| Grammar and word slips (slip / detective) | 95 / 93 percent | the LLM judge works here |
| Wrong facts (slip / detective) | 79 / 55 percent | mostly works |
| Secret leaks (detective / slip) | 62 / 0 percent | a character states another character's secret |
| Cross-field contradictions (slip / detective) | 43 / 33 percent | needs the whole cast in view at once |
| Language slips (wrong-language labels) | 29 / 67 percent | the reviewer reads a label as normal text |
| "Other" | 0 percent | e.g. the customer's renames |

Of the 11 things the reviewer missed on Champagnens: about 60 of the ~120 edits were wrong-language or malformed section labels (German "Zur Person", "VERBÜNDETE", English "Why This Matters", wrong-gender "DIT HEMMELIGE"); 2 were customer renames that never reached the character sheets; 1 was one character stating another's secret; 1 a confession that cleared another cast member.

Causes found:
1. **Labels.** The Child language pack (ADR-0135) has tables for six languages only. For Danish, Swedish, Finnish, Korean, Japanese and Chinese the Child is told to "translate each label once", and in the Danish package it drifted to German and to inconsistent Danish. Nothing afterwards compares a label with its language.
2. **Renames.** A customer's late edit (a delta in chat) reaches `master_context` (the Parent reads everything after the approved snapshot, ADR-0059) but not the roster the Child uses for names, which comes from the snapshot (ADR-0069 deferred prose-only drift). Nothing compares the two afterwards.
3. **Secret leaks.** The reviewer reads one character at a time and judges "does this text reveal a secret"; a line that states another character's secret is read as ordinary content.

## Decision

Three levers, each in the order prevent, detect, heal, escalate. All healing code is deterministic and free unless stated; no new paid call is switched on without a yes.

1. **Labels.**
   - *Prevent:* add Danish and Swedish tables to `docs/language-pack/header-labels.json` (the single source of truth) and rebuild the Child as Child62 from Child61 so the pack carries them. Jonathan imports it. Finnish, Korean, Japanese and Chinese stay on "translate once" until an order exists.
   - *Detect and heal in one module* (`label-conformity.ts`, the ADR-0103 Addendum 80 lesson that detector and heal share one module): every whole-line header or bold label in a character field is classified against the labels of all languages and the English keys, by normalised exact match, otherwise by edit distance (at most 25 percent, a clear winner required). A label that belongs to the key K but is not this package's canonical wording for K is replaced by the canonical wording. This heals foreign-language labels, English labels, typos and wrong-gender variants. It does NOT touch synonyms that are not close to the canonical wording (cosmetic) and never touches prose.
   - *Where it runs:* before the LLM review inside the release queue (free, so the customer never sees the slip), in the second pass, and as `mode: conform_labels` for delivered packages (dry-run first). Language comes from the existing stopword detector; unclear language or no table means nothing is changed. Kill switch: `pipeline_settings.label_conformity = 'off'`.
2. **Renamed characters.**
   - *Detect and heal in one module* (`roster-reconcile.ts`): the names in the `master_context` relationship matrix (minus the victim and any non-playable name) are compared with the `mystery_characters` names. When exactly one matrix name is missing from the sheets and exactly one sheet name is missing from the matrix, they share a whole word, the new name appears in at least max(2, 25 percent) of the other sheets and the old name in none of them, the sheet is renamed (name, all its fields, pointform, `extracted_characters`). Anything less certain becomes an open high finding (visible in the daily email), never a write.
   - *Not done (prevention):* carrying the customer's late renames into the roster before the Child runs is a Make or edge-function change; the heal covers it now and the Child fix can follow if the heal fires repeatedly.
3. **Cross-sheet secret check.** A new reviewer pass that does not read sheets one by one. For every character's secret it retrieves, deterministically, the sentences in OTHER sheets that mention the owner and share rare words with the secret (a few dozen sentences per package), and asks the model one batched question: does this sentence reveal the secret to someone who should not know it? Findings are category `secret_leak`, never auto-applied (precision of the class is still about 85 percent), and appear in the daily email. This is **paid** (about 0.05 to 0.15 USD per package by estimate), so it is built behind `pipeline_settings.review_leak_probe = 'off'` and has a read-only `mode: leak_probe` for a measured test; turning it on needs Jonathan's yes.

**Not built here, designed only:** a cross-field contradiction pass (recall 33 to 43 percent). The idea is a claims table: one cheap extraction per character (where they say they were, amounts, times, who they accuse) and one final comparison over the table. It is a larger design with its own pilot; it should only be built after the pilot shows it beats the current propagation pass.

## Evidence required before each lever is switched on

- Labels: replay on the pre-fix Champagnens rows reproduces the hand edits; a dry run over all delivered non-English packages shows no change that is not a label (false positives = 0), reviewed by reading the diff.
- Roster: the replay on the pre-fix Champagnens rows finds exactly the two renames; a corpus scan of the other 2026-08-01+ packages finds no heal and the known false shapes (a non-playable victim, truncated names, titles) are skipped.
- Secret check: unit tests prove the pre-fix Jazz-Jo line is retrieved for Ingrid's secret; a paid probe on a known package measures precision before the flag is turned on.

## Rationale

About half of what the sweep changed is mechanical and checkable without a model, so a free check that runs on every package before release is both cheaper and more reliable than asking a model to notice it; the model is kept for judgment (leaks, contradictions). The scorecard shows the model is already at 93 to 95 percent on its strong classes, so more of the same judge is not the lever.

## Alternatives considered

- **A second identical LLM judge over every package.** The blind spots are structural (label reading, whole-cast comparisons, absent requirements); a second pass with the same view repeats them.
- **A bigger or higher-effort model for the reviewer.** Costs more per package and still reads one sheet at a time.
- **Only fix the Child prompt.** Necessary (Child62) but it has failed to hold before (ADR-0135 Consequences); the heal is the safety net.
- **Put the label and roster checks into the SQL completion gate.** Rejected: a second copy of the rules (the paired-predicate drift of Addendum 80); the module is the one place, and a gate hold would delay a customer for something the system can fix itself.

## Consequences

- Danish and Swedish labels become fixed wording; the tables have had no native-speaker review (same caveat as Dutch in ADR-0135). The JSON is the one file to edit; a test fails if the TypeScript copy and the JSON differ.
- Delivered packages are only changed by an explicit `conform_labels` run.
- A mis-heal is bounded: every write goes through the guarded path with a before-value in `auto_remediation_log` and a finding row, and the revert guard of the reviewer.

## Key files
- `docs/language-pack/header-labels.json`, `supabase/functions/review-package-quality/label-tables.ts`, `label-conformity.ts`, `roster-reconcile.ts`, `leak-probe.ts` (+ tests), `index.ts`
- `temp-files/build-child-v62.py`, `temp-files/MM Live - Child (Unified)62-DanishSwedishPack.blueprint.json` (gitignored; import into Make)
- `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 90

## State (2026-10-13)

**Live (review-package-quality v17, deployed by CLI, `verify_jwt` true):**
- `label-conformity.ts`, `roster-reconcile.ts`, `leak-probe.ts` (+ `label-tables.ts` generated from the JSON, tests, `npm run test:reviewer`). Both free heals run in the release queue before the model reads the text, and in the second pass; settings `label_conformity` and `roster_reconcile` are `on` (an unset or invalid value means `report`: compute and log `would_*` rows, write nothing). Every write goes through `remediation_write_field` with the blocking-defect revert guard and an `auto_remediation_log` row holding the before/after pairs. Manual modes: `conform_labels`, `reconcile_roster` (dry run unless `force:true`), `heal_scan` (read-only corpus scan), `leak_probe` (model calls only with `paid:true`).
- Design choices made while testing against real data (all in the tests): (1) the first version also normalised valid synonyms and typography and a scan of 120 delivered packages showed it would have turned French "Rôle :" into "Rôle:", Spanish "LA CÓMPLICE" into "EL CÓMPLICE" and Italian "ROUND" into "TURNO"; the final version acts only on wrong-language labels (exact match to another language or English, or one edit away from one) and on close typos or wrong-gender slips of this language's own label, never on case, spacing, gender articles or a different valid word (4+ letter edit); (2) the roster heal first fired on three S'more Heist sheets where the generator had simply invented fuller names than the customer's roster; it now also requires the old name to appear in `master_context` within 200 characters of a separate occurrence of the new name (the Parent writes the customer's rename down, as it did for Agnes and Signe), otherwise the mismatch is only logged and, once the heal is on, becomes an open high finding.
- Evidence: replay on the pre-fix Champagnens rows reproduces every hand edit (92 label edits incl. 46 Round 4 headers, plus two typos "ofret" that the hand sweep missed) and the two renames; the corpus scan of 120 completed packages since 2026-08-01 finds no rename and 15 non-English packages with label edits, almost all English leftovers, register slips (MI CONFESIÓN, MEINE ANSCHULDIGUNG) or typos; 2 packages (S'more Heist, Vanished Sketchbook) log an unresolved roster mismatch. First live write: the 4 remaining label edits on Champagnens (written, gate still clean, status completed).
- Secret check retrieval replayed on the pre-fix Champagnens sheets: 93 candidate sentences over 14 owners (about 8k tokens in total) and the Jazz-Jo line about Ingrid's mother is among Ingrid's candidates.

**Built, waiting for Jonathan:**
- `temp-files/MM Live - Child (Unified)62-DanishSwedishPack.blueprint.json` (built by `temp-files/build-child-v62.py` from Child61; only the 8 pack formulas differ, +9.5k characters in total). Import, test one Danish character, then make it the live Child. Cost: about 1.2K extra input tokens per call for Danish and Swedish orders only; English unchanged.
- Cross-sheet secret check: needs a yes for a measured paid probe (estimate 0.3 to 0.6 USD for a 17-character package, hard cap 0.6 per run in code). Then `review_leak_probe` can be set to `on` (about the same per paid package, inside the shared 10 USD daily cap).

**Not built:** the cross-field contradiction pass (claims table), and carrying the customer's late renames into the roster before the Child runs.
