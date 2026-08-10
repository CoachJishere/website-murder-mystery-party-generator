# ADR-0072: `is_test` flag and health-check detector hardening

- **Status:** Accepted
- **Date:** 2026-08-10
- **Related:** ADR-0043 (completed-but-empty detector, whose join bug this ADR fixes), ADR-0041/ADR-0042/ADR-0048/ADR-0064/ADR-0067/ADR-0070 (the other health-check detectors touched here), ADR-0067 (the feature whose test data caused this incident)

## Context

The scheduled health check (`.github/workflows/health-check.yml`) opened a GitHub
issue reporting "3 generation(s) stuck in_progress for over 2 hours," all the same
conversation ID (`74b66430-56d6-4376-b3f1-105b8601af65`), then a follow-up run
reported the same conversation again plus "2 package(s) marked completed but
missing content." Investigation traced both alerts to a single piece of leftover
test data:

- The conversation, titled "TEST ADR-0067 Reveal-Confession Split," was created
  2026-08-07 while manually validating the ADR-0067 reveal/confession-split
  feature against production. It was marked `is_paid = true` to exercise the paid
  code path.
- It had **three** `mystery_packages` rows for one conversation — generation was
  apparently re-triggered a couple of times without cleaning up earlier attempts.
  Two rows (created 21:56 and 21:58) were abandoned `in_progress` with 0
  characters; the third (created 21:53) completed successfully with 5 characters.
  Nothing in the schema distinguishes test data from a real customer, so the two
  orphaned rows sat untouched for three days until the 2-hour "stuck" threshold
  fired.
- Separately, `list_completed_but_empty_packages` (ADR-0043) has a genuine join
  bug: its WHERE clause treats a package as "done" if `(mp.generation_status->>
  'status') = 'completed' OR c.has_complete_package = true`. The second clause is
  a **conversation-level** flag, but the query runs per **package row**. When a
  conversation has only one package (the normal case), this is harmless. Here,
  with three sibling rows, the conversation's `has_complete_package = true` (set
  from the one package that succeeded) got compared against the *other two*
  package rows too — so both abandoned `in_progress` stubs were misreported as
  `completed_but_no_characters`, even though their own status was never
  `completed`.

Neither alert was a real customer issue, but nothing would have stopped this from
happening again — there was no way to mark a conversation as test data, and the
join bug is latent for any future conversation that ends up with more than one
package row.

## Decision

1. **Add `conversations.is_test boolean NOT NULL DEFAULT false`.** Excluded via
   `AND NOT c.is_test` in every one of the eight health-check detector SQL
   functions (`list_packages_missing_evidence_images`,
   `list_packages_with_identity_conflicts`, the four ADR-0042 content-quality
   functions, `list_completed_but_empty_packages`,
   `list_packages_with_structural_defects`,
   `list_packages_with_unconfessed_culprit`,
   `list_packages_with_final_statement_confession_leak`) and in
   `scripts/detect-roster-mismatches.mjs` (check 12). Backfilled `is_test = true`
   on the offending conversation.
2. **Promote health-check checks 2 (stuck in_progress) and 3 (needs_review) from
   raw PostgREST filter strings in the workflow YAML to proper SQL functions**
   (`list_stuck_in_progress_packages`, `list_needs_review_packages`), so they can
   join `conversations` and apply the same `is_test` exclusion — a shell
   one-liner filtering `mystery_packages` alone can't express that join.
3. **Fix the `list_completed_but_empty_packages` join bug**: the
   `c.has_complete_package = true` branch is now scoped to only the **latest**
   `mystery_packages` row per conversation (`DISTINCT ON (conversation_id) ...
   ORDER BY created_at DESC`), since that conversation-level flag can only ever
   legitimately describe the package currently representing the conversation,
   not an earlier abandoned attempt.
