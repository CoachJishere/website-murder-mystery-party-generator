# ADR-0047: Closed-loop auto-remediation for content-quality defects

- **Status:** Accepted — **built 2026-07-29**, **scheduled 2026-07-31** (re-eval passed; cron active at `43 */4 * * *`)
- **Date:** 2026-07-29

## Context

ADR-0042 gave us **detection** (read-only detectors + the 6-hourly health check that opens a GitHub issue / emails the owner). But **remediation is still manual**: the owner reads the alert, asks an AI session to look, and the fix is applied by hand. Every live catch so far — Black Swan (meta-leak), Cognitive Dissonance (missing image), Ghosts Of The Past (self-directed question) — was caught automatically but *fixed* only because the owner was in the loop.

The owner's ask (2026-07-29): "how does this happen without me in the loop?" — and, when asked, confirmed **autonomous spend is acceptable**. So the money gate that previously blocked auto-recovery (the standing no-paid-API-without-permission rule) is lifted *for this bounded, logged use*.

Remediation difficulty is not uniform. Some defects have a deterministic mechanical fix; others need real rewriting judgment and/or regeneration tooling that doesn't exist yet (character scripts are child-generated; `regenerate-parent-content` only covers parent content).

## Decision

Build a scheduled **`auto-remediate-packages`** edge function, wired to the existing monitoring cron, operating on a bounded recent window (30 days, matching the health check). For each detector-flagged package it attempts a class-specific fix, then **re-runs the detector and only accepts the fix if the package now passes** — otherwise it escalates. This re-detect gate is the core safety invariant: auto-remediation can never ship something worse than the current escalate-to-human path.

| Defect class | Action | Spend |
|---|---|---|
| Missing evidence images | Auto-fix: recall `generate-evidence-images` for the missing rounds (prompts from `evidence_cards`) | Replicate ~$0.04/img |
| Self-directed / victim-directed questions | Auto-fix: deterministic retarget to a living suspect not already asked that round | none |
| Meta-text / template artifacts (known patterns: `[choose …]`, `[CLOSING PARAGRAPH …]`, `master_context` lines) | Auto-fix: strip the offending line | none |
| Wrong victim in `game_overview` | Auto-regen `game_overview` via `regenerate-parent-content`, then re-detect | Claude Haiku, small |
| Identity contamination; slip-culprit-leak in a character secret | **Escalate** (child-generated, judgment-heavy, no safe deterministic fix and no child-content regenerator yet) | — |
| Anything still failing after the fix + re-detect, or an unhandled class | **Escalate** via the existing GitHub-issue/email channel | — |

