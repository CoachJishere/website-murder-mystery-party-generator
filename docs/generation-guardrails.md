# Generation guardrails — per-character content coherence

Canonical rule list for the **Make.com child scenario** per-character prompt (and the parent detective/evidence prompt where noted). Companion to `docs/evidence-card-generation-guardrail.md`. Source decision: ADR-0037 (grounded in the *Whispers From The Void* playtest). Latest blueprints: child `MM Live - Child (Unified)16`, parent `MM Live - Parent46`.

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

## G4 — Accomplice-script coherence — ONLY IF `hasAccomplice = true`
The accomplice's throughline must be internally consistent: they **shield the murderer** (deflect, provide cover, misdirect) and must **not** also be scripted to accuse or incriminate the murderer. Any suspicion the accomplice raises is aimed at **other** suspects, never the person they are protecting.

> Prompt line: *"If this character is the accomplice: their consistent goal is to protect the murderer. They deflect suspicion away from the murderer and toward other suspects. Never script the accomplice to accuse, incriminate, or 'turn on' the murderer in any round."*

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
