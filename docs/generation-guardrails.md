# Generation guardrails — per-character content coherence

Canonical rule list for the **Make.com child scenario** per-character prompt (and the parent detective/evidence prompt where noted). Companion to `docs/evidence-card-generation-guardrail.md`. Source decisions: ADR-0037 (Whispers playtest), ADR-0041 (identity contamination), ADR-0042 (content-quality detectors + G7–G10). Latest blueprint files on disk: child `MM Live - Child (Unified)19-SlipGuilt-OutputHygiene-VictimQuestions` (built 2026-07-25, carries G8/G9/G2), parent `MM Live - Parent49 (Accomplice-Beat Silent-Omission)` (built 2026-07-26, carries G7/G8/G9 + the reworded accomplice-beat instruction; supersedes Parent48). **⚠️ Whether these are the versions actually LIVE in Make.com is not tracked in git — see the Import ledger at the bottom. Confirm the live version before assuming a guardrail is active.**

When you edit a Make.com prompt, apply the matching rule verbatim (or close), and mirror any detective/evidence rule into `supabase/functions/regenerate-parent-content/index.ts` so the recovery tool stays consistent.

---

## G1 — Timing realism (TWO layers)
Timing is **load-bearing** — it's the incriminating mechanism — so it's designed at the master level, not just formatted downstream.

**Layer 1 — master constraints (Parent v46, all 4 `## N. TIMELINE FRAMEWORK` prompts).** Design the alibi timeline so the **host** holds precise-enough times to adjudicate who's lying (host-only `timelineFramework` / `hostBriefing`), but the **player-facing** alibis, claimed locations, and the culprit's alibi gap read approximately/event-relative from the outset. The culprit's gap is an event-relative inconsistency, not a minute mismatch.

**Layer 2 — per-character recall enforcement (Child v16).** Even given the design, characters *recall* time approximately and relative to events — "just before nine, as the lamps were lit", "shortly after the second gong". A precise clock time is permitted **only** when it is a deliberate incriminating anchor **and** the character has an in-fiction reason to remember it exactly (glanced at a watch and the number stuck, heard a clock chime the hour).

> Master prompt line: *"Design the timeline in two layers: the host layer may hold precise clock times to adjudicate; the player-facing layer (alibis, locations, the culprit's gap as spoken) must read approximate and event-relative. Give an exact time only when it is the deliberate clue AND a character has a concrete reason to remember it."*
> Child prompt line: *"When a character refers to time, use approximate, event-relative phrasing ('just before nine', 'as the séance was about to begin') rather than exact clock times. Only give an exact time if it is a deliberate clue AND the character has a concrete reason they'd remember that exact moment."*

## G2 — No self-directed questions
A character's "questions to ask" list must **never** contain a question addressed to that same character. Every question targets a **different** cast member.

> Prompt line: *"Every question in this character's 'questions to ask' list must be directed at a DIFFERENT character. Never generate a question this character asks of themselves."*

## G3 — Evidence provenance *(parent evidence prompt + child references)*
Any evidence that functions as a record or testimony (logbook, ledger, letter, journal, receipt) must state **who created or kept it**, so "who wrote this?" always has an answer. Provenance is neutral and must not spoil the culprit (per ADR-0035).

> Prompt line: *"Any documentary evidence (logbook, ledger, letter, journal) must name who created or maintained it (e.g. 'the butler's entrance logbook'). Do not leave a record's authorship unexplained. Provenance must not reveal or uniquely pinpoint the culprit."*

## G4 — Accomplice coherence — ONLY IF `hasAccomplice = true` (TWO layers)
The accomplice's throughline must be internally consistent: they **shield the murderer** (deflect, provide cover, misdirect) and must **not** also be scripted to accuse or incriminate the murderer. Any suspicion the accomplice raises is aimed at **other** suspects, never the person they are protecting.

Like timing, the accomplice is **designed at the master level** for predetermined (detective) styles, so it's enforced in two layers:

**Layer 1 — master constraints (Parent v46, the 2 predetermined masters' `ACCOMPLICE DETAILS` sections — murder + intrigue).** The `accompliceDetails` throughline (specificRole, inGameBehavior) must protect the culprit and deflect toward other suspects, never at the culprit. (Random-slip / character-based masters have **no** `ACCOMPLICE DETAILS` — the accomplice is drawn at the table, so it's child-only there.)

**Layer 2 — per-character (Child v16).** The accomplice character's actual round scripts must protect, never accuse, the culprit.