**Safety rails (all required):**
- **Re-detect gate** after every fix; accept only if clean, else escalate.
- **Per-package/per-defect attempt cap** (e.g. 2) — never loop.
- **Audit log** (`auto_remediation_log`): package_id, class, action, before-value, outcome, cost, timestamp — so the owner sees everything it did *without being in the loop*.
- **Global daily spend cap**; stop + escalate if exceeded.
- **Bounded window**: only act on packages created within the health-check window (don't churn ancient/played packages).
- Fixes are targeted/additive and log the prior value (recoverable).

## Rationale

- Removes the owner from the loop for the **mechanical** defects — which are the majority of live catches — while keeping a human gate exactly where judgment is load-bearing.
- The re-detect gate means autonomy is safe: the worst case degrades to today's behaviour (escalate), never "silently shipped something worse."
- Reuses everything already built: the ADR-0042 detectors, the `generate-evidence-images` (v15, now self-healing) and `regenerate-parent-content` recovery functions, and the existing cron + escalation channel.

## Alternatives Considered

1. **Full LLM auto-regeneration for every class** — rejected (for now): non-deterministic, and character-script contamination has no regenerator; auto-regen there could introduce new defects. Gated re-detect bounds the risk but the tooling gap remains — a **child-content regenerator is the follow-on** that would let contamination/culprit-leak join the auto-fix set.
2. **Keep remediation manual, only tighten guardrails** — rejected: guardrails reduce frequency but never reach zero (Ghosts slipped past live Child19), so a human is always needed without this.
3. **Auto-fix without a re-detect gate** — rejected: unsafe to mutate paid packages unattended with no confirmation the fix worked.

## Consequences

- The system spends money autonomously (bounded + capped + logged). Owner-approved 2026-07-29 for this use.
- Mechanical defects self-heal and stop reaching the owner; the email/issue channel now carries only judgment cases + genuine failures — higher signal.
- New surface to maintain: the worker + the audit log. A runaway is bounded by the attempt cap + spend cap.
- **Open follow-on:** a child-content regenerator to bring identity-contamination and slip-culprit-leak into the auto-fix set; until then they escalate.
- Build is done as a focused pass with an independent eval before it runs unattended (it mutates paid packages and spends money — highest-stakes automation in the repo).

## Build Notes (2026-07-29)

Built as specified. The worker is **deployed but not scheduled** — the pg_cron migration is committed un-run because this ADR requires an independent eval before it mutates paid packages unattended. `POST { "dry_run": true }` reports planned actions without mutating or spending.

**Implementation decisions worth recording:**

- **All rails live in one shared `runGatedAttempt` code path** (cap → spend → apply → re-detect → accept/revert), rather than in each defect handler. A handler contributes only a `FixPlan` (action, cost, apply, revert), so a future defect class cannot accidentally ship without the gate.
- **Whitelisted field accessors instead of direct PostgREST writes.** `remediation_read_field`/`remediation_write_field` centralise the jsonb-string handling (`#>> '{}'` in, `to_jsonb` out) that `evidence_cards`/`relationships`/`secrets` need, and refuse any non-whitelisted field — so the worker structurally cannot write `generation_status`, `master_context` or `host_access_token`. The jsonb writer additionally refuses when the column currently holds an object/array, since `to_jsonb(text)` would change its shape.
- **The artifact strip is narrower than the detector.** Only the three authorised patterns are stripped. The meta-text detector also fires on model chain-of-thought ("let me reconsider"), which needs a rewrite rather than a deletion — so those fail the re-detect gate and escalate, which is the correct outcome.
- **Image prompts are built only from the player-facing `#### DESCRIPTION`,** stopping at the next `####`. The `SIGNIFICANCE (Host Only)` block routinely names the murderer and must never reach an image prompt.
- **Attempt-cap counting excludes `skip:`/`escalate:` bookkeeping rows,** and those rows are written at most once per package/class, so a permanently-unfixable package neither consumes its own cap nor grows a log row every 4 hours.

**Trade-off flagged for the eval — revert-on-gate-failure restores a known-bad state.** As specified, a fix rejected by the re-detect gate is reverted. For a package with both a strippable artifact *and* unstrippable chain-of-thought, this means the artifact is put back before escalating, even though the partially-cleaned version was arguably better content. This was chosen deliberately: escalation assumes the human sees the package as the detector described it, and "leave a partial mutation in place" is the harder invariant to reason about. Worth revisiting if it proves annoying in practice — it is a one-line change in `runGatedAttempt`, not a structural one.

**Verification (synthetic fixture, created and deleted):** both free fixes applied and passed the gate; a deliberately poisoned package was rejected by the gate and reverted **byte-for-byte** (md5 match); the third attempt hit `skip:attempt_cap`; the spend cap read a simulated $5 day as zero remaining headroom. Escalate-only classes were logged and never mutated.

**Security issue found and fixed during the build:** the migration's `REVOKE ALL … FROM PUBLIC` did not remove the `EXECUTE` grants Supabase issues to `anon`/`authenticated` by default for `public`-schema functions, leaving `remediation_write_field` — an arbitrary-content writer — callable unauthenticated via PostgREST. Fixed with an explicit `REVOKE … FROM anon, authenticated`, folded back into the migration. Generalises to any future non-public `SECURITY DEFINER` function.

**Still open (unchanged by this build):** the child-content regenerator that would let identity-contamination and slip-culprit-leak join the auto-fix set.

## Post-eval fixes (2026-07-31)

Independent fresh-tab eval returned **NOT SAFE to schedule** — one blocking content-destruction bug the re-detect gate structurally could not catch. Fixes applied (deploy + independent re-eval still required before the cron is enabled):

- **#8 (BLOCKING) — whole-line artifact strip destroyed content.** In production every artifact is embedded mid-sentence in accusation speeches (`I believe [choose …] is the murderer`), never on its own line, so line-stripping emptied the field — and a gutted-but-artifact-free field passes the detector, so the gate accepted it. Rewrote `stripArtifactLines` to excise only *bracketed spans* and only when the line was a standalone authoring note (remainder empty/punctuation); if the artifact is embedded in real content it returns `safe:false` and the handler **escalates instead of gutting**. Added a **content-loss guard** in `writeField` (refuse any write that empties a field or removes >30% of a ≥40-char field) as a handler-independent backstop → throws → gate reverts + escalates.
- **#7 — all-or-nothing hole on apply failure.** A throw mid-apply (e.g. the loss guard tripping on field 3 of 5) logged `failed` without reverting, leaving a partial mutation. The apply-catch now calls `plan.revert()` (handlers read edits from closure, so it cleans up partial writes) and records `|reverted`.
- **#10 — brittle DESCRIPTION terminator.** Broadened to `#{2,6}` (space-optional) + a line-anchored `significance` truncation so the host-only SIGNIFICANCE block (names the murderer) can never reach an image prompt regardless of heading form.

Eval confirmed real and correct: the security grant fix (anon/authenticated EXECUTE=false), the universal gate, escalate-only never mutating, caps, bounded window, byte-for-byte revert. Records were uncommitted — fixed by the same commit as these fixes.

## Re-eval and scheduling (2026-07-31)

Independent fresh-tab re-eval of the post-eval fixes: **PASS — scheduled.** The committed source was deployed as v2 first (the running v1 was still the pre-fix code, so the fixes were not live until this eval deployed them).

Verified from ground truth, with synthetic fixtures created and deleted:

- **#8 is fixed.** A character `accusations` field with an embedded `[choose …]` artifact (476 chars) escalated as `escalate:no_mechanical_fix`; field md5 **identical** before and after, across four consecutive real runs. This is the exact case that emptied the field before.
- **Content-loss guard fires and reverts cleanly.** A character with a strippable `background` (775 chars) *and* a short `secret` (152 chars) produced a mid-apply throw on field 2 — `content-loss guard: character.secret 152->71 chars`. The already-written `background` was reverted **byte-for-byte (md5 identical)** and logged `…|apply_failed|reverted`. #7 confirmed.
- **#10 terminator holds** for `#### `, `#####`(no space), `**SIGNIFICANCE**`, `> SIGNIFICANCE`, `# SIGNIFICANCE` and `## Significance`; no culprit name reaches the prompt in any form.
- **Regressions all hold:** `dry_run` mutated nothing and spent nothing (md5s + empty log); `window_days: 9999` clamped to 30; attempt cap engaged (`3 prior attempts, cap 2`); spend accounting read a simulated $5 day as $5/$5; `anon`/`authenticated` `EXECUTE = false` on both accessor RPCs; escalate-only package untouched (`updated_at` unchanged).
- **Final production run:** 1 escalation, 0 fixed, 0 failed, **$0**, nothing mutated.

### Findings recorded, none blocking (see `00_INBOX` note)

1. **The `template_artifact` auto-fix is effectively inert in production.** All 9 artifact instances that have ever existed in this database (7 `accusations`, 2 `detective_script`) are embedded mid-sentence — **zero** are standalone lines, including the two `detective_script` cases this ADR described as the standalone shape (they are `Detective [choose a name …]` inside a 464/493-char paragraph). Post-fix that means 9/9 escalate. This is *correct and safe*, but the class no longer self-heals, so the "mechanical defects stop reaching the owner" benefit does not currently apply to it. A span-aware repair (or regeneration) is the real fix.
2. **The loss guard can block a legitimate standalone-note strip on short fields.** A standalone note only survives the guard when the field is at least `note_length / 0.3` (~267 chars for the standard 80-char note). Below that, the correct fix degrades to `failed` → revert → escalate. Safe direction, but it costs an attempt against the cap.
3. **`game_overview` is the one revert that *can* trip the guard.** It restores the *shorter* original over a longer regenerated overview; if the regeneration is >1.43× the original, the revert throws and is logged `revert_not_feasible`, leaving the regenerated text in place. The "reverts restore the longer original, so they never trip this" comment in `writeField` does not hold for this handler.
4. **`before_value` is `NULL` on the `apply_failed` path** (the throwing `apply` never returned it). Harmless for the strip/retarget handlers, whose `revert` reads edits from closure. But `handleVictimMismatch.revert` reads the *passed* `beforeValue`, so an apply-failure after `regenerate-parent-content` had already overwritten `game_overview` yields `apply_failed|revert_not_feasible` with no before-value in the log — the original would be unrecoverable. Narrow (needs a partial failure in the regenerator, and the class currently has 0 flagged packages), but it is a hole in Rail 5.

Findings 3 and 4 both sit in `game_overview_victim_mismatch`, which has zero flagged packages today, so live exposure is nil. They were left unfixed deliberately: making discretionary code changes at the end of an independent eval would invalidate the thing being evaluated.

## Key Files

- `supabase/functions/auto-remediate-packages/index.ts` — the worker (built; deployed v1, `verify_jwt` on)
- `supabase/migrations/20260729_auto_remediation_log.sql` — audit table + whitelisted field accessors + the anon/authenticated revoke (built). Note: applied to the DB as **two** migration versions — `20260729082237_auto_remediation_log` and the same-day security follow-up `20260729082931_remediation_field_accessors_revoke_anon`. The single repo file folds both together, so a fresh apply is correct; the DB history simply shows the two-step sequence.
- `supabase/migrations/20260729_schedule_auto_remediate_packages.sql` — pg_cron schedule (written, **deliberately un-run**)
- `supabase/functions/generate-evidence-images/index.ts` (v15), `regenerate-parent-content/index.ts` (v6) — the recovery tools it drives
- `supabase/migrations/20260725_detect_content_quality_issues.sql`, `20260722_detect_character_identity_conflicts.sql` — the detectors it gates on
- `.github/workflows/health-check.yml` — detection + the escalation channel it falls back to
- [ADR-0042](0042-content-quality-detectors-and-generation-guardrails.md) — the detection layer this closes the loop on

## Findings follow-up (2026-08-01)

After the passing re-eval scheduled the cron, four findings were recorded (vault note "Auto-remediation worker — open findings"). Actions:

- **#1 template_artifact is de-facto escalate-only.** Every artifact instance in the DB is embedded mid-sentence (accusations 531–1277 chars; the two detective_script cases too) — zero standalone. So the (correctly) conservative strip escalates all of them; this class does not self-heal in production. The worker's real live self-heal value is **missing-images + self-directed-questions** (the classes actually hit live) **+ victim-mismatch when it occurs**. Honest downgrade of the benefit claim; the proper fix for embedded artifacts is regeneration (proven on Velvet Viper/Coronation) or a child-content repair — the open follow-on.
- **#3 + #4 (victim-mismatch handler) — FIXED IN SOURCE (deploy pending).** One closure refactor: `handleVictimMismatch` captures `before` at plan-build time; its `revert` reads it from closure (survives an apply-failure — #4) and writes with a new `writeField` `bypassLossGuard` option (a shorter original restoring over a longer regeneration no longer trips the guard — #3). **Not yet deployed** — folded into the next integrity pass; zero live exposure (no victim-mismatch packages exist), so the live worker is unaffected until one appears.
- **#2 loss-guard blocks short-field strips** — accepted as safe noise; near-moot given #1 (no standalone notes exist to strip). No change.

Also recorded (separate, larger): **`generation_status` is double-encoded on 23/144 rows (17 completed, incl. Velvet Viper)**, so `generation_status->>'status'` returns NULL and the `= 'completed'` filter used by every ADR-0016/0041/0042 detector silently SKIPS them — their "clean across history" validations were against a reduced corpus. The structural detector (ADR-0048) tolerates both encodings; the others do not. Fix (recommended): normalise the 23 rows to a proper jsonb object in one migration, which repairs all detectors at once. Tracked for a dedicated pass.
