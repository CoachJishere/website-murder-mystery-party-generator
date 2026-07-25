# Generation guardrails — per-character content coherence

Canonical rule list for the **Make.com child scenario** per-character prompt (and the parent detective/evidence prompt where noted). Companion to `docs/evidence-card-generation-guardrail.md`. Source decisions: ADR-0037 (Whispers playtest), ADR-0041 (identity contamination), ADR-0042 (content-quality detectors + G7–G10). Latest blueprint files on disk: child `MM Live - Child (Unified)19-SlipGuilt-OutputHygiene-VictimQuestions` (built 2026-07-25, carries G8/G9/G2), parent `MM Live - Parent48 (Victim-Consistency + No-Fixed-Culprit + Output-Hygiene)` (built 2026-07-25, carries G7/G8/G9). **⚠️ Whether these are the versions actually LIVE in Make.com is not tracked in git — see the Import ledger at the bottom. Confirm the live version before assuming a guardrail is active.**

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
| Child19 (G8 slip, G9 brackets, G2 victim) | 2026-07-25 (`…Child (Unified)19-SlipGuilt-OutputHygiene-VictimQuestions`) | `SLIP-STYLE GUILT` | 2026-07-25 (Jonathan, Make UI) | 2026-07-25 behavioral: 1st post-import pkg "Death By High Tea" (detective) clean on all detectors (n=1 — next character-style pkg will exercise G8) |
| Parent48 (G7 victim, G8 no-fixed-culprit, G9 output_hygiene) | 2026-07-25 (`…Parent48 (Victim-Consistency + No-Fixed-Culprit + Output-Hygiene)`) | `VICTIM CONSISTENCY` / `output_hygiene` | 2026-07-25 (Jonathan, Make UI) | 2026-07-25 behavioral: 1st post-import pkg "Death By High Tea" clean on victim-mismatch/meta-leak/self-q/evidence-spoiler (n=1) |

**Recovery-tool mirror (2026-07-25):** `supabase/functions/regenerate-parent-content/index.ts` now carries the applicable parent rules — G9 `<output_hygiene>` in all 4 regeneration prompts (game_overview, materials, detective_script, evidence_cards) and G7 `VICTIM CONSISTENCY` in the game_overview prompt. G8 is intentionally NOT mirrored (character-only rule; the recovery tool consumes an existing master_context and its detective_script route has a legitimate fixed culprit).
