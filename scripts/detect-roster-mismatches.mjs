#!/usr/bin/env node
/**
 * Roster-count-mismatch detector (ADR-0064, follow-up to ADR-0063).
 *
 * Re-parses each paid, completed package's approved concept snapshot with the
 * SHIPPED extractRosterFromMessage — same technique as
 * scripts/__tests__/conceptSnapshot.test.mjs: transpile the real source with
 * esbuild and run it, never a hand-copy (ADR-0057 discipline) — and compares
 * the roster size to the actual mystery_characters row count for that
 * package. A mismatch means either the extractor drifted from what actually
 * got generated, or the pipeline dropped/added characters after extraction.
 * This is the safety net for the exact bug ADR-0063 fixed: catches it (or any
 * future variant) even if a future prompt/parser change reintroduces it.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/detect-roster-mismatches.mjs [--since=ISO_DATE] [--json]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const asJson = process.argv.includes('--json');
const sinceArg = process.argv.find((a) => a.startsWith('--since='));
const since = sinceArg ? sinceArg.split('=')[1] : new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

// Load the SHIPPED extractor, not a copy.
const SRC_PATH = new URL('../supabase/functions/mystery-webhook-trigger/index.ts', import.meta.url);
const src = readFileSync(SRC_PATH, 'utf8');
const start = src.indexOf('const CHARACTER_LIST_HEADERS');
const end = src.indexOf('// Primary extraction: regex-based');
if (start < 0 || end < start) {
  console.error('Could not locate extractRosterFromMessage prelude in mystery-webhook-trigger/index.ts — source shape changed, update this script.');
  process.exit(1);
}
const js = transformSync(
  src.slice(start, end) + '\nexport { extractRosterFromMessage };',
  { loader: 'ts', format: 'esm' },
).code;
const { extractRosterFromMessage } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

async function main() {
  const { data: packages, error } = await supabase
    .from('mystery_packages')
    .select('id, conversation_id, created_at')
    .eq('generation_status->>status', 'completed')
    .gte('created_at', since);

  if (error) throw error;

  // Packages where a human has already investigated this exact finding and
  // decided to leave it — see supabase/migrations/20260811_acknowledged_health_alerts.sql.
  // Distinct from is_test: these are real, understood gaps, not disposable rows.
  const { data: acknowledged } = await supabase
    .from('acknowledged_health_alerts')
    .select('package_id')
    .eq('detector', 'roster_mismatch');
  const acknowledgedIds = new Set((acknowledged ?? []).map((a) => a.package_id));

  const mismatches = [];
  for (const pkg of packages ?? []) {
    if (acknowledgedIds.has(pkg.id)) continue;

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, title, is_paid, is_test, approved_concept_message_id')
      .eq('id', pkg.conversation_id)
      .maybeSingle();
    if (!conv?.is_paid || conv?.is_test || !conv?.approved_concept_message_id) continue;

    const { data: msg } = await supabase
      .from('messages')
      .select('content')
      .eq('id', conv.approved_concept_message_id)
      .maybeSingle();
    if (!msg?.content) continue;

    const roster = extractRosterFromMessage(msg.content);
    // Mirror the bounds mystery-webhook-trigger applies before trusting a regex
    // parse as THE roster (MIN_ROSTER_SIZE=4, cap=35 — see extractCharactersFromMessages).
    // Outside that range production falls through to a legacy scan / Claude
    // fallback this script doesn't replicate, so the raw regex count isn't what
    // was actually used to generate — comparing it would be a false positive,
    // not a real mismatch. (Confirmed against "Death At The Velvet Viper": a
    // known prior incident whose approved snapshot is a stale 60-player draft —
    // raw regex parses 42, which was never the count production generated from.)
    if (roster.length < 4 || roster.length > 35) continue;

    const { count: actualCount, error: countErr } = await supabase
      .from('mystery_characters')
      .select('id', { count: 'exact', head: true })
      .eq('package_id', pkg.id);
    if (countErr) continue;

    // Incident 2026-08-21 (ADR-0098): a raw roster.length vs actualCount diff
    // can't tell "a character is missing because of a bug" apart from "a
    // customer paid to have it removed" via Remove a Character (ADR-0036/
    // 0082/0088) -- confirmed live: this exact gap flagged a customer's
    // correctly-reduced package as a mismatch, and a human response to that
    // alert re-fired the 9 characters she'd paid $5 to remove, the day
    // before her party. A 'verified' mystery_adaptations row means the
    // removal completed and passed its own verify gate, so it's subtracted
    // from the expected count here exactly like a legitimate generation.
    const { count: verifiedRemovals } = await supabase
      .from('mystery_adaptations')
      .select('id', { count: 'exact', head: true })
      .eq('package_id', pkg.id)
      .eq('status', 'verified');
    const expectedCount = roster.length - (verifiedRemovals ?? 0);

    if (actualCount !== expectedCount) {
      mismatches.push({
        package_id: pkg.id,
        conversation_id: conv.id,
        title: conv.title,
        approved_roster_count: roster.length,
        verified_removals: verifiedRemovals ?? 0,
        expected_character_count: expectedCount,
        actual_character_count: actualCount ?? 0,
      });
    }
  }

  if (asJson) {
    console.log(JSON.stringify(mismatches));
  } else if (mismatches.length === 0) {
    console.log('No roster mismatches found.');
  } else {
    console.log(`${mismatches.length} package(s) with roster mismatches:`);
    for (const m of mismatches) {
      const removalNote = m.verified_removals > 0 ? ` (${m.verified_removals} deliberately removed via paid purchase, already accounted for)` : "";
      console.log(`  - ${m.title} [${m.package_id}]: approved snapshot=${m.approved_roster_count} characters, expected=${m.expected_character_count}${removalNote}, actual=${m.actual_character_count}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