> Master prompt line: *"The accomplice's throughline must stay internally consistent across every field and round: they PROTECT the culprit, deflecting suspicion toward OTHER suspects. Never accuse, incriminate, or turn on the culprit."*
> Child prompt line: *"If this character is the accomplice: their consistent goal is to protect the murderer. They deflect suspicion away from the murderer and toward other suspects. Never script the accomplice to accuse, incriminate, or 'turn on' the murderer in any round."*

## G5 — Blackmail / secret logic
A secret used as blackmail leverage must remain **genuinely hidden**. Exposure consequences are **prospective**, not already-realised. A backstory must not say a scandal was "discovered / became public / nearly ended your career" **and** that someone is currently blackmailing them over that same fact. Either it is still secret (blackmailable) or it is public (not blackmailable) — pick one.

> Prompt line: *"If a secret is being used to blackmail this character, that secret must still be genuinely hidden from the public — the damage is what WOULD happen if exposed. Never write that the same fact was already discovered/made public AND is still being used as active blackmail leverage."*

## G6 — Secret stakes + guard directive
Every secret states **concrete prospective consequences** of exposure (financial ruin, arrest, social destruction, loss of inheritance). The player is told to protect it at all costs. (The consequences are generated here; a static "guard this at all costs" reminder is also injected at the render layer so it survives regardless.)

> Prompt line: *"Every secret must spell out the concrete consequences the character faces if it is exposed (ruin, arrest, loss of position). End the secret with a clear stake: this character will do almost anything to keep it hidden."*

---

## Detective-script rules (parent scenario — Parent46, mirror in regenerate-parent-content)

- **Accomplice reveal — ONLY IF `hasAccomplice = true`.** After the murderer's confession, the detective turns to the accomplice ("but you didn't act alone, did you?"), the accomplice gives their own short confession, and the detective arrests **both**, closing with a summary that names both. If there is no accomplice, keep the single-arrest close.
- **Two-round accusation framing (D2).** The detective announces out loud: two rounds — first everyone accuses someone else and cites evidence (no self-defence yet); then, after everyone has gone, each player defends themselves. Accusations forced **outward**.
- **Transitions.** After the opening statement: an explicit "proceed immediately to Round 1" cue. Between rounds: a clear beat that the detective has finished and players should talk/investigate before the next detective statement.
- **No "stand up".** Remove blocking that assumes a standing/theatre setup (e.g. "everyone stand up"); groups play seated.
- **Hybrid reveal (D1).** The reveal presents a clinching final clue and a "how they did it" walkthrough, while the case remains solvable from the breadcrumbs planted across rounds.

---

## G7–G10 — added after the 2026-07-25 quality audit (ADR-0042)

The 2026-07-25 hand-audit of three recent paid packages found four failure modes reaching customers. G7–G10 are the generation-time prevention; the read-only detectors in `supabase/migrations/20260725_detect_content_quality_issues.sql` (health-check checks 6–9) are the backstop. **Prompt text below is ready to apply; the blueprint build is a separate careful step — duplicate the current head (`temp-files/`, re-list first), insert, save as the next number (child → `19-…`, parent → `48-…`), verify JSON valid + module count unchanged, import, then record in the ledger.**

## G7 — Victim consistency *(parent: game_overview + master_context generators)*
The victim named in `game_overview` must be the SAME victim the master_context establishes — same name, role, manner of death. Never introduce a different or additional named victim. (Incident: "The Last Will And Testament Of Adelaide Crane" opened with "Sophie Duplock, a 24-year-old real estate magnate" — a foreign victim bled from another package while the rest of the package was Adelaide Crane.)

> Prompt line (add to the overview `<output_instructions>` and the master_context generator): *"VICTIM CONSISTENCY: The victim is already established in the master_context. Name the SAME victim — same name, role, and manner of death. NEVER introduce a different or additional named victim, and never rename or re-gender the established victim. If unsure who the victim is, re-read the master_context; do not invent one."*

## G8 — No fixed culprit in random-slip ("character" style) games *(parent master_context + child character-based route ONLY)*
In `mystery_style = 'character'` games the culprit is drawn at the table, so NO character is guilty in advance. A character's STATIC fields (`secret`, `background`, `description`, `introduction`) must give a MOTIVE, never a murder confession or guilty knowledge. Guilt appears ONLY in the guilty-slip branch. Innocent-slip branches and improvised accusations must NOT converge on one specific suspect. (Incident: Adelaide Crane — Morgan Ashford's static secret was "You poisoned Adelaide's Earl Grey… You killed Adelaide", and multiple innocent branches fingered Morgan, so the slip mechanic was broken and pointed guests at one player.)
**⚠️ Add to the character-based route's `<content_coherence_rules>` ONLY — never the predetermined route, where a fixed culprit is correct.**

