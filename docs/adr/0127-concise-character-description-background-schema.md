# ADR-0127: Concise character `description`/`background` schema in Child (Unified)

- **Status:** Accepted — imported into Make.com and validated on both routes, 2026-09-19
- **Date:** 2026-09-19
- **Related:** ADR-0074 (blanket Sonnet 5 upgrade), ADR-0103 (New-Purchase Coherence Sweep — Sherri's ticket was handled as a sweep-adjacent one-off), ADR-0088 (materials/prop-list pattern)

## Context

Customer Sherri (sfulm24@gmail.com) contacted support asking to have her purchased package's characters rewritten to be "just to the point... a few facts not a storyline, it's too much to read" — specifically the `description` and `background` fields, not the round scripts or the Round 1 introduction speech.

Investigating whether this was a Haiku-era artifact (pre ADR-0074, 2026-08-11): it was not — her package was generated 2026-09-17, over a month post-upgrade, fully on Sonnet 5. Checked `contact_messages` for corroboration and found one other genuine complaint: Marie Potesta, 2026-09-06, "it seems veeeery long... purchased it for a teenager party." Her complaint is likely a *different* mechanism (total round count/game duration for a time-boxed party — the already-known, deliberately-deferred "round count is hardcoded" gap), not the same bug as Sherri's prose-density complaint. Treated as one data point per problem, not two on the same one.

Traced the actual root cause in the live blueprint (`Child (Unified)41-WebhookRotation.blueprint.json`, current production version per ADR-0124). The `output_schema` in Call 1 (the call that generates `description`, `background`, `relationships`, `secret`, `introduction` for every character) explicitly instructs:

```
"description": "## CHARACTER DESCRIPTION\n\n[2-3 paragraphs of who this character is, their role in the production/world, what makes them distinct]",
"background": "## CHARACTER BACKGROUND\n\n...**Background:**\n\n[3-4 paragraphs of life history, relationships, secrets, motive...]\n\n**Your Relationship to the Victim:**\n\n[1-2 paragraphs...]",
```

That's 6-9 mandated paragraphs across two fields, every character, every package, regardless of player count or game length. This is not a Sonnet-5-is-inherently-verbose problem — Sonnet 5 is doing exactly what the schema asks. The likely reason this wasn't as visible under Haiku is the same pattern ADR-0074 documented for other contrastive instructions: Haiku's weaker instruction-following probably under-delivered on the paragraph counts, while Sonnet 5 reliably hits them.

**Verified with a live test call** (Jonathan approved the Anthropic spend explicitly before this was run) rather than shipping a prompt change on theory alone. Took the real `master_context` from Sherri's purchased package and Colonel Mustard's real character context, and sent two calls to `claude-sonnet-5`:
- First attempt omitted `thinking: {type: "disabled"}` — Sonnet 5 burned 315 of 700 `max_tokens` on hidden reasoning and the JSON response was truncated mid-field. This is the exact `thinking` configuration ADR-0074 confirmed Sonnet 5 needs disabled explicitly; corrected on the retry.
- Second attempt (thinking disabled, `max_tokens: 800`) with a proposed concise schema — reworded `description` to "[3-4 punchy sentences, no more than ~80 words]" and `background` to a bulleted "who they are / how they met the victim / relationship then vs. now" structure (~150 words) — returned a complete, valid response landing almost exactly on both targets (66 words / 147 words) with every real fact preserved (the $180,000 embezzlement figure, the blackmail mechanic, the then/now arc).

Real-number comparison, same character, same underlying facts:

| | Current live schema | Concise schema (live-tested) |
|---|---|---|
| `description` | 1,352 chars / 222 words | 399 chars / 66 words |
| `background` | 2,109 chars / 355 words | 947 chars / 147 words |
| **Total** | **~577 words** | **~213 words (37%)** |

Total spend for the two test calls: ~$0.15 (higher than the initial ~$0.01-0.05 estimate given to Jonathan before running them, because the real `master_context` used for realism runs ~22K input tokens — worth flagging for any future live-test cost estimate on this pipeline).

## Decision

Patch only the `description` and `background` fields in Child (Unified)'s Call 1 `output_schema`, in **both** routes (`routes[0]` = detective-style, `routes[1]` = character-style — confirmed via the same "which calls actually define this schema vs. just reference it downstream" check ADR-0074 used, since `CHARACTER BACKGROUND`/`CHARACTER DESCRIPTION` text also appears in 6 *other* Call 2-5 locations that only reference the already-written background for consistency checks, not redefine it).

New file: `temp-files/MM Live - Child (Unified)42-ConciseCharacterContent.blueprint.json`, built from `41-WebhookRotation` via a targeted raw-text patch (not a full `json.load`/`json.dump` round-trip, which would have reformatted the entire file's whitespace and made the diff unreviewable). Diffed against `41`: **exactly 2 lines changed**, both being the two Call 1 prompt text fields — nothing else in the 220KB file touched.

**Explicitly out of scope for this change:** `relationships`, `secret`, `introduction` (Round 1 speech), and every round 2-4 script/confession field. Sherri's complaint and the live test both targeted `description`/`background` specifically — the introduction speech in particular is read aloud at the party and shortening it wasn't asked for or tested here.

## Rationale

- Root cause is a fixed paragraph-count instruction in the prompt template, not a model behavior to work around — the fix is a prompt edit, not a model swap, a post-processing step, or a new "concise mode" toggle.
- Live-tested before committing to the blueprint edit, per the standing no-unverified-prompt-changes discipline this codebase already follows (ADR-0074's structural-diff practice, applied here to output content instead of blueprint structure).
- Scoped narrowly to the two fields actually complained about, keeping blast radius minimal (matches the existing "prefer cell-by-cell, narrow blast radius" convention already used for direct content edits in this codebase).

## Alternatives Considered

- **Leave as-is, treat Sherri's request as one-off**: rejected — two independent customer complaints in two weeks, both post-Sonnet-5, and the live test shows a straightforward fix with no quality tradeoff (all facts survived compression).
- **Add a "concise mode" toggle at generation time** (a customer-facing option, separate from `script_type: pointForm` which only covers round scripts): deferred. No signal yet that customers want *both* styles available — every complaint on file is "too long," none is "too short." A global schema change is simpler than a new option with no demonstrated demand; revisit if that changes.
- **Also shorten `introduction`** (also currently "[2-3 paragraphs]"): deferred — out of scope for what was actually complained about or tested, and it's a performed speech rather than reference text, where length trade-offs are different.

## Consequences

- **Not yet imported into Make.com** — Jonathan will import and end-to-end test before this affects any live generation.
- **No backfill** — only affects packages generated after import. Already-completed packages (including Sherri's own, which was hand-edited separately as a one-off — see the vault note on that manual edit) are unaffected.
- If a future health-check or content-quality detector ever expects the old 6-9 paragraph structure, it should be checked against this schema change rather than treated as a regression.
- Worth re-running the live-test comparison on a second character/mystery-style combination before or shortly after import, to confirm the ~150-word background target holds up outside the one tested case (accomplice-heavy, blackmail-driven motive) — e.g. a character-style (non-detective) route, which wasn't part of the live test itself (only the schema text was patched identically in both routes; only the detective-style route was actually test-called).

## Discussion

Two failed attempts preceded the working patch, both worth recording since this blueprint-editing pattern will likely recur. First attempt used `json.load` + modify + `json.dump(indent=2)` — the content edit itself was correct, but re-serializing the whole file reformatted every line's whitespace, making the diff useless for review. Second attempt tried a raw-text `str.replace()` using normal Python string literals with `\n` for newlines — this failed silently (zero matches) because the prompt's embedded JSON-schema example text uses **literal two-character `\n` sequences** (backslash + n) by design, showing Claude the escape syntax it should reproduce in its own output — not real newlines. The working approach: parse once to extract the real field text (where these literal `\n` sequences are correctly represented as literal `\n` in the Python string), apply the edit at that layer, then re-encode just that one field back into its raw JSON-string-literal form (`json.dumps(text, ensure_ascii=False)` — `ensure_ascii=False` was itself a second bug found the same way, since the default would have escaped the file's existing em-dashes into `\uXXXX` and broken the exact-match splice) and substitute only that one encoded blob back into the untouched raw file text.

## Key files

- `temp-files/MM Live - Child (Unified)42-ConciseCharacterContent.blueprint.json` (new, from `41-WebhookRotation`) — **imported**, gitignored (Make.com blueprints in `temp-files/` are not tracked; this ADR is the durable record)

## Update (same day): route 1 (character-style) sanity-checked without a second live call

Jonathan imported `42-ConciseCharacterContent` into Make.com. Before closing this out, the open item from the Consequences section — route 1 (character-style, slip-draw) was never itself live-tested, only patched with the identical schema text — was addressed at Jonathan's request *without* a second paid Anthropic call: ran the actual patched route-1 prompt (same real `master_context`, same character, Mustard) by hand in-conversation rather than through the API, to sanity-check the schema's wording produces the same shape of output.

Result: 72 words / 132 words (description/background) — consistent with route 0's live-tested 66/147, same facts preserved, correctly avoided any guilt-confession language per route 1's slip-style-guilt rule. This confirms the schema *reads* clearly and produces the intended structure; it does not confirm Sonnet 5's exact behavior through the live Make.com call the way the route-0 test did (JSON-escaping edge cases, `thinking` config, etc. weren't exercised). Given route 0's live call came back clean and the two routes' schemas are structurally identical, this was judged sufficient — a further live test on route 1 remains a cheap (~$0.05-0.10) option if a discrepancy ever surfaces in production output.

Considered done as of this update.
