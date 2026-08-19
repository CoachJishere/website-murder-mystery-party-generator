# ADR-0093: Pass the customer's language explicitly to the Child scenario instead of asking Claude to detect it

- **Status:** Accepted
- **Date:** 2026-08-19
- **Related:** ADR-0089 (Child(Unified) blueprint history/versioning conventions this ADR follows), project memory `project_child_scenario_language_bug_aug16` (the same symptom class, previously scoped as whole-package drift)

## Context

Customer Ciaran Fox (`CIARAN FOX <INFO@CIARANFOXDUBAI.COM>`, user `e4574dcb-facc-4e30-b79a-70c9d17de89f`) purchased a 24-character mystery ("Murder At The Costa Del Karaoke", conversation `212a7243-3f3c-436b-af85-5d02404f89d7`, package `ec8fab9f-9667-4379-a901-de182ad73cfc`) on 2026-08-18 and reported two defects: only 16 of 24 characters generated, and some character content in a different language than expected.

Investigation confirmed both:
- The approved concept message (24 characters, clean English) was fully and correctly sent from `mystery-webhook-trigger` to the Make.com parent scenario — the character-count shortfall happened inside the Make.com parent/child run itself, not in extraction. (Separately scoped; see the open vault note, not this ADR.)
- 2 of the 16 generated characters (Jody/Jordan Matthews, Kayleigh/Kyle Brooks) came back **entirely in Portuguese**, despite the customer's `profiles.language = 'en'` and every other character being clean English.

Root cause of the language defect, traced directly in the live Child (Unified) scenario's Claude prompts (module `401` and 7 others, all identical): the `<language_instruction>` block asked Claude to **detect** the output language from `master_context`/`conversationContent` on every single call (~8 Claude calls per character), rather than being told the language explicitly. This mystery's setting is an English-language concept saturated with Spanish flavor text and proper nouns (Bar Estrella, Costa del Sol, sangria, "Rodrigo 'Roddy' Delgado," "Karaoke Knockout Competition"). That's exactly the kind of input that makes per-call language detection unreliable — different Claude calls, given the identical input, independently misjudged the dominant language on some calls (drifting to Spanish or the nearby Portuguese) and correctly detected English on others. Confirmed via direct inspection: the input bundle for an affected module showed clean English `master_context`/`conversationContent`, ruling out a corrupted-input explanation.

