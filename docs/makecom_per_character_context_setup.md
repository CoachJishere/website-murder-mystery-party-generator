# Make.com setup: pass per-character chat context to child scenarios

**Date:** 2026-05-21
**Trigger:** Fotini "Multiverse" — child scenarios were generating character sheets without access to the user's chat-developed design detail (Klint's 10-secret bribe/riddle system was lost in generation).

## Background

The edge function `mystery-webhook-trigger` now bundles two new pieces of context in the webhook payload:

1. **`characterExcerpts`** — a JSON-stringified map of `{ characterName: ["User: ...", "AI: ...", ...] }`. For each extracted character, this contains all the chat messages that mention them by name (case-insensitive word-boundary on first/last/nickname parts ≥3 chars). Capped at 30KB per character. Targeted, character-specific.
2. **`conversationContent`** — already in payload. Full conversation (or approved-concept snapshot, per the v112 thin-snapshot heuristic). The backup safety net for implicit references that `characterExcerpts` misses (e.g. "the witch's apprentice" instead of "Felix").

## Required Make.com changes — blueprints already built

**Version protocol followed:** duplicate-and-version. The new blueprints are sitting in `temp-files/`, ready to import:

- **Parent:** `temp-files/MM Live - Parent36.blueprint.json` (from `MM Live - Parent35.blueprint.json`)
- **Child:** `temp-files/MM Live - Child (Unified)15-PerCharacterContext.blueprint.json` (from `MM Live - Child (Unified)14-SplitCalls.blueprint.json`)

### What changed in Parent36

1. **Webhook interface (module 63):** added `characterExcerpts` text field to accept the new payload from the edge function.
2. **New ParseJSON module (id 15200):** inserted right after the existing `extractedCharacters` parser. Parses `{{63.characterExcerpts}}` into a keyed map `{ "Character Name": ["User: ...", "AI: ...", ...] }`.
3. **All 8 child HTTP trigger modules:** body extended with two new fields:
   - `characterChatExcerpts`: `{{join(get(15200; 179.name); newline + "---" + newline)}}` — looks up the current character's excerpts from module 15200 and joins them into a single string.
   - `conversationContent`: `{{63.conversationContent}}` — full conversation pass-through as backup context.

### What changed in Child v15

1. **Webhook interface (module 63):** added two text fields — `characterChatExcerpts` and `conversationContent`.
2. **All 8 Claude prompt modules:** the existing `<context>` block was extended with two new entries inserted right after `**Mystery type:**`:
   - **Character-specific chat excerpts** — labelled as the user's actual design intent, with instruction to preserve mechanics/riddles/secrets/items exactly.
   - **Full brainstorming conversation** — labelled as backup for implicit references like "the witch's apprentice" or "her brother".

The model used is still Claude Haiku 4.5 (`claude-haiku-4-5-20251001`). Input size per child rises from ~5K → ~85K tokens. Haiku 4.5's 200K context handles this easily; cost increase is ~$0.07 per character × 17 characters = ~$1.20 extra per generation.

### Import steps

1. In Make.com, open the current active Parent scenario.
2. Click the three-dot menu → "Clone" (or use Import Blueprint and upload `MM Live - Parent36.blueprint.json`). Confirm the cloned name shows v36.
3. Same for Child: clone the active Child (Unified) or import `MM Live - Child (Unified)15-PerCharacterContext.blueprint.json`. Confirm v15.
4. The cloned Parent will retain the OLD child webhook URL (`https://hook.eu2.make.com/3l26wasbsjzh5396np25qoyv8g82u6j3`) which points to the currently-active Child. Until you switch over, Parent36 will trigger the OLD Child v14 with the new fields (Child v14 ignores them — no harm).
5. In Child v15, copy its new webhook URL.
6. In Parent v36, replace the URL in all 8 HTTP modules with Child v15's URL. (Or: keep the old URL on Child v15 by reassigning the hook — your call. Easier if you can swap the hook on the child.)
7. Test against a known long iterative conversation before promoting.

## Cost / latency impact

- **Token cost per generation:** +~$1.20 in Haiku input tokens (acceptable given the package price).
- **Latency per child:** modest increase (long-context inference takes a bit longer); roughly +5-10 sec per character but they run in parallel, so total generation time should rise <30 sec.
- **Make.com data transfer:** payload from edge function grows from ~600KB → ~1-1.5MB. Well within Make.com webhook limits.

## Testing checklist

Before promoting the new versions:

- [ ] Trigger a test generation against a known-iterative conversation (Fotini's or a synthetic one).
- [ ] Check Make.com execution log: confirm `characterExcerpts` parsed correctly and each child received its slice.
- [ ] Spot-check 2-3 character sheets: do they reflect chat-specific design detail that was missing before?
- [ ] Sanity check Klint (or equivalent meta-character with special mechanics): does the generated sheet now include the user's designed mechanics (riddles, multiple secrets, special items)?
- [ ] Promote new versions; keep old versions disabled (not deleted) for one week as rollback.

## Rollback plan

If the new versions misbehave: disable the new versions, re-enable the old versions. The edge function will keep sending the new `characterExcerpts` field — old Make.com versions just ignore it (no harm).
