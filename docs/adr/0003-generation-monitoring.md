# ADR-0003: Generation Monitoring via Postgres Trigger + pg_cron Sweep

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made April 2026, captured retroactively)

## Context

Mystery package generation is orchestrated through Make.com: a parent scenario produces the overview and host guide, then fans out to a child scenario per character to write round scripts. The pipeline is essentially a multi-step external workflow that writes back to Supabase asynchronously, and it can fail in two qualitatively different ways:

1. **Loud failures** — Make.com reports an HTTP error, the run dies, the package row never reaches `generation_status = 'completed'`. These are visible: the customer is stuck on the loading screen, support gets a ticket.
2. **Silent failures** — the parent finishes successfully and writes `completed`, but child scenarios returned empty character rows (or were turned off entirely, as happened with the character-based child scenario in April). The package appears complete in the DB but the UI has nothing to show. Customers see a broken state and may not realize it's broken until they try to host the party.

We needed a detection mechanism for the silent class. Three rough architectures were on the table:

- **Background queue (BullMQ/Inngest/dedicated worker).** Make.com writes to a queue, a worker validates and either promotes or flags.
- **Frontend-only polling and timeout.** UI watches the row and surfaces "stuck" states to the user.
- **DB-native trigger + scheduled sweep.** Postgres trigger validates on completion; pg_cron catches anything the trigger misses.

We also needed Make.com itself to verify its work mid-run (so it can retry once before giving up), which requires the same validation logic to be callable from outside Supabase.

## Decision

**Architecture: DB-native trigger + pg_cron sweep + RPC for external verification + frontend timeout.**

Four pieces, each with a specific job:

1. **`validate_package_characters()` — BEFORE UPDATE trigger on `mystery_packages`.** Fires when `generation_completed_at` transitions from NULL to non-NULL. Inspects `mystery_characters` rows for the package; if any have NULL `description` or NULL `character_role`, overrides `generation_status` to `needs_review` and calls `notify-generation-issue` via `pg_net`. Being BEFORE UPDATE lets it modify NEW.* before the row is written — the bad-state package never reaches `completed` in the first place.

2. **`sweep_incomplete_packages()` — pg_cron job, every 30 min.** Catches packages where the trigger didn't fire (e.g. characters were nulled-out after completion, or the package was written by older code paths). Sets `needs_review` and fires notifications. Also calls `promote_complete_packages()` to walk `needs_review` rows back to `completed` if characters were later populated — important for the recovery flow where we manually patch characters via Claude Code agents.

3. **`get_empty_characters(p_package_id)` — SECURITY DEFINER RPC.** Called by Make.com mid-run via the REST API with the anon key. RLS would normally block anon reads of `mystery_characters`; SECURITY DEFINER bypasses it. Make.com routes on `fileSize` of the response (`fileSize = 2` means `[]` empty array = all characters good; `> 2` means empties exist) and retries the child webhook with a 5-minute sleep before final verdict.

4. **Frontend 15-minute timeout in `MysteryView.tsx`.** If the row hasn't reached `completed` or `needs_review` after 15 min, the UI shows the "team has been notified" amber screen and calls `notify-generation-issue`. Covers Make.com runs that died entirely without writing anything back.

`pg_net` and `pg_cron` extensions are required and enabled on the project.

## Consequences

**Positive:**
- **Silent failures become loud.** The `needs_review` status is a single signal both the UI and support tooling key off — no scattered ad-hoc checks.
- **No new infrastructure.** Trigger + cron + RPC are all native Postgres/Supabase. No queue, no worker process, no third-party.
- **External callable.** The same validation logic that the trigger runs is reachable by Make.com via RPC, so verification logic doesn't drift between in-DB and out-of-DB callers.
- **Recovery path is symmetric.** `promote_complete_packages()` means we can fix characters by any means (manual SQL, Claude Code agent, re-run) and the next sweep picks it up — no special "this was manually fixed" code path.
- **Cron sweep is a safety net.** Even if the trigger has a bug or is bypassed, the sweep catches it within 30 min.

**Negative:**
- **30-min worst-case detection latency.** For silent failures the trigger doesn't catch, the customer can see a broken package for up to 30 min before `needs_review` flips. Acceptable given the 15-min frontend timeout already surfaces something to the user.
- **Trigger logic lives in SQL.** Harder to unit-test than TypeScript and the change cycle (`apply_migration`) is slower than deploying an edge function.
- **`pg_net` failures are silent.** If the trigger fails to call `notify-generation-issue` (e.g. transient `pg_net` error) the row still gets `needs_review` but support isn't paged. The 30-min sweep covers this on the next pass.
- **Anon key hardcoded in Make.com modules.** Acceptable because the RPC is SECURITY DEFINER over a known-safe read-only query; rotation requires a Make.com edit.
- **Make.com's `fileSize` quirk** (using response byte count to distinguish empty from populated array) is non-obvious and fragile if the response shape changes. Captured in [project_generation_monitoring_apr2026.md](../../.claude/projects/-Users-jonathanmiller-CascadeProjects-website-murder-mystery-party-generator-main/memory/project_generation_monitoring_apr2026.md).

**When to revisit:**
- **If Make.com is replaced** by in-house orchestration (e.g. Inngest, Temporal, custom worker), the RPC and Make.com retry loop go away but the trigger + sweep + frontend timeout still earn their keep — they're orchestrator-agnostic.
- **If silent-failure rate drops to ~zero for 90 days,** the 30-min sweep cadence could be stretched to hourly to reduce DB noise. Not urgent.
- **If a new "package broken" failure mode appears that NULL-character checks don't catch,** add the predicate to `validate_package_characters()` rather than building a parallel monitoring system. One source of truth.

## Rejected alternatives

- **Background queue (BullMQ/Inngest).** Rejected: adds infrastructure (Redis or third-party), and the validation logic is fundamentally a "look at the row that was just written" check — exactly what triggers are for. Queues earn their keep when you need fan-out, scheduling, or retry semantics that DB triggers don't provide; this needs none of those.
- **Frontend-only polling and timeout.** Rejected as the *only* mechanism: if a customer closes the tab, the silent failure is never reported. Kept as a *complement* for the "Make.com died entirely" case where no DB row update happens.
- **Validate inside Make.com only.** Rejected: relies on the orchestrator to police itself, which is exactly the layer that failed in the original incident (child scenario was off, parent didn't know). Validation has to live one layer below the orchestrator.
- **Synchronous validation in the parent's final HTTP call.** Rejected: would block the parent on every run and couple two failure modes. The trigger fires asynchronously and the parent's verification flow (which uses the RPC) gives it a chance to self-heal before any external alarm is raised.
