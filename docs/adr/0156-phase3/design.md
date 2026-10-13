# ADR-0156 Phase 3 design: `child-context` and Child64 (2026-10-13)

Status: built, tested, **`child-context` and the `regenerate-child-content` change deployed with the switch OFF**; Child64 built locally, **not imported**; the switch has never been anything but `off`. The approvals recorded in the ADR on 2026-10-13 were used as follows: failure policy (used), edge function deployment with the switch off (used), paid check (NOT used: see section 9).

## 1. Facts checked against the code and the database (free, read-only)

1. **The role does not exist before Call 1.** The Parent (Parent86) has no `mystery_characters` upsert. The Child's module 400 only looks for an existing row; the row, with `character_role`, is written by module 404 AFTER Call 1 (`character_role: {{402.data.characterRole}}`), where `characterRole` is the model's own answer. A fresh run therefore has no stored role; only a re-fire or a heal does. The function derives the role from the design instead (`deriveRole`: `murdererSelection.character`, `accompliceSelection.character`, then `isRedHerring` on the character's own `wrongedEachCharacter` entry, else `suspect`).
2. **Derived equals stored for every culprit.** On the 14 recent detective packages in the local fixtures (153 characters): all 19 murderers and accomplices are derived as such, no stored culprit is derived as an innocent and no innocent as a culprit. The 28 other differences are all `suspect` versus `redHerring`, i.e. the model's own noisy choice against the design's flag; they do not affect redaction. (`temp-files/charctx/`, test `real packages`.)
3. **The chat the Child receives is not the chat in the database.** `63.conversationContent` is built by `mystery-webhook-trigger` per run: the approved concept message plus everything after it, optional earlier customer briefs, a concept base for a delta message, and an appended **operator note** (not stored anywhere). `63.characterChatExcerpts` is the per-character message list (30 KB cap) from `conversation.messages`. A function that rebuilt the chat from the database would silently drop the operator note and change the snapshot slice. So the function does **not** read the chat from the database; it redacts the texts Make already holds (decision 2 below).
4. **Module layout.** Common flow: webhook 63, 142 (search `mystery_packages`), router 200. Route 0 (detective, filter on module 400 "Detective Style"): 400, 401 (Call 1), 405 (Call 2), 409 (Call 3), plus parse/upsert modules. Each of 401/405/409 has exactly one `{{142.master_context}}`, one `{{63.characterChatExcerpts}}` and one `{{63.conversationContent}}`. Route 1 (slip, 500 to 521) has the same three references in five modules and is untouched.
5. **Second consumer.** `regenerate-child-content` (line ~1088 before the change) put the whole `master_context` and a windowed raw transcript into its prompts, and also listed every other character WITH ITS ROLE ("- Name (murderer)") in the cast roster. That roster is a third leak of the solution for every healed character; it is covered (section 7).
6. **The roster for chat redaction** comes from the design (`wrongedEachCharacter` names, else `characterSpecificDetails`), because the `mystery_characters` rows do not all exist yet while the Children run. On the 14 packages every row name matches a design name except 2 characters of El Ultimo Trago (the design has 19 entries for 21 rows); those two take the fallback.
7. **Auth reality.** Every existing Make call to our functions sends the PUBLIC anon key (it is in the frontend bundle). A function behind only that key would hand any visitor a customer's full design. Hence the shared secret in section 8.
8. **`is_test`** lives on `conversations`, not `mystery_packages`. Only one `is_test` detective package exists and it is a 1,826-character stub with 2 characters, so no existing package can host the paid check (section 9).

## 2. Decisions, and where this differs from the kickoff

1. **Transport: one `text/plain` body, no JSON escaping in Make.** Body = packageId, characterName, characterChatExcerpts, conversationContent joined by `\n<<<CHILD-CONTEXT-PART-7c2e91>>>\n` (`BODY_SEPARATOR` in `_shared/childContext.ts`). Make's raw JSON bodies break on multi-line chat (documented history in `mystery-webhook-trigger`), module 402 already posts 100 KB of text/plain, and header or query values cannot carry names such as "Dona Hierbas". A body that does not split into exactly four parts, or whose id is not a UUID, is a 400.
2. **Chat input comes from Make, not the database** (fact 3). Deviation from the kickoff ("reads master_context and the chat from the database"): the master_context is read from the database (the trusted copy), the chat is the text Make passes.
3. **`off` returns `redacted:false` and no text, not an echo of the full text.** The kickoff said "off returns the full context and chat". Echoing 100 to 300 KB back only to have Make paste it would add a transfer and a way to differ. Instead the Child64 prompt reads `{{if(414.data.redacted; 414.data.context; 142.master_context)}}`: whenever `redacted` is not true the ORIGINAL reference is used, so off, test_only on a real package, a culprit, every fallback, an HTTP error and a missing `data` all produce exactly today's input by construction, not by comparison.
4. **Chat-list rule refined.** The approved policy says "chat list not recognised -> fall back". Taken literally that would fall back for every character of a package whose excerpt simply contains no character list (normal for a customer who never posted one). Implemented: fall back when the list is not recognised AND the other characters' hidden text from the design still appears in the chat after the strict pass (`survivors > 0`). A chat with no recognisable list and nothing hidden in it is harmless and is redacted normally; the flag is recorded. On the 12 real classic chats the unrecognised flag never occurred.
5. **Four-valued role.** The context's `contextFor.role` is `suspect` or `redHerring` (from the design's flag) for innocents, so Call 1 still sees the red-herring signal it used to read from `isRedHerring`, which the redaction drops. The Child prompt's role_determination block is unchanged.
6. **Only fallbacks are logged, not successes.** `auto_remediation_log` (outcome must be fixed/escalated/failed) rows with defect_class `child_context`, outcome `escalated`, cost 0, action `fallback:<reason>:<name>`. A success row would carry the outcome "fixed", whose documented meaning is a repaired defect. Successes appear in the function log (ids, role, sizes, flags; never customer text) and in the Make execution output (`redacted: true`).
7. **Alerts: one e-mail per package and reason**, via an `alert:<reason>` marker row (so 14 characters of one package send one e-mail), through Resend to support@ like the other alert paths. Intrigue is logged but does not alert (it is a known, permanent fallback until an intrigue allowlist exists).
8. **Unknown switch value is `off`.**

