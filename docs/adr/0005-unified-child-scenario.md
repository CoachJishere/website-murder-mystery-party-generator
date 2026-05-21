# ADR-0005: Unify Make.com Child Scenarios Into One

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made April 2026, captured retroactively)

## Context

Mystery generation in Make.com is split parent → child: the parent scenario produces the overview, host guide, and basic character list, then triggers a child scenario per character to write the round scripts.

Historically there were **two child scenarios**, one per generation style:
- `MM Live - Child (Character-based)` — webhook `lvy2gj2hza86t0lacs3elxaj5rcek2uj`
- `MM Live - Child (Detective-Style)` — webhook `r5n709cdqbw7s5wedi1zc4k3pd3m0l7l`

The parent routed to one or the other based on the `mystery_style` field on `mystery_packages`. This was the original design — different prompts and module flows per style, kept physically separate for clarity.

The arrangement failed in April 2026 in a predictable but painful way: the character-based child scenario was accidentally toggled OFF (it can happen via the Make.com UI in a single click), and the parent had no way to know. Two real customer packages generated with `generation_status = 'completed'` and zero characters. The customers saw a broken UI; we found out by support ticket.

This was the proximate trigger for the broader monitoring system ([ADR-0003](0003-generation-monitoring.md)), but it also raised a more fundamental question: **why are we running two scenarios that can independently go offline, when a single scenario could route internally?**

The two style-specific prompt chains shared most of their structure. The actual divergence — different prompt templates and slightly different output validators — was a small minority of the modules and could be expressed as routing inside a single scenario.

## Decision

**Merge both child scenarios into one: `MM Live - Child (Unified)`, webhook `3l26wasbsjzh5396np25qoyv8g82u6j3`.**

- The unified child reads `mystery_style` from `mystery_packages` (module 142 Supabase lookup) and routes internally via a Make.com router to either the character-based branch or the detective-style branch.
- The parent scenario now calls a single webhook URL for all children, regardless of style.
- The two old webhook URLs are deprecated and the old scenarios are kept turned off as archival reference; they should not be re-enabled.
- The parent's verification flow (see [ADR-0003](0003-generation-monitoring.md)) calls the same RPC regardless of style, so monitoring is also style-agnostic.

Operational rule that goes with this decision: **the unified child is the single scenario that must be ON.** "Are the children scenarios on?" reduces to "is the one scenario on?" — a question that can be checked at a glance and that automated monitoring can assert on.

## Consequences

**Positive:**
- **One scenario to keep on, not two.** The single-click-off failure mode that caused the original incident still exists in principle (any Make.com scenario can be toggled off), but its blast radius is now "generation is completely broken" rather than "generation is silently broken for half of customers." A complete outage is loud; a half-outage is silent. Loud is recoverable.
- **No more "is the right child scenario on?" question.** The style-routing logic is internal to the scenario, not external to it.
- **Shared module updates apply to both branches.** Prior to unification, an improvement to, say, the JSON parser error handler had to be ported into both children. Now it's a single edit.
- **Monitoring is style-agnostic.** Trigger and sweep check for empty characters regardless of style, and the parent's RPC verification doesn't branch on style.

**Negative:**
- **The single scenario is larger and harder to reason about.** Two routed branches in one canvas vs. two separate canvases — clarity per scenario is lower. Mitigated by the fact that the branches diverge only in the prompt-and-validator portions; everything before and after is shared.
- **A bug in the shared portion now breaks both styles simultaneously.** Previously a regression in the character-based prompt couldn't affect detective generations. Now they share more wiring. Acceptable because the shared portion is mostly inert plumbing (HTTP, Supabase, JSON parsing) where regressions are rare.
- **Lost the implicit "different styles are different products" cue** that came from physically separate scenarios. Future contributors might assume the two styles are more similar than they actually are, and propagate changes across both when only one was intended. Mitigated by clear router labeling inside the scenario.
- **Webhook URL change is a one-way migration.** Anything (test scripts, docs, monitoring) that referenced the old webhooks had to be updated. The blueprint files in `temp-files/` retain the old URLs for archival purposes only.

**When to revisit:**
- **If a third generation style is added** and the in-scenario router becomes unwieldy (>3 branches with non-trivial logic), splitting back into per-style children may become worthwhile. The bar: when reading the scenario, can a human still hold the whole flow in their head? If no, split.
- **If Make.com is replaced** by in-house orchestration, this ADR becomes moot — the equivalent decision in code is "one orchestrator function vs. one per style," and the same reasoning (single source of truth for shared logic) should apply.

## Rejected alternatives

- **Keep two scenarios, add external "is it on?" monitoring.** Rejected: solves the immediate incident but doesn't address the underlying duplication. Also, monitoring "are these specific scenarios enabled?" via Make.com's API is possible but brittle, and the duplication of shared modules across both children was a separate ongoing cost.
- **Build orchestration in-house and skip Make.com entirely.** Considered, deferred. Make.com handles a lot of retry/scheduling/visibility work that we'd have to rebuild. Unifying the children is a 1-day change; replacing Make.com is a multi-week project. Unification is the right move now; replacement is a separate future decision.
- **Two scenarios but with a "watchdog" parent module that pings each child before invoking.** Rejected: adds a pre-flight check to every generation just to detect a configuration drift that we can prevent structurally by having only one scenario.
