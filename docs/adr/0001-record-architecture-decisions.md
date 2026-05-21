# ADR-0001: Record Architecture Decisions

- **Status:** Accepted
- **Date:** 2026-05-21

## Context

The Murder Mystery Party Generator has grown across multiple subsystems — Make.com webhook orchestration, Supabase edge functions, the React frontend, email pipelines, monitoring/cron, and so on. Several recent incidents and feature rollouts have involved tradeoffs that are non-obvious from reading the code alone:

- Why guest feedback is one email only (legal/UX reasoning, not technical)
- Why child Make.com scenarios were unified into one (operational, not architectural)
- Why generation monitoring uses a Postgres trigger + pg_cron sweep rather than a queue
- Why the welcome discount uses per-user Stripe promo codes rather than a single coupon

These decisions all have a "we picked X because Y, even though Z" structure. The reasoning lives in chat history, ad-hoc memory notes, or Jonathan's head. When the same area of the code is revisited months later, the rationale has to be reconstructed from scratch — which is slow, error-prone, and occasionally leads to undoing past decisions without realizing it.

CHANGELOG.md captures *what* changed. It does not capture *why*, what was rejected, or what tradeoffs were accepted. Git commits help but are scoped to a single change and are not discoverable when you don't already know the relevant SHA.

## Decision

Adopt a lightweight ADR (Architecture Decision Record) practice:

- ADRs live in `docs/adr/` as numbered markdown files (`0001-…`, `0002-…`).
- Format follows Michael Nygard's classic four sections: **Context, Decision, Consequences**, plus a **Status** header.
- Status values: `Proposed`, `Accepted`, `Superseded by ADR-NNNN`, `Deprecated`.
- ADRs are immutable once Accepted. To change a decision, write a new ADR that supersedes the old one — never edit the original except to update its Status line.
- The bar: **if the tradeoffs would survive a code rewrite, it's an ADR.** Implementation details do not qualify; architectural and policy choices do.

Examples of what gets an ADR:
- Choice of architecture pattern (queue vs. trigger; DB-backed vs. email-only)
- Tradeoffs between competing concerns (spam protection vs. UX friction)
- Policy decisions encoded in code (rate limits, retention, retry behavior)
- Anything where "we considered X and rejected it because Y" is worth preserving

Examples of what does NOT get an ADR:
- Bug fixes (CHANGELOG)
- Refactors that don't change behavior (commit message)
- Library version bumps (CHANGELOG)
- Schema additions that are mechanical extensions of existing patterns

## Consequences

**Positive:**
- Future-Jonathan (and future Claude sessions) can read `docs/adr/` to understand why the system is the way it is, without reconstructing context from chat logs.
- When a tradeoff's premise changes (e.g., spam volume crosses a threshold), the ADR makes it explicit when to revisit.
- Reduces accidental regressions where a past decision is undone without realizing it.

**Negative:**
- Small ongoing writing cost per architectural decision.
- Risk of ADR-bloat if the bar drifts down. Mitigated by the "survives a code rewrite" test.
- Risk of ADRs becoming stale if not updated when superseded. Mitigated by the immutability rule plus the Status field.

**Neutral:**
- CHANGELOG.md continues to document what changed and when. ADRs document why. The two coexist.
- Existing memory notes (`~/.claude/projects/.../memory/*.md`) continue to capture working-style preferences and project state. ADRs are for architectural decisions specifically — different purpose, different audience.
