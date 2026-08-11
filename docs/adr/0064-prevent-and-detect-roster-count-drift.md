# ADR-0064: Prevent and detect roster-count drift (guardrail + detector)

- **Status:** Accepted
- **Date:** 2026-08-05
- **Related:** ADR-0063 (structural roster continuation parsing), ADR-0057 (select concept snapshot by parse, not header), ADR-0042/ADR-0048 (existing content-quality and structural detectors)

## Context

ADR-0063 fixed the parsing bug behind Raleigh's ticket: the extractor stopped reading her roster at an unrecognized `### Optional Characters` subheading. Investigating *why* her concept snapshot had that shape at all surfaced a deeper problem: "optional characters, core N + M for a larger group" is not a real product feature. Checked every chat system-prompt branch in `supabase/functions/mystery-ai/index.ts` — none instruct the model to propose a core/optional split; there's no `is_optional` column, no tier concept anywhere. The model invented the framing entirely on its own, mid-conversation, and told the customer it would be honored. The product has no mechanism to honor it: characters are generated exactly once, from exactly the approved roster.

This leaves two gaps even after ADR-0063:

1. **Nothing stops the model from inventing this framing again**, in a new wording the ADR-0063 fix wouldn't need to know about (the fix is robust to *how* the roster continues, but does nothing about the model promising a roster shape the product can't deliver in the first place).
2. **Nothing would catch a future variant of the same failure mode** — a case where the delivered character count silently doesn't match what the customer approved, for any reason, not just this one. ADR-0063's fix only helps if the *cause* is exactly this parsing gap. This codebase already has this exact pattern of defense-in-depth for other failure classes: ADR-0042 (content-quality detectors), ADR-0048 (structural defects) — each pairs a fix for the specific incident with a standing detector for the failure *class*.

## Decision

Two complementary controls, prevention and detection:

**1. Prompt guardrail (prevention).** Added a directive appended unconditionally to `systemPrompt` in `mystery-ai/index.ts`, after all branch logic determines the base prompt (inline template or the `MYSTERY_FREE_PROMPT` external secret via `applyDatabasePrompt()`):

> CRITICAL: List EXACTLY the established player count of characters — never propose "optional," "bonus," or scalable extra characters for a larger group [...]. If the user might end up with more guests than characters, do not solve it by offering additional characters — that is handled separately by inviting extra guests as co-investigators, not by expanding the cast.

