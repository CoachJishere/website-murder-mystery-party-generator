# ADR-0042: Post-generation content-quality detectors + generation-time guardrails (G7–G10)

- **Status:** Accepted
- **Date:** 2026-07-25

## Context

A hand-audit of the three most recent paid packages (2026-07-25) found content defects that reached customers with `generation_status = completed` and every field populated — invisible to every existing check (NULL sweeps, `needs_review`, ADR-0016 evidence-image detector, ADR-0041 identity-conflict detector). The defects, all confirmed against raw rows:

- **Mutiny And Murder On The Crimson Tide** (predetermined): raw model chain-of-thought in a character's `relationships` ("Wait, I need to correct this… the matrix shows Morgan's row…"); a bracketed authoring directive in the detective reveal ("[CLOSING PARAGRAPH — No Accomplice Beat because master_context…]"); an evidence-card DESCRIPTION naming the culprit ("…embroidered initial 'W'—in thread matching Sailing Master Weatherby's name", ADR-0035 violation); three misdirected Round-2 questions (two self-directed, one to the dead victim).
- **The Last Will And Testament Of Adelaide Crane** (random-slip): `game_overview` opened with a **different victim** ("Sophie Duplock, a 24-year-old real estate magnate") than the rest of the package (Adelaide Crane) — a cross-package/overview bleed; a static `secret` that was a **fixed murder confession** ("You poisoned Adelaide's Earl Grey… You killed Adelaide") in a game whose culprit is drawn at the table, breaking the slip mechanic.

The owner's framing: these should be caught **before a customer or a manual review sees them**. Two prior-art facts shaped the response: (1) hosts buy ~2–3 weeks ahead and guest feedback arrives post-party, so the 6-hourly health check is the only pre-party warning channel (ADR-0041); (2) an assessment of the Make.com blueprints showed several guardrails were **authored into files but their manual import was never confirmed live** — the likeliest reason "fixed" defects recur.

## Decision

Two layers, mirroring the ADR-0041 pattern (prompt prevention + read-only detector backstop):

1. **Detection (shipped, verifiable).** New migration `20260725_detect_content_quality_issues.sql` adds five read-only `list_packages_with_*()` functions: meta-text/chain-of-thought leak, evidence-culprit spoiler, victim mismatch, slip-culprit leak, self-directed questions. Four are wired into `health-check.yml` (checks 6–9) on the same 30-day rolling window as check 5. The **evidence-culprit-spoiler** detector is deliberately **NOT** wired to alerting — validation showed a high false-positive rate (murderer surname legitimately appearing as a location/family/common word, and host sections that use `### IMPLICATIONS` instead of `#### SIGNIFICANCE`); it is kept for manual use pending refinement, and ADR-0035's parent-prompt rule remains its prevention.

2. **Prevention (specced, build deferred).** Guardrails **G7** (victim consistency), **G8** (no fixed culprit in random-slip games), **G9** (output hygiene — no chain-of-thought/template artifacts), and a **G2 addendum** (questions never target the victim) are added to `docs/generation-guardrails.md` with exact prompt text and placement. The blueprint build (Child19/Parent48, duplicated from the current heads) is deferred to a focused pass rather than rushed — a malformed 4.3 MB parent blueprint can silently revert other workstreams' fixes or break generation, and the import cannot be tested from here.

3. **Root-cause fix.** An **import ledger** is added to `docs/generation-guardrails.md` tracking, per blueprint version: built date, a grep marker, imported-to-Make date, and live-confirmed status. The audit's core finding was not missing prompt text (three of six guardrails already exist in the files) but that import completion is never recorded — so "pending" persists and the changelog even contradicted itself on whether v17 was imported.

The three audited packages were repaired in place via surgical data edits (no regeneration, no LLM/API spend).

## Rationale

- **Detectors are the layer that satisfies "caught before a review."** They run every 6h, are fully in our control, and were validated against all history: victim-mismatch and slip-culprit-leak return zero (precise; both would have caught Adelaide pre-fix); meta-leak and self-directed-questions return only historical true positives (0 in the 30-day window). No false positives in the wired set.
- **A noisy detector is worse than none.** Wiring the evidence-spoiler detector as-is would cry wolf on good future packages; excluding it keeps the alert channel trustworthy.
- **The import ledger attacks the actual recurrence cause.** Better prompts don't help if they never go live; tracking live-confirmation to ground truth is the durable fix.
- **Deferring the blueprint build is the conservative choice.** The prevention text is captured and ready; the risky mechanical step is separated from the verified work, consistent with the blueprint-versioning hazard (a stale-based edit nearly reverted Parent46 on 2026-07-20).

