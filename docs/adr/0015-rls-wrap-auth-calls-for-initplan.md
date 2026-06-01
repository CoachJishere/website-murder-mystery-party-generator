# ADR-0015: Wrap `auth.uid()` / `auth.role()` in `(select ...)` Across RLS Policies

- **Status:** Accepted
- **Date:** 2026-06-01

## Context

Supabase sent a Disk IO Budget depletion warning on 2026-06-01. The project is healthy, but disk reads/writes per day are exceeding the compute tier's baseline allowance, which would eventually manifest as query throttling and IO-wait CPU spikes.

The Supabase performance advisor reported:

- **32 `auth_rls_initplan` WARNs** — RLS policies calling `auth.uid()` / `auth.role()` directly, which forces Postgres to re-evaluate the function per row instead of once per query.
- 48 `multiple_permissive_policies` WARNs (policy consolidation work, separate from this ADR).
- 28 `unused_index` notices (separate).
- 5 unindexed FK notices (separate).

The 32 `auth_rls_initplan` warnings span 13 tables, including high-traffic ones (`blog_posts`, `conversations`, `mystery_packages`, `mystery_characters`, `messages`). The project runs many scheduled jobs (daily publish, prerender, Pinterest runner, monitoring sweep, cross-link audit, generation timeout sweep) that hit these tables on cron, so the per-row cost compounds.

Supabase's documented fix is to wrap auth function calls in a subquery: `auth.uid()` → `(select auth.uid())`. This is a planner hint — the subquery is evaluated once and the result is reused per row, instead of the function being called per row.

## Decision

Apply a single migration ([supabase/migrations/20260601_rls_initplan_wrap_auth_calls.sql](../../supabase/migrations/20260601_rls_initplan_wrap_auth_calls.sql)) that drops and recreates each of the 32 flagged policies with auth calls wrapped in `(select ...)`. Policy predicates, roles, and `WITH CHECK` clauses are preserved exactly — this is purely a planner optimization, not a behavioral change.

The other advisor findings (`multiple_permissive_policies`, unused indexes, unindexed FKs) are **out of scope** for this ADR. They warrant separate analysis because:

- Consolidating permissive policies changes the access-control surface (merging predicates with OR) — requires per-table review.
- Dropping unused indexes is reversible but each index needs a "why does this exist" check.
- Adding FK indexes is cheap but should be measured against actual query patterns.

## Rationale

- **Behavior-preserving:** Wrapping `auth.uid()` in `(select auth.uid())` doesn't change *what* the policy evaluates, only *when* (once per query vs once per row). No risk of accidentally exposing or hiding rows.
- **Highest IO leverage of the listed advisor findings:** the affected tables are the hottest in the system. Cutting per-row function calls on `mystery_packages.SELECT` alone (used in MysteryView every page load) is meaningful.
- **Single migration, fully reversible** by reverting to the prior `pg_policies` snapshot if a regression appears.
- **Documented Supabase pattern**, not a hack — this is the recommended remediation in their lint docs.

## Alternatives Considered

1. **Do nothing.** The warning is informational and the project is healthy. Rejected because the IO budget will continue to deplete daily; eventually the site degrades.
2. **Upgrade the compute add-on.** Brute-force fix. Rejected because the underlying inefficiency is real (the policies were genuinely written suboptimally) and paying more for compute doesn't address it.
3. **Apply auth-wrap, plus consolidate permissive policies in the same migration.** Rejected because policy consolidation requires per-table judgment (which permissive policies should merge, and on what predicate). Lumping it into a mechanical perf fix would blur the scope. Tracked separately.
4. **Drop the unused indexes in the same migration.** Rejected for the same reason — index-by-index review needed.

## Consequences

- **Disk IO usage should decrease** on every query that touches these 13 tables under an authenticated session. The magnitude depends on row count scanned; biggest wins on full-table scans by admins.
- **Future RLS policies must follow the wrap pattern.** This convention should be in the project conventions (CLAUDE.md or similar) so new policies don't reintroduce the issue. Captured as a follow-up: add a lint check or doc note.
- **48 `multiple_permissive_policies` warnings remain.** These are next on the IO-reduction list if disk pressure continues.
- **Pre-existing `profiles` table inconsistency surfaced but not fixed.** `profiles.{SELECT, UPDATE}` policies reference `auth.uid() = id`; `profiles.{DELETE, INSERT}` reference `auth.uid() = user_id`. This migration preserves both. If `profiles.user_id` doesn't exist, the DELETE/INSERT policies are already broken and have been so since before this change. Tracked as a separate follow-up.

## Discussion

The main trade-off debated: do this as a deep DB cleanup (auth-wrap + permissive consolidation + index pruning + FK indexing in one ADR), or as a targeted single-purpose change. Chose targeted.

Two reasons: (1) auth-wrap is mechanical and low-risk; bundling it with judgment-calls would inflate review surface for a fix the user could ship in 60 seconds. (2) Each of the other categories has different reversibility and review needs — packaging them together makes "revert if regression" harder. Separate ADRs let each decision stand on its own merits.

Second trade-off: should the migration also fix the `profiles` column inconsistency (`user_id` vs `id`)? Decided no. Fixing it would change RLS access for the affected commands — that's a behavioral change, not a planner hint. If `profiles.user_id` doesn't exist as a column, the DELETE/INSERT policies have been silently broken and need investigation, not an opportunistic edit during a perf fix.

## Key Files

- [supabase/migrations/20260601_rls_initplan_wrap_auth_calls.sql](../../supabase/migrations/20260601_rls_initplan_wrap_auth_calls.sql) — the migration
- Supabase advisor lint: [auth_rls_initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- Supabase docs: [Call functions with (select ...)](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
