# ADR-0133: Parent/Child Make.com prompt audit — remove the duplicate Part 1 injection, leave the rest

- **Status:** Accepted
- **Date:** 2026-10-01
- **Related:** [ADR-0131](0131-quality-check-machinery-audit-and-consolidation-proposal.md) (the audit this one is a sibling of), [ADR-0093](0093-explicit-language-parameter-for-child-generation.md) (explicit `language` for Child)

## Context

After ADR-0131 audited the quality-check machinery for redundancy, Jonathan asked whether the same audit was needed for the Make.com Parent and Child prompts. His prior was "probably no — the prompts are repetitive on purpose, to reinforce the model, and the self-heal layer backs them up", but nobody had looked at them holistically in a while. A read-only look at Parent71 and Child48 (all 36 `anthropic-claude:createAMessage` modules extracted and measured; no API calls made) found:

- **All four Part 2 prompts (nodes 3000/4010/4020/4030) inject Part 1's full output twice** — once in `<part_1_input>` and again inside `<input_data>`, same variable both times. Part 1 averages ~37K chars (~9K tokens; 72 packages, last 45 days).
- Parent Part 2 states its output contract four times (role, `output_format`, `critical_reminders`, `no_markdown_critical`); the evidence "don't name the culprit" rule appears ~5 times.
- The Child `content_coherence_rules` block (~6 KB) is copied into all 8 child calls and is **in sync** apart from intentional differences (healthy). Minor: the three secret rules go to calls that don't write `secret`; node 405 carries an accomplice `finalStatement` exception it can't use (that field is written by 409, whose own schema already handles it) — dead text, not a live bug.
- Parent Part 1/Part 2 say "respond in the language the user writes to you" (inferred), while Child uses explicit `{{63.language}}` and the 5xxx/151xx prompts follow master_context.
- The dominant input cost is not prompt wording: `master_context` averages ~62K chars (~16K tokens) and rides along on every child call.

## Decision

1. **Do:** Parent72 removes the second Part 1 copy from `<input_data>` in nodes 3000/4010/4020/4030, keeping the `<part_1_input>` copy (it carries the "context only, do NOT echo" instruction). Built by `temp-files/build-parent-v72.py` from Parent71; diffed against Parent71 — exactly those four prompt texts (~70 chars each) and the blueprint name differ.
2. **Skip:** collapsing the repeated output contract / evidence rules. Only ~700 chars (~200 tokens) per prompt is verbatim duplication, and it is the text that prevents unparseable JSON and Part 1 echo — a slip there fails the whole generation. Not worth it.
3. **Defer:** switching Parent's language instruction to `{{63.language}}`. It is a behavior change, not de-duplication; no Parent language failure has been observed; and the Parent70/Child45 register fix still hasn't been exercised on a real non-English purchase. Revisit after that test. (`language` is safe to reference — it is in module 63's interface since Parent56, and already forwarded to Child.)
4. **Not touched, on purpose:** the Child receiving the full `master_context`. Jonathan recalls it was added because child accuracy suffered without it; unverified either way. If revisited (trimming per call, or prompt caching if the Make Anthropic module supports it), it should be an A/B on a few packages against the self-heal detectors, as its own decision.
5. **Not done (cosmetic):** scoping the secret rules / removing the dead node-405 exception — candidates for the next Child version if one ships anyway.

## Rationale

- Item 1 is the only change where the information in the prompt is provably identical before and after: the removed line is the same Make variable as the one kept, and nothing downstream reads prompt text (the Part 1 + Part 2 merge consumes Part 1's module output directly). ~9K fewer input tokens per mystery.
- The rest is either tiny, risky relative to its savings, or not the same kind of change. Jonathan's condition for items 2/3 was "only if it's literally the same information doubled up" — item 2 mostly isn't (it's deliberate reinforcement), item 3 isn't at all.

## Alternatives Considered

- A full ADR-0131-style audit with a consolidation proposal: rejected as disproportionate; the findings above are the whole yield.
- Deleting all repeated output-contract text: rejected (see Decision 2).

## Consequences

- Parent72 was imported into Make.com by Jonathan on 2026-10-01 (no Make API access in this workflow, so import is manual). **Imported, but not yet verified on a real generation.** After import, the first real generation should be checked that Part 2 still completes and the merged `master_context` has both halves (look for `evidenceProgression`/`hostBriefing` for detective-style, or the 7 Part 2 groups for character-style).
- Per-mystery input tokens drop by roughly one Part 1 (~9K) for the one Part 2 call.

## Key files

- `temp-files/MM Live - Parent72 (Part1 Single Injection).blueprint.json` (gitignored), `temp-files/build-parent-v72.py`
- Source: `temp-files/MM Live - Parent71 (Reveal Name-Fusion Guardrail).blueprint.json`
