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


## Addendum 2 (2026-10-15): latency measured, cost still unmeasured, stale edge-function models listed

Report only. No blueprint, edge function or prompt was changed, and no paid API call was made (reads of Supabase and of Make's execution log only).

### Cutover time was wrong in `prompt_version_history`

Make's scenario log (type `modify`, unlabelled) shows the edits that most likely put Parent79 and Child59 live at **2026-10-06 20:34 UTC (Parent 9106101; Child 9061052 at 20:34 and 20:50)**; they are the only edits that day after a 09:23 Parent edit, which fits Jonathan's hand edit of module 171 into Parent78, then Parent80/Child60 on 2026-10-07 07:27 and Parent81/Child61 on 2026-10-08 07:01. The rows seeded in `prompt_version_history` say 12:19 and 12:59 on 2026-10-06 (`approximate = true`), which is about 8 hours early. Packages created 10-06 19:52 and 20:04 therefore ran on Sonnet 5, not 5.5. Not corrected in the table (report-only task); correcting versions 79/59 to the Make times is a one-line UPDATE if Jonathan agrees.

### What data exists

| Source | What it holds | Use |
|---|---|---|
| `mystery_packages.generation_started_at`, `quality_review_started_at`, `generation_completed_at` | Wall-clock per package. Since ADR-0138 (2026-10-04) `generation_completed_at` is written at review release, so this addendum uses `quality_review_started_at` (gate passed) as the end where present | Package wall-clock |
| Make API `GET /scenarios/{id}/logs` (token in `.env`, host `eu2.make.com`, max `pg[limit]` 50, needs a non-default User-Agent) | Per execution: `duration`, `operations`, `transfer` (bytes), `status`. Retention reaches back to 2026-09-12 (Child) and 2026-09-15 (Parent) | Per-call-chain latency |
| `generation_attempts`, `child_generation_attempts` | Attempt counts; the child table is an AFTER INSERT snapshot of field lengths on `mystery_characters`, NOT final output size | Re-fire detection only |
| `package_reviews.tokens/cost_usd`, `auto_remediation_log.cost_usd` | Spend of the reviewer and the paid heals only | Not generation |

**Token counts and cost for the Make generation calls are stored nowhere.** Make's module output (which carries `usage`) is UI-only, and the API log has no token field. ADR-0019 Addendum 1 estimates input spend from character counts (about 53 USD per month for Child `master_context`), which is input only; the part ADR-0145 flagged as the risk, adaptive thinking tokens billed as output at 10 USD per MTok, is unmeasured. Nothing here supports a cost number, up or down.

### Latency, 9-day windows each side of 2026-10-06 20:50 UTC (before 09-27 20:50 to 10-06 20:50; after 10-06 20:50 to 10-15 20:50)

Make executions (status 1 only; medians, with p25/p75):

| Scenario | Before | After |
|---|---|---|
| Child (one run per character) | n=284 (283 ok): 91.6 s (84.7 / 117.3) | n=201 (all ok): 84.5 s (59.3 / 102.1) |
| Parent (one run per package) | n=23 (22 ok): 558.9 s (471.8 / 609.0) | n=18 (17 ok): 474.5 s (349.3 / 575.1) |

Operations per run are flat (Child 19 to 20, Parent 58.5 to 57). Transfer per run is flat for Child (182 to 197 KB) and lower for Parent (5.1 to 3.5 MB, wide spread driven by cast size). A longer before-baseline (log start to cutover: Child n=649, median 97.0 s; Parent n=46, 560.0 s) agrees. **No sign that adaptive thinking slowed generation or inflated responses.** Make reports a green run even when a field read comes back empty (Addendum 1), so the near-zero Make failure rate (Child 1 of 284 before, 0 of 201 after) says nothing about quality.

Package wall-clock (single-attempt packages, 0 to 120 minutes, test packages excluded): before n=17, median 21.8 min (1.83 min per character); after n=8, median 10.9 min (0.91 min per character). **This is underpowered and style-mixed**: before was 14 detective and 6 slip, after 5 detective and 8 slip. Detective alone: 17.1 min (n=13) to 23.9 min (n=3); slip alone: 38.4 min (n=4) to 6.1 min (n=5). Read it as "no evidence of a slowdown", not as a speed-up. The 120-minute cutoff was chosen after looking at the rows.

Reliability signal, same windows: packages excluded as re-fired or longer than 120 minutes went from 3 of 20 (15 percent) to 5 of 13 (38 percent). The documented causes in the second window are the empty-read incidents (Addendum 1; ADR-0103 Addenda 87/88) and gate holds (for example a 30-hour hold on Lip Sync For Your Life); the 5,203-minute package (created 2026-10-09 18:03) was not root-caused here.

### Model grep (CLAUDE.md "Model Upgrades" command, plus a wider one)

The prescribed grep only reads `supabase/functions/*/index.ts`. The wider grep (all `.ts` under `supabase/functions`) adds one hit it misses, `review-package-quality/review-core.ts:14`.

| Hit | Model | Thinking | Verdict |
|---|---|---|---|
| `mystery-webhook-trigger` lines 96 and 300 | `claude-haiku-4-5-20251001` | none (temperature 0) | Deliberate: language ID (10 tokens) and roster JSON extraction, narrow deterministic tasks (ADR-0112) |
| `review-package-quality/review-core.ts:14` (env `REVIEW_MODEL` overrides) | `claude-sonnet-5-5` | n/a | Deliberate, already 5.5 (missed by the prescribed grep) |
| `mystery-ai/index.ts:733` (customer concept chat) | `claude-sonnet-5` | `disabled` | Left behind, not decided: ADR-0145 scoped to Make. Latency-sensitive chat, thinking off on purpose |
| `regenerate-child-content` :122, `regenerate-parent-content` :31 | `claude-sonnet-5` | `disabled` | Left behind: ADR-0098 Addenda 6/7 set Sonnet 5 to match the live blueprint; the blueprint is now 5.5 so parity is gone. Paid, manual re-fire only |
| `adapt-mystery-apply` :332 | `claude-sonnet-5` | `disabled`, effort medium, structured outputs | Left behind, not decided (Remove a Character path) |
| `generate-pointform-summaries` :52-53 | `claude-sonnet-5` | `disabled` for Sonnet | Deliberate move off Haiku on 2026-09-10; still Sonnet 5, left behind by ADR-0145 |

ADR-0145 itself says (Consequences, last bullet) that these hand-written calls "were not touched". **A model-string bump alone is not safe for any of the five Sonnet 5 callers:** each sends `thinking: {type: "disabled"}`, which Sonnet 5.5 rejects with a 400, and any that reads `content[0].text` meets the blank-read class from Addendum 1. Also outside the edge functions: `scripts/generateSeoDigest.mjs` (claude-opus-4-8) and `scripts/complete-terminus13-roster.mjs` (claude-sonnet-5, one-off); not part of the pipeline.

### Recommendation

1. **Keep medium effort with adaptive thinking.** Latency did not regress on 485 Child and 41 Parent executions, and nothing in the stored data argues for a change.
2. **Do not tune effort, thinking or `max_tokens` per module yet.** The data needed (output tokens per module) is not available through any API; a per-module change would be a guess.
3. **Cheapest way to start capturing tokens:** read the Make-key spend by day and model in the Anthropic Console usage page (zero code; only works if the Make connection uses its own key or workspace, which needs checking). For per-package numbers, add one Make module after each Parent and Child run that posts `usage.input_tokens` and `usage.output_tokens` to a small table; that needs a blueprint import, so it needs Jonathan's yes first. Arithmetic for reading either result: output costs 10 USD per MTok, so each 1,000 thinking tokens on one call costs 0.01 USD.
4. **Leave the edge functions on Sonnet 5 for now.** Moving them to 5.5 means dropping `thinking: disabled`, raising `max_tokens`, and fixing the content-block read, per function, with a test run; no measured benefit justifies the risk. Revisit if Sonnet 5 is retired.

### Not done / open

- `prompt_version_history` rows for 79/59 (and 80/60, 81/61) still carry the approximate times.
- Token and cost capture not built (needs a yes).
- Eval prompt for this work: see the kickoff conversation; not run.
