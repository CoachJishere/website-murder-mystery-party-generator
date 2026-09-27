# ADR-0130: Require a leading space before a plain-hyphen separator in roster-line extraction, so hyphenated names stop getting truncated

- **Status:** Accepted
- **Date:** 2026-09-27
- **Builds on:** ADR-0103 Addendum 59 (the target-distribution sweep that surfaced this), ADR-0110/ADR-0125 (the shared roster-extraction module this touches)

## Context

While testing the ADR-0103 Addendum 59 rumor/question target-distribution fix against a real purchase ("Ghost In The Uplink," package `4f9babf8-c691-4987-b2bf-850e92f6522d`), Jonathan noticed every character in the cast referred to "Marcus/Marisol Adebayo" as "Marcus/Marisol Adebayo**-Finch**" — a consistent surname mismatch, 18 occurrences across 11 characters' guest-facing fields.

Traced the source of truth first: `master_context` (the Parent-generated shared context every per-character Child call reads) uses "Adebayo-Finch" **13 times, 100% consistently** — never once the shorter form. The customer's own approved concept-chat message (`user_conversation`) also reads "Marcus/Marisol Adebayo-Finch – Orochi-Tanaka Corp" — the full name is correct at both the customer-input layer and the generation layer. The only place with the wrong (truncated) name is `mystery_characters.character_name` itself, which is set once, before generation, by `_shared/rosterExtraction.ts`'s regex-based roster parser (`characterLineRegex`/`boldCharRegex`) reading that same approved message.

Root cause, confirmed with a direct regex test: `characterLineRegex`'s name-capture group is non-greedy (`(.+?)`), and its separator character class `[-–—:]` accepts a plain ASCII hyphen with **zero required whitespace** on either side. Given the input line `3. Marcus/Marisol Adebayo-Finch – Orochi-Tanaka Corp`, the non-greedy capture stops at the **first** character satisfying the separator pattern — which is the hyphen inside "Adebayo-Finch" itself, not the en-dash before "Orochi-Tanaka Corp" that was actually meant as the name/description separator. The regex has no way to tell a hyphen used as a list separator apart from one used inside a compound name.

