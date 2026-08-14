# ADR-0087: Close the identity-field silent-blank-write gap (missing re-fire context + no parse-failure guard)

- **Status:** Accepted
- **Date:** 2026-08-14
- **Related:** ADR-0086 (the spend-cap incident that prompted this investigation), ADR-0079 (an earlier, related-but-distinct incident — `character_role` sentinel invisible to the recovery filter), ADR-0054 (`regenerate-child-content`, and the documented-permanent `characterChatExcerpts` persistence gap this ADR does not reopen), ADR-0052 (the `character_role` coerce-not-reject precedent this ADR's design mirrors for a different field set)

## Context

Phoenix Rivers ("Sunset Songs: The Stolen Spotlight", ADR-0086) hit the 2-attempt auto-recovery cap with `round2_script`/`round3_script`/`round4_script`/`final_statement` fully populated but `description`/`background`/`secret`/`relationships` completely untouched across both attempts. Investigated in two parts.

**Part 1 — payload gap.** Compared the re-fire payload (`notify-generation-issue`) against the original full-generation payload (sent by `mystery-webhook-trigger` via the Parent scenario, once per character). The original sends 9 fields; the re-fire sent 7, missing `characterChatExcerpts` and `conversationContent`. `characterIndex` being hardcoded to `1` on re-fire is not a contributing factor — confirmed unused in any Child-scenario routing, only cosmetic prompt text.

**Part 2 — the more likely actual cause.** Traced the Child scenario blueprint (`Child (Unified)27`). `description`/`background`/`secret`/`relationships` are produced together by one Claude call (module 401 detective / 501 character), parsed by a separate `parse-claude-json` HTTP call (402/502), then written by an `upsertARecord` (404/504). Round scripts are a completely independent call/parse/write chain (409/410/412, etc.) that doesn't depend on 401/402/404 succeeding.

Critically: **neither the parse HTTP call nor the upsert has any Make error handling**, and `parse-claude-json` returns HTTP 422 with `{error, sanitized_preview}` (no `data` key) on a parse failure — confirmed by reading its actual source (`supabase/functions/parse-claude-json/index.ts`). Make's HTTP module here does not throw the scenario into its error path on that 422 (confirmed by the very fact that round-script writes succeed downstream in the same sequential flow when identity writes are blank — a scenario-halting error would have stopped everything, not just this branch). So on a parse failure: module 404's upsert still fires, referencing `{{402.data.description}}` etc., which resolve to `undefined` because the error response has no such keys — writing blank strings over whatever was there, silently, with no error surfaced anywhere. The blueprint's own prompt text separately flags `relationships` as "the highest-risk site" for the kind of JSON malformation (`\'`, stray quotes) that `parse-claude-json`'s repair stages don't always catch.

**Important caveat, not fully resolved:** ADR-0079 documented a different incident where 2 re-fires *did* successfully populate `description`/`background`/`secret` for other characters (only `character_role` failed, via a separate coercion-trigger mechanism). So the missing payload fields and the parse-failure gap are both real, but neither is proven beyond doubt to be *the* specific trigger for Phoenix Rivers' case — no Make.com execution logs were available to confirm which failure mode actually fired. Both fixes below are justified independently of that uncertainty: one closes a confirmed context gap, the other closes a confirmed silent-data-loss path.

## Decision

**Two fixes, different deployment paths:**

1. **Re-fire payload now includes `conversationContent`.** Sourced from `mystery_packages.user_conversation` — a persisted column already used the same way in `regenerate-child-content` (`conversationContent: pkg.user_conversation ?? ""`), not a new computation. `characterChatExcerpts` is deliberately NOT added: per ADR-0054, it is "not persisted anywhere" and "not recoverable post-hoc" — recomputing it here would mean duplicating `mystery-webhook-trigger`'s alias-regex extraction logic in a second place, reopening a gap this codebase already decided to accept. Deployed `notify-generation-issue` v19 → v20 (`verify_jwt: true` preserved).

2. **Built `Child (Unified)28-GuardIdentityParseFailure.blueprint.json`** (not yet imported — awaiting Jonathan), duplicated off the confirmed current head (Child27, re-listed `temp-files/` first per the standing blueprint-versioning-hazard rule). Two changes per style route (detective: 400s, character: 500s), 8 total, applied via a Node script (`JSON.parse`/`JSON.stringify`, not sed/perl):
   - Added a **filter** on the identity upsert (404 / 504): only fires when `{{402.data.description}}` (resp. `{{502.data.description}}`) exists. On a parse failure, the upsert is skipped entirely — `character_role`/`description`/`background`/`relationships`/`secret`/`introduction` are left exactly as they were (`NULL` on a fresh character, unchanged on a re-fire) instead of overwritten with blanks. This is the same coerce/never-silently-lose-recoverability principle ADR-0052 already established for `character_role`, applied here to the sibling fields that had no equivalent protection.
   - **Repointed 6 downstream modules' `id` field** away from `{{404.id}}`/`{{504.id}}` to `{{400.id}}`/`{{500.id}}` (the original `searchRows` result, always available) — detective modules 408, 412; character modules 508, 512, 516, 520. Without this, skipping 404/504 on a parse failure would have broken every downstream write in that character's chain (rumors, round scripts, point-form) by making their own `id` mapper reference resolve to nothing — turning a narrow, safe fix into a regression. Traced every `{{404.id}}`/`{{504.id}}` reference in the file before writing the patch to make sure none were missed.
   - Verified: JSON valid (round-tripped through `JSON.parse`), module count unchanged at 48, `diff` against Child27 shows exactly these 8 changes plus the scenario `name` field (cosmetic).

## Rationale

- The filter approach was chosen over adding Make `onerror` handling that halts the scenario, because ADR-0052 already traced through this exact tradeoff for `character_role` and rejected a hard failure for a live paying-customer run — a scenario-halting error requires manual DLQ resume and blocks every OTHER field for that character too, not just the identity group. A skip-and-leave-recoverable filter gets the same safety property (never persist blank/corrupted data as delivered content) without that cost.
- Leaving the field `NULL`/unchanged rather than writing an explicit sentinel (the way `character_role` gets `'invalid_role'`) is deliberate: `notify-generation-issue`'s own empty-character filter already treats `!c.description` as empty and offers recovery — no new sentinel value is needed for these text fields the way one was needed for `character_role` (which has a fixed enum and could be confused with a legitimate `NULL` case per ADR-0052's own header).
- The payload fix (item 1) and the blueprint fix (item 2) are independent and both worth doing regardless of which one (if either) actually caused Phoenix Rivers' specific case — closing a confirmed context gap and closing a confirmed silent-write path are both correct moves on their own merits.