## Alternatives Considered

1. **Regenerate the three packages.** Rejected: LLM/API spend on likely-single-use packages, and regeneration under the current (possibly un-imported) prompts could reproduce the defects. Surgical data edits are cheaper and deterministic.
2. **Wire all five detectors including evidence-spoiler.** Rejected for alert fatigue (see Decision); kept for manual use.
3. **Hand-edit the production parent blueprint now.** Rejected under current constraints (4.3 MB, 40 prompt blocks, untestable import, spend limit reached mid-task) — specced instead for a focused build.
4. **Only add prompt guardrails, no detectors.** Rejected: prompts are gated on a manual import with no confirmation record, and detectors are the only pre-party safety net that doesn't depend on that step.

## Consequences

- Health check now reports five extra rows; four can raise alerts on new packages. Historical true positives (10 packages with `[choose …]` accusation placeholders; ~11 with self-directed questions) sit outside the 30-day window and do not alert — a known backlog, logged, not auto-fixed.
- The evidence-spoiler function exists but is advisory until tokenisation + host-section-format handling are improved.
- G7–G10 are documented and now **built** into Child19/Parent48 (see the 2026-07-25 update below); they become **live** only once imported and recorded in the ledger. Until import, the detectors are the only protection for those modes.
- New failure modes (fixed-culprit-in-slip, overview victim bleed) are now nameable and monitored; candidate refinements noted in the migration and the audit vault note.

## Update — 2026-07-25: G7–G10 blueprint build completed (import still pending)

The deferred prevention build (Decision point 2) is done. Two new blueprints were duplicated from the current heads and edited programmatically (parse JSON, edit only target prompt fields, JSON re-validated, module count unchanged, diff limited to the intended additions):

- **Child19** (`temp-files/MM Live - Child (Unified)19-SlipGuilt-OutputHygiene-VictimQuestions.blueprint.json`, base Child18, 40 modules): G8 `SLIP-STYLE GUILT` in the **character-based route's** `<content_coherence_rules>` **only** (never the predetermined route); G9 bracketed-authoring-direction stripping added to `<no_meta_text_in_output>` (both routes); G2 addendum in the QUESTIONS rule ("DIFFERENT, LIVING character", never the victim).
- **Parent48** (`temp-files/MM Live - Parent48 (Victim-Consistency + No-Fixed-Culprit + Output-Hygiene).blueprint.json`, base Parent47, 164 modules): G7 `VICTIM CONSISTENCY` in the 4 game_overview `<output_instructions>` + 8 master_context `<critical_reminders>`; G8 parent-side `NO FIXED CULPRIT` in the 4 **character-based** master_context `<critical_principle>` **only** (verified absent from detective routes); G9 `<output_hygiene>` in every parent generation prompt (28).
- **Route-scoping** was the critical correctness point and was verified both ways: the slip/no-fixed-culprit rules are present in every character-based generator and absent from every predetermined/detective generator.
- **Recovery-tool mirror:** `regenerate-parent-content/index.ts` gained G9 in all 4 prompts and G7 in game_overview; G8 was intentionally not mirrored (character-only; the tool consumes an existing master_context and its detective_script route has a legitimate fixed culprit).
- **Still pending:** Make.com import is Jonathan's manual UI step (the Make API is unreliable here); the ledger rows for Child19/Parent48 show built 2026-07-25 with import/live = pending.

## Discussion

The audit reframed the owner's "I thought we fixed these": for identity contamination and self-directed questions the *rules* existed, but (a) the packages predated them or (b) the Make import was never confirmed. So the highest-leverage move was not more prompt text — it was a detection backstop that doesn't depend on the import, plus a ledger to make import completion visible. The evidence-spoiler false-positive finding also validated the "verify before trusting" discipline: the crude surname-match would have degraded the whole alert channel's credibility.

## Key Files

- `supabase/migrations/20260725_detect_content_quality_issues.sql` — the five detector functions (four wired, one advisory)
- `.github/workflows/health-check.yml` — checks 6–9
- `docs/generation-guardrails.md` — G7–G10, G2 addendum, and the Import ledger
- `docs/adr/0041-detect-cross-character-identity-contamination.md` — the pattern this extends
- `docs/adr/0035-evidence-cards-must-not-name-the-culprit.md` — the evidence-spoiler prevention