> Child prompt line (character-based route): *"SLIP-STYLE GUILT (culprit is drawn at the table — no character is guilty in advance): this character's static secret/background/description/introduction must give a MOTIVE or something-to-hide, NEVER a murder confession or guilty knowledge ('you killed X', 'you did it'). Guilt appears ONLY in the guilty-slip branch. In innocent branches and accusations, spread suspicion — never converge on one specific person as the murderer."*
> Parent master_context line (character style): *"NO FIXED CULPRIT: the murderer is selected by slip-draw at the table. Do NOT designate, name, or imply a pre-assigned murderer anywhere, and do not write any character's static profile as guilty. Every suspect must be equally plausible."*

## G9 — Output hygiene: no chain-of-thought or template artifacts *(BOTH scenarios)*
Emit only final, in-world content. Never include reasoning/self-correction ("Wait, I need to correct this", "the matrix shows Morgan's row", "let me reconsider"), references to `master_context`/"the matrix"/field names, or bracketed authoring directions ("[CLOSING PARAGRAPH — No Accomplice Beat…]", "[choose someone with strong motive]", "[insert name]"). (Incidents: Crimson Tide — raw chain-of-thought in a relationships field + a bracketed directive in the detective reveal; 10 older packages have "[choose …]" placeholders sitting in player-facing accusations.) Child already has `<no_chain_of_thought_in_output>` + `<no_meta_text_in_output>`; **parent has neither — add an `<output_hygiene>` block to every parent generation prompt**, and extend the child `<no_meta_text_in_output>` to explicitly strip bracketed authoring directions.

> Prompt block (parent): *"<output_hygiene> Emit ONLY final in-world content. Never include reasoning or self-correction ('wait, I need to…', 'the matrix shows…', 'let me reconsider'), references to the generation process / 'master_context' / 'the matrix' / field names, or bracketed authoring directions / placeholders ('[choose …]', '[insert …]', '[CLOSING PARAGRAPH …]'). If you slip mid-generation, silently rewrite the field cleanly. </output_hygiene>"*

## G2 addendum — questions never target the victim
G2 already forbids self-directed questions. Also forbid questions addressed to the **victim** (dead, not a player). (Incident: Crimson Tide — a Round-2 question was addressed to the murdered Captain.)

> Amended child QUESTIONS line: *"Every question must target a DIFFERENT, LIVING character. Never ask a question of yourself, and never address a question to the victim."*

---

## G11 — Honor `incomplete_context`: abort, never placeholder *(parent scenario — after master_context Part 1)*

The parent's master_context Part 1 already self-diagnoses when the conversation lacks the essentials — it emits `{"status": "incomplete_context", "missingCriticalInformation": {...}}` naming the missing victim / event / character roster. Today **nothing acts on that flag**: the scenario proceeds to Part 2 and the child fan-out, producing placeholder content ("Character A"–"E") and an empty character extraction, then the package is marked completed. (Incident 2026-07-26: "Victorian mansion - 32 Players" — generation fired ~100s after the assistant was still asking the customer what occasion brings the guests; Part 1 returned `incomplete_context`; the pipeline shipped placeholder junk with 0 characters and status=completed. ADR-0043.)

**Rule:** immediately after the Part 1 generator, add a Make.com router/filter on `master_context.status`. When it equals `incomplete_context` (or victim/characters are unresolved), the scenario must **STOP** before Part 2 / the child webhook and write a package status of `needs_more_info` (progress 0, the missing-info list in `currentStep`), rather than generating any downstream content. No placeholder characters, no "completed".

