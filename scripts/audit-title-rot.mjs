#!/usr/bin/env node
/**
 * Audit ko + zh-cn `title` and `meta_description` columns against the
 * title-rot gate. The content-column audit (audit-rot-signals.mjs) cleared
 * 842 rows by May 2026; this is the equivalent sweep for the two
 * head-of-page columns that drive SERP click-through and AI-platform
 * surfacing — never previously audited.
 *
 * Usage:
 *   node scripts/audit-title-rot.mjs                  # all rows, any status
 *   node scripts/audit-title-rot.mjs --status=draft
 *   node scripts/audit-title-rot.mjs --status=published
 *
 * Outputs: summary table to stdout + CSV of every failing (slug, lang, column)
 * combination to temp-files/title-audit-<ISO>.csv.
 *
 * Read-only — no DB writes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTitle, checkMeta } from './check-title-rot.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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
const statusFilter = args.status;

async function fetchAll(language) {
  const out = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    let url = `${SUPABASE_URL}/rest/v1/blog_posts`
      + `?language=eq.${language}`
      + `&select=slug,language,status,title,meta_description`
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

console.error(`Fetching en + ko + zh-cn rows${statusFilter ? ` (status=${statusFilter})` : ''}...`);
const [enRows, koRows, zhRows] = await Promise.all([
  fetchAll('en'),
  fetchAll('ko'),
  fetchAll('zh-cn'),
]);
console.error(`  en: ${enRows.length} rows (for ratio anchor)`);
console.error(`  ko: ${koRows.length} rows`);
console.error(`  zh-cn: ${zhRows.length} rows`);

// EN slug → {title, meta} lookup so each (slug, target-lang) check can
// compare against the canonical source for the ratio heuristic.
const enBySlug = new Map();
for (const r of enRows) {
  enBySlug.set(r.slug, {
    title: r.title || '',
    meta:  r.meta_description || '',
  });
}

// Each row produces two check records (one per column). Failures are flattened
// into a single list so the CSV is one-row-per-failure-cell, easy to feed
// into generate-title-regen-prompts.mjs and easy to scan in a spreadsheet.
const failures = [];
const stats = {
  ko:    { total: 0, titleFail: 0, metaFail: 0, reasonCounts: new Map() },
  'zh-cn': { total: 0, titleFail: 0, metaFail: 0, reasonCounts: new Map() },
};

function countReason(lang, column, reason) {
  // Strip variable bits so categories aggregate cleanly.
  const cat = reason
    .replace(/^title length \d+ < \d+$/, 'title length below floor')
    .replace(/^title length \d+ > \d+$/, 'title length above ceiling')
    .replace(/^meta length \d+ < \d+$/, 'meta length below floor')
    .replace(/^meta length \d+ > \d+$/, 'meta length above ceiling')
    .replace(/^(brand-as-text in (title|meta)):.*$/, '$1')
    .replace(/^(untranslated English in (title|meta)):.*$/, '$1')
    .replace(/^(ko calque title \(sentence-final ending\)):.*$/, '$1')
    .replace(/^length ratio [0-9.]+ vs EN \(<[0-9.]+\)$/, 'length ratio below EN bound')
    .replace(/^length ratio [0-9.]+ vs EN \(>[0-9.]+\)$/, 'length ratio above EN bound');
  const key = `${column}: ${cat}`;
  stats[lang].reasonCounts.set(key, (stats[lang].reasonCounts.get(key) || 0) + 1);
}

function audit(lang, row) {
  stats[lang].total++;
  const enRow = enBySlug.get(row.slug);
  const t = checkTitle(lang, row.title || '', enRow?.title || '');
  const m = checkMeta(lang,  row.meta_description || '', enRow?.meta || '');
  if (!t.pass) {
    stats[lang].titleFail++;
    failures.push({
      lang, slug: row.slug, status: row.status,
      column: 'title', value: row.title || '',
      length: t.length, reasons: t.reasons.join('; '),
    });
    for (const r of t.reasons) countReason(lang, 'title', r);
  }
  if (!m.pass) {
    stats[lang].metaFail++;
    failures.push({
      lang, slug: row.slug, status: row.status,
      column: 'meta', value: row.meta_description || '',
      length: m.length, reasons: m.reasons.join('; '),
    });
    for (const r of m.reasons) countReason(lang, 'meta', r);
  }
}

for (const row of koRows) audit('ko', row);
for (const row of zhRows) audit('zh-cn', row);

console.log('');
console.log('## Title + meta audit summary');
console.log('');
console.log('| lang  | rows  | title fail | meta fail | title fail % | meta fail % |');
console.log('|-------|-------|------------|-----------|--------------|-------------|');
for (const lang of ['ko', 'zh-cn']) {
  const s = stats[lang];
  const tPct = s.total ? (s.titleFail / s.total * 100).toFixed(1) : '0.0';
  const mPct = s.total ? (s.metaFail  / s.total * 100).toFixed(1) : '0.0';
  console.log(`| ${lang.padEnd(5)} | ${String(s.total).padStart(5)} | ${String(s.titleFail).padStart(10)} | ${String(s.metaFail).padStart(9)} | ${tPct.padStart(11)}% | ${mPct.padStart(10)}% |`);
}

for (const lang of ['ko', 'zh-cn']) {
  console.log('');
  console.log(`### ${lang} top failure reasons`);
  const sorted = [...stats[lang].reasonCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    console.log('(none — all pass)');
  } else {
    for (const [cat, count] of sorted) {
      console.log(`  ${String(count).padStart(4)}  ${cat}`);
    }
  }
}

const tempDir = resolve(ROOT, 'temp-files');
if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const csvPath = resolve(tempDir, `title-audit-${stamp}.csv`);
const escape = (s) => `"${String(s).replace(/"/g, '""')}"`;
const csv = [
  'lang,slug,status,column,length,value,reasons',
  ...failures.map(f => [f.lang, f.slug, f.status, f.column, f.length, f.value, f.reasons]
    .map(escape).join(',')),
].join('\n');
writeFileSync(csvPath, csv);
console.log('');
console.log(`Wrote ${failures.length} failure rows to ${csvPath.replace(ROOT + '/', '')}`);