## 3. Function contract (`supabase/functions/child-context`)

`POST /functions/v1/child-context`, `verify_jwt = true` (explicit in `config.toml`), headers `Authorization`/`apikey` (anon, to pass the gateway) and **`x-child-context-key`** (the real gate).

| Status | When | Make does |
|---|---|---|
| 200 `{redacted:true, role, context, excerpt, chat, flags, mode, fallback:null}` | innocent, redaction on and succeeded | uses the three returned texts |
| 200 `{redacted:false, ..., context:null, ..., flags, fallback}` | switch off, test_only on a real package, not detective, culprit, or any fallback | keeps its original inputs |
| 401 / 503 / 405 / 400 / 404 / 500 | wrong or missing key / secret not configured / not POST / bad body / unknown package / lookup failure | keeps its original inputs (`redacted` is absent) |

Only a literal `redacted:true` changes anything. The handler never throws to the caller: an unexpected exception inside the redaction becomes an alerted `exception` fallback.

## 4. Failure policy (approved 2026-10-13, with the refinement in 2.4)

Every row means: today's full inputs are kept, a `child_context` row is logged, never a blank or partial sheet.

| Reason | Trigger | Alert |
|---|---|---|
| `unsupported-intrigue` | `mysteryType` intrigue | no |
| `unsupported-schema`, `unreadable-design` | design not parseable or not the classic shape, empty or null `master_context` | yes |
| `design-names-no-murderer` | a design with no murderer (would otherwise look like "everyone innocent") | yes |
| `own-entry-not-found` | the character has no `wrongedEachCharacter` or `characterSpecificDetails` entry (rename after approval, stale roster) | yes |
| `context-too-small` | the slice is under 1,500 characters (real slices are 4,500 to 11,200) | yes |
| `chat-list-not-recognised` | see 2.4 | yes |
| `exception` | anything unexpected | yes |

