#!/bin/bash
set -e

###############################################################################
# Deploy the edge functions that consume _shared/rosterExtraction.ts
#
# ADR-0131 item 1 (second half). Runs the roster-extraction regression suite
# (scripts/__tests__/conceptSnapshot.test.mjs + siblings) and refuses to
# deploy anything if it fails.
#
# Why this exists: `supabase functions deploy` is a manual CLI call fully
# disconnected from this repo's git history and CI (a push to main does not
# deploy an edge function, and a passing/failing GitHub Actions check does
# not block one either). The ADR-0130 Addendum 1 regression shipped this way
# — validated against synthetic test cases only, deployed straight from the
# CLI, and live for ~28 hours before two customers reported it. This script
# is the only mechanism in this codebase that can actually block a bad
# deploy of this specific file, and only if it's what you run instead of a
# bare `supabase functions deploy`.
#
# Usage: ./scripts/deploy-roster-functions.sh
###############################################################################

echo "=== Running roster-extraction regression suite ==="
npm run test:roster

echo ""
echo "=== Tests passed — deploying consumers of _shared/rosterExtraction.ts ==="
supabase functions deploy extract-concept-roster
supabase functions deploy mystery-webhook-trigger
supabase functions deploy mystery-ai

echo ""
echo "=== Deploy complete ==="
