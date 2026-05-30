#!/usr/bin/env node
/**
 * Fetch the live sitemap and check the HTTP status of every URL.
 *
 * Why: GSC reports 2,627 "Not found (404)" and 1,090 "Page with redirect"
 * pages — suspected sitemap pollution suppressing indexation. This audit
 * answers: of the URLs currently in sitemap.xml, how many actually return
 * 200? Anything non-200 in the sitemap is wasted crawl budget and a trust
 * signal hit.
 *
 * Read-only. HEAD requests only. Writes CSV + summary to temp-files/.
 *
 * Usage:
 *   node scripts/audit-sitemap-urls.mjs
 *   node scripts/audit-sitemap-urls.mjs --concurrency=10
 *   node scripts/audit-sitemap-urls.mjs --sitemap=https://...
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = Object.fromEntries(
  process.argv.slice(2)
    .map(a => a.match(/^--([^=]+)=(.*)$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]])
);

const SITEMAP_URL = args.sitemap || 'https://www.mysterymaker.party/sitemap.xml';
const CONCURRENCY = Number(args.concurrency) || 20;
const TIMEOUT_MS = 15000;
const USER_AGENT = 'mysterymaker-sitemap-audit/1.0 (+admin@mysterymaker.party)';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function fetchSitemap(url) {
  log(`fetching sitemap: ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1].trim());
  log(`sitemap has ${locs.length} <loc> entries`);
  return locs;
}

async function checkOne(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    // HEAD first; if server rejects HEAD (some hosts do), fall back to GET range
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: ac.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: ac.signal,
        headers: { 'User-Agent': USER_AGENT, Range: 'bytes=0-0' },
      });
    }
    const status = res.status;
    const location = res.headers.get('location') || '';
    return { url, status, location, error: '' };
  } catch (err) {
    return { url, status: 0, location: '', error: String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  const total = items.length;
  async function runner() {
    while (true) {
      const i = next++;
      if (i >= total) return;
      results[i] = await worker(items[i], i);
      done++;
      if (done % 100 === 0 || done === total) {
        log(`progress: ${done}/${total}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner));
  return results;
}

function langOf(url) {
  const m = url.match(/^https?:\/\/[^/]+\/([a-z]{2}(?:-[a-z]{2})?)\/blog\//i);
  if (m) return m[1].toLowerCase();
  if (/\/blog\//.test(url)) return 'en';
  return '_root';
}

function statusBucket(status) {
  if (status === 200) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status === 404) return '404';
  if (status >= 400 && status < 500) return '4xx-other';
  if (status >= 500) return '5xx';
  if (status === 0) return 'network-error';
  return 'other';
}

(async () => {
  const start = Date.now();
  const urls = await fetchSitemap(SITEMAP_URL);

  log(`checking ${urls.length} URLs with concurrency=${CONCURRENCY}`);
  const results = await runPool(urls, checkOne, CONCURRENCY);

  // CSV
  const tempDir = resolve(ROOT, 'temp-files');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
  const iso = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = resolve(tempDir, `sitemap-audit-${iso}.csv`);

  const escape = (s) => {
    const v = String(s ?? '');
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };

  const rows = ['url,lang,status,bucket,redirect_target,error'];
  for (const r of results) {
    rows.push([
      escape(r.url),
      langOf(r.url),
      r.status,
      statusBucket(r.status),
      escape(r.location),
      escape(r.error),
    ].join(','));
  }
  writeFileSync(csvPath, rows.join('\n'));
  log(`wrote CSV: ${csvPath}`);

  // Aggregate
  const byBucket = {};
  const byLang = {};
  const badByLang = {};
  for (const r of results) {
    const b = statusBucket(r.status);
    byBucket[b] = (byBucket[b] || 0) + 1;
    const l = langOf(r.url);
    byLang[l] = byLang[l] || {};
    byLang[l][b] = (byLang[l][b] || 0) + 1;
    if (b !== '2xx') {
      badByLang[l] = (badByLang[l] || 0) + 1;
    }
  }

  console.log('\n=== STATUS BUCKETS ===');
  for (const [b, n] of Object.entries(byBucket).sort((a, b) => b[1] - a[1])) {
    const pct = ((n / results.length) * 100).toFixed(1);
    console.log(`  ${b.padEnd(15)} ${String(n).padStart(5)}  (${pct}%)`);
  }

  console.log('\n=== NON-2XX BY LANGUAGE ===');
  const langKeys = Object.keys(byLang).sort();
  for (const l of langKeys) {
    const total = Object.values(byLang[l]).reduce((a, b) => a + b, 0);
    const bad = badByLang[l] || 0;
    const pct = ((bad / total) * 100).toFixed(1);
    console.log(`  ${l.padEnd(8)} ${String(bad).padStart(4)} / ${String(total).padStart(4)}  (${pct}% non-2xx)`);
  }

  // Sample of bad URLs per bucket
  console.log('\n=== SAMPLE NON-2XX URLS (up to 10 per bucket) ===');
  const badBuckets = ['404', '3xx', '4xx-other', '5xx', 'network-error', 'other'];
  for (const b of badBuckets) {
    const sample = results.filter(r => statusBucket(r.status) === b).slice(0, 10);
    if (sample.length === 0) continue;
    console.log(`\n  [${b}]`);
    for (const r of sample) {
      const tail = r.location ? `  -> ${r.location}` : r.error ? `  (${r.error})` : '';
      console.log(`    ${r.status}  ${r.url}${tail}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s. CSV: ${csvPath}`);
})();
