#!/usr/bin/env node
/**
 * Status-predicate-agreement detector (ADR-0131 item 3).
 *
 * ADR-0055 widened every list_packages_with_* detector's status filter from
 * `= 'completed'` to `IN ('completed', 'needs_review')` specifically so the
 * auto-remediation worker and health-check could still see (and fix) a
 * package the completion gate had just held in needs_review — without this,
 * a held package is invisible to the very systems meant to repair it, the
 * exact deadlock ADR-0055 fixed. ADR-0072's migration silently reverted this
 * a month later (a hand-written rewrite from a stale pre-widening snapshot),
 * caught only by a routine sweep. Nothing before this asserted the two
 * states stay in agreement; this is that assertion.
 *
 * Ground truth comes from list_defect_detector_status_coverage() (live DB
 * introspection via pg_get_functiondef), not from a local grep of migration
 * files — this project has documented, repeatedly, that migration files and
 * live state diverge here (see CLAUDE.md, "Database Migrations" section).
 *
 * Verified ALLOWLIST reasons against each function's own real source before
 * listing it here (not inferred from name alone):
 *   - list_completed_but_empty_packages: the defect it detects (marked
 *     completed with 0 characters/empty overview) is, by its own
 *     definition, a property only a 'completed' row can have — a
 *     needs_review-held package was never marked completed in the first
 *     place, so there is nothing for needs_review-inclusion to add here.
 *   - list_packages_missing_evidence_images: its own COMMENT ON FUNCTION
 *     says so explicitly — "Decoupled from needs_review (no status
 *     mutation, no 24h window)". missing_images was deliberately excluded
 *     from package_completion_blocking_defects() (ADR-0053: async/
 *     architectural, handled by the ADR-0047 worker's post-completion
 *     recall instead) — a package with this defect never gets HELD in
 *     needs_review for this reason, so there's nothing to miss.
 *   - list_packages_with_unconfessed_culprit: "unconfessed_culprit" is not
 *     one of package_completion_blocking_defects()'s classes either (heavy
 *     NLP judgment, explicitly excluded from the gate, ADR-0070) — same
 *     reasoning as missing_images. Less explicitly documented in the
 *     function's own comment than missing_images is; flagged here as
 *     plausible-but-worth-confirming rather than certain.
 *   - list_packages_with_role_tag_leak: NOT completed-only — mentions
 *     neither status literal at all. Confirmed via its real source: no
 *     status filter whatsoever, scoped only by created_at (_since). This is
 *     broader than every other detector, not narrower, so it structurally
 *     cannot reproduce the ADR-0055/0072 deadlock shape (that shape is
 *     "held packages become invisible" — a detector with no status filter
 *     at all can never become blind to a held package). Newest detector in
 *     the corpus (ADR-0103 Addendum 59); worth a deliberate decision on
 *     whether it should have a status filter, but that's a scope/cost
 *     question (it's manual-sweep-only today, not scheduled), not the
 *     drift this check exists to catch.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/detect-status-predicate-drift.mjs [--json]
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const ALLOWLIST = new Map([
  ['list_completed_but_empty_packages', 'the "completed but empty" defect only exists in completed status by definition'],
  ['list_packages_missing_evidence_images', 'own comment: "Decoupled from needs_review" -- missing_images is deliberately excluded from the blocking gate (ADR-0053)'],
  ['list_packages_with_unconfessed_culprit', 'unconfessed_culprit is not a package_completion_blocking_defects() class either (ADR-0070) -- plausible, not explicitly documented'],
  ['list_packages_with_role_tag_leak', 'has NO status filter at all (broader, not narrower) -- structurally cannot reproduce the held-package-invisible shape'],
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const { data, error } = await supabase.rpc('list_defect_detector_status_coverage');
if (error) {
  console.error(`list_defect_detector_status_coverage failed: ${error.message}`);
  process.exit(1);
}

const flagged = (data ?? []).filter(
  (row) => row.mentions_completed && !row.mentions_needs_review && !ALLOWLIST.has(row.function_name)
);
const staleAllowlistEntries = [...ALLOWLIST.keys()].filter((name) => {
  const row = (data ?? []).find((r) => r.function_name === name);
  // An allowlisted function that NOW includes needs_review has been fixed --
  // the allowlist entry (and its reasoning above) should be removed.
  return row && row.mentions_needs_review;
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ flagged, staleAllowlistEntries }));
} else {
  if (flagged.length === 0 && staleAllowlistEntries.length === 0) {
    console.log('All detector status predicates agree (or are on the reviewed allowlist).');
  }
  for (const f of flagged) {
    console.log(`POSSIBLE ADR-0055/0072-SHAPE REGRESSION: ${f.function_name} mentions 'completed' but not 'needs_review', and is not on the allowlist.`);
  }
  for (const name of staleAllowlistEntries) {
    console.log(`STALE ALLOWLIST ENTRY: ${name} now includes needs_review -- remove it from ALLOWLIST in this script.`);
  }
}

process.exit(flagged.length > 0 || staleAllowlistEntries.length > 0 ? 1 : 0);
