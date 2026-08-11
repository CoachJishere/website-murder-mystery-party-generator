# ADR-0068: Roster-line annotation between name and dash silently drops a character

- **Status:** Accepted
- **Date:** 2026-08-07
- **Related:** ADR-0063 (structural roster continuation parsing), ADR-0064 (roster-count-mismatch guardrail + detector), ADR-0057 (select by parse, not header)

## Context

Customer (Heather, `heather.aadb@outlook.com`, conversation `ac2c3610-7078-477a-9375-18e1a282a034`, "The Host Herself") asked mid-chat for a 12th "optional player" character, the assistant built one in ("Blaire/Blair Ashford"), and she approved a concept snapshot listing:

```
12. **Blaire/Blair Ashford** *(OPTIONAL PLAYER)* – Vivienne's unpredictable older sister...
```

She paid 20 minutes later. `mystery_characters` ended up with only 11 rows — Blaire never generated, despite `game_overview` (a separate generation call) correctly saying "twelve women present," proving the 12-person roster was known upstream and only one specific pipeline stage lost her.

Root cause, confirmed with a live regex test against both lines:

```js
const characterLineRegex = /^\d+\.\s+(?:\*\*(.+?)\*\*|([A-Z...].+?))\s*[-–—:]\s*(.+)/;
characterLineRegex.test("11. **Quinn Marchetti** – A well-regarded philanthropist...")  // true
characterLineRegex.test("12. **Blaire/Blair Ashford** *(OPTIONAL PLAYER)* – Vivienne's...")  // false
```

`characterLineRegex` in `supabase/functions/mystery-webhook-trigger/index.ts` requires the bolded name to be followed, after only optional whitespace, by a `-–—:` separator. The italic `*(OPTIONAL PLAYER)*` annotation between the closing `**` and the dash breaks the match — there's no backtrack path that satisfies the pattern, since only one `**...**` pair exists on the line. The header-path parse (`extractRosterFromMessage`) silently returns 11 characters instead of 12; nothing errors, nothing logs a count mismatch, the pipeline proceeds as if 11 was always the roster.

This is a sibling of ADR-0063's fix — same function, same "the model's wording keeps drifting, parse the shape not the text" lesson — but a different literal trigger. ADR-0063 fixed a subheading (`### Optional Characters`) breaking the *section-continuation* scan. This is an inline annotation breaking the *per-line* character match. Neither fix covers the other's case.

It also was not caught by either existing safety net:
- **ADR-0064's prompt guardrail** targets the model *inventing* an unrequested optional tier unprompted. Here the customer explicitly asked for and approved an optional 12th player — a legitimate, deliberate request the guardrail was never meant to block, and the parser still couldn't read it.
- **ADR-0064's roster-count-mismatch detector** (`scripts/detect-roster-mismatches.mjs`) would have caught this — it re-parses the approved snapshot with the shipped extractor and diffs against actual row count — but it's a scheduled Node script, not one of the SQL detector functions (`list_packages_with_structural_defects` etc.) checked in this investigation initially. It runs on a rolling window in CI; this package fell in the gap between purchase and its next scheduled run at the time this was found manually.

## Decision

Two parts, mirroring ADR-0063/0064's prevention-plus-detection pattern:

1. **Immediate customer fix (shipped same day, see CHANGELOG 2026-08-07):** hand-authored Blaire's full character record directly in the database — not a Make.com regenerate — since regenerating would have re-rolled all 12 characters' content non-deterministically for a single missing row. Same package also got the ADR-0067 reveal-confession split applied to all 12 characters, since it was generated on the pre-fix blueprint and needed that patch regardless.
2. **Parser fix (this ADR, implementation follows in the same change):** widen `characterLineRegex` to tolerate an optional parenthetical/italic annotation between the name and the separator, so a line like `**Name** *(anything)* – description` parses the same as `**Name** – description`. The fix targets the *shape* (name, optional annotation, separator, description) rather than special-casing the literal string "OPTIONAL PLAYER" — the same principle ADR-0063 and ADR-0064 already established for this file: match structure, not wording, because the model's phrasing for "this character is different somehow" will keep drifting.

## Rationale

- **Structural fix over literal-string fix.** Special-casing `*(OPTIONAL PLAYER)*` would fix today's incident and nothing else — the next customer-requested annotation could be `*(if numbers allow)*`, `(late addition)`, or any other wording. A regex that tolerates *any* short annotation between name and separator survives wording drift the way ADR-0063's structural continuation check does.
- **Hand-patch over regenerate for the live customer.** Consistent with the precedent set for Raleigh's package in ADR-0067's changelog entry: a full regenerate risks non-deterministic drift in 11 characters' content that were already correct, to fix one missing row. A targeted, voice-matched hand-patch has a much smaller blast radius.
- **No metered API calls.** All of Blaire's content and the 11 existing characters' reveal-confession split were authored directly, per the standing policy against unauthorized Anthropic/OpenAI usage — this was pure writing work, not model inference against a paid key.

## Alternatives Considered

- **Special-case-strip `*(OPTIONAL PLAYER)*` before matching.** Rejected for the reason above — fixes one literal string, not the class of bug.
- **Regenerate the whole package via Make.com once the blueprint supports 12.** Rejected for this specific customer: too much blast radius on already-correct, already-purchased content for a single missing character.
- **Leave the parser as-is and rely solely on the ADR-0064 detector to catch future instances.** Rejected: detection without prevention means every future instance becomes a live incident needing a manual hand-patch, which is exactly the cost this fix is meant to avoid going forward.

## Consequences

- Fixes future generations where a customer-approved roster line has an inline annotation between name and separator (any wording, any bracket style).
- **Does not backfill:** other already-completed packages that may have hit the same bug are not swept in this pass. A scan for other paid packages whose approved concept snapshot contains a similar bracketed/italic annotation pattern on a numbered character line is flagged as follow-up, not done here.
- **Does not touch the batch-path (header-agnostic) regex** if it turns out to share the same limitation — should be checked in the same pass as the header-path fix, since `boldCharRegex` has an analogous structure.
- **Deployed 2026-08-11** (function version 122 → 123, `verify_jwt: false` preserved). Confirmed live via `mcp__supabase__get_edge_function` immediately after deploy. Local git had carried this fix (plus the pre-existing, likewise-undeployed ADR-0063 peek-ahead subheading fix) since 2026-08-07 without reaching production — a 4-day gap during which any customer hitting either bug would not have been protected. Verified against source, not assumed: re-fetched the deployed function post-deploy and diffed the regex lines directly.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `characterLineRegex`, `extractRosterFromMessage`
- `scripts/detect-roster-mismatches.mjs` — existing detector, unchanged by this fix
- Package hand-patched: `mystery_characters` / `mystery_packages` for conversation `ac2c3610-7078-477a-9375-18e1a282a034`

## Discussion

The chain that surfaced this is worth naming: a routine "did this generate correctly" check (payment status, `generation_status`, evidence images, the 9 SQL content-quality detectors) all came back clean. What actually caught the bug was reading `master_context`'s relationship matrix (12 columns) against `mystery_characters` (11 rows) and noticing the mismatch — then reading the approved concept snapshot itself, which is the one artifact that unambiguously states what the customer paid for. `generation_status.sections.characters: true` and "100% complete" describe pipeline completion, not roster fidelity; a completeness flag can be true while the delivered cast is short a player. The ADR-0064 detector exists precisely to close this gap on a schedule, but this instance was found ahead of its next scheduled run, by manual cross-reference against the chat history rather than by any automated signal.