Role doubt resolves toward the FULL context: if either the design or the stored role says murderer or accomplice, the character keeps everything (a starved culprit writes a wrong confession; an innocent kept at today's input is only as leaky as today), and a disagreement is flagged (`role-mismatch`) in the response.

## 5. Kill switch

`pipeline_settings.child_context_redaction`: `off` (default; row inserted as `off` on 2026-10-13 at deployment), `test_only` (redact only when `conversations.is_test`), `on`. Read on every call, so flipping it needs no deploy or Make import. Rollback of everything: set `off`. Both consumers read the same row.

## 6. Child64 (`temp-files/build-child-v64.py`, copy in `docs/adr/0156-phase3/tools/`)

From Child63, asserted by counts and by a per-module comparison:

- **New module 414** `http:ActionSendData` "Child Context", inserted after 400 in route 0 (the route filter on 400 still gates it, so the slip route never calls it). `handleErrors:false` as in 402/413 (a non-2xx answer does not raise), timeout 60, body as in 2.1, headers `Content-Type`, `Authorization`, `apikey`, `x-child-context-key`.
- **Modules 401, 405, 409:** the three references each become `{{if(414.data.redacted; 414.data.<field>; <old reference>)}}`.
- **One clause** appended to the existing POSITIONS AT THE KEY MOMENT rule in those three: "An entry for another character is only what this character could see of them at that moment: use it as a sighting, and never add why they were there, what they were doing out of sight, or what happened later."
- Blueprint name changed. Everything else, including the long innocent-ignorance rules, role_determination, the whole slip route and all other modules, is byte-identical (the script asserts: only 401/405/409 differ, only 414 is new, the five slip call modules and the whole of route 1 are equal, the reverse substitution reproduces Child63's text exactly).
- **The key:** the script reads `CHILD_CONTEXT_KEY` from the environment (it is in the gitignored `.env`). The blueprint currently on disk was built WITHOUT it and holds the placeholder `PASTE_CHILD_CONTEXT_KEY_HERE`; rebuild with `set -a; . ./.env; set +a; cd temp-files && python3 build-child-v64.py` just before importing. Never commit the blueprint (gitignored by `temp-files/**/*.json`).

What the one remaining Make-side risk is: a connection failure or timeout (not an HTTP status) makes module 414 raise, and with no error handler the execution stops for that character. That is a loud failure (the existing stuck-package detection and re-fire apply), not a blank sheet, and the function answers in about a second. A `Resume` handler for the HTTP module could remove even that; I did not hand-write one because its output mapper cannot be verified outside the Make editor.

## 7. `regenerate-child-content`

Same shared function (`inputsForRegeneration`), same switch and fallback. Per target character: design and transcript replaced by the redacted forms when the switch applies (the transcript is redacted first, then windowed by `buildConversationExcerpt` as before); a fallback writes a `child_context` row; with a redacted character the cast roster no longer shows other characters' roles. Off (default): the strings are the originals, byte for byte (test: `regeneration seam: off returns the exact original strings`). A thrown error inside the seam returns the originals. The change is strictly upstream of the existing write, content-loss guard and re-detect gate, so it adds no new way to write a field. `redaction-seam.test.mjs` is a source-level tripwire for the wiring, because the file is Deno code that Node cannot import. No e-mail alert from this path (a heal already reports through its own response); the log row is written.

## 8. Security

- Gateway JWT check on, plus a shared secret in `x-child-context-key` compared in constant time (SHA-256 of both sides, XOR loop). No secret configured: 503, serves nothing. Anon key alone: 401 (verified live).
- Service role is used inside the function only to read `mystery_packages`, `conversations`, `pipeline_settings` and to write `auto_remediation_log`; the response contains the caller's own package only because the caller must already hold the secret.
- No CORS headers: it is a server-to-server call and browsers cannot use it.
- Customer text is never logged (test: `customer text is never written to the log`); only ids, role, sizes and flags. Alert mails carry the character name and flags.
- The secret exists in three places: Supabase secret, `.env` (gitignored), and the local Child64 file. Rotation: set a new Supabase secret, rebuild, re-import.

## 9. Verification plan (NOT executed) and estimate

**Why the approved paid check was not run.** It is specified as a Child-only re-fire, which runs through Make and therefore needs Child64 imported (Jonathan's call), and it needs an `is_test` detective package with a real design; the only one that exists is a stub. So it cannot start yet. Free checks done instead: 49 new tests, 22 mutations killed, the 14 real packages exercised through `prepareChildInputs`, live deployment smoke test with the switch off (401 without key, 401 with the anon key only, 200 `redacted:false` with the key).

**Not verified in the deployed runtime:** the `on` path (the same TypeScript as the Node tests, but never run in Deno on the live project). The first thing the paid check proves.

**Plan A (needs the import; the approved shape).**
1. Jonathan imports Child64 (with the key rebuilt in). With the switch `off` this changes nothing by construction; confirm on the first detective execution that module 414 shows `redacted:false` and the prompts contain the original text.
2. Create an `is_test` copy of a real classic package with accomplice (Blackthorn or Silver Nightingale: copy `master_context`, the chat text and the characters into a new test conversation/package; DB writes, to be listed before running).
3. Set the switch to `test_only`. Re-fire 6 innocents Child-only (switch on arm) and the same 6 with the switch `off` (control). Compare per character: the three reviewer-style checks used in Phase 2 (hidden-text 6-word runs of other characters, culprit named, the solution notes) and, with one reviewer run per arm, findings per category (secret_leak first, wrong_fact and cross_field_contradiction watched for a rise); read 3 sheets in full for starvation.
4. Estimate: 12 characters x 3 calls, about 0.2 USD per character = 2.4 USD, two reviewer runs about 1.0 USD, **about 3.4 USD; proposed cap 4.5 USD** (same cap as Phase 4).

**Plan B (no import needed; narrower).** On the same test package use `regenerate-child-content` (all three groups, 6 innocents) with the switch `test_only` against a control arm with `off`: 12 x about 0.15 = 1.8 USD, reviewer runs about 1.0 USD, **about 2.8 USD, cap 3.5 USD**. It proves the Deno `on` path and the regenerate seam, not the Make wiring or the Child64 prompt clause.

**After go-live (the real metric).** Per `mystery_packages_prompt_versions`, compare the first 5 detective purchases on Child64 with the baseline (about 13 reviewer findings per English package; about 2 secret_leak findings per package in the Round Scripts call; 52 of 312 findings overall): secret_leak and culprit-named down; wrong_fact and cross_field_contradiction must not rise. Also count `child_context` fallback rows per purchase (expect intrigue only, plus rare own-entry-not-found).

## 10. Checklist for Jonathan

1. Nothing is needed to keep today's behaviour; the switch is off.
2. To import Child64: rebuild with the key (section 6); after import open module 414 and confirm the URL, the four headers (the `x-child-context-key` value must not be the placeholder) and the body; run one detective Child execution with the switch off and check the prompt text is unchanged.
3. Only then, with a yes, the switch goes to `test_only` for the paid check; `on` for real purchases is a separate decision.
4. Record the import in `prompt_version_history` when told (not done).

## 11. Least certain

That Make resolves `{{if(414.data.redacted; ...)}}` for a boolean from a parsed JSON response exactly as in the unit-level reading (a boolean `true` is truthy, a missing `data` is empty). I could not run Make. If it did not, the behaviour is still safe in one direction (everything falls to the old reference) but redaction would never apply; the first execution with the switch off proves nothing about that, and the first `test_only` one does.

## 12. Files

`supabase/functions/_shared/childContext.ts` (+ `.test.mjs`), `supabase/functions/child-context/{index.ts,handler.ts,child-context.test.mjs}`, `supabase/functions/regenerate-child-content/{index.ts,redaction-seam.test.mjs}`, `supabase/config.toml`, `package.json` (`npm run test:childctx`), `temp-files/build-child-v64.py` and `docs/adr/0156-phase3/tools/{build-child-v64.py,mutate.py}`, local `temp-files/MM Live - Child (Unified)64-RedactedContext.blueprint.json`.
