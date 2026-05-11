#!/usr/bin/env node
/**
 * Audit all ko + zh-cn blog rows against the rot-signal gate.
 *
 * Why: we needed a quantitative read on whether the gate that runs in
 * the daily-publish workflow is finding real rot or rubber-stamping
 * everything. Single-slug spot-checks (one slug passed at runtime) are
 * not enough signal — we need a queue-wide failure rate and the top
 * reasons by frequency, so we can either trust the gate or extend its
 * heuristics.
 *
 * Usage:
 *   node scripts/audit-rot-signals.mjs                  # all rows, any status
 *   node scripts/audit-rot-signals.mjs --status=draft   # drafts only
 *   node scripts/audit-rot-signals.mjs --status=published
 *
 * Outputs to stdout: summary table + top failure reasons.
 * Writes a CSV of failures to: temp-files/rot-audit-<ISO>.csv
 *
 * Read-only — no DB writes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLanguage } from './check-rot-signals.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .env without requiring dotenv as a hard dep on the import path.
try {
  const envText = readFileSync(resolve(ROOT, '.env'), 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* no .env, fall back to ambient env */ }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('missing SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2)
    .map(a => a.match(/^--([^=]+)=(.*)$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]])
);

const statusFilter = args.status; // optional

// PostgREST default page is 1000 rows; we page explicitly to be safe.
async function fetchAll(language) {
  const out = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/blog_posts`
      + `?language=eq.${language}`
      + `&select=slug,language,status,content`
      + `&order=slug.asc`
      + `&limit=${PAGE}`
      + `&offset=${offset}`;
    if (statusFilter) url += `&status=eq.${statusFilter}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!res.ok) {
      console.error(`fetch failed for ${language} offset=${offset}: HTTP ${res.status}`);
      process.exit(1);
    }
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

console.error(`Fetching ko + zh-cn rows${statusFilter ? ` (status=${statusFilter})` : ''}...`);
const [koRows, zhRows] = await Promise.all([fetchAll('ko'), fetchAll('zh-cn')]);
console.error(`  ko: ${koRows.length} rows`);
console.error(`  zh-cn: ${zhRows.length} rows`);

const results = { ko: [], 'zh-cn': [] };
for (const row of koRows) {
  const r = checkLanguage('ko', row.content || '');
  results.ko.push({ slug: row.slug, status: row.status, ...r });
}
for (const row of zhRows) {
  const r = checkLanguage('zh-cn', row.content || '');
  results['zh-cn'].push({ slug: row.slug, status: row.status, ...r });
}

function summarize(lang) {
  const rows = results[lang];
  const pass = rows.filter(r => r.pass).length;
  const fail = rows.length - pass;
  const failRate = rows.length ? (fail / rows.length * 100).toFixed(1) : '0.0';

  // Failure reasons by category (strip the variable bits so categories merge).
  const reasonCategory = (r) => r
    .replace(/^length \d+ < floor \d+$/, 'length below floor')
    .replace(/^(brand-as-H2):.*/, '$1')
    .replace(/^(url-as-H2):.*/, '$1')
    .replace(/^(untranslated English in H2):.*/, '$1')
    .replace(/^(ko calque H2 \(sentence-final ending\)):.*/, '$1')
    .replace(/^(ko calque H2 \(explicit pronoun\)):.*/, '$1');

  const reasonCounts = new Map();
  for (const row of rows) {
    if (row.pass) continue;
    for (const r of row.reasons) {
      const cat = reasonCategory(r);
      reasonCounts.set(cat, (reasonCounts.get(cat) || 0) + 1);
    }
  }
  const topReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Length distribution for pass-only rows (so we know healthy baseline).
  const passLens = rows.filter(r => r.pass).map(r => r.length).sort((a, b) => a - b);
  const median = passLens.length ? passLens[Math.floor(passLens.length / 2)] : 0;

  return { lang, total: rows.length, pass, fail, failRate, topReasons, medianLen: median };
}

const koSum = summarize('ko');
const zhSum = summarize('zh-cn');

console.log('');
console.log('## Audit summary');
console.log('');
console.log('| lang  | total | pass | fail | fail % | median pass length |');
console.log('|-------|-------|------|------|--------|--------------------|');
for (const s of [koSum, zhSum]) {
  console.log(`| ${s.lang.padEnd(5)} | ${String(s.total).padStart(5)} | ${String(s.pass).padStart(4)} | ${String(s.fail).padStart(4)} | ${s.failRate.padStart(5)}% | ${String(s.medianLen).padStart(18)} |`);
}

for (const s of [koSum, zhSum]) {
  console.log('');
  console.log(`### ${s.lang} top failure reasons`);
  if (!s.topReasons.length) {
    console.log('(none — all pass)');
  } else {
    for (const [cat, count] of s.topReasons) {
      console.log(`  ${String(count).padStart(4)}  ${cat}`);
    }
  }
}

// Write per-failure CSV for follow-up spot-checking.
const tempDir = resolve(ROOT, 'temp-files');
if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const csvPath = resolve(tempDir, `rot-audit-${stamp}.csv`);
const failures = [
  ...results.ko.filter(r => !r.pass).map(r => ({ ...r, lang: 'ko' })),
  ...results['zh-cn'].filter(r => !r.pass).map(r => ({ ...r, lang: 'zh-cn' })),
];
const escape = (s) => `"${String(s).replace(/"/g, '""')}"`;
const csv = [
  'lang,slug,status,length,reasons',
  ...failures.map(f => [f.lang, f.slug, f.status, f.length, f.reasons.join('; ')]
    .map(escape).join(',')),
].join('\n');
writeFileSync(csvPath, csv);
console.log('');
console.log(`Wrote ${failures.length} failure rows to ${csvPath.replace(ROOT + '/', '')}`);
