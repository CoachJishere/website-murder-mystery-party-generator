# ADR-0047: Closed-loop auto-remediation for content-quality defects

- **Status:** Accepted
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

## Key Files

- `supabase/functions/auto-remediate-packages/index.ts` — the worker (to build)
- `supabase/migrations/*_auto_remediation_log.sql` — audit table (to build)
- `supabase/functions/generate-evidence-images/index.ts` (v15), `regenerate-parent-content/index.ts` (v6) — the recovery tools it drives
- `supabase/migrations/20260725_detect_content_quality_issues.sql`, `20260722_detect_character_identity_conflicts.sql` — the detectors it gates on
- `.github/workflows/health-check.yml` — detection + the escalation channel it falls back to
- [ADR-0042](0042-content-quality-detectors-and-generation-guardrails.md) — the detection layer this closes the loop on
