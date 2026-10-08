# ADR-0147: Make.com reads the model's answer with a fallback (textResponse, then content[].text, then content[2].text)

**Status:** Accepted (Parent81 and Child61 built 2026-10-08; NOT yet imported; first live purchase and the re-fire of "Death And Dumplings" will be the test)
**Date:** 2026-10-08
**Related:** ADR-0146 (superseded in part), ADR-0145 (Sonnet 5.5 adaptive thinking), ADR-0103 Addendum 88 (the incident), Addendum 87 (Montero Manor)

## Context

ADR-0146 replaced every `{{N.content[].text}}` with `{{N.textResponse}}` because `content[].text` came back empty when the model emitted a thinking block first (Montero Manor, `detective_script` NULL). The first live purchase on Parent80/Child60, "Death And Dumplings At Madwimmin House" (2026-10-07, two runs), failed the other way round: Master Doc Part 1 (module 165) and Part 2 (4010) returned a complete answer, yet `master_context` saved '' and the game overview module, whose prompt embeds `{{165.textResponse}}{{4010.textResponse}}`, replied that the master_context "arrived empty". Jonathan's reading of the Make execution (module 158 input shows `master_context: ""`; module 165 and 4010 output: `content[0]` is `type: text` holding the full answer, `thinking` tokens 0, about 8,000 output tokens, `stop_reason` empty) shows the model call is fine and `textResponse` resolved blank for these two modules, while it resolved correctly for the detective script and game overview modules in the same run.

So neither read is reliable alone: `content[].text` fails when a thinking block comes first, `textResponse` failed on the 32,000-`max_tokens` Master Doc modules. Why (an empty `stop_reason` suggests these large calls come back through a different path in the Make module; unproven) is not settled.

## Decision

1. Parent81 (from Parent80) and Child61 (from Child60): every `{{N.textResponse}}` becomes `{{ifempty(N.textResponse; ifempty(N.content[].text; N.content[2].text))}}` (84 reads in the Parent, 8 in the Child). Order: `textResponse`; then the Parent79 read (worked for 165/4010 when no thinking block); then the second content block (the answer when a thinking block is first).
2. Nothing else changes (models, effort, thinking, `max_tokens`, prompts, routing). `temp-files/build-textresponse-fallback-parent81-child61.py` builds and verifies by path-level diff; scenario names inside the blueprints are "MM Live - Parent81" and "MM Live - Child (Unified)61".
3. The re-fire of the held package waits until Parent81 is imported (a third run on Parent80 would probably repeat).

## Rationale

It does not depend on explaining the Make module's behaviour, only on the fact that each of the three reads has been seen to work in some shape of response. The expression has no quotes, so no JSON escaping inside prompt strings.

## Alternatives considered

- **Revert to Parent79/Child59.** Brings back the empty detective script; rejected.
- **`join(map(N.content; "text"; "type"; "text"); "")`.** Covers every block layout in one expression, but the `map` filter syntax is unverified in Make; kept as the next step if the nested `ifempty` fails.
- **Lower `max_tokens` on 165/4010 to change the response path.** Unproven guess about the cause; rejected.
- **Assemble `master_context` by hand from the pasted outputs and regenerate characters only.** The overview, materials, detective script and evidence cards (and their paid Flux images) were all generated against an empty master context, so a partial repair leaves wrong content.

## Consequences

- Unverified until a run: that Make accepts `content[2].text` and `ifempty` on an array expression inside prompt strings. First checks after import: `master_context` non-empty and about 50k chars, game overview names the victim, characters created, `detective_script` and `evidence_cards` non-empty. An import error or an empty field means move to the `map` form.
- Still open (follow-up, not built): a Make-side stop right after module 158 when `master_context` is empty, so a blank value fails the Parent instead of firing the Children and the paid auto-repair; and a DB gate condition for empty `master_context` on its own.

## Discussion

Jonathan's question was whether Sonnet 5.5 is the cause. The output of 165 and 4010 is good and consistent, so the model is not the problem; the plumbing between the model response and the saved field is, and adaptive thinking changed the response shape that plumbing sees. He supplied the module 158 input, the 165 output structure and the confirmation that 4010 is the same, which turned two equally likely explanations (failed call vs blank `textResponse`) into one.

## Key files

`temp-files/build-textresponse-fallback-parent81-child61.py`, `temp-files/MM Live - Parent81 (textResponse With Fallback).blueprint.json`, `temp-files/MM Live - Child (Unified)61-TextResponseFallback.blueprint.json` (gitignored like earlier blueprints); `docs/adr/0146-read-textresponse-not-content-text-in-make.md`.
