# ADR-0146: Make.com reads the model's answer from `textResponse`, not `content[].text`

**Status:** Accepted (Parent80 and Child60 built and imported into Make.com 2026-10-07; first live purchase still to confirm)
**Date:** 2026-10-07
**Related:** ADR-0145 (Sonnet 5.5, adaptive thinking on every module), ADR-0103 Addendum 87 (the incident), ADR-0138 (review before release)

## Context

ADR-0145 switched all 28 Parent and 8 Child Anthropic modules to `claude-sonnet-5-5` with `thinking: adaptive` (Sonnet 5.5 rejects `thinking: disabled`). With adaptive thinking the model decides per call whether to think, and when it does, `content[0]` is a `type: thinking` block (empty `thinking`, a `signature`) and the answer sits in a later block. Every save in the blueprints reads the answer as `{{N.content[].text}}`.

"Murder At Montero Manor" (paid, 2026-10-07, first generation after Parent79/Child59 were imported) saved `detective_script` as NULL on two consecutive runs while Make showed a successful execution. Jonathan's pasted output of module 5004 showed `content[0] = thinking` and the full script in the text response. The module has a "Resume" error handler and no step checks the value, so an empty read passes silently; the customer received a ready email for a package with no detective script (caught by the customer, then by the new `missing_core_content` gate). The evaluation of `content[].text` by Make was not reproduced from here; the evidence is the pasted structure plus the NULL.

The same expression is read 84 times in Parent79 and 8 times in Child59, and the model chooses to think per call, so any of them can come back empty at random. Gated today: empty detective script, empty character branches. Not gated: empty `host_guide`, `materials`, evidence cards.

## Decision

1. Parent80 (from Parent79) and Child60 (from Child59): every `{{N.content[].text}}` becomes `{{N.textResponse}}`. `textResponse` ("Text Response") is a top-level output of `anthropic-claude:createAMessage`, already present in every module's interface metadata and in the Resume handlers' empty mappers, and it held the full script in the failing execution.
2. Nothing else changes: models, effort, thinking, `max_tokens`, prompts and routing are untouched. `temp-files/build-textresponse-parent80-child60.py` builds both and verifies by a path-level diff (84 reads in 56 strings and 8 reads in 8 strings are the only differences besides the scenario name; all 28 and all 8 referenced modules are Anthropic modules; zero `content[].text` left).
3. The scenario name inside the blueprints is set to "MM Live - Parent80" and "MM Live - Child (Unified)60" so the import is distinguishable (Parent79's inner name still read Parent77).

## Rationale

The fix targets exactly the read that fails, uses a field the module documents and exposes, and is verifiable by diff, so it cannot alter generation. A wrong field name would not throw; it would read empty, the same symptom, so the first runs after import are checked explicitly (below).

## Alternatives considered

- **A throwaway Make scenario with 5 short calls testing extraction variants (Jonathan's proposal).** Cheap, but it would test one thing that the pasted execution already shows (the text is in `textResponse` when a thinking block is present); the remaining uncertainty (does `textResponse` also fill when no thinking block is emitted) is covered by the same free check on any existing execution and by the first purchase. Not built; can still be built if the free checks disagree.
- **`thinking: disabled`.** Rejected by Sonnet 5.5 (400), ADR-0145.
- **A formula that filters the text block (`join(map(N.content; "text"; "type"; "text"); "")`, `last(N.content).text`).** Exact Make syntax unverified; more moving parts than reading a field the module already provides.
- **Leave as is and rely on the DB gate.** The gate only covers fields it knows about; host guide, materials and evidence cards would still ship empty without an alert.
- **A post-save "non-empty" guard in Make.** Worth adding later (a filter or router after each save); not part of this mechanical change.

## Consequences

- After import, free checks before the next purchase: in the 2026-10-07 06:37 execution, module 100 / 15301 input shows `detective_script` empty (confirms the cause), module 5004 output shows `textResponse` filled (confirms the fix target).
- First purchases after import (watch item in CLAUDE.md): `detective_script`, `evidence_cards`, `host_guide`, `materials` and `game_overview` all non-empty; character sheets still full; Child modules unchanged in behaviour.
- If a field is empty again with Parent80 live, the read is not the cause: look at the module's output (`stop_reason`, `usage.output_tokens`, error-handler route) in Make before changing anything else.
- Open: consider extending the gate to `host_guide`, `materials` and `evidence_cards` (corpus check first; two historic packages have null evidence cards).

## Discussion

Jonathan reported, correctly, that Make showed no stop and every Child run succeeded, and that the detective script was module 5004 on his route, not 5000; both corrections changed the diagnosis from "the module errored" to "the module succeeded and the save read the wrong place". He offered a test scenario with several short calls or a straight Parent80/Child60; the straight build was chosen because the field already exists and the pasted output demonstrates it.

## Key files

`temp-files/build-textresponse-parent80-child60.py`, `temp-files/MM Live - Parent80 (Read textResponse).blueprint.json`, `temp-files/MM Live - Child (Unified)60-ReadTextResponse.blueprint.json` (blueprints are gitignored, like earlier versions); `docs/adr/0145-sonnet-5-5-medium-adaptive-across-generation-pipeline.md`; `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` (Addendum 87).
