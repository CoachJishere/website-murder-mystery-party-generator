# ADR-0136 calibration pilot (2026-10-03)

Run locally, report-only: nothing here writes to the database. Model `claude-sonnet-5-5` ($2 in / $10 out per million tokens, cache reads $0.20).

- `pilot.py <package.json> <label> <out.json>`: per-character review. Shared prefix (instructions + `master_context` + roster dossier) is prompt-cached; one structured-output call per character; hard cost cap (`PILOT_CAP`), effort via `PILOT_EFFORT`. Needs a package export (`mystery_packages` + `mystery_characters` rows as JSON).
- `ground_truth.py`: the 28 hand-edit locators for "Boogie Nights", tagged by ADR-0137's classes (single_gen 6, wrong_fact 3, cross_call 1, pronoun 12 prose locations, mechanical 6).
- `score.py`: matches findings to ground truth (same character + field, quoted span overlaps the known defect).
- `adjud_v1.py`: my by-hand adjudication of the first run's 47 unmatched findings.
- `results/`: raw output of all five runs. Results and conclusions: ADR-0136 Addendum 2.