## Alternatives Considered

- **Recompute `characterChatExcerpts` in `notify-generation-issue` for full payload parity.** Rejected: ADR-0054 already decided this gap is permanent and documented why (no persisted source, not recoverable post-hoc). Duplicating the extraction algorithm in a second edge function creates a second place for it to drift out of sync with `mystery-webhook-trigger`'s, for a field not proven to be the actual cause.
- **Add Make `onerror` handlers that halt the bundle on a parse failure**, matching the "no error handler = halt" behavior already documented elsewhere in this codebase. Rejected per Rationale above — ADR-0052 already ruled this out for the sibling `character_role` case with reasoning that applies identically here.
- **Retry the identity call automatically inside the Child scenario** (e.g., a second Claude call if the first fails to parse) instead of skip-and-leave-recoverable. Rejected as unnecessary complexity for a first pass: `notify-generation-issue`'s existing re-fire mechanism already provides the retry (up to 2 attempts, ADR-0076), operating at the character level from outside the scenario. Building a second, in-scenario retry loop would duplicate that mechanism.

## Consequences

- **Positive (once imported):** an identity-call parse failure can no longer silently blank out a character's description/background/relationships/secret — the field stays in its current (possibly already-good, possibly-NULL-and-detectable) state, and the existing re-fire mechanism (now correctly seeing an empty field) gets a real chance to fix it.
- **Positive (already live):** re-fires now carry more of the original generation's context, closing a confirmed gap regardless of whether it was the specific cause of this incident.
- **Not addressed:** the underlying Claude JSON-parse fragility itself (why the identity call's output sometimes fails all of `parse-claude-json`'s repair stages, especially on `relationships`) — this ADR makes the failure mode safe, not the failure rate lower. A prompt-engineering pass on the `<critical_json_rules>` block is a separate, not-yet-scoped follow-up.
- **Not addressed:** whether this was actually the cause of Phoenix Rivers' specific incident — no Make.com execution log access to confirm. If a `description`-empty-with-rounds-fine case recurs after Child28 is live, that would strongly suggest a third, still-undiscovered failure mode.
- **Imported 2026-08-14 (Jonathan, Make UI).** Live-confirm still pending — this defect class is intermittent, so no repeat isn't proof the fix works; watch for any future `needs_review` package with empty identity fields but populated round scripts, which the fix should now make impossible. Tracked in `docs/generation-guardrails.md`'s Import Ledger.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — `conversationContent` added to the re-fire payload (v19 → v20)
- `temp-files/MM Live - Child (Unified)28-GuardIdentityParseFailure.blueprint.json` — the filter + id-repoint fix, built on Child27, awaiting Make.com import
- `docs/generation-guardrails.md` — Import Ledger entry + head-pointer update
- `supabase/functions/parse-claude-json/index.ts` — read (not modified) to confirm the exact failure response shape (422, `{error, sanitized_preview}`, no `data` key) that the filter condition depends on

## Discussion

The two-part investigation is worth naming as a pattern: the first, cheaper hypothesis (missing payload context) turned out to be real but probably not load-bearing for this specific symptom; the second, more expensive one (tracing the actual module graph and the parse function's real failure shape) found something that fits the evidence far more precisely — an identical field-group succeeding independently downstream, no scenario halt, a known-fragile field (`relationships`, flagged in the blueprint's own prompt text) at the exact point of failure. Worth the extra investigation time before committing to a fix, rather than shipping the cheap hypothesis alone and hoping.
