# ADR-0164: Move the roster-extraction fallback in mystery-webhook-trigger from Haiku 4.5 to Sonnet 5.5

- **Status:** Accepted, live 2026-10-15
- **Date:** 2026-10-15
- **Related:** ADR-0112 (Haiku for language ID, kept), ADR-0069/0118 (roster extraction and its guards), ADR-0145 and Addendum 2 (Sonnet 5.5 medium adaptive; listed these two Haiku calls as deliberate), ADR-0074 (blanket Sonnet 5 upgrade)

## Context

`mystery-webhook-trigger` makes two Haiku 4.5 calls. ADR-0145 Addendum 2 (2026-10-15) classed both as deliberate: narrow deterministic tasks. Jonathan asked on 2026-10-15 to move the character-extraction one anyway, because it decides which characters a paid order gets (the regex extractor runs first; this call is the fallback when the regex result is short of `player_count`) and he wants every call that shapes a paid package on the same model family as the Make pipeline.

The guards around the call are unchanged and make a bad answer safe: a null return, a roster with fewer than 4 entries, or a roster that drops names from the approved concept message keeps the regex roster (`index.ts`, the "[CharExtract]" block).

## Decision

Only the extraction call (`extractCharactersWithClaude`) changes:

- `model`: `claude-haiku-4-5-20251001` to `claude-sonnet-5-5` (same $2 / $10 per MTok as Sonnet 5).
- `temperature: 0` removed (Sonnet 5.5 rejects non-default sampling parameters with a 400).
- `thinking: {type: "between_tools"}` (Sonnet 5.5 rejects `disabled`; `between_tools` is its lowest setting, takes no other field, and needs effort `high` or below).
- `output_config: {effort: "low"}` (Anthropic's guidance for extraction and classification).
- `max_tokens` 2000 to 4000 (Sonnet writes longer descriptions than Haiku; a cap costs nothing unless used).
- The text is read from the first `text` block instead of `content[0]` (ADR-0145 Addendum 1: a thinking block can come first).

The language classifier (`detectConversationLanguage`, 10 output tokens) **stays on Haiku**: no quality gain is possible on a one-token answer, and ADR-0112 chose it for cost and speed.

## Verification (one paid call, approved by Jonathan 2026-10-15, about 0.01 USD)

Request built from the function's own system prompt and the real approved-concept message of the 8-player conversation `c35afa15` ("Thrifted To Death", 5,477 characters). Result: HTTP 200 in 3.8 s, `stop_reason` `end_turn`, content `[text]` only (0 thinking tokens), 2,314 input and 557 output tokens. The parsed array had 8 entries whose names match the stored `extracted_characters` exactly (dual names included), descriptions carried over, and the victim ("Jo/Josie Gawn") was not listed as a player.

This also shows the raw API accepts `thinking: {type: "between_tools"}` and `output_config: {effort: "low"}` on a no-tools request. It does **not** cover `effort: medium` together with `json_schema` output (the combination in `adapt-mystery-apply`, ADR-0145 Addendum 3).

## Alternatives considered

- **Leave both on Haiku (ADR-0145 Addendum 2's verdict).** Valid: the call is narrow, guarded, and rarely reached. Rejected on Jonathan's instruction; the cost difference is about a cent per use.
- **Omit `thinking`.** On Sonnet 5.5 that means adaptive thinking, which spends tokens on a task that does not need them and can put a thinking block first. Rejected.
- **Move the language classifier too.** No benefit on a 10-token answer; rejected.

## Consequences

- Cost per fallback call rises from about 0.003 to about 0.01 USD. The fallback fires only when the regex roster is short, so volume is low.
- Latency per fallback call is about 4 s (Haiku was similar for 2k output tokens at this size; not measured here).
- **If the call ever fails** (for example the API starts rejecting `between_tools`), the function logs `Claude extraction API returned <status>` and returns null, which keeps the regex roster: the same behaviour as before Claude was added. Passive check: `Claude fallback extracted N characters` and `[CharExtract] Claude fallback found` lines in the function log after the next order that triggers it.
- Rollback: restore the three lines (`claude-haiku-4-5-20251001`, `temperature: 0`, `max_tokens: 2000`) and the `content?.[0]?.text` read.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` (`extractCharactersWithClaude`)
