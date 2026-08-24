# ADR-0107: Decide the victim's name once, at generation time — never dual-gender it

- **Status:** Accepted
- **Date:** 2026-08-23
- **Related:** [ADR-0103](0103-new-purchase-coherence-sweep-ritual.md) Addendum 1, [ADR-0104](0104-close-post-purchase-free-regeneration-hole.md) Addendum 3 (the incident this ADR follows up on)

## Context

Today's repeat sweep on Toby Wragg's purchase (*Death On The Île De Ré*) found the victim's name rendered two different ways in the same delivered package: `game_overview`/`detective_script` said "Margot Dubois," while `evidence_cards` and all 4 characters' background/secrets/accusations said "Margot/Marc Dubois." Widening the check found the same defect in 2 more live, already-delivered packages (Behind The Mask: Death At The Gilded Circle; Death At The Velvet Rose) — 3 of 11 sampled (27%). All 3 were fixed with a data-only SQL patch (see ADR-0104 Addendum 3); this ADR is the pipeline-level follow-up so the next purchase doesn't need the same patch.

Traced the root cause through every prompt in the pipeline (the concept chat in `mystery-ai/index.ts`, and the Make.com Parent blueprint's `master_context` generation, `Parent58` at time of writing). Neither one *instructs* the "Name1/Name2" gender-flexible naming convention anywhere — there is no existing rule that says "use this format." The model appears to generate it unprompted for every named person, suspect and victim alike, presumably inferring it's helpful so a host can assign any player to any role. That's a reasonable inference for suspects (who are always played by a real guest) but not for the victim, who is never played by anyone — the model has simply never been told the two cases are different. Because nothing holds it to either behavior for the victim specifically, whether the parent-generation stage (`game_overview`/`detective_script`) and the child-generation stage (`evidence_cards`/character content) each independently resolve it to a single name, both keep it dual, or one does each — is essentially down to per-generation chance. That's why some historical packages are internally consistent (both stages agree, dual or single) and some aren't.

Checked whether fixing this could break anything downstream: `adapt-mystery-apply`'s `nameVariants()` (used for murderer/accomplice reassignment) only ever expands the *suspect* being reassigned, never the victim. The `package_victim_is_playable_character()` detector (migration `20260802_detect_victim_is_playable_character.sql`) only expands *suspect* names to check whether the overview describes one of them as dead. Nothing in the codebase depends on the victim carrying a dual-gender name. Safe to remove.

## Decision

Add an explicit instruction to the Parent blueprint's Part 1 prompt (`master_context` generation), at the exact point it defines `victimProfile.name` / the wronged party's name, in all 4 style variants (detective-murder, character-murder, detective-intrigue, character-intrigue):

- **Murder-style victim** (never playable): "Decide ONE single, final name and gender for the victim. NEVER use the gender-flexible 'A/B' dual-name format here (unlike character names) — the victim is never played by a guest, so there is no reason to leave the name flexible."
- **Intrigue-style "wronged party"** (sometimes playable — `isPlayableCharacter` can be `true`): conditional wording — single fixed name unless `isPlayableCharacter` will be `true`, in which case the normal dual-name convention is fine, matching the character-name convention it would then share.

Character/suspect names are untouched — the dual-gender convention there is a real, intentional product feature (the host resolves it manually via the `character_name` field before printing/assigning), not something this ADR touches.

Drafted as a new blueprint version, `Parent59 (Victim Single-Name Decision)`, built on top of `Parent58 (Fix Missing Completion Write)` — the current head as of another concurrent session today, confirmed via `temp-files/` before branching (per the standing Make.com blueprint-versioning practice: always re-check the current head, never branch off a stale version or reuse a number). **Superseded same day:** a separate concurrent session landed `Parent60 (Wait Before Completion Check)` on top of `Parent59` — confirmed all 4 victim-naming instruction insertions from this ADR carried forward intact (`grep` count of 4, matching). `Parent60` is the actual import candidate, not `Parent59`.

**Imported and confirmed live same day.** Verified directly via the Make.com API (scenario id `9106101`): `isActive: true`, and the live scenario's own `/blueprint` response contains all 4 victim-naming instructions (matched `Decide ONE single, final name and gender` × 4) — not just imported, actually the active version serving new webhook calls.

## Rationale

- **Fix at the source, not downstream.** Today's incident fix patched already-generated data for 3 packages; that doesn't stop the 4th one. The generation-time fix means every future package gets a victim name that's already single and final before either the parent or child stage ever touches it — nothing left to disagree about.
- **Additive instruction, not a correction.** There was no existing rule telling the model to dual-name the victim, so this isn't "fixing a wrong rule" — it's giving the model a rule it never had, for the one case (the victim) where the model's own unprompted inference about "any player could take this role" doesn't hold.
- **Scoped to the victim/wronged-party field only.** Character/suspect names keep the dual-gender convention exactly as-is; this ADR does not touch it, evaluate it, or attempt to change host-facing UX around it.
- **Conditional wording for intrigue's `isPlayableCharacter`.** Unlike a murder-mystery victim, an intrigue mystery's "wronged party" can legitimately be one of the players — in that case it should keep the dual-name convention like any other character. A single blanket "never dual-name" rule would have been wrong for that variant.

## Alternatives Considered

- **Add a detector instead of fixing the prompt.** Rejected as the sole fix — a detector would catch drift after the fact but wouldn't stop it from happening every time; the sweep ritual already leans on "detectors are a data point, not proof" (ADR-0103) specifically because detector coverage keeps having gaps. Added anyway as defense-in-depth (see below) — not a substitute for the prompt fix, a backstop for it.
- **Resolve the name in a post-processing step instead of the prompt.** Rejected: would require picking one of the two already-generated names (parent's or child's) after the fact, which is exactly the ambiguous "which one is right" problem this incident already had to solve manually 3 times today. Fixing the prompt means there's only ever one name generated, never two to reconcile.

## Consequences

**Positive:**
- Removes the entire defect class for future purchases — the parent and child generation stages will read the same single, already-decided victim name from `master_context`, with nothing left to independently resolve.
- No behavior change for suspects/characters — the existing host-resolves-it-manually convention is untouched.

**Negative:**
- Required a live Make.com blueprint import — a revenue-path change, done deliberately slower (drafted, reviewed, then imported) rather than edited live. Imported and confirmed active same day.
- Doesn't retroactively fix any other historical packages beyond the 3 already patched — a package generated before this ships could still carry the old inconsistency if it hasn't been checked yet. Widening the earlier sample turned up 2 more (Ghosts Of The Past; The Masked Betrayal) that still have a dual name in `master_context`, though neither showed the parent/child *disagreement* shape that makes it customer-visible — not treated as urgent, left as-is pending a future sweep.

**Added same day — defense-in-depth detector:** `supabase/migrations/20260823_detect_unresolved_victim_dual_name.sql` adds `package_victim_name_unresolved()` / `list_packages_with_unresolved_victim_name()`, flagging any completed package whose `master_context.victimProfile.name` still contains "/". Deployed and verified against the live corpus — correctly found the 5 known historical offenders (the 3 patched today, plus the 2 above). Deliberately read-only, not wired into `package_completion_blocking_defects()` (ADR-0053's gating bar requires a validated zero-false-positive detector; this one hasn't been proven against enough post-fix data yet). Wired into the `CLAUDE.md` sweep checklist (step 3) alongside the existing two detectors. Known limitation: it checks `master_context`, which this ADR's own 3 already-fixed packages were deliberately *not* rewritten in (only their customer-facing rendered content was patched) — so those 3 will always show up here, which is expected, not a regression; only new hits on packages created after `Parent60` actually ships are meaningful.

## Key files

- `temp-files/MM Live - Parent59 (Victim Single-Name Decision).blueprint.json` — drafted, superseded same day by `Parent60`
- `temp-files/MM Live - Parent60 (Wait Before Completion Check).blueprint.json` — actual import candidate; confirmed carries this ADR's diff forward, not yet imported
- `supabase/migrations/20260823_detect_unresolved_victim_dual_name.sql` — defense-in-depth detector, deployed
- `CLAUDE.md` — sweep checklist step 3 updated to include the new detector
- `supabase/functions/adapt-mystery-apply/index.ts` — confirmed unaffected (`nameVariants()` only touches suspect names)
- `supabase/migrations/20260802_detect_victim_is_playable_character.sql` — confirmed unaffected (only expands suspect names)