4. **Document the convention** in `docs/OPERATIONS.md` ("Testing against
   production — always set `is_test = true`"): anyone (human or AI session)
   triggering real generation against the live DB to test a feature should set
   the flag on the conversation before starting.
5. **Delete the two orphaned test package rows** (`dbcd44e4-...`,
   `b36a883a-...`) as immediate cleanup, independent of the schema/detector fix.

## Rationale

- **A flag plus a documented habit, not a fully automated system.** The
  alternative — auto-expiring rows, a separate test-data table, a cron job that
  deletes stale `is_test` rows — is more machinery than one incident justifies.
  The flag makes test data *filterable* even if someone forgets to clean up
  (which is exactly what happened here); the OPERATIONS.md note makes the habit
  discoverable for the next person or AI session.
- **Fix the join bug regardless of the flag.** The `is_test` flag prevents this
  *specific* conversation from re-triggering, but the underlying query bug would
  misfire again for any future conversation that legitimately ends up with
  multiple `mystery_packages` rows (e.g. a customer retry after a failed
  generation, if that ever creates a new row instead of updating the existing
  one). Scoping the conversation-level flag to the latest package is the correct
  fix independent of why this instance surfaced it.
- **Touch every detector, not just the two that fired.** All eight functions
  share the same `mystery_packages JOIN conversations` shape; a test conversation
  that trips one is equally capable of tripping any of the others (e.g. a test
  package with placeholder "chain-of-thought"-shaped text would trip the
  meta-text-leak detector). Patching only the two that happened to fire this time
  would leave the other six as latent false-positive risk.

## Alternatives Considered

- **Just delete the rows and move on.** Rejected: fixes the symptom, not the
  recurrence risk — the same class of leftover test data will eventually trip
  another detector, and the join bug remains live for any future multi-package
  conversation.
- **Filter by title prefix (`title NOT LIKE 'TEST %'`) instead of a schema
  column.** Rejected: fragile (a real customer could title their party "Test
  Kitchen Murder" or similar) and invisible to `scripts/detect-roster-
  mismatches.mjs`'s JS query without re-deriving the same string match in two
  places. A boolean column is unambiguous and queryable from both SQL and JS.
- **Auto-delete `is_test` rows after N days via pg_cron.** Rejected for now:
  adds a scheduled job and a retention policy decision for a problem the flag
  already solves (test data becomes invisible to alerting immediately, whether
  or not it's ever cleaned up). Can be added later if `is_test` rows accumulate
  enough to matter for storage/cost, which is not currently a concern.

## Consequences

- **Positive:** the specific conversation that caused this incident can no
  longer trigger any health-check alert, and neither can any future test
  conversation that's flagged the same way.
- **Positive:** the `completed_but_empty` detector's cross-package
  contamination bug is fixed for all conversations, not just test ones — a real
  customer conversation that somehow ends up with multiple package rows will now
  be evaluated correctly.
- **Neutral:** checks 2 and 3 now cost one extra RPC round-trip each instead of
  a single REST filter call; negligible at current health-check volume (runs
  every 6 hours).
- **Negative / open:** `is_test` is opt-in — it only helps if whoever creates
  test data remembers to set it. The OPERATIONS.md note is the only enforcement
  mechanism; nothing blocks generation from firing against production without
  it. Acceptable given how rarely ad-hoc production testing happens, but worth
  revisiting if it recurs.

## Key files

- `supabase/migrations/20260810_add_is_test_flag_and_harden_health_check_detectors.sql`
- `.github/workflows/health-check.yml` (checks 2 and 3 now call RPCs)
- `scripts/detect-roster-mismatches.mjs` (excludes `is_test` conversations)
- `docs/OPERATIONS.md` ("Testing against production" section)

## Discussion

The two alerts looked at first like they might be two independent problems (a
stuck-generation issue and a content-quality issue), which is why both were
investigated before concluding they shared one root cause. That's worth naming
as a pattern: when two different health-check categories flag the *same*
conversation ID in the same window, check whether they're actually one
underlying anomaly before treating them as separate incidents — a conversation
that's unusual enough to trip one detector (here: has three package rows instead
of one) is likely to be unusual enough to trip others that share its query shape.

The join-bug fix (scoping `has_complete_package` to the latest package) was found
only because this test conversation happened to have multiple package rows —
something no real customer conversation is currently known to have. It's included
here rather than deferred because the fix is small, low-risk (a `DISTINCT ON`
added to one CTE, no behavior change for the 1-package-per-conversation case that
covers every real conversation today), and leaving a known-wrong query live once
its wrongness is understood isn't a defensible tradeoff just because it hasn't
bitten a real customer yet.