Appending here — rather than only editing the inline template branches — matters: for standard (non-intrigue) murder mysteries, `databasePrompt && !isIntrigue` is true whenever `MYSTERY_FREE_PROMPT` is set, which it is in production (confirmed via `supabase secrets list`). That's Raleigh's exact path. Editing only the inline templates would have missed the dominant case entirely, because the external secret's content isn't the templates in this file. The four inline templates also got the same instruction added directly (for the intrigue/no-secret fallback paths, where it's the primary prompt, not just reinforcement), but the unconditional append is what actually guarantees coverage regardless of which branch or external content produced the base prompt.

**2. Roster-count-mismatch detector (detection), `scripts/detect-roster-mismatches.mjs`.** For each paid, completed package in a rolling window, re-parses the approved concept snapshot with the SHIPPED `extractRosterFromMessage` (same technique as `scripts/__tests__/conceptSnapshot.test.mjs`: transpile the real source with esbuild, run it, never a hand-copy — ADR-0057 discipline) and compares the result to the actual `mystery_characters` row count for that package. A mismatch is flagged. Mirrors the same `MIN_ROSTER_SIZE`–35 bounds the production pipeline uses before trusting a regex parse (see Alternatives/Discussion — this bound was added after a false positive during testing).

Wired into `.github/workflows/health-check.yml` as check 12, same 30-day rolling window and escalate-only posture as checks 5-11 (`STRUCT`, content-quality detectors): a mismatch means the delivered cast doesn't match what the customer approved, which is not something to guess-fix automatically.

## Rationale

- **Prevention alone isn't enough.** A guardrail is one line of defense against one model's current behavior; it doesn't survive a prompt rewrite, a model change, or a wording the guardrail didn't anticipate. A detector catches the *outcome* (delivered count ≠ approved count) regardless of cause — it would have caught Raleigh's case even before ADR-0063's fix existed, and it survives whatever specific bug caused it.
- **Detection alone isn't enough either.** Without the guardrail, every future instance of this model behavior becomes a live incident needing a manual regenerate — the guardrail is cheap and stops the recurring cost at the source.
- **The detector reuses the shipped parser rather than reimplementing comparison logic in SQL.** The existing detector pattern in this codebase (checks 4-11) is a Postgres RPC function. Markdown roster parsing doesn't belong in SQL — replicating `extractRosterFromMessage`'s regex/header logic in a second language is exactly the "one concept, two predicates, updated independently" failure ADR-0057 diagnosed and rejected. A Node script that transpiles and runs the real TypeScript function is the same technique the test suite already uses for the same reason.

## Alternatives Considered

- **Detector as a Postgres RPC function**, matching every other check in health-check.yml. Rejected: would require re-implementing roster parsing in SQL, reintroducing the two-predicates problem this whole area of the codebase has already been bitten by three times (ADR-0055/0056/0057). A Node script invoked as an extra health-check.yml step, output folded into the same `$PROBLEMS` aggregation, achieves the same alerting behavior without a second parser.
- **Auto-remediation instead of escalate-only.** Rejected for the same reason checks 8/11 (slip-culprit-leak in some cases, structural defects) are escalate-only: there's no safe automatic fix. A roster mismatch could mean the extractor undercounted (this bug), the pipeline dropped characters after extraction (a different bug — see Discussion), or something else; guessing which and auto-correcting risks making a paid package worse.

## Consequences

- Both controls verified before shipping: the prompt guardrail passed an esbuild syntax check (no test harness exists for prose prompt content, unlike the parser); the detector script was run against real production data (`--since=2026-01-01`).
- **Running the detector against real data surfaced two things the ADR-0063 fix doesn't cover:**
  - Raleigh's package (`bd82acd8-...`) still shows the mismatch (approved=18, actual=15) — expected, since the DB still holds her pre-fix 15-character package. Resolves once she's regenerated.
  - **A previously unknown, unrelated bug**: "Whispers From The Void" (`ffea7320-ba7e-48a3-a5c2-9fcf2ba8112a`) has a clean, well-formed 10-character approved snapshot but only 9 `mystery_characters` rows — a genuine character silently dropped somewhere between extraction and delivery, not an "optional characters" case at all. **Not investigated or fixed in this pass** — flagged for follow-up; the detector doing its job by finding a real defect outside its original motivating incident.
  - A third case, "Death At The Velvet Viper" (`6c417188-...`), initially showed a 42-vs-30 mismatch but turned out to be a false positive: its approved snapshot is a stale 60-player draft (a known prior incident, ADR-0048) — 60 exceeds the 35-character cap the production pipeline applies before trusting a regex parse, so production never used this raw count to generate from. The detector was missing that bound; added it (mirroring `extractCharactersFromMessages`'s own `roster.length >= MIN_ROSTER_SIZE && roster.length <= 35` check) and the false positive disappeared. Recorded here because it's a real limitation to know about: the detector's parse can still diverge from what production actually used in any case where production fell through to the Claude-fallback or legacy-scan path instead of trusting the raw regex result — those cases are silently skipped (`continue`), not compared, rather than risking further false positives.
- New CI dependency: `health-check.yml` now runs `npm ci` (via `actions/setup-node@v4`) before checks, since the detector script needs `@supabase/supabase-js` and `esbuild`. Every other check remains pure curl/jq; only check 12 needs Node.

## Key files

- `supabase/functions/mystery-ai/index.ts` — guardrail (unconditional append + 4 inline reinforcements)
- `scripts/detect-roster-mismatches.mjs` — detector script
- `.github/workflows/health-check.yml` — check 12 wiring, `npm ci` step, status table row

## Discussion

The guardrail's placement was the one real design decision here. The instinct was to edit the four inline prompt templates and stop — that's where the visible "optional characters" formatting lived in Raleigh's case, and it's a one-paragraph change per branch. Checking whether that was actually sufficient (rather than assuming it) surfaced that `MYSTERY_FREE_PROMPT`, an opaque environment secret not stored in git, is what standard (non-intrigue) murder mysteries actually use in production — the exact mystery type Raleigh bought. Editing only the four inline templates would have shipped a fix that never ran for the majority of customers. The unconditional-append fix sidesteps needing to know or edit that secret's content at all: it's appended after `systemPrompt` is fully determined, regardless of source, so it can't be silently bypassed by a future edit to the external prompt that this file doesn't know about.

The false positive on "Death At The Velvet Viper" during testing is worth sitting with rather than glossing over. It's a reminder that this detector, like `extractRosterFromMessage` itself, only replicates *part* of the production decision tree (the header-path regex parse) — not the Claude-fallback or legacy-scan paths production falls through to outside the 4-35 bound. That's a deliberate scope limit, not an oversight: replicating the Claude fallback would mean burning a real API call per package per health-check run, for a detector whose whole value proposition is "cheap, deterministic, no metered spend." The tradeoff is that a package which took the fallback path and — genuinely, this time — has a real mismatch would be silently skipped rather than flagged. Noted here as an accepted gap rather than fixed, matching how ADR-0057 explicitly recorded its own "not addressed: the affected-customer sweep" rather than pretending the fix was complete.