Every downstream system (master_context, all 11 other characters' independently-generated content) was working correctly off the customer's real name — the bug was entirely upstream, in the one-time roster extraction that seeds `character_name`.

## Decision

Changed the separator pattern in both `characterLineRegex` and `boldCharRegex` from `\s*[-–—:]\s*` to `(?:\s+-|[–—:])\s*`: a plain hyphen now requires at least one preceding whitespace character to count as a separator; en-dash, em-dash, and colon are unchanged (none of them plausibly appear mid-name). This exploits a real, load-bearing distinction: every documented separator format in this codebase's own comments ("Name **-** Description", spaced) has a space before the dash, while a hyphenated name ("Adebayo-Finch", "Mary-Anne Fitzgerald") never has a space before its internal hyphen.

Verified via a standalone Node regex test (mirrors the actual JS/TS runtime, not an approximation) against 9 cases before touching production code: the fix correctly extracts "Marcus/Marisol Adebayo-Finch" (previously truncated) and, as a bonus proof the fix generalizes, correctly extracts a synthetic "Mary-Anne Fitzgerald" case that the old regex also would have truncated to just "Mary" — while every existing documented format (bold-dash, bold-colon, plain-dash, parenthetical-role variants) still matches identically to before.

Checked for regressions before deploying: ran the corpus check both ways — (1) searched all historical `user_conversation` roster text for the hyphenated-name pattern this bug affects: found exactly one other package ever ("Ghost In The Uplink" itself — genuinely rare, hyphenated compound names are uncommon in this corpus); (2) searched for the specific regression risk the fix could introduce — a "Name**-**Description" list format with **zero** space anywhere around the separator, which the new, stricter pattern would fail to match at all: **zero occurrences found anywhere in the historical corpus.** The fix has a confirmed real bug it corrects and no found case it breaks.

Fixed the 18 already-generated occurrences in the live package directly (`replace()` across every character/package-level text field, verified zero remaining hits). Deployed the regex fix to all three edge functions that import the shared module (`extract-concept-roster`, `mystery-ai`, `mystery-webhook-trigger`) via the Supabase CLI, not the MCP deploy tool (per established practice — a prior MCP inline-content deploy once shipped placeholder text), and confirmed via `list_edge_functions` that `verify_jwt` was unchanged on all three post-deploy.

## Rationale

- **Root-caused to the exact mechanism before writing a fix.** Confirmed via `master_context` and the customer's own approved message that the correct name existed at every other layer — this wasn't a generation-side embellishment or a cross-field semantic contradiction, it was a single, deterministic parsing bug with one exact reproduction case.
- **Fixed the general case, not just today's name.** The distinguishing signal (space-before-hyphen vs. no-space) generalizes to any hyphenated name, confirmed by the "Mary-Anne Fitzgerald" test case — not a one-off patch for "Adebayo-Finch" specifically.
- **Verified both directions before touching a function explicitly flagged as fragile.** This file's own comments warn "don't grow the one regex" and describe past redundant-copy bugs (ADR-0110/0125) from treating this logic casually. Given that, and that this is live production code (not a Make.com blueprint Jonathan reviews before import), checking for regressions against the full historical corpus before deploying — not just confirming the fix works — was the bar for touching it at all.
- **No new ongoing cost.** Same regex, same call sites, same three functions — a pure correctness fix inside code that already runs once per purchase.

## Alternatives Considered

1. **Escape/allowlist known hyphenated-name patterns.** Rejected: would require recognizing "this hyphen is inside a name" ahead of time, which is exactly what the regex can't currently do — no more tractable than the actual fix, and wouldn't generalize past whatever specific names get allowlisted.
2. **Strip hyphens from names entirely during extraction, re-attach later.** Rejected: much more invasive, touches every downstream consumer of `character_name`, and solves a problem ("hyphens exist") that isn't actually the problem (the problem is only that a *bare* hyphen is ambiguous with the separator; requiring a leading space resolves the ambiguity directly).
3. **Leave it, since the corpus check found only one historical occurrence.** Considered given how rare this is — but the fix is free (no new call sites, no new cost, confirmed zero regressions) and the failure mode when it does occur is a customer-visible name inconsistency across every character's dialogue, not a minor cosmetic nit. Per this project's own standing practice ("when a found bug traces to a genuinely fixable, cheap, deterministic gap, fix it now rather than waiting for a second occurrence"), rarity alone wasn't a reason to defer a zero-cost, zero-regression fix.

## Consequences

- Any future customer roster containing a hyphenated first or last name (or a hyphenated role/nickname in the same position) will now be extracted correctly instead of silently truncated at the internal hyphen.
- No change to any currently-correct extraction — confirmed via the full historical-corpus regression check, not just spot-checked cases.
- The one live instance of this bug ("Ghost In The Uplink") is fully corrected; no other current package is known to be affected.
- `characterLineRegex`/`boldCharRegex` remain the single shared implementation (ADR-0125's "one call, one source of truth") — this fix didn't introduce a second copy or a per-caller variant.

## Key files

- `supabase/functions/_shared/rosterExtraction.ts` — `characterLineRegex`, `boldCharRegex`; deployed 2026-09-27 via `extract-concept-roster`, `mystery-ai`, `mystery-webhook-trigger`.
- `mystery_characters` — 18 fields hand-corrected across 11 characters in package `4f9babf8-c691-4987-b2bf-850e92f6522d` (`Adebayo-Finch` → `Adebayo` was backwards; corrected the *other* direction, replacing the erroneous truncated form with the customer's actual approved name, `Adebayo-Finch`, everywhere it had been dropped).
- `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 59 — the session that surfaced this.
- CHANGELOG.md 2026-09-27 entry.

## Discussion

This is the inverse of most bugs this session — instead of the generation layer inventing something not in the customer's approved input, the generation layer (master_context, all 11 characters) was **faithfully correct**, and the one-time, pre-generation roster extraction was the thing that silently dropped part of the customer's own name. Worth remembering as a general lesson for future name-consistency investigations in this codebase: don't assume the generation prompt is always the suspect just because that's where most of this session's other bugs lived — check `user_conversation` (what the customer actually approved) against `master_context` (what generation actually saw) before assuming which layer is wrong. Here, doing that in the wrong order would have wasted time hunting for a generation-prompt cause that didn't exist.
