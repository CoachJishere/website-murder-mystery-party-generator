# ADR-0145: Claude Sonnet 5.5 at medium effort with adaptive thinking across the generation pipeline

- **Status:** Accepted, imported 2026-10-06; the first live runs exposed a side effect of adaptive thinking (see Addendum 1), fixed downstream by ADR-0146/0147
- **Date:** 2026-10-06
- **Related:** ADR-0074 (blanket Sonnet 5 upgrade), ADR-0098 Addenda 7/8 (stale hardcoded models), ADR-0135/0142 (quality work this should be measured against)

## Context

Jonathan wanted every Anthropic call in Make.com on Sonnet 5.5 at medium effort, and believed everything was still on Haiku. He set module 171 (Parent, detective-style murder, "Master Doc - Part 1") to `claude-sonnet-5-5` + effort `medium` by hand in Make and exported that as `Parent78`.

Inspection of `Parent78` and `Child (Unified)58`:

- **Nothing was on Haiku.** All 28 Parent and 8 Child modules already sent `model: "claude-sonnet-5"` (ADR-0074). What still said "Claude Haiku 4.5" was Make's cached `metadata.restore.expect.model.label`, a UI-only label never refreshed after the ADR-0074 edit. (If an execution's output `model` field ever shows Haiku, that contradicts this and needs a fresh look.)
- **Module 171's `thinking: {type: "disabled"}` is invalid on Sonnet 5.5.** The API returns a 400 for `disabled` on `claude-sonnet-5-5` (only `adaptive`, omitted, or `between_tools` are accepted), and Make's own option label says "Not available for Opus 5.5/Sonnet 5.5 at any effort". Sonnet 5 accepted `disabled`, so copying 171 verbatim would have 400'd every call.
- `temperature: "1"` is the default and stays valid (only non-default values 400). No prefill, `top_p`/`top_k`, system field or forced `tool_choice` exists in any module.

## Decision

`Parent79` (from Parent78) and `Child (Unified)59` (from Child58): every Anthropic module (28 + 8) gets `model: claude-sonnet-5-5`, `effort: medium`, `thinking: {type: "adaptive"}` (Jonathan's choice among adaptive / omitted / disabled-and-test).

Adaptive thinking tokens count against `max_tokens`, so the caps were raised (a cap is a ceiling, no cost unless used): 1000 and 2000 to 8000, 4000/5000/6000 to 12000, 8000 to 16000, 16000 to 24000, 32000 unchanged.

Parent modules also take Make's own export metadata from module 171 (`expect`, `interface`, model/effort/fallbacks restore entries), and the stale `restore.expect.thinking` label is dropped so Make re-derives it. Child modules keep their minimal script-built metadata (mapper-only change). Build script: `temp-files/build-sonnet55-parent79-child59.py` (gitignored, like the blueprints).

## Alternatives considered

- **Omit the thinking field:** same behaviour as adaptive on Sonnet 5.5 (adaptive is the default), nothing pinned in the UI. Rejected as less explicit.
- **Copy 171 exactly (disabled) and test one run first:** expected 400 on every call; a throwaway test scenario was started and then dropped when Jonathan chose adaptive.
- **`thinking: between_tools`** (the API's way to turn thinking off on Sonnet 5.5): not in Make's connector enum for the thinking type, so not usable from the module UI.

## Consequences

- Same per-token price as Sonnet 5 ($2 / $10 per MTok); **real cost rises with the thinking tokens adaptive mode spends**, and wall-clock per call rises with it. Not measured yet: compare Make execution output tokens and run time per module with the pre-import baseline.
- Quality effect unmeasured. Judge it with the reviewer finding counts in `docs/autonomy-scoreboard.md` (about 13 per English package, ADR-0142) on the first packages after import.
- Child timeouts and the Parent-to-Child webhook chain were tuned on non-thinking calls; watch for slower generations (ADR-0138 client timeouts were already raised).
- `claude-sonnet-5-5` is Sonnet 5.5's own ID; edge functions that hand-implement Anthropic calls were not touched (run the grep in CLAUDE.md "Model Upgrades" if those should follow).

## Key files

- `temp-files/MM Live - Parent79 (Sonnet 5.5 Medium Adaptive).blueprint.json`, `temp-files/MM Live - Child (Unified)59-Sonnet55MediumAdaptive.blueprint.json` (gitignored, local)
- `temp-files/build-sonnet55-parent79-child59.py`

## Addendum 1 (2026-10-12): adaptive thinking broke the answer reads, not the model choice

This ADR's "Consequences" listed latency and cost as the risks to watch; the real one was missed. With adaptive thinking on, the response `content` array can start with an empty `thinking` block, so every `{{N.content[].text}}` read in the blueprints evaluated empty (84 reads in Parent79, 8 in Child59) while Make still reported success through the Resume error handler. Montero Manor saved `detective_script` as NULL (ADR-0103 Addendum 87); the new completion gate held the package. ADR-0146 (Parent80/Child60) switched to `textResponse`, which then came back blank on the 32,000-token Master Doc modules (Death And Dumplings, ADR-0103 Addendum 88); ADR-0147 (Parent81/Child61, verified live) reads with a fallback chain. The model, effort and thinking choice themselves were kept.

**Lesson for any future model or thinking change:** before importing, grep every `content[].text` / `textResponse` read and test one run of a multi-block-response module (large `max_tokens` included); a green Make run is not proof the field was populated.