This is the same underlying defect class already flagged in `project_child_scenario_language_bug_aug16` (blueprint #31 "CharacterContentLanguageMatch," drafted 2026-08-16), which had in fact already shipped a **first attempt** at fixing this — the `<language_instruction>` block itself was v31's fix, replacing an earlier version with no language handling at all. That first attempt used a "detect and match" design instead of an explicit parameter, which is the design that this incident shows to be unreliable specifically when the mystery's own content contains non-target-language flavor text.

## Decision

Pass the customer's language explicitly end-to-end instead of asking Claude to infer it:

1. **`supabase/functions/mystery-webhook-trigger/index.ts`**: added a `LANGUAGE_NAMES` map (the 13 `src/i18n` locale codes → full English names), fetches `profiles.language` for the conversation's `user_id`, resolves it to a name (default `"English"` if unset), and adds `language` to the `webhookPayload` sent to the Make.com parent. This field did not exist in the payload before — the customer's language was never forwarded to Make.com at all.
2. **Parent blueprint**: all 8 modules that POST a character to the Child scenario's webhook (4 mystery-style routes × {initial send, self-heal retry send}: `180`, `202`, `145`, `303`, `2425`, `2439`, `2461`, `2475`) now include `"language": "{{63.language}}"` in their JSON body, reading straight from the parent's own webhook trigger (module `63`, i.e. the edge function's payload). Built as `temp-files/MM Live - Parent55 (Explicit Language Parameter).blueprint.json`, from the true head (`Parent54`).
3. **Child blueprint**: all 8 `anthropic-claude:createAMessage` modules (`401, 405, 409, 501, 505, 509, 513, 517`) had their identical `<language_instruction>` block replaced. New instruction: `Write ALL output in {{63.language}}` (the child's own webhook module is also numbered `63`, receiving whatever the parent's send modules POST) — explicit, not detected — plus an added defense-in-depth clause explicitly telling the model not to switch languages based on character names, setting details, or foreign-language flavor text elsewhere in the context, since that's the exact failure mode observed here. Built as `temp-files/MM Live - Child (Unified)33-ExplicitLanguageParameter.blueprint.json`, from the true head (`Child(Unified)32`).

Diffed both new blueprint files against their parents: exactly the 8 targeted modules plus the blueprint's own `name` field changed in each, nothing else — same verification discipline as ADR-0089.

## Rationale

- Detection-based language matching only works when the input text is monolingual, or at least dominated by the target language with no salient foreign vocabulary. A mystery deliberately themed around a non-English setting (Spanish resort, French chateau, etc.) — a normal and expected creative choice — will always contain foreign proper nouns and flavor words, which is precisely the condition under which detection is least reliable. An explicit parameter removes the ambiguity entirely regardless of theme.
- The fix is additive and narrow at every layer: one new field threaded through three places (edge function payload → parent pass-through → child prompt), no restructuring of the existing pipeline, no new modules.
- Kept the anti-flavor-text warning even though it's now cosmetic under the explicit-parameter design — it's cheap insurance against a differently-shaped variant of the same failure (e.g. if a future change reintroduces any inference step).

## Alternatives Considered

- **Prompt-only patch** (keep "detect from content" but harden the wording to warn against flavor-text drift): rejected as the sole fix — still probabilistic, doesn't eliminate the failure mode, just lowers its rate. (Folded the warning in anyway as a second line of defense, see Rationale.)
- **Detect once in the parent and pass a resolved language down**, instead of using the customer's stored `profiles.language`: rejected — `profiles.language` is already the authoritative signal used for every other localized surface in the product (transactional emails, Host Guide, etc. per `project_email_localization_may2026` / ADR-0090), and re-detecting from chat content would reopen exactly the ambiguity this ADR removes.

## Consequences

- **Positive:** once imported, every future character-generation Claude call receives an unambiguous language directive instead of inferring it fresh each time — closes this defect class for all locales, not just this incident's English/Spanish/Portuguese collision.
- **Not yet imported or tested in Make.com** — no Make.com API access this session (mirrors ADR-0089's `v31`/`v32`: drafted here, needs Jonathan to import both `Parent55` and `Child33` live and verify `{{63.language}}` resolves as expected before publishing). Import order matters: the parent must be publishing `language` in its child-webhook payload before or at the same time as the child scenario is updated to expect it, otherwise `{{63.language}}` in the child will resolve empty (harmless — `ifempty` behavior of an undefined Make variable is an empty string, not an error — but would silently reproduce a version of the original ambiguity by giving Claude "Write ALL output in ." with no language named). Recommend importing/publishing both together.
- **Ciaran's package is not yet fixed** — this ADR covers the systemic fix only. Once both blueprints are live, the plan is a targeted re-fire of just the 8 missing + 2 Portuguese characters (not a full 24-character regen), separately scoped.
- **Not addressed by this ADR:** the missing-character-count gap (`generation_status` can report `completed` with fewer `mystery_characters` rows than `player_count`; `get_empty_characters` only catches existing-but-incomplete rows, never absent ones) — tracked separately in the open vault note, still outstanding.
- **Not addressed:** why 8 of 24 characters never got a row inserted at all in Ciaran's run. Root cause for the count shortfall is still bounded to "somewhere inside the child scenario execution," not fully pinned — needs the child scenario's own execution history reviewed for that specific run.

## Addendum (2026-08-19): remediation + a 3rd, distinct defect found during verification

Both blueprints (`Parent55`, `Child33`) were imported into Make.com. Verified with a single real re-fire (Jody/Jordan Matthews, one of the two Portuguese characters) before the full remediation: came back clean English, content quality intact, `updated_at` confirmed the write. Confirmed the fix.

Proceeded to remediate Ciaran's package directly via the child scenario's public webhook (same mechanism as ADR-0089's recovery — no Make.com API needed, it's a plain HTTP POST): fired all 8 missing characters (Kev/Keira Donnelly, Terry/Tessa Donnelly, Carlos/Carla Ruiz, Gaz/Gabby Norton, Big Johnny/Big Joanna Murphy, Stacey/Steve Wilson, Frankie/Francesca Rossi, Dodgy Dave/Davina) plus the second Portuguese character (Kayleigh/Kyle Brooks). Result: all 24 characters now exist, all 24 have an English `## CHARACTER DESCRIPTION` header — zero language errors, including on the 8 that had never generated before. Both of the customer's original complaints are resolved at the data level.

Verification surfaced a **3rd, distinct defect**, unrelated to the language fix or the missing-character-count gap: **Richie/Regina "The Wolf" Castellano** consistently came back with 7 fields completely empty — `round2_questions`, `round3_questions`, `round4_questions`, `round2_innocent`, `round3_innocent`, `round4_innocent`, `final_innocent` — on both the original 2026-08-18 run and a same-day re-fire (identical failure both times, ruling out random flakiness).

Root cause: the child scenario's per-character generation is split across multiple Claude calls by slip type. Module `509` ("INNOCENT-SLIP scripts") produces all 7 of those fields on `max_tokens: 4000`. Its siblings — `513` ("GUILTY-SLIP scripts," 4 fields) and `517` ("ACCOMPLICE-SLIP scripts," 5 fields) — both get `max_tokens: 5000`, despite producing *less* required output. The call with the most work has the smallest budget. Richie's `secret` (an elaborate money-laundering backstory) most likely pushes the model's 7-field response past 4000 tokens before the JSON object closes, producing invalid JSON that fails to parse downstream — dropping all 7 fields together, which matches exactly what was observed. This isn't specific to Richie; any character with a sufficiently dense backstory could hit the same ceiling.

**Fix**: bumped module `509`'s `max_tokens` from `4000` to `6000` (headroom above parity with its 5000-token siblings, since it does strictly more work than either). Built as `temp-files/MM Live - Child (Unified)34-InnocentSlipTokenBudget.blueprint.json`, from the true head (`Child(Unified)33`). Diffed clean: only that one field plus the blueprint's `name` changed.

**Imported and verified (2026-08-19).** Re-fired Richie a third time against `Child34`: all 7 previously-empty fields now populate correctly (400-570 chars each, coherent content — e.g. "Roddy wanted bigger cut to stay silent about financial arrangements..."). Final sweep across all 24 of Ciaran's characters: **0 non-English, 0 bad headers, 0 incomplete rows.** Package fully remediated — all three defects (language drift, missing characters, token-budget truncation) confirmed fixed.

**Audited the rest of the child scenario's Claude calls for the same pattern.** Field count and requested-paragraph density vs. `max_tokens`, across all 8 calls in both routes:

| Module | Route | Purpose | Fields | Paragraph asks | `max_tokens` |
|---|---|---|---|---|---|
| 409 | detective | round2-4 scripts + final statement (incl. murderer's full confession) | 7 | 4 | 4000 → **6000** |
| 401 | detective | identity/intro | 6 | 5 | 4000 → **5000** |
| 501 | character | identity/intro | 6 | 5 | 4000 → **5000** |
| 509 | character | innocent-slip | 7 | 4 | 6000 (fixed above) |
| 513 | character | guilty-slip | 4 | 4 | 5000 (unchanged) |
| 517 | character | accomplice-slip + confession | 5 | 4 | 5000 (unchanged) |
| 405 | detective | rumors/accusations | 2 | 0 | 4000 (unchanged) |
| 505 | character | rumors/accusations | 2 | 0 | 4000 (unchanged) |

**`409` is a structural twin of the call that just failed** — same field count, same paragraph density, plus it uniquely carries the murderer's full confession (likely to run long) — sitting at the same `4000` that just broke on `509`. Untested (no detective-style customer with a dense-backstory character has reported this specific symptom), but the same failure class is very plausible. Bumped to `6000`, matching `509`'s fix.

`401`/`501` (identity/intro) are denser than a glance suggests — 6 fields, 5 requested prose blocks — but run for every character in every mystery regardless of style, so a high failure rate would likely have already surfaced elsewhere. Lower confidence than `409`, bumped to `5000` as cheap defensive headroom (raising `max_tokens` doesn't increase cost unless the model actually uses more — Anthropic bills actual output tokens, not the ceiling).

`405`/`505` (2 short list-style fields, no prose) and `513`/`517` (already 5000, proportionate to their field count) left unchanged — no structural risk signal.

Built as `temp-files/MM Live - Child (Unified)35-DetectiveAndIdentityTokenBudget.blueprint.json`, from the true head (`Child(Unified)34`). Diffed clean: only the 3 targeted `max_tokens` values plus `name` changed.

**Imported (2026-08-19, confirmed by Jonathan).** Not independently re-verified against a live generation this session (no Make.com API access) — flagged if a detective-route or identity/intro truncation symptom resurfaces after this date, that would mean the import didn't take or the headroom wasn't enough.

## Addendum 2 (2026-08-19): title bug — separate, unrelated, also fixed

Ciaran's original report mentioned nothing about the title, but investigation earlier in this incident found `mystery_packages.title` / `conversations.title` both read `死亡en El Micrófono: Murder At The Costa Del Karaoke` — a stray Chinese character where the concept-chat model most likely intended the Spanish "Muerte" (matching the deliberate Spanish-flavored bilingual title style, "[Death] en El Micrófono"). Confirmed this bug originates in the assistant's own chat message, generated before Make.com is ever invoked — entirely unrelated to the Child-scenario fixes above, and untouched by any of the character-level re-fires (which don't write to `title`).

Fixed directly via a targeted `UPDATE` on both `mystery_packages.title` and `conversations.title` to `Muerte en El Micrófono: Murder At The Costa Del Karaoke`. Verified no other trace of the stray character exists anywhere else in the package (`game_overview`, `host_guide`, `master_context`, `mystery_data`, all `mystery_characters` text fields — swept, clean).

Casing corrected in a follow-up update — the rest of this product's titles consistently capitalize every word regardless of length (`Murder On The Midnight Express`, `Murder At Villa Soleil`), confirmed by sampling 15 other titles; the first fix left "en" lowercase, inconsistent with that pattern. Final value: `Muerte En El Micrófono: Murder At The Costa Del Karaoke`.

**Investigated whether this needs a systemic fix — concluded no, on the evidence.** Checked `supabase/functions/mystery-ai/index.ts` (the concept-chat generator, separate from anything else in this ADR): it already does language handling correctly — takes the client's selected language explicitly, falls back to character-set detection only when no language tag is provided, with a strong explicit directive (`Write the ENTIRE response in ${languageName}...`). This is the same design this ADR had to *retrofit* into the Make.com child scenario; here it already existed. So the stray Chinese character wasn't a "detection failed" bug like the Portuguese leak — the model was correctly instructed and still slipped one glyph.

Scanned all 137 other package titles (customers whose `profiles.language` isn't zh-cn/ja/ko) for any CJK characters: **zero matches**. This is a genuine 1-in-138 one-off, not a recurring pattern — the existing safeguard is working as designed; it just didn't catch this one token. Considered but did not build a defensive post-generation scan (flag CJK/unexpected-script characters in non-CJK-locale output) — the base rate doesn't currently justify it; noted here as a cheap option if it recurs.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `LANGUAGE_NAMES` map, `profiles.language` lookup, `language` field added to `webhookPayload`
- `temp-files/MM Live - Parent55 (Explicit Language Parameter).blueprint.json` — current parent head, built on `Parent54`
- `temp-files/MM Live - Child (Unified)33-ExplicitLanguageParameter.blueprint.json` — current child head, built on `Child(Unified)32`
- `temp-files/MM Live - Child (Unified)31-CharacterContentLanguageMatch.blueprint.json` — the first (detection-based) attempt at this same defect class, superseded by this ADR's explicit-parameter design
- `docs/adr/0089-child-scenario-id-chaining-and-filter-operator-regression.md` — prior ADR establishing the "drafted here, imported live by Jonathan, re-exported" workflow this ADR follows

## Discussion

The original `<language_instruction>` (v31, Aug 16) was itself a real fix for a real, previously-reported bug — it's not that no one had addressed language handling before. The gap was specifically in *how* it determined the target language: content-detection degrades exactly when the content is richly themed in a language other than the customer's own, which is common and expected in a creative-writing product (customers regularly ask for foreign settings while writing in English). Worth remembering for any future per-call Claude instruction in this pipeline: prefer passing known values explicitly (language, customer name, script type — all already modeled as first-class fields elsewhere in this payload) over asking the model to re-derive them from prose content it wasn't specifically structured to encode.