This is the Make-side twin of the two in-repo guards shipped with ADR-0043 (the `mystery-webhook-trigger` **entry gate** that refuses to fire when there's no CHARACTER LIST message, and the **completion invariant** that never marks a 0-character package completed). The entry gate prevents most cases before Make is even called; G11 is the defense-in-depth for a conversation that slips past it (e.g. a service/recovery call, or a concept that looked present but Part 1 judged too thin).

### Why this is a UI recipe, not a blueprint edit (2026-07-26)

This is a **topology change** (a new Router with two branches, inserted into *both* top-level style routes), not a prompt-text insertion like G7–G10. Two facts make a blind blueprint edit genuinely risky, so we ship a precise Make-UI recipe instead of a `ParentNN` file:

1. **The Part-1 status is not a parsed field.** In the current parent (`temp-files/…Parent48…`, flow module count 8) the Part-1 generators emit **raw Claude text** — `{{171.textResponse}}` (predetermined route) / `{{165.textResponse}}` (character route) — which is concatenated straight into `master_context` (`master_context: "{{171.textResponse}}{{3000.textResponse}}"` at the master-save module #178). Nothing does a `ParseJSON` on Part 1, so there is **no `{{Part1.status}}` to filter on** — the filter must string-match the emitted JSON, or a `ParseJSON` module must be added first. (Grep confirms `incomplete_context` / `missingCriticalInformation` appear **0 times** in the blueprint today.)
2. **It must be inserted in both routes**, immediately after each Part-1 module and before its Part-2 module (`#171 → #3000`, and `#165 → #4010`), inside a 4.5 MB JSON where a malformed edit can silently revert other workstreams' modules (see the blueprint-versioning hazard in memory). It also can't be import-tested from here — import is a manual Make UI step.

### Make UI recipe (do this in the Make editor on the live "MM Live - Parent" scenario)

Do it **once per style route** — the predetermined/detective route (Part 1 = module #171 in the Parent48 export) and the character-based route (Part 1 = module #165). Same steps both times.

1. **Insert a Router** on the link between the Part-1 module and the Part-2 module (i.e. between #171 and #3000 for the predetermined route; between #165 and #4010 for the character route). The existing downstream chain (Part 2 → Game Overview → Themed Materials → child fan-out → …) becomes **Route B** below.
2. **Route A — "Incomplete context → STOP"** (build this branch new):
   - **Filter** (name it `Part 1 says incomplete_context`): condition `{{171.textResponse}}` **Text operator: contains** `"status": "incomplete_context"` (use the character route's `{{165.textResponse}}` on that route). Match the quoted key/value, not the bare word, to avoid a stray-substring false positive.
   - **Module: Supabase → Update a Record** on table `mystery_packages`, `id` = `{{46.id}}` (the row fetched by the existing search-rows module #46, the same id every status-write module already uses, e.g. #222). Set `generation_status` to the literal JSON string:
     `{"status":"needs_more_info","progress":0,"currentStep":"Your mystery concept isn't finished yet — Part 1 flagged missing victim / occasion / character roster. Finish the concept in chat, then generate."}`
     Leave `generation_completed_at` **unset** (this is not a completion). This module is the **terminal** module of Route A — nothing follows it, so the scenario simply ends on this branch. **Do NOT** wire Part 2 or the child webhook here.
   - *(Optional richer `currentStep`:* add a `JSON → Parse JSON` module before the Supabase update, parsing `{{171.textResponse}}`, then interpolate `{{parsed.missingCriticalInformation}}` into `currentStep`. Skip it if it complicates the branch — the static message above is sufficient and lower-risk.)*
3. **Route B — "Concept OK → continue"**: the existing Part-2-onward chain. Give it the **fallback** flag (Make's "fallback route", the route with no filter) **or** the inverse filter `{{171.textResponse}}` **does not contain** `"status": "incomplete_context"`. Fallback is preferred so a Part 1 that omits the status entirely still proceeds normally.
4. **Verify** in the UI: run the scenario once against a known-incomplete conversation (or the "Victorian mansion" conversation `e49805d9-…`) and confirm it writes `needs_more_info` and **stops before** Part 2 / the child webhook fires. Then confirm a normal conversation still runs end-to-end.
5. **After import**, export the blueprint, save it as the next unused number (`Parent49 (G11 incomplete_context abort)`) into `temp-files/`, and fill the ledger row below with the import date + the grep marker (`incomplete_context` filter present in the export).

> One-line summary: after each Part-1 module, a Router — Route A filters *`{{171|165.textResponse}}` contains `"status": "incomplete_context"`* → Supabase Update `mystery_packages` (`id = {{46.id}}`) `generation_status = needs_more_info` (terminal, no completion timestamp); Route B is the fallback carrying the existing Part-2-onward chain. Do NOT run Part 2 or the child webhook on Route A.

---

## Import ledger — what is BUILT vs what is LIVE in Make.com

**Root-cause note (2026-07-25):** the audit found guardrails that were authored into blueprint FILES but whose Make.com import was left "manual, pending" — with no record confirming the import happened. That gap is the likeliest reason "fixed" defects recurred. Fill this table whenever a blueprint is imported (the live prompt is the only ground truth; the Make API is unreliable here — confirm in the UI by grepping the live prompt for the marker).

| Guardrail / version | Built (file) | Marker to grep in live prompt | Imported-to-Make (date) | Live-confirmed |
|---|---|---|---|---|
| Child v16 PlaytestFixes (G1/G2) | 2026-07-19 | `event-relative` timing line | ? | ? |
| Child v17 IdentityRule (ADR-0041) | 2026-07-22 | `CHARACTER IDENTITY:` | ? | ? |
| Child v18 PredeterminedDeflectionHeader | 2026-07-22 | `DEFLECTING SUSPICION — FOR YOUR EYES ONLY` | ? | ? |
| Parent46 Playtest Fixes (ADR-0037) | 2026-07-19 | detective two-round accusation framing | ? | ? |
| Parent47 Clue-Timing | 2026-07-20 | clue-timing funnel line | ? | ? |
| Parent45 Evidence Spoiler Guardrail (ADR-0035) | earlier | `EVIDENCE SPOILER RULE` | ? | ? |
| Child19 (G8 slip, G9 brackets, G2 victim) | 2026-07-25 (`…Child (Unified)19-SlipGuilt-OutputHygiene-VictimQuestions`) | `SLIP-STYLE GUILT` | 2026-07-25 (Jonathan, Make UI) | ✅ G8 confirmed: 2026-07-26 "The Black Swan Society" (character/slip) 0 slip-culprit-leak; G2/victim also clean. "Death By High Tea" (detective) also clean. |
| Parent48 (G7 victim, G8 no-fixed-culprit, G9 output_hygiene) | 2026-07-25 (`…Parent48 (Victim-Consistency + No-Fixed-Culprit + Output-Hygiene)`) | `VICTIM CONSISTENCY` / `output_hygiene` | 2026-07-25 → **superseded 2026-07-27 by Parent49 (no longer live)** | ⚠️ G7 clean; **G9 GAP FOUND** 2026-07-26: "The Black Swan Society" detective_script leaked `[The master_context defines NO accomplice…]` (same class as Crimson Tide). Detector caught it pre-delivery; package fixed in place. Root cause: the reveal's ACCOMPLICE-BEAT instruction invites an inline omission-note when there's no accomplice — G9's general rule doesn't override it. **FIX BUILT: Parent49 (2026-07-26)** reworded the accomplice-beat instruction (silent omission, never narrate the absence) in all 4 detective_script generators; the `regenerate-parent-content` mirror already carries the identical wording (v6, commit 5f82946). See Parent49 ledger row below. |
| Parent49 (Accomplice-beat silent-omission — G9 gap fix) | 2026-07-26 (`…Parent49 (Accomplice-Beat Silent-Omission)`) | reworded beat: `no sentence explaining that there is no accomplice` (grep for `write nothing here` in the detective_script prompt) | **2026-07-27 (Jonathan, Make UI) — now the live parent; supersedes Parent48** | ✅ file verified pre-import (4/4 detective_script generators reworded, 0 old phrasing, byte-identical to the v6 mirror). End-to-end live-confirm pending: the next **no-accomplice** package's detector sweep must be meta-leak-clean. |
| G11 incomplete_context abort (ADR-0043) | 2026-07-26 — **UI recipe only, no blueprint file**. A blind blueprint edit was judged too risky (topology change — a Router in both style routes — and Part-1 status is unparsed `textResponse`, so no clean field to filter on; see the G11 recipe above). Precise Make-UI steps written; `ParentNN` file to be exported *after* the manual import. | filter/router on `{{171/165.textResponse}}` containing `"status": "incomplete_context"` after Part 1 (a **topology** marker — check the scenario/exported blueprint, not a live-prompt grep) | **— (not imported; manual, pending Jonathan)** | **— (not live)**. In-repo entry gate + completion invariant + completed-but-empty detector (health-check check 10) are the live protection meanwhile. |

**Recovery-tool mirror (2026-07-25):** `supabase/functions/regenerate-parent-content/index.ts` now carries the applicable parent rules — G9 `<output_hygiene>` in all 4 regeneration prompts (game_overview, materials, detective_script, evidence_cards) and G7 `VICTIM CONSISTENCY` in the game_overview prompt. G8 is intentionally NOT mirrored (character-only rule; the recovery tool consumes an existing master_context and its detective_script route has a legitimate fixed culprit).
