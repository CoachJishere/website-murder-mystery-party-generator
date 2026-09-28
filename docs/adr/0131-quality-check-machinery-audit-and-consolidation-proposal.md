# ADR-0131: Quality-Check Machinery Audit — Inventory, Relationship Map, Gaps, and a Consolidation Proposal

- **Status:** Proposed
- **Date:** 2026-09-28
- **Related:** ADR-0130 + Addendum 1 (the triggering incident), ADR-0125 (the consolidation precedent this proposal follows), ADR-0103 + 60 addenda (the sweep ritual this audits), ADR-0042/0047/0048/0049/0051/0053/0054/0055/0060/0061/0062/0096 (the detector/gate/self-heal buildout), ADR-0088 + 13 addenda, ADR-0098 + 8 addenda, ADR-0072 (the silent regression this ADR's Part 2 treats as a cautionary precedent), ADR-0056/0065 (the "paired-predicate drift" pattern named by those ADRs)

## Context

On 2026-09-27/28, the shared roster-extraction regex in `supabase/functions/_shared/rosterExtraction.ts` regressed twice within about 12 hours: a hyphenated-name fix (ADR-0130) landed, and the fix itself broke leading-whitespace tolerance for the corpus's single most common character-line format (`**Name** – Description`), silently blocking checkout for most customers for roughly 28 hours before two support tickets surfaced it (ADR-0130 Addendum 1). A corpus scan found 858 of 1,000 sampled messages broken. Neither regression was caught by anything automated — the fix had been validated only against synthetic/hand-picked cases, not a full corpus diff, which Addendum 1 itself names as "the second incident where a synthetic-case-only check on this file missed something a full corpus diff would have caught immediately."

That incident raised a broader question Jonathan asked to have actually investigated rather than assumed: this project has accumulated a large amount of quality-check machinery over roughly five months of iterative bug-fixing — SQL detector functions (`list_packages_with_*`), a blocking completion gate (`package_completion_blocking_defects()`), a closed-loop self-heal worker (`auto-remediate-packages`), several sweep/recovery crons, alerting logic (`notify-generation-issue`, `health-check.yml`), a manual "New Purchase Coherence Sweep" checklist embedded in `CLAUDE.md`, and a nascent automated test suite (`scripts/__tests__/*.test.mjs`). Is this collection comprehensive, non-redundant, and non-contradictory, or has it grown blind spots, dead checks, and independently-drifting duplicates?

**Scope of this ADR:** an audit and a design proposal, not an implementation. No migration, deploy, or `CLAUDE.md` edit was made while producing it. Every recommendation below is for Jonathan's review before any of it is built.

## Method — how this was independently verified

`CLAUDE.md`'s own maintenance notes already warn that this exact class of inventory is easy to undercount (ADR-0130 Addendum 1's grep-based function search missed real functions; ADR-0098 Addendum 6 found a detector's "zero hits" was a false negative from a Postgres regex-flavor bug). So this audit did not trust `grep`, the migration file tree, or ADR prose at face value:

- **Live database, not migration files.** Queried `mhfikaomkmqcndqfohbp` directly via `pg_proc`, `pg_trigger`, and `cron.job` for the actual deployed function/trigger/schedule inventory — not what a `grep` across `supabase/migrations/*.sql` would suggest (per this project's own standing lesson that migration files and live state diverge here).
- **Source diffing, not documentation, for the relationship map.** For the two most safety-critical predicate pairs (the blocking gate's `meta_text_leak` and `victim_mismatch` checks vs. their advisory `list_packages_with_*` siblings), pulled `pg_get_functiondef()` for both sides and diffed the actual regex text — not the ADRs that describe them — because ADR prose describes intent at time-of-writing and several ADRs in this history (ADR-0072, ADR-0098 Addendum 6) show that intent and live behavior have silently diverged before.
- **Source reads, not summaries**, for `auto-remediate-packages/index.ts` (full, 1670 lines), `notify-generation-issue/index.ts` (full), and `scripts/__tests__/conceptSnapshot.test.mjs` (full).
- **Full re-read of ADRs 0041–0130** (three parallel structured extractions plus a direct read of ADR-0103's Context/Decision/Rationale and its addendum index, plus deep reads of Addenda 38, 40–41, 59–60), specifically for: what mechanism each ADR introduced, what customer-facing failure it targets, whether it's blocking or advisory and why, every explicitly-documented blind spot, and every later supersession.
- **CI check**, confirming no `.github/workflows/*.yml` currently runs any of the three `scripts/__tests__/*.test.mjs` files.

---

## Part 1 — Full Inventory

### 1A. Pre-completion blocking gates (cannot be bypassed regardless of caller)

| Mechanism | Type | What it targets | Location | Origin |
|---|---|---|---|---|
| `trg_validate_package_characters` → `validate_package_characters()` | DB trigger, `BEFORE UPDATE` on `mystery_packages` | Fires on **every** transition into `generation_status.status = 'completed'`, from any caller (Make.com, cron, edge function, raw SQL) — not a one-shot gate | migration `20260825_completion_trigger_revalidate_on_every_write.sql` | ADR-0049 (created), ADR-0108 (broadened to re-fire on every write), ADR-0113 (broadened field coverage) |
| `package_completion_blocking_defects(_pkg)` | Shared `plpgsql` predicate, called by the trigger above and by both recovery crons below | 18 defect subclasses in current live source (see Part 2B for the two whose coverage is confirmed stale): `error_body_in_package/character`, `invalid_role`, `meta_text_leak` (package + character), `self_directed_question`, `missing_round_content`, `missing_role_branch_content`, `pointform_language_mismatch`, `narration_person_mismatch`, `victim_mismatch`, `slip_culprit_leak`, `identity_conflict`, `victim_is_playable_character` | `public.package_completion_blocking_defects` | ADR-0049/0051/0053 (created + extended), ADR-0060 (victim-as-character), ADR-0096 + Addendum (missing_round_content, accomplice peer-existence), ADR-0103 Addendum 31/36 (missing_role_branch_content), ADR-0103 Addendum 41 (pointform_language_mismatch — **confirmed blocking in live source; not called out as such in the ADR history read for this audit**), ADR-0103 Addendum 45 (narration_person_mismatch) |
| `normalize_generation_status()` trigger | Write-boundary coercion | Coerces Make.com's double-encoded jsonb-string `generation_status` before any other check can even see the row | `trg_00_normalize_generation_status` | ADR-0050 |
| `normalize_character_data()` trigger | Write-boundary coercion | Coerces an out-of-enum `character_role` to sentinel `'invalid_role'` (never silently NULL) | `normalize_character_data_trigger` | ADR-0052 |
| `heal_completed_packages()` (cron, `*/2 * * * *`) | Recovery-path gate | Refuses to promote a package if `package_completion_blocking_defects()` or `package_expected_character_count()` still fails | `heal_completed_packages_2min` job | ADR-0049 (extended), ADR-0094/0095 (character-count gate) |
| `promote_complete_packages()` | Recovery-path gate | Same invariant as above, second call site | — | ADR-0049, ADR-0094/0095 |
| `sweep_incomplete_packages()` (cron, `*/2 * * * *`) | Stuck-package sweep, quiet-period gated | Re-checks packages that should have completed but haven't; won't act mid-generation (Addendum 14) | `sweep_incomplete_packages_2min` job | ADR-0103 Addendum 14 |
| `adapt-mystery-apply`'s verify-or-revert gate | Feature-scoped blocking gate (Remove-a-Character / reassignment) | Deterministic scrub → snapshot-write → verify-or-revert; a failed verify reverts byte-for-byte rather than shipping a broken removal | `supabase/functions/adapt-mystery-apply/index.ts` | ADR-0088 (+13 addenda) |

### 1B. Advisory, read-only SQL detectors (`list_packages_with_*`) — 17 live

Confirmed via direct `pg_proc` query against the live database (not `grep`), per the ADR-0130 Addendum 1 lesson that grep undercounts here. **Corrected (Addendum 3, 2026-09-28):** the original version of this table listed 16 and missed `list_packages_with_final_statement_confession_leak` (added below) — found only while gathering source for the item-7 comment backfill, not by this section's own stated method. There is also a sibling function, `list_packages_missing_evidence_images()` (ADR-0016), whose name doesn't match the `list_packages_with_*` pattern at all — a live illustration of exactly the grep-undercounting risk this table's method claims to avoid; a name-pattern query is still a name-pattern query.

| Function | Defect class | Wired to auto-remediate? | Has `COMMENT ON FUNCTION`? | Origin |
|---|---|---|---|---|
| `list_packages_with_meta_text_leak` | Leaked authoring/meta text, chain-of-thought, template placeholders, T-V pronoun-pair leaks | Yes (free strip + delegated) | Yes | ADR-0042, patched by Addenda 18/20/39/54, ADR-0098 Addenda 5/6 |
| `list_packages_with_victim_mismatch` | Overview names a victim absent from `master_context`/character backgrounds | Yes (delegated, paid) | Yes | ADR-0042, extended ADR-0098 Addendum 4 |
| `list_packages_with_self_directed_questions` | A character is asked a question addressed to themselves or the victim | Yes (free, deterministic retarget) | No | ADR-0042 |
| `list_packages_with_slip_culprit_leak` | A random-culprit game's `secret` field confesses outright | Yes (delegated) | No | ADR-0042 |
| `list_packages_with_evidence_culprit_spoiler` | Evidence card names the culprit | **No — permanently advisory, high false-positive rate by design** | No | ADR-0042 |
| `list_packages_with_identity_conflicts` | ≥2 characters claim the same unestablished kinship term | Yes (delegated) | Yes | ADR-0041 |
| `list_packages_with_structural_defects` | `invalid_role`, multiple murderers, name/background mismatch, duplicated cast | **No — escalate-only by design; ADR-0047's worker is explicitly forbidden from acting on this list** | Yes | ADR-0048 |
| `list_packages_with_unconfessed_culprit` | Detective-style final statement reads as denial, not confession | **No — escalate-only by design; NLP judgment call** | Yes | ADR-0070 |
| `list_packages_with_victim_as_character` | Overview kills off a playable suspect | Advisory sibling of the blocking check in 1A | No | ADR-0060 |
| `list_packages_with_characters_absent_from_conversation` | Delivered character never mentioned anywhere in the source conversation | No | No | ADR-0118 Addendum 2 |
| `list_packages_with_missing_role_branch_content` | Per-character missing accomplice-branch fields | Yes (delegated) | No | ADR-0103 Addendum 36 |
| `list_packages_with_pointform_language_mismatch` | `*_pointform` summaries drift to English | Yes (delegated, paid) | No | ADR-0103 Addendum 41 |
| `list_packages_with_narration_person_mismatch` | Third-person narration in a character's own first-person branch | Yes (delegated) | No | ADR-0103 Addendum 45 |
| `list_packages_with_unresolved_victim_name` | `master_context`'s victim name still dual-gendered | No | No | ADR-0107 |
| `list_packages_with_dangling_quote_mark` | Unmatched trailing quote in confession/reveal fields | No (manual sweep only) | No | ADR-0103 Addendum 55 |
| `list_packages_with_role_tag_leak` | Murderer/accomplice's internal role-suffixed name leaking into another character's guest-facing text | No (manual sweep only) | Yes | ADR-0103 Addendum 59 |
| `list_packages_with_final_statement_confession_leak` | For `mystery_style='character'` packages, a reveal-confession field exists but the branch text reads as a denial, not a confession | No | Yes (backfilled, Addendum 3) | ADR-0074 |

*(Originally reported as "12 of 16 lack documentation" — corrected, Addendum 3: 12 of these 17 functions, plus `package_victim_is_playable_character()`, carried no `COMMENT ON FUNCTION` before Decision item 7's backfill. All 13 now documented; see Addendum 3.)*

### 1C. Self-heal / auto-remediation

| Mechanism | Cadence | Defect classes | Safety rails |
|---|---|---|---|
| `auto-remediate-packages` — held-only pass | `*/5 * * * *` | `identity_contamination`, `slip_culprit_leak`, `template_artifact`, `missing_role_branch_content`, `pointform_language_mismatch`, `narration_person_mismatch` | Re-detect gate, 2-attempt cap, $10/day shared spend cap, concurrency claim |
| `auto-remediate-packages` — full sweep | `13,43 * * * *` (every 30 min) | All 9 defect classes it knows | Same rails |
| `notify-generation-issue`'s own inline recovery | Fired on every completion-trigger write + `sweep_stuck_needs_review_packages` (`*/10 * * * *`) | `empty_character_content`, `missing_character_row` — a **separate** mechanism from `auto-remediate-packages`, sharing only the spend cap and the `auto_remediation_log` table | 2-attempt-per-character cap, shared $10/day cap, 20s cross-invocation cooldown (Addendum 9/11), scaled quiet period (ADR-0123) |
| `regenerate-child-content` / `regenerate-parent-content` | Callable primitives, not self-scheduling | Delegated target for 5 of `auto-remediate-packages`'s 9 classes | Internal re-detect-and-revert gate (ADR-0054); own `nameVariants()`, own `rumorTargetingRules()`/`questionTargetingRules()` mirrors — see Part 2C |
| `sweep_stuck_in_progress_packages` | `*/10 * * * *` | Generation stalled >45 min, no auto-retry (alert-only by design) | — |
| `sweep_stuck_needs_review_packages` | `*/10 * * * *` | Re-invokes `notify-generation-issue` for held packages | — |
| `sweep_stuck_adaptation_batches` | `*/10 * * * *` | Reclaims a stuck Remove-a-Character batch row past TTL | — |

### 1D. Alerting

- `notify-generation-issue` email, gated by a chain of suppression logic: the ADR-0065 self-heal grace period, the ADR-0081/0085 "recovery looks clean" suppression, the ADR-0111 `missing_round_content` self-recovery exclusion, a 6-hour cooldown, and a 20-second cross-invocation cooldown (Addendum 9).
- `.github/workflows/health-check.yml` — runs the advisory detectors above plus `scripts/detect-roster-mismatches.mjs` (ADR-0064) and `scripts/detect-truncated-concept-messages.mjs` (Addendum 38), opens a GitHub issue/email on a hit.
- `acknowledged_health_alerts` table — lets a known, accepted false-positive be silenced without weakening the underlying detector.

### 1E. Manual practice (`CLAUDE.md`)

- **"sweep"** — the New-Purchase Coherence Sweep, 10 steps (ADR-0103). Runs the two patched detectors, then five judgment-based manual reads (victim-name string equality, full `detective_script` read, full-cast content read, schema-driven field-completeness check, register-consistency check for T-V-distinction languages).
- **"New 'Remove a Character' Purchase"** sweep — batch-completion verification (ADR-0088).
- **"Model Upgrades" checklist** — a manual `grep` for hardcoded model strings, run only when a human remembers to (ADR-0098 Addenda 7–8).

### 1F. Automated tests

- `scripts/__tests__/conceptSnapshot.test.mjs` — 18 checks, imports the *shipped* `rosterExtraction.ts`/`mystery-webhook-trigger` source directly (not a hand-copy), covering ADR-0057/0063/0068/0069/0118/0130 regressions including the exact ADR-0130 Addendum 1 shape.
- `scripts/__tests__/retargetQuestions.test.mjs`, `leverClassifier.test.mjs` — exist, same pattern.
- **None of these three are wired into any GitHub Actions workflow.** They can be run by hand (`node scripts/__tests__/conceptSnapshot.test.mjs`) but nothing runs them automatically before or after a deploy.

---

## Part 2 — Relationship Map

### 2A. Genuine single-source-of-truth wins

- **`_shared/rosterExtraction.ts`** (ADR-0125) — after three confirmed occurrences of independent client/server roster-parser drift (ADR-0044 Addendum, ADR-0110 + 2 addenda), consolidated into one module now imported directly by `mystery-webhook-trigger`, `extract-concept-roster`, and the deleted client-side parser. This is the model this proposal recommends extending (Part 4, item 4).
- **`package_completion_blocking_defects()`** — one shared function, called from the trigger and both recovery crons, so those three call sites cannot disagree with each other about what blocks completion.

### 2B. Confirmed, currently-live divergence between a blocking gate and its advisory sibling

This is the audit's headline finding, and it is the same *shape* of risk that produced the triggering incident: two independently-maintained implementations of "the same idea," one of which quietly fell behind the other. Verified by diffing live `pg_get_functiondef()` output, not by reading ADR prose.

**`meta_text_leak`.** The blocking gate's inline pattern (`package_completion_blocking_defects()`) is:

> `(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose |\[if guilty)`

The advisory `list_packages_with_meta_text_leak()` has been patched five times since (Addenda 18, 20, 39, 54; ADR-0098 Addenda 5–6) and its live pattern additionally includes: `per (the |content )?rules`, `not included in`, `accomplice beat`, `self-reference`, `no self-entry needed`, `this would be removed in actual implementation`, `\[no ...hostile`, a leaked prompt-template word-count directive pattern (`total \w+:\s*(no more than|~?\d+\s*words?|concrete facts)`), the full T-V pronoun-pair pattern covering all 6 supported languages with formal/informal address, **and** an entire second `narrative_only_rx` for "relationship matrix"/"cast dynamics" leaks that the gate doesn't check at all. It also negative-lookaheads `\[choose (?!a name or leave blank)` to exempt the legitimate host-fill-in convention — the gate's plain `\[choose ` has no such exemption.

**Consequence:** a package containing any of these ~10 confirmed leak patterns — all previously live, real, paid-order defects — can pass the blocking completion gate and ship as `completed`, and would only ever be caught by the advisory sweep (health-check or manual "sweep"), not before delivery. Separately, the gate is *more* prone than the advisory detector to a false-positive `needs_review` hold on the legitimate `[choose a name or leave blank]` host convention, since it lacks the exemption the advisory side already learned.

**`victim_mismatch`.** The gate extracts the overview's victim name with exactly one regex: `'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'`. The advisory `list_packages_with_victim_mismatch()` was widened in ADR-0098 Addendum 5 with two additional fallback patterns — a `Dr. Firstname Lastname` form and a narrative-prose form (`"... was found / had been / is dead / was killed / was murdered / was poisoned"`) — specifically because the header-first pattern alone was found "78% inert" on real overviews (ADR-0060). That widening was never ported back into the gate.

**Consequence:** a victim-mismatch on any overview that opens with narrative prose rather than a name-first header — which ADR-0060 already measured as the *majority* shape — can bypass the blocking gate entirely and only ever surface via the advisory sweep.

Both of these are currently live, unfixed, and — as far as this audit found — undocumented as a known gap anywhere in the ADR history. Nothing in this codebase currently asserts that the gate and its advisory sibling agree.

**Follow-up check completed (Addendum 3, 2026-09-28):** `self_directed_question` and `slip_culprit_leak` — diffed the gate's inline patterns against `list_packages_with_self_directed_questions()`/`list_packages_with_slip_culprit_leak()`. **Both confirmed byte-for-byte identical, currently in sync.** Not every duplicate pair in this codebase has drifted — worth stating plainly rather than only reporting the ones that have. `identity_conflict` remains unchecked (same method, still a cheap high-value follow-up).

**Update (Addendum 1, 2026-09-28):** a third gate/advisory pair — `pointform_language_mismatch` — was confirmed the same day this ADR was written, via unrelated live work, not via the follow-up check above. It's a different failure shape than the two above: the two copies hadn't diverged from each other, they were identically, symmetrically wrong since the class was created (Addendum 40/41). See this ADR's Addendum 1 for detail; already fixed (`docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 62).

### 2C. Other documented duplicate-logic pairs at risk

- **`nameVariants()`** exists independently in `adapt-mystery-apply` and `regenerate-child-content` "by deliberate per-function-owns-its-helpers convention" (per the ADR-0088 addenda themselves) and has already drifted twice — a bare-first-name fix and a title-stripping fix each had to be manually ported to the second copy after the fact, with no structural safeguard against a third drift.
- **`rumorTargetingRules()`/`questionTargetingRules()`** exist as Make.com blueprint prompt text *and* as an independent hardcoded TS mirror inside `regenerate-child-content`. Confirmed drifted: Addendum 60 found the TS copy still carried the pre-fix rumor rules and had no question-targeting rules at all, discovered only because a retroactive repair session happened to check first.
- **`ARTIFACT_SPAN_RX`/`ARTIFACT_TOKEN_RX`** in `auto-remediate-packages` is a second, independent implementation of the same leak patterns `list_packages_with_meta_text_leak()`'s SQL regex encodes — the file's own comment says "Keep this in sync BY HAND," and it already drifted once (ADR-0099: only 3 of 13 alternatives recognized before the fix).
- **`missingRoundContent()`** — `notify-generation-issue`'s inline JS predicate explicitly "mirrors `package_completion_blocking_defects()`'s missing_round_content check (same field list, same `mystery_style` branching)" per its own code comment. A SQL function and a TS function can't literally share code, but nothing tests that they still agree.
- **`DETECTOR_RPC`** — `auto-remediate-packages` maintains a hardcoded `Record<DefectClass, string>` mapping each defect class to an RPC name string. If a detector function is ever renamed, this silently breaks (the RPC call errors) with no compile-time or test-time signal.

### 2D. A naming-mismatch risk, explicitly accepted rather than fixed

`generation_status.structuralDefects` entries and `auto_remediation_log.defect_class` strings use different vocabularies for the same underlying classes (`self_directed_question` vs. `self_directed_questions`; `identity_conflict` vs. `identity_contamination`). ADR-0056/0065 explicitly declined to build a reconciling lookup table, reasoning that doing so would just be "a second driftable name mapping." This is a considered trade-off, not an oversight — noted here for completeness, not as a new finding.

### 2E. Possibly dead or redundant

- ~~`get_empty_characters()` — dead code~~ **CORRECTED (Addendum 3): this was wrong, not dead.** See Decision item 6 and Addendum 3.
- **`quick_reference`** field on `mystery_characters` — generated on every package, confirmed (Addendum 59) not rendered anywhere in `src/` or any edge function. Generates real generation cost for a field nothing shows a customer.
- **`evidence_culprit_spoiler`** — permanently advisory-only by explicit design (high false-positive rate). Not dead, but worth confirming someone still periodically reads it, since nothing alerts on it automatically.
- **Two independently-capped repair lanes for `meta_text_leak`** (the free deterministic strip vs. the delegated `regenerate-child-content` path) — a deliberate asymmetry per ADR-0061, not a bug, but a standing complexity/bookkeeping cost ("a stubborn package can be attempted up to 4 times total across two different mechanisms before a human is needed").

---

## Part 3 — Concrete Gaps

### 3A. Documented, still-open blind spots

- **Victim same-package-swap.** `victim_mismatch`'s core design cannot catch a victim name that's wrong but happens to collide with a *living* character in the same package (Lyn DiFranco's actual bug, ADR-0098 Addendum 4) — explicitly named as "an open design question, not built" as of Addendum 5.
- **Rumor/question target-convergence** (Addenda 59–60) — a real, corpus-confirmed structural bias (independent per-character generation calls converge on the same 2–3 "obviously suspicious" names). The shipped fix is prompt-only guidance with no deterministic guarantee; the heavier fallback (pre-assigning targets via a balanced-assignment scheme before the LLM call) is explicitly logged, not built, pending evidence the prompt fix isn't enough.
- **Model-staleness drift** — found independently three times (`regenerate-child-content`, `regenerate-parent-content`, `generate-pointform-summaries`, each stuck on Haiku with stale `temperature`/`thinking`/`max_tokens` settings weeks after the ADR-0074 blanket upgrade). A lightweight automated health-check for this was proposed twice (ADR-0098 Addenda 7–8) and never built; the only mitigation today is the manual `CLAUDE.md` grep checklist.
- **The "gate-held vs. detector-visible" agreement assertion** — ADR-0055 explicitly asked for a test asserting the completion gate's held states and the detectors' visible states stay in sync, and explicitly never built it ("nothing tests that... A future assertion... would prevent the next instance of this class"). This exact class of gap — an unverified assumption that two things which must agree actually do — is structurally the same shape as both confirmed divergences in Part 2B and the triggering ADR-0130 incident.
- **No detector coverage of the pre-purchase/checkout path at all.** Every mechanism in Parts 1A–1D operates on `mystery_packages`/`mystery_characters` *after* generation. The ADR-0130 incident's actual failure mode — a regex regression blocking checkout — sits entirely outside this machine's domain; nothing here would have caught it even in principle, at any layer, because none of it runs before a purchase.
- **`scripts/__tests__/*.test.mjs` exist but are not wired into CI.** Confirmed via grep across `.github/workflows/`. The regression suite specifically built to catch the ADR-0130 shape of bug (including 4 tests Addendum 1 itself added, "verified non-vacuous by running them against the known-buggy commit first") can be skipped simply by not remembering to run it by hand before a deploy.

### 3B. Advisory checks already correctly tightened, or correctly left advisory

For clarity against the historical record: `pointform_language_mismatch`, `missing_role_branch_content`, and `narration_person_mismatch` are **already wired into the blocking gate** per live source, not merely advisory + self-heal as some earlier ADR framing might suggest in isolation. No change recommended there. (This is a statement about wiring, not correctness — see Addendum 1 below: `pointform_language_mismatch` was correctly *wired* but the shared logic itself had a real, confirmed one-directional gap, found and fixed the same day this ADR was written.) Conversely, `unconfessed_culprit`, `evidence_culprit_spoiler`, and `structural_defects` (multiple murderers, name/background mismatch, duplicated cast) are correctly advisory-only by explicit, repeated design decision — each requires human/NLP judgment a regex cannot safely automate into a block. **This audit does not recommend making any of these three blocking.**

### 3C. Bug classes hit more than once with still no detector or standing safeguard

- **"Paired-predicate drift" itself** — named explicitly, by that phrase, in at least six separate ADRs (0079, 0088's 2026-08-28 addendum, 0094, 0096, 0125's writeup, 0130) as the root cause of an incident, and it has no detector, lint, or CI check of its own. It is the mechanism behind both confirmed findings in Part 2B and the triggering incident.
- **Model staleness** — three confirmed occurrences, no automated check (see 3A).
- **A SQL/TS boundary duplicate silently under-covering its DB-side counterpart** — two confirmed instances now (`meta_text_leak`, `victim_mismatch`), found only by this audit's source diff, not by any existing process.
- **Missing documentation on new detectors** — 13 detector/gate-adjacent functions carried no `COMMENT ON FUNCTION` (corrected count, Addendum 3), which is exactly the kind of self-documentation gap that made the ADR-0130 Addendum 1 "grep for the wrong name" near-miss possible in the first place. **Implemented, Addendum 3: all 13 now documented.**

---

## Decision

Each item is tagged **[combine]**, **[eliminate]**, **[add]**, or **[preserve]**, states the bug-class coverage it protects (nothing currently caught is proposed for removal without saying so explicitly), and its approximate cost.

1. **[add] Wire `scripts/__tests__/*.test.mjs` into CI as a required, path-filtered check.** Add a GitHub Actions job (or a step in `deploy.yml`) that runs `node scripts/__tests__/conceptSnapshot.test.mjs` (and its two siblings) whenever a PR/push touches `supabase/functions/_shared/**`, `supabase/functions/mystery-webhook-trigger/**`, or `supabase/functions/extract-concept-roster/**`. This is the direct, cheap fix for the actual mechanism of the triggering incident — Addendum 1's own stated lesson was "a full corpus diff would have caught immediately," and the test suite already has 4 regression tests built for exactly this shape; they just never run automatically. Cost: near-zero (a `node` invocation with no external dependencies beyond `esbuild`, already a devDependency). **Implemented (Addendum 2, 2026-09-28) — with a correction:** a GitHub Actions check cannot literally block an edge function deploy in this repo (deploys go through a manual `supabase functions deploy` CLI call, disconnected from git/CI). Shipped as two parts instead of one: `.github/workflows/test-roster-extraction.yml` (fast automated alert, not a hard gate) plus `scripts/deploy-roster-functions.sh` (the actual blocking mechanism, conditional on being used instead of the bare CLI command). See Addendum 2 for detail.

2. **[combine] Reconcile the blocking gate's `meta_text_leak` and `victim_mismatch` checks with their more complete advisory siblings.** Concretely: extract each pattern into a single shared SQL function (e.g., `_meta_text_leak_pattern()`, `_victim_name_extraction_patterns()`) that both `package_completion_blocking_defects()` and the corresponding `list_packages_with_*` function call, rather than two independently-maintained inline strings. This removes nothing currently caught by either side — it takes the union of both and gives both consumers the same, single copy of it — and closes a confirmed, currently-live gap where roughly ten known leak patterns and two of three victim-extraction fallback patterns can bypass the blocking gate today. Cost: one migration touching two existing functions; recommend shadow-testing the reconciled pattern against a full corpus sample before cutover, per the same caution ADR-0130 itself should have applied. **Update (Addendum 1, 2026-09-28): widen this item's scope to a third pair, `pointform_language_mismatch`** — found duplicated (not shared) the same day this ADR was written, and found to be identically wrong in both copies. Fixing it required hand-editing two independent inline copies in lockstep within one migration — exactly the fragility this item exists to remove structurally, and now with a second, non-divergence-shaped example of why.

3. **[add] A scheduled "predicate agreement" check.** A cheap, SQL-only scheduled query (or a health-check.yml step) that periodically confirms every `list_packages_with_*` function's status-inclusion predicate (`completed` vs. `needs_review` inclusion) still matches what `package_completion_blocking_defects()` and `validate_package_characters()` actually gate on. This is the exact assertion ADR-0055 asked for and never got, and it is also the general shape of check that would have caught ADR-0072's month-long silent regression (where a hand-written migration reverted the ADR-0055 status-widening) much sooner than "a routine sweep noticed."

4. **[combine] Consolidate `nameVariants()` into a shared module**, mirroring exactly what ADR-0125 already did for roster extraction. Both existing copies already carry code comments acknowledging the drift risk, and the fix pattern (extract to `_shared/`, both call sites import it) is proven in this codebase. Preserves both existing bug fixes (bare-first-name, title-stripping); removes the need to remember a third manual port next time either is touched.

5. **[add] Promote the manual "stale hardcoded model" `CLAUDE.md` checklist to an automated `health-check.yml` step** — a grep for `claude-haiku|claude-sonnet|claude-opus` across `supabase/functions/*/index.ts`, diffed against a small allowlist of intentionally-different models, alerting on anything new. This was proposed twice (ADR-0098 Addenda 7–8) and never built; per Addendum 38's own impact/cost framework, three confirmed incidents of real, paid-content defects (Haiku confession drops, pointform language drift, stale `temperature`/`thinking` settings) is more than enough evidence that "cheap to detect, severe when missed" applies here.

6. ~~**[eliminate] Delete `get_empty_characters()`.**~~ **RETRACTED (Addendum 3, 2026-09-28) — this finding was wrong.** Re-verifying live callers immediately before deletion (the exact caution this item itself specified) found the function carries its own `COMMENT ON FUNCTION`: *"Used by the parent Make.com scenario's retry loop to detect failed character generations."* It is not dead code — it is a live completion/retry router called directly by Make.com's Parent blueprint over HTTP, a caller surface no repo grep can see. This ADR's original claim leaned on ADR-0096's addendum ("zero callers, ever"), without checking that ADR-0109 — five days later — already corrected that same claim after finding and fixing exactly this blind spot. Deleting it would have broken production character-generation retry logic. See Addendum 3 for the full account. No deletion was made.

7. **[add] Require `COMMENT ON FUNCTION` on every new detector/gate function going forward**, and backfill the 12 existing ones that lack it as a low-priority housekeeping pass. Costs nothing per function going forward; directly targets the documentation gap that made the ADR-0130 Addendum 1 grep-undercounting near-miss possible, and is exactly the kind of policy that "would survive a rewrite." **Implemented (Addendum 3, 2026-09-28)** — with a corrected target list (2 more undocumented detector-shaped functions turned up while doing this than the original inventory counted; see Addendum 3).

8. **[preserve, ratify] Formally adopt ADR-0103 Addendum 38's impact/cost framework as standing project policy**, not just an addendum buried in one ADR's history. The framework — build immediately when detection is cheap+deterministic and impact is severe+obvious, regardless of occurrence count; keep deferring only when detection genuinely requires fuzzy/semantic judgment and impact is subtle — already correctly explains every "wait for a 2nd occurrence" and every "build now" decision found in this audit's full history. Recommend citing it by name in `CLAUDE.md`'s sweep section so future sessions apply it explicitly rather than re-deriving similar reasoning ad hoc each time.

9. **[preserve] Every escalate-only/advisory-by-design mechanism identified in Part 3B is correct as-is and should not be made blocking**: `unconfessed_culprit`, `evidence_culprit_spoiler`, `structural_defects` (multiple murderers / name-background mismatch / duplicated cast). Each requires human judgment a regex cannot safely automate into a hard gate without risking false-blocking real revenue.

10. **[flag for Jonathan, not decided here] `quick_reference` field.** Confirmed generated on every package, confirmed rendered nowhere. Recommend either wiring it into a real surface or stopping its generation to save cost — a product decision, not a quality-check decision, and explicitly out of this ADR's scope.

11. **[flag for Jonathan, not decided here] Rumor/question target-convergence's deterministic fallback.** The prompt-only fix (blueprints 46/47) already shows a meaningful, confirmed real-purchase improvement. Recommend waiting for more post-import data before committing to the heavier structural rewrite (pre-computed balanced target assignment) that Addendum 59 already scoped as the fallback.

## Rationale

- **Every recommendation above is a mechanical/structural fix, not a judgment-automation fix**, because every gap this audit actually found is mechanical: two independently-maintained regex sets falling out of sync, a test suite that exists but doesn't run automatically, a dead function, undocumented detectors. None of it is a case where a human's semantic judgment needs replacing — which is exactly the category ADR-0103 Addendum 38's framework says to fix immediately and cheaply, and exactly the category this project has twice already (Addenda 56, 59) correctly declined to solve with a paid LLM-judge tool. This audit's findings don't change that calculus; if anything, Addendum 59's own conclusion — that full-cast manual reading is *unreliable* specifically for verbatim-string-leak bugs, and a cheap deterministic detector is the right tool for that class — is the same principle applied one level up to this audit's own findings.
- **No full unification/rewrite is proposed** (e.g., one master defect-registry table driving every gate, detector, remediation handler, and alert off a single config). It's tempting on paper and would address the "redundant implementations" complaint in one stroke, but this audit found no evidence that the *separation* between gate/advisory/remediation/alert layers is itself the problem — each layer exists for a documented reason (a gate can't safely run judgment calls; an advisory detector can afford to be looser; remediation needs its own re-detect safety rail). The actual root causes found are narrow, specific, unsynced duplicates. A big-bang unification would be a much larger rewrite risk than the problems it would fix, and conflicts with this project's own stated preference for simple, targeted fixes over speculative infrastructure.

## Alternatives Considered

- **Full unification into a single defect-registry/config-driven system.** Rejected — disproportionate to the actual, narrow findings; see Rationale.
- **A general LLM-judge consistency pass across all delivered content.** Rejected again, consistent with the twice-already-declined precedent (Addenda 56, 59). This audit's findings are all mechanical, not semantic, so they don't provide new evidence for revisiting that decision.
- **Do nothing and rely on the next routine sweep to catch drift.** Rejected — this is precisely the assumption that already failed for 28 hours in the triggering incident, and the `meta_text_leak`/`victim_mismatch` gate-vs-advisory divergence documented in Part 2B has apparently been live, undetected, since at least Addendum 18 (2026-09-04) — over three weeks — because nothing was ever built to check the two sides still agree.

## Consequences

**Positive:**
- Closes two confirmed, currently-live gaps (Part 2B) where known leak/mismatch patterns can bypass the blocking completion gate, with no coverage loss to either side.
- Gives the ADR-0130-shaped regression class an automated backstop (CI-wired tests) instead of relying on a human remembering to run them by hand.
- Extends the one proven consolidation pattern this codebase already trusts (ADR-0125's `_shared/rosterExtraction.ts`) to the next-most-drift-prone duplicate (`nameVariants()`), rather than inventing a new pattern.
- Removes one piece of confirmed dead code and starts closing a real documentation gap cheaply.

**Negative:**
- The CI gate (item 1) adds a small amount of pipeline time to any PR touching the roster-extraction path, and needs correct path-scoping so it doesn't slow down unrelated deploys.
- The gate/advisory reconciliation (item 2) touches a currently-live, revenue-path blocking function; it needs the same shadow-test-before-cutover discipline this whole audit is arguing for, or it risks becoming the next incident rather than preventing one.
- None of this addresses the two flagged-not-decided product questions (items 10–11), which remain genuinely open and are Jonathan's call.

**Neutral:**
- This ADR does not change the manual sweep checklist's judgment-based steps, nor any of the escalate-only/advisory-by-design detectors — those are confirmed correct as designed and are explicitly out of scope for change.

## Discussion

The two headline findings in Part 2B were not something any prior ADR flagged — they were found only because this audit diffed live function source directly rather than trusting either the ADR history or a `grep`. That is itself informative: the project's existing self-checks (the sweep checklist, the ADR addenda process, the health-check alerting) are all *content*-focused — they check whether a generated package is defective — and none of them are structured to notice that two pieces of *infrastructure* meant to agree with each other have quietly stopped doing so. Item 3 (the predicate-agreement check) is the closest thing to a general answer to that meta-gap, and is deliberately scoped narrow (a structural comparison of status predicates) rather than an attempt to build something that would catch every possible future drift — consistent with this project's repeated, explicit preference for narrow, evidence-driven fixes over speculative generality.

The CI-gate proposal (item 1) was weighed against just telling future sessions "remember to run the tests by hand" — but that is exactly the kind of unenforced convention (cf. `is_test`'s "opt-in... nothing blocks... acceptable given how rarely this recurs, worth revisiting if it recurs" from ADR-0072) that this project's own history shows doesn't reliably hold under time pressure. A real purchase is on the line within hours of most changes to this pipeline; the cost of a CI job is low enough that there's no real tradeoff to debate here, unlike some of this project's other "add automation vs. stay lightweight" calls.

## Key files

- `supabase/functions/_shared/rosterExtraction.ts` — the ADR-0125 consolidation this proposal cites as precedent
- `scripts/__tests__/conceptSnapshot.test.mjs`, `retargetQuestions.test.mjs`, `leverClassifier.test.mjs` — exist, not yet CI-wired (item 1)
- `package_completion_blocking_defects()` (DB function) — the reconciliation target (item 2)
- `list_packages_with_meta_text_leak()`, `list_packages_with_victim_mismatch()` (DB functions) — the confirmed-more-complete siblings (item 2)
- `supabase/functions/adapt-mystery-apply/index.ts`, `supabase/functions/regenerate-child-content/index.ts` — both hold independent `nameVariants()` copies (item 4)
- `get_empty_characters()` (DB function) — proposed for deletion (item 6)
- `.github/workflows/health-check.yml` — target for items 3 and 5
- `CLAUDE.md` — target for item 8 (citing the Addendum 38 framework by name); not edited by this ADR

## Addendum 1 (2026-09-28): fresh, same-day evidence — a third gate/advisory duplicate-logic pair confirmed live (a new failure shape), plus a same-day near-miss of the very framework this audit recommends formally adopting

This ADR was written and committed earlier on 2026-09-28. Later the same day, unrelated live work — investigating a customer's content-filter alert on a fresh purchase ("Embers Of Trust") — surfaced a real defect that lands squarely inside this audit's own subject matter, found independently of the follow-up checks this ADR itself recommended (item 2, Part 2B's "not independently re-verified" list). Full incident detail: `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 62. This addendum records what it means for the audit above.

**A third confirmed gate/advisory pair, but a genuinely different failure shape than Part 2B's two headline findings.** `pointform_language_mismatch`'s inline copy inside `package_completion_blocking_defects()` and its advisory sibling `list_packages_with_pointform_language_mismatch()` are — like `meta_text_leak` and `victim_mismatch` — two independently-maintained copies of the same logic, not a single shared function. But unlike those two, this pair had **not** drifted apart: both copies checked only one direction of language drift (foreign prose + English point-form, the original Addendum 40 shape) and both missed the symmetric case (English prose + foreign point-form) identically, since the class was first built (Addendum 40/41, 2026-09-10) — eighteen days of a shared, silent blind spot, not a divergence between two implementations that started out agreeing. Part 2B's framing ("one implementation quietly fell behind the other") doesn't quite describe this: here, nothing fell behind anything — the two copies were in perfect, permanent agreement about being wrong. This is worth naming as its own sub-pattern: **a duplicated-logic pair is exactly as risky when both copies share a design flaw as when one drifts ahead of the other** — either way, the fix requires editing two places by hand and hoping nothing is missed, which is precisely what happened fixing this one (Addendum 62: one migration touching both functions in lockstep).

**This is evidence for Decision item 2, not a new decision.** The inline note added to item 2 above widens its recommended scope from two pairs to three. No new migration is needed for `pointform_language_mismatch` itself — it's already fixed — but the *pattern* it confirms strengthens the case for item 2's shared-function extraction: a single shared predicate would have made this bug impossible to introduce asymmetrically in the first place, the same benefit item 2 already claims for `meta_text_leak`/`victim_mismatch`.

**A near-miss of Decision item 8, found in this same day's own work, not hypothetically.** Item 8 recommends formally ratifying Addendum 38's framework — build immediately when detection is cheap and deterministic and impact is severe and obvious, regardless of occurrence count. Earlier the same day, Addendum 60 (part of a *different* investigation — a rumor/question target-imbalance sweep) directly observed this exact symptom on a different character (Grace Drawer, "Last Call: The Underground") and explicitly declined to act on it: "a pre-existing, unrelated bug, left alone." By the framework's own stated criteria this qualified for an immediate fix — the detection is a cheap SQL stopword-density comparison already built for the mirror-image case, and the impact is a paying customer receiving a foreign-language character guide, about as obvious as this class of bug gets. It sat unactioned for the rest of the day until a second, independent sighting (on a different package, in a different investigation) connected the dots. **This is stronger evidence for item 8 than anything in the original audit**: not a pattern reconstructed from ADR history, but the actual discipline failing to apply itself on the exact day the audit proposing it was written, inside the very project it's about.

**A new technical debt item, distinct from the now-fixed detector gap — investigated same day, no clean root cause found.** Fixing the 7 confirmed characters via `generate-pointform-summaries` converged cleanly for 5, but 2 (Professor Marigold in "The Last Lesson Of Professor Vaingloryus," Onszi in "Shadows Over Blackwood Manor") failed to converge after 3 independent regeneration attempts each, against source content read and confirmed clean, unambiguous English every time — and didn't even fail the same way twice (Onszi's 3rd attempt came back Portuguese, not French). Worked around by hand-drafting the content directly. A same-day follow-up check ruled out several candidate explanations (character-name Unicode encoding, source field length, `character_role`) without new API spend; one partial lead (Onszi's entire cast uses non-English-flavored names, unlike the rest of the corpus) doesn't generalize to Marigold's cast, which is entirely English-named. Left as genuinely open — most likely baseline model stochastic variance, not a mechanical bug this audit's own framework would apply to. Full investigation: ADR-0103 Addendum 62. Candidate addition to Part 3A's blind-spot list (alongside the existing model-staleness entry) for whoever next has reason to touch `generate-pointform-summaries`.

### Key files (Addendum 1)
- No new files — this addendum records evidence from `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 62 and its underlying fix (`supabase/migrations/20260928140000_widen_pointform_language_mismatch_bidirectional.sql`) as it bears on this ADR's own findings and recommendations. This ADR's own Decision items are unchanged in substance; item 2's scope is explicitly widened per the inline update above.

## Addendum 3 (2026-09-28): implemented Decision item 7 — and in re-verifying item 6 immediately before acting on it, found the ADR's own "delete this" recommendation was wrong

Continuing the step-by-step rollout Jonathan asked for, next in sequence were items 6 (delete `get_empty_characters()`) and 7 (backfill missing `COMMENT ON FUNCTION`s). Item 6's own text already committed to "re-verify zero callers live right before deleting" — that check is what surfaced this addendum.

**Item 6 retracted: `get_empty_characters()` is not dead code, and deleting it would have broken production.** Its own live `COMMENT ON FUNCTION` reads: *"Used by the parent Make.com scenario's retry loop to detect failed character generations."* Reconstructing why the original audit got this wrong: Part 2E's claim came from ADR-0096's addendum (2026-08-20), which found no *repo-visible* callers and called it dead. But ADR-0109 (2026-08-25, five days later) directly contradicts that: Make.com's Parent blueprint calls this exact RPC over HTTP as its own completion/retry router for detective-style packages, a caller surface no codebase grep can ever see — and ADR-0109 extended the function specifically to fix a gap in that live usage (a `UNION ALL` branch for wholly-missing character rows). The original audit read ADR-0096's claim and didn't cross-check it against the later, contradicting ADR-0109 finding — exactly the "verify a memory/claim against current ground truth before acting on it" failure this project's own standing practice warns about, now caught in this ADR's own work rather than by an external incident. **No deletion was made.** This is also the clearest evidence yet, from inside this exercise itself, for why item 6-style "confirmed dead code" claims need re-verification at the point of action, not just at audit time — state (and understanding of state) can be wrong in ways that only show up when you go to actually act on it.

**Item 7 implemented, with a corrected scope.** While gathering each function's real SQL to write an accurate comment (not inferring content from ADR prose — a guessed-at `COMMENT ON FUNCTION` would be worse than none), found two more detector-shaped functions the original audit's inventory missed entirely: `list_packages_with_final_statement_confession_leak()` (referenced by ADR-0074 but never added to Part 1B's table) and `package_victim_is_playable_character()` (the shared predicate behind the victim-as-character gate/advisory pair, itself undocumented). Corrected count: 13 functions lacked documentation, not 12. Backfilled all 13 via `supabase/migrations/20260928200000_backfill_detector_function_comments.sql`, applied live and committed. Comments-only, no behavior change.

**A useful side effect of reading every function's real source for item 7: verified two more gate-vs-advisory pairs Part 2B had explicitly left unchecked.** `self_directed_question` and `slip_culprit_leak` — diffed the gate's inline patterns against their `list_packages_with_*` siblings. Both are byte-for-byte identical, currently in sync. Recorded inline in Part 2B — this audit should report the pairs that check out clean as plainly as the ones that don't, not just accumulate findings.

**A near-miss that resolved itself, worth naming for the next session rather than silently ignoring.** Partway through this investigation, a fresh check of `package_completion_blocking_defects()`'s `pointform_language_mismatch` block appeared to show only one direction (the pre-Addendum-62 shape), which would have meant Addendum 1's "fixed live, both copies" claim was itself wrong. Before reporting that as a finding, re-queried live state directly rather than trusting the in-conversation read from earlier in this same (long) session — the gate is in fact correctly bidirectional right now. The likely explanation: this is a shared checkout (per the standing `project_shared_checkout_git_hazard` memory), and Addendum 62's actual migration apply most likely landed on the live database *during* this conversation, after this session's own earlier read but before this re-check. Not a new bug — but a reminder that in this environment, a claim about live state is only as fresh as the query that produced it, even within one sitting.

### Key files (Addendum 3)
- `get_empty_characters()` (DB function) — NOT deleted; correction only
- `supabase/migrations/20260928200000_backfill_detector_function_comments.sql` — new, applied live and committed
- `list_packages_with_final_statement_confession_leak()`, `package_victim_is_playable_character()` — the two functions this audit's original inventory missed
- `CHANGELOG.md` (+ vault sync) — dated entry for this implementation step

## Addendum 2 (2026-09-28): implemented Decision item 1 — found "CI gate" doesn't mean what it sounds like in this repo, shipped a two-part fix instead

Jonathan reviewed this ADR, agreed to proceed, and asked to go step by step starting with the lowest-risk items. Before building item 1 as written ("wire the tests into CI"), checked what deploying an edge function in this repo actually depends on — a habit this whole ADR argues for (verify live state before acting on a plan, don't trust the plan's own framing at face value).

**Finding: `supabase functions deploy` is a manual CLI call, fully disconnected from this repo's git history and GitHub Actions.** Confirmed via `grep` across `.github/workflows/` — no workflow deploys any edge function, and no `npm` script wraps the deploy CLI either. This matches the standing memory note "Git push ≠ deployed for edge functions." A standard "CI gate" (a GitHub Actions check that blocks a merge) therefore cannot block the actual deploy path that shipped the ADR-0130 Addendum 1 regression — a green or red checkmark on a push-to-`main` workflow would be a signal arriving independently of whether someone already ran the deploy by hand, not a block on it. Item 1 as originally worded would have shipped something that *looked* like it closed this gap without actually doing so.

**Fix, shipped as two parts rather than the one originally proposed:**
1. **`.github/workflows/test-roster-extraction.yml`** — runs `npm run test:roster` (new script, chains all three `scripts/__tests__/*.test.mjs` suites) on every push to `main` touching `_shared/rosterExtraction.ts`, its three real consumers, or the test files themselves. Confirmed one consumer the original ADR's file list missed: `mystery-ai/index.ts` also imports from `_shared/rosterExtraction.ts`, alongside `mystery-webhook-trigger` and `extract-concept-roster`. This can't block a deploy, but turns "28 hours until two customers complain" into "a few minutes until a failed GitHub Actions run" for the next person who pushes a regression to the repo, regardless of whether they remember to run tests by hand first.
2. **`scripts/deploy-roster-functions.sh`** — runs the same suite and only proceeds to `supabase functions deploy` (for all three consumers) on success. This is the only mechanism in the codebase that can actually block a bad deploy of this file — conditional on it being what's actually run instead of the bare CLI command, the same "unenforced convention" caveat this ADR's own Discussion section already raised about `is_test` (ADR-0072).

**Verified before wiring in, not after:** ran all three test files directly (`node scripts/__tests__/*.test.mjs`) and via the new `npm run test:roster` script — 41 checks total, all passing, confirmed clean before either the workflow or the wrapper could reference them. YAML syntax of the new workflow validated with `python3 -c "import yaml; yaml.safe_load(...)"`.

**Not done:** did not attempt to retrofit a similar wrapper for any other edge function's deploy path (e.g. `regenerate-child-content`, which also touches drift-prone shared logic per Part 2C) — out of scope for item 1, which was specifically about the roster-extraction regression class.

### Key files (Addendum 2)
- `.github/workflows/test-roster-extraction.yml` — new, push-triggered + path-filtered test workflow
- `scripts/deploy-roster-functions.sh` — new, the actual blocking mechanism
- `package.json` — new `test:roster` script
- `CHANGELOG.md` (+ vault sync) — dated entry for this implementation step
