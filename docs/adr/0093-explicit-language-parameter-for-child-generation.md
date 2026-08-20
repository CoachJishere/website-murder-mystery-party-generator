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

## Addendum 3 (2026-08-20): the "fully remediated" claim in Addendum 1 was wrong — verification only checked headers

Ciaran emailed again: "quite a lot of the text is in spanish" across several character packs. Investigation found Addendum 1's "final sweep across all 24 of Ciaran's characters: 0 non-English, 0 bad headers, 0 incomplete rows" was a real check but an incomplete one — it verified the `## CHARACTER DESCRIPTION` header on all 24 rows, not the actual round-script/secret/slip content underneath. It never re-checked the **13 characters from the original 2026-08-18 run that Addendum 1 didn't touch at all** (it only re-fired the 8 missing + 2 known-Portuguese + Richie — 11 of 24, not "all 24" as the header-only sweep implied).

Built a higher-precision full-content sweep this session: rather than accented characters alone (too noisy — flags legitimate French/Spanish-themed flavor text going back over a year of paid orders, e.g. "Death At Château Buzancy," a genuinely French-language customer order from 2025-08-12), searched for the template's own section headers translated into Spanish/Portuguese/French (`## RONDA 2`, `## RODADA 2`, `## SEU SEGREDO`, `**SI ERES**`, `**SE VOCÊ É**`) — strings with zero legitimate overlap with English or themed flavor text. Ran this across **every paid customer's package**, not just Ciaran's, to check whether this was systemic. Result: exactly one other hit, and it's a legitimate all-French mystery (customer's own concept chat and `game_overview` are consistently French throughout — not a defect). **This incident is contained to Ciaran's package.**

Confirmed 13 of 24 of Ciaran's characters (all from the original 2026-08-18 run) had entire round-script/secret/slip fields in Spanish or Portuguese — e.g. Maureen/Maurice Briggs had `secret` entirely in Portuguese (`## SEU SEGREDO`) while `round2_innocent` was entirely in Spanish (`## RONDA 2: MOTIVOS`) on the same row, confirming this predates the explicit-language fix (Parent55/Child33, imported 2026-08-19, one day after this run).

**Remediation:** re-fired all 13 via the same `CHILD_WEBHOOK` mechanism as Addendum 1, this time manually adding `"language": "English"` to the payload — `notify-generation-issue`'s default payload shape (which these prior remediations copied by hand) never included a `language` field at all, so without adding it by hand, the fix these characters most needed wouldn't have been applied. One of the 13 (Chantelle/Charlie Frost) silently no-showed on the first fire — webhook returned HTTP 200 but the row never updated after 5+ minutes; a single isolated retry fixed the no-show itself, confirmed by a fresh `updated_at`.

**Result: 19 of 24 characters are now fully clean English.** 5 still have one or two fields (never more) in Spanish/Portuguese, scattered across different characters and different slip types — not concentrated in one module the way Addendum 1's `509` token-budget bug was:

| Character | Field(s) still wrong |
|---|---|
| Chantelle/Charlie Frost | accomplice-slip only |
| Deano/Deanna Harper | accomplice-slip only |
| Maureen/Maurice Briggs | accomplice-slip only |
| Tommo/Tamsin Clarke | innocent-slip only |
| Tracey/Travis Bennett | innocent-slip AND guilty-slip |

This scatter (no single module fails consistently; different slip types fail for different characters) reads as **residual per-call drift, not a module that's missing the explicit-language instruction outright** — if e.g. the accomplice-slip module (517) simply lacked the instruction, it should have failed for every character with an accomplice-slip field, not 3 of ~9. Chantelle's isolated retry is the cleanest single data point: identical payload, `language: "English"` explicitly set, and it still landed one specific field (accomplice-slip) in Spanish while the other three (innocent, guilty, secret) came back clean on the same call. Genuinely unresolved question for whoever looks at the live Make.com scenario next: whether `{{63.language}}` intermittently resolves empty (a Make binding/timing issue, not a prompt issue) or the explicit instruction is simply not 100% reliable at the model level despite being unambiguous. No Make.com API access this session to inspect the modules directly.

**Also fixed, separately:** `notify-generation-issue/index.ts` (the auto-recovery function `sweep_stuck_needs_review_packages` fires every 10 minutes for any package sitting in `needs_review`) never sent a `language` field in its own `CHILD_WEBHOOK` payload — a gap that predates and is independent of this incident. Added the same `LANGUAGE_NAMES` map and `profiles.language` lookup as `mystery-webhook-trigger/index.ts`, now forwarding `language` on every auto-recovery re-fire. Without this, any future auto-healed character for any non-English-locale customer (or any English customer whose mystery is richly foreign-flavored, exactly like Ciaran's) would silently reproduce this whole defect class through the *automated* recovery path, even after this ADR's fix is fully live everywhere else. Deployed to production (`notify-generation-issue` v24) with `verify_jwt: true` preserved from the prior version.

**Update:** retried all 5. Chantelle's second attempt came back fully clean (accomplice-slip fixed). The other 4 did not converge — 21 of 24 characters fully clean, 3 with a reproducible residual defect (Deano/Maureen: accomplice-slip wrong on 2/2 attempts; Tracey: innocent+guilty-slip wrong on 2/2 attempts; Tommo: webhook returns HTTP 200 but never writes to the DB, 3/3 no-show). See Addendum 4 for the actual root cause found afterward.

## Addendum 4 (2026-08-20): the real root cause — the fix documented above was never actually functional, for any customer

Jonathan pointed out `MAKE_API_TOKEN` in `.env` is usable (a prior session had already discovered this — ADR-0095/0096 — but it wasn't checked before writing Addendum 3). Pulled both live scenarios' blueprints directly via the Make API (`GET /api/v2/scenarios/{id}/blueprint`, zone `eu2.make.com`, org 3652337, team 1719612):

- Child scenario, live as `id 9061052`, confirmed at `Child(Unified)35` (matches CHANGELOG's account, not stale).
- Parent scenario, live as `id 9106101`, confirmed at `Parent55`.

Inspected each scenario's `gateway:CustomWebHook` trigger module (module `63` in both). A Make custom webhook only exposes fields as `{{63.fieldname}}` to downstream modules if that field is present in the module's own declared `metadata.interface` list — this is Make's stored "data structure" for the hook, set when the structure is (re)determined from a sample payload, not automatically inferred from whatever a given HTTP POST happens to contain. **Neither webhook's interface list includes `language`:**

- Child module 63's interface: `characterName, characterDescription, characterIndex, packageId, scriptType, hasAccomplice, mysteryType, characterChatExcerpts, conversationContent` — 9 fields, no `language`.
- Parent module 63's interface: ~636 fields (the full per-message schema `mystery-webhook-trigger` sends) — no `language` among them either, despite that edge function adding a `language` field to its payload back when Addendum 1 shipped.

Confirmed all 8 Claude-call modules (401/405/409/501/505/509/513/517) do correctly reference `{{63.language}}` in their prompts, and confirmed the `max_tokens` values match what CHANGELOG/Addendum 1 claimed (401/501: 5000, 409/509: 6000, 513/517: 5000, 405/505: 4000) — the prompt-level work from Addendum 1 was applied correctly. But since `language` was never added to either webhook's declared structure, **`{{63.language}}` has resolved to an empty string on every single character generation since Parent55/Child33 went live on 2026-08-19 — not just Ciaran's leftovers, every customer, going forward, right up to this moment.** An empty language directive ("Write ALL output in .") is functionally the same ambiguous-detection failure mode this whole ADR was written to eliminate — it just happens to default to English often enough (most mysteries are thin on foreign flavor text) that it went unnoticed until a customer's mystery leaned as heavily into Spanish/Portuguese setting detail as Ciaran's did. This also fully explains Addendum 3's scattered pattern: not a broken module, but a uniformly-blank language field whose failure rate tracks how much foreign-language flavor text sits in each call's own context (accomplice/guilty/innocent-slip calls include the character's `secret`, which for several of Ciaran's characters (Carlos the "greasy Spanish barman," money-laundering backstories set "in Spain") is exactly where the flavor density concentrates).

**Fix drafted, not yet imported:** added `{"name": "language", "type": "text"}` to both webhook modules' interface arrays. Built as `temp-files/MM Live - Child (Unified)36-WebhookLanguageField.blueprint.json` (from true head `Child35`) and `temp-files/MM Live - Parent56 (Webhook Language Field).blueprint.json` (from true head `Parent55`). Diffed both against the live-pulled originals: exactly the one interface entry plus the blueprint's own `name` field changed in each, nothing else — same verification discipline as ADR-0089/Addendum 1.

**Not done this session:** did not push either change live via the API — this alters the production generation path for every customer, and the established workflow for this codebase is draft-here/import-by-Jonathan (ADR-0089's precedent), not an unreviewed live API write to a shared scenario. Once imported (Child first or together with Parent — same ordering caution as the original Decision section: importing Child alone before Parent is harmless, since `{{63.language}}` in Child just stays empty until Parent starts sending it; importing Parent's field without Child's isn't useful either, since Child still won't recognize it), Deano/Maureen/Tracey/Tommo's remaining broken fields should be worth one more re-fire attempt — this time with a real chance of `{{63.language}}` actually resolving.

**Consequence for the "is it safe to tell the customer" question:** no. Even setting aside Ciaran's 3 still-broken characters, the underlying mechanism has been non-functional in production this whole time — any customer between 2026-08-19 and whenever this interface fix lands is at the same latent risk Ciaran hit, for any mystery whose setting leans into non-English flavor text.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `LANGUAGE_NAMES` map, `profiles.language` lookup, `language` field added to `webhookPayload`
- `supabase/functions/notify-generation-issue/index.ts` — same `LANGUAGE_NAMES` map + `profiles.language` lookup added 2026-08-20 (Addendum 3); `language` field added to its own `CHILD_WEBHOOK` auto-recovery payload, which never had one
- `temp-files/MM Live - Parent55 (Explicit Language Parameter).blueprint.json` — current parent head, built on `Parent54`
- `temp-files/MM Live - Child (Unified)33-ExplicitLanguageParameter.blueprint.json` — current child head, built on `Child(Unified)32`
- `temp-files/MM Live - Child (Unified)31-CharacterContentLanguageMatch.blueprint.json` — the first (detection-based) attempt at this same defect class, superseded by this ADR's explicit-parameter design
- `docs/adr/0089-child-scenario-id-chaining-and-filter-operator-regression.md` — prior ADR establishing the "drafted here, imported live by Jonathan, re-exported" workflow this ADR follows

## Discussion

The original `<language_instruction>` (v31, Aug 16) was itself a real fix for a real, previously-reported bug — it's not that no one had addressed language handling before. The gap was specifically in *how* it determined the target language: content-detection degrades exactly when the content is richly themed in a language other than the customer's own, which is common and expected in a creative-writing product (customers regularly ask for foreign settings while writing in English). Worth remembering for any future per-call Claude instruction in this pipeline: prefer passing known values explicitly (language, customer name, script type — all already modeled as first-class fields elsewhere in this payload) over asking the model to re-derive them from prose content it wasn't specifically structured to encode.
