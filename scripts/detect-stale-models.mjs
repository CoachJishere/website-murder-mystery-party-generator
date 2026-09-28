#!/usr/bin/env node
/**
 * Stale-hardcoded-model detector (ADR-0131 item 5).
 *
 * Promotes CLAUDE.md's manual "Model Upgrades — Check for Stale Hardcoded
 * Models" checklist to something health-check.yml actually runs, rather than
 * relying on a human remembering to grep by hand. ADR-0098 Addenda 7/8 found
 * two edge functions (regenerate-child-content, regenerate-parent-content)
 * still on Haiku, with stale temperature/thinking/max_tokens settings, weeks
 * after the ADR-0074 blanket Sonnet 5 upgrade — a third instance
 * (generate-pointform-summaries) surfaced independently via ADR-0103
 * Addendum 40. Three confirmed incidents of the same forgotten-update shape
 * is the evidence base for automating this (per Addendum 38's own impact/
 * cost framework: cheap, deterministic to detect; severe when missed).
 *
 * Pure static analysis of committed source — no network, no DB, no paid API
 * call. Greps every supabase/functions/*\/index.ts for a Claude model-string
 * literal and compares each hit against ALLOWLIST below. A hit not on the
 * allowlist is flagged as possibly-forgotten. An allowlist entry that no
 * longer appears in the source is flagged too, so the allowlist itself
 * doesn't quietly go stale.
 *
 * Deliberately NOT auto-fixable and NOT trying to be clever about "is this
 * intentional" — CLAUDE.md's own checklist already says "deliberately-
 * different models... are fine, anything that's just been forgotten isn't",
 * and that's a judgment call for whoever reads the alert, the same as every
 * other escalate-only check in this codebase. The allowlist is how that
 * judgment gets recorded once, in writing, rather than re-made from memory
 * every time this runs.
 *
 * Usage:
 *   node scripts/detect-stale-models.mjs [--json]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_DIR = path.join(__dirname, '..', 'supabase', 'functions');

/**
 * Known-intentional non-default model usages, with why. Update this list
 * (not the check's logic) when a new deliberately-different model is added —
 * that edit IS the documentation of the decision.
 */
const ALLOWLIST = [
  {
    file: 'mystery-webhook-trigger',
    model: 'claude-haiku-4-5-20251001',
    reason: 'detectConversationLanguage(): a strict single-word language classifier, max_tokens=10, temperature=0 — narrow, deterministic, cheap by design, not a generation call.',
  },
  {
    file: 'mystery-webhook-trigger',
    model: 'claude-haiku-4-5-20251001',
    reason: 'Claude-fallback roster JSON extraction (legacy-scan path, ADR-0064): a strict JSON-array extraction tool, temperature=0 — narrow deterministic extraction, not a generation call.',
  },
];

const MODEL_RX = /claude-(?:haiku|sonnet|opus)-[a-z0-9.-]+|claude-sonnet-5|claude-opus-5|claude-3(?:\.\d)?-[a-z]+/g;

function findModelHits() {
  const hits = [];
  for (const entry of readdirSync(FUNCTIONS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_shared') continue;
    const indexPath = path.join(FUNCTIONS_DIR, entry.name, 'index.ts');
    let src;
    try {
      src = readFileSync(indexPath, 'utf8');
    } catch {
      continue; // no index.ts in this function dir
    }
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      // Skip comment-only lines (e.g. "// Was claude-haiku-... until ...") —
      // those are history notes, not live model selections.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      for (const m of line.matchAll(MODEL_RX)) {
        hits.push({ file: entry.name, model: m[0], line: i + 1, text: trimmed });
      }
    });
  }
  return hits;
}

function detectStaleModels() {
  const hits = findModelHits();

  // Sonnet 5 / Opus 5 (or later) are the current default per ADR-0074 and
  // are never flagged. Anything Haiku, or an explicit claude-3.x string, is
  // a candidate — either a deliberate narrow-task choice (must be on the
  // allowlist) or a forgotten update.
  const isCurrentGen = (model) => /^claude-(sonnet|opus)-5/.test(model);
  const isAllowlisted = (h) => ALLOWLIST.some((a) => a.file === h.file && a.model === h.model);

  const flagged = hits.filter((h) => !isCurrentGen(h.model) && !isAllowlisted(h));

  // Count-based, not existence-based: two allowlist entries can share the
  // same (file, model) pair (two different call sites using the same older
  // model) — an existence check alone would stay silent as long as AT LEAST
  // ONE of them still matches, missing the case where one call site was
  // removed/upgraded and the other wasn't. Group both sides by key and
  // compare counts so a 2-in-allowlist/1-in-source mismatch is caught.
  const keyOf = (x) => `${x.file}\u0000${x.model}`;
  const countBy = (arr) => arr.reduce((m, x) => m.set(keyOf(x), (m.get(keyOf(x)) ?? 0) + 1), new Map());
  const allowlistCounts = countBy(ALLOWLIST);
  const hitCounts = countBy(hits);
  const staleAllowlistEntries = [...allowlistCounts.entries()]
    .filter(([key, count]) => (hitCounts.get(key) ?? 0) < count)
    .map(([key]) => {
      const [file, model] = key.split('\u0000');
      const expected = allowlistCounts.get(key);
      const actual = hitCounts.get(key) ?? 0;
      return { file, model, expected, actual };
    });

  return { flagged, staleAllowlistEntries };
}

const { flagged, staleAllowlistEntries } = detectStaleModels();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ flagged, staleAllowlistEntries }));
} else {
  if (flagged.length === 0 && staleAllowlistEntries.length === 0) {
    console.log('No unallowlisted non-Sonnet-5 model strings found.');
  }
  for (const h of flagged) {
    console.log(`POSSIBLY STALE: ${h.file}/index.ts:${h.line} — ${h.model}\n    ${h.text}`);
  }
  for (const a of staleAllowlistEntries) {
    console.log(`STALE ALLOWLIST ENTRY: ${a.file} / ${a.model} — expected ${a.expected} matching call site(s) in source, found ${a.actual}. Update ALLOWLIST in this script.`);
  }
}

process.exit(flagged.length > 0 || staleAllowlistEntries.length > 0 ? 1 : 0);
