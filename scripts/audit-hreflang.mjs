#!/usr/bin/env node
/**
 * Audit live blog post HTML for hreflang + canonical correctness.
 *
 * Why: prerender-blog.mjs emits one <link rel="alternate" hreflang="X">
 * per published sibling per slug, plus a canonical and an x-default.
 * The May 2026 phantom-zh-CN incident (commit 94e64a0) hinted the
 * generation logic — and what's actually deployed to mysterymaker.party
 * — may not match what the source code claims to emit. This audit
 * fetches the live prerendered HTML and reconciles against the DB.
 *
 * Read-only. Writes CSV to temp-files/hreflang-audit-<ISO>.csv.
 *
 * Notes on normalization:
 *   - Prerender maps DB lang `zh-cn` -> hreflang value `zh-Hans`
 *     (Google's canonical form). URL path stays `/zh-cn/blog/...`.
 *     This script normalizes both ways so `zh-Hans` is treated as
 *     equivalent to the DB row `zh-cn`. Uppercase `zh-CN` IS a bug
 *     (the May incident) and gets flagged.
 *   - en URL pattern is `/blog/X`, others are `/{lang}/blog/X`.
 *
 * Usage:
 *   node scripts/audit-hreflang.mjs                  # 50-slug sample
 *   node scripts/audit-hreflang.mjs --sample=200     # bigger sample
 *   node scripts/audit-hreflang.mjs --sample=all     # all slugs
 *   node scripts/audit-hreflang.mjs --concurrency=4  # tune politeness
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
} catch { /* no .env */ }

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

const SAMPLE = args.sample ?? '50';
const CONCURRENCY = Math.max(1, parseInt(args.concurrency ?? '6', 10));
const ORIGIN = args.origin ?? 'https://www.mysterymaker.party';

const DB_LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'da', 'sv', 'fi', 'ja', 'ko', 'zh-cn'];
const DB_LANGS_SET = new Set(DB_LANGS);

// Map any hreflang value the live HTML might emit back to its DB lang form.
// zh-Hans is the canonical Google form the prerender emits for zh-cn rows.
function normalizeHreflang(val) {
  const v = val.trim();
  if (v.toLowerCase() === 'zh-hans') return 'zh-cn';
  if (v.toLowerCase() === 'zh-cn') return 'zh-cn'; // tolerate lowercase too
  return v.toLowerCase();
}

function postPath(lang, slug) {
  return lang === 'en' ? `/blog/${slug}` : `/${lang}/blog/${slug}`;
}

async function supabaseFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`supabase ${path}: HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchPublishedInventory() {
  const all = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const rows = await supabaseFetch(
      `blog_posts?select=slug,language,status`
      + `&status=eq.published&order=slug.asc&limit=${PAGE}&offset=${offset}`
    );
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

function extractHead(html) {
  // We only care about <head>. Trimming here means downstream regex
  // can't accidentally pull a hreflang out of an in-body script string.
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : html;
}

function parseHtmlLang(html) {
  const m = html.match(/<html\s+[^>]*\blang\s*=\s*"([^"]*)"/i);
  return m ? m[1] : '';
}

function parseHreflangs(head) {
  // Capture every <link rel="alternate" hreflang="X" href="Y">. rel and
  // hreflang can appear in any order in HTML, so handle both forms.
  const out = [];
  const re = /<link\b[^>]*\brel\s*=\s*"alternate"[^>]*>/gi;
  let m;
  while ((m = re.exec(head)) !== null) {
    const tag = m[0];
    const hl = tag.match(/\bhreflang\s*=\s*"([^"]+)"/i);
    const hr = tag.match(/\bhref\s*=\s*"([^"]+)"/i);
    if (hl && hr) out.push({ hreflang: hl[1], href: hr[1], raw: tag });
  }
  return out;
}

function parseCanonical(head) {
  const m = head.match(/<link\b[^>]*\brel\s*=\s*"canonical"[^>]*\bhref\s*=\s*"([^"]+)"/i)
    || head.match(/<link\b[^>]*\bhref\s*=\s*"([^"]+)"[^>]*\brel\s*=\s*"canonical"/i);
  return m ? m[1] : '';
}

function canonicalLang(canonicalUrl) {
  if (!canonicalUrl) return '';
  try {
    const u = new URL(canonicalUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    // /blog/<slug>  -> en
    // /<lang>/blog/<slug>
    if (parts[0] === 'blog') return 'en';
    if (parts.length >= 3 && parts[1] === 'blog') return parts[0];
    return '';
  } catch {
    return '';
  }
}

async function fetchHtml(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MysteryMakerHreflangAudit/1.0)',
        'Accept': 'text/html,*/*;q=0.8',
      },
    });
    return { status: res.status, html: await res.text(), finalUrl: res.url };
  } catch (err) {
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 500));
      return fetchHtml(url, attempt + 1);
    }
    return { status: 0, html: '', finalUrl: url, error: String(err) };
  }
}

function diff(actualSet, expectedSet) {
  const missing = [...expectedSet].filter(x => !actualSet.has(x)).sort();
  const extra = [...actualSet].filter(x => !expectedSet.has(x)).sort();
  return { missing, extra };
}

function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let nextIdx = 0;
  let done = 0;
  const total = items.length;
  async function lane() {
    while (true) {
      const idx = nextIdx++;
      if (idx >= total) return;
      results[idx] = await worker(items[idx], idx);
      done++;
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`  ${done}/${total}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  return results;
}

async function main() {
  console.log('Fetching published-row inventory from Supabase...');
  const inventory = await fetchPublishedInventory();
  console.log(`  ${inventory.length} published rows`);

  // Group by slug
  const slugToLangs = new Map();
  for (const row of inventory) {
    if (!slugToLangs.has(row.slug)) slugToLangs.set(row.slug, new Set());
    slugToLangs.get(row.slug).add(row.language);
  }
  console.log(`  ${slugToLangs.size} unique slugs`);

  // Surface DB-level anomalies up front (cheap, no fetches required).
  const dbAnomalies = [];
  for (const [slug, langs] of slugToLangs) {
    for (const l of langs) {
      if (!DB_LANGS_SET.has(l)) {
        dbAnomalies.push({ slug, lang: l, kind: 'unexpected-db-lang' });
      }
    }
  }
  if (dbAnomalies.length) {
    console.log(`\n  DB anomalies (langs outside the 13 expected):`);
    for (const a of dbAnomalies.slice(0, 20)) {
      console.log(`    ${a.slug}  ${a.lang}  ${a.kind}`);
    }
    if (dbAnomalies.length > 20) console.log(`    ... +${dbAnomalies.length - 20} more`);
  }

  // Pick sample of slugs (stable: alphabetical order).
  const allSlugs = [...slugToLangs.keys()].sort();
  const sampleSlugs = SAMPLE === 'all' ? allSlugs : allSlugs.slice(0, parseInt(SAMPLE, 10));

  // Build (slug, lang) work list using each slug's actual published langs.
  // We only audit URLs the prerender would have written; auditing
  // /ja/blog/X for a slug with no ja row would 404 by design.
  const work = [];
  for (const slug of sampleSlugs) {
    for (const lang of slugToLangs.get(slug)) {
      if (DB_LANGS_SET.has(lang)) work.push({ slug, lang });
    }
  }
  console.log(`\nAuditing ${work.length} URLs (${sampleSlugs.length} slugs)...`);

  const rows = await runPool(work, async ({ slug, lang }) => {
    const path = postPath(lang, slug);
    const url = `${ORIGIN}${path}`;
    const { status, html } = await fetchHtml(url);

    if (status !== 200) {
      return {
        slug, lang, url, http: status,
        html_lang: '', n_hreflang: 0, hreflang_values_raw: '',
        missing_vs_db: '', extra_vs_db: '', has_uppercase_zh_cn: 'no',
        canonical_url: '', canonical_lang: '', x_default_url: '',
        issues: status === 0 ? 'fetch-failed' : `http-${status}`,
      };
    }

    const head = extractHead(html);
    const htmlLang = parseHtmlLang(html);
    const alternates = parseHreflangs(head);
    const canonical = parseCanonical(head);

    const issues = [];

    // Detect uppercase zh-CN specifically (the May 2026 phantom-row signature)
    const upperZh = alternates.some(a => a.hreflang === 'zh-CN');
    if (upperZh) issues.push('uppercase-zh-CN');

    // Separate x-default from lang entries
    const langEntries = alternates.filter(a => a.hreflang !== 'x-default');
    const xDefault = alternates.find(a => a.hreflang === 'x-default');

    // Duplicates check
    const seen = new Set();
    const dupes = [];
    for (const e of langEntries) {
      const k = normalizeHreflang(e.hreflang);
      if (seen.has(k)) dupes.push(e.hreflang);
      seen.add(k);
    }
    if (dupes.length) issues.push(`duplicate-hreflang:${[...new Set(dupes)].join('|')}`);

    // Compare actual vs expected. Expected = the set of langs that have
    // a published row for this slug. (NOT all 13 — a slug may legitimately
    // exist in only some languages, and emitting hreflang for unpublished
    // siblings would be lying to Google.)
    const expected = new Set(slugToLangs.get(slug));
    const actualNormalized = new Set(langEntries.map(e => normalizeHreflang(e.hreflang)));
    const { missing, extra } = diff(actualNormalized, expected);
    if (missing.length) issues.push(`missing:${missing.join('|')}`);
    if (extra.length) issues.push(`extra:${extra.join('|')}`);

    // Canonical sanity
    const canLang = canonicalLang(canonical);
    if (!canonical) {
      issues.push('no-canonical');
    } else if (canLang !== lang) {
      issues.push(`canonical-lang-mismatch:${canLang}!=${lang}`);
    } else {
      // expected canonical path
      const expectedCanon = `${ORIGIN}${postPath(lang, slug)}`;
      if (canonical !== expectedCanon) {
        // tolerate trailing slash drift but report anything else
        if (canonical.replace(/\/$/, '') !== expectedCanon.replace(/\/$/, '')) {
          issues.push(`canonical-url-drift`);
        }
      }
    }

    // x-default check (only meaningful if an en variant exists)
    if (expected.has('en')) {
      if (!xDefault) {
        issues.push('no-x-default');
      } else {
        const xLang = canonicalLang(xDefault.href);
        if (xLang !== 'en') issues.push(`x-default-not-en:${xLang}`);
      }
    }

    // html lang attribute
    if (!htmlLang) {
      issues.push('no-html-lang');
    } else {
      const expectedHtmlLang = lang === 'zh-cn' ? 'zh-Hans' : lang;
      if (htmlLang !== expectedHtmlLang) {
        issues.push(`html-lang-mismatch:${htmlLang}!=${expectedHtmlLang}`);
      }
    }

    return {
      slug, lang, url, http: status,
      html_lang: htmlLang,
      n_hreflang: langEntries.length,
      hreflang_values_raw: langEntries.map(e => e.hreflang).join('|'),
      missing_vs_db: missing.join('|'),
      extra_vs_db: extra.join('|'),
      has_uppercase_zh_cn: upperZh ? 'yes' : 'no',
      canonical_url: canonical,
      canonical_lang: canLang,
      x_default_url: xDefault?.href ?? '',
      issues: issues.join('; '),
    };
  }, CONCURRENCY);

  // Write CSV
  const tmpDir = resolve(ROOT, 'temp-files');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(tmpDir, `hreflang-audit-${stamp}.csv`);
  const header = [
    'slug', 'lang', 'url', 'http', 'html_lang',
    'n_hreflang', 'hreflang_values_raw',
    'missing_vs_db', 'extra_vs_db', 'has_uppercase_zh_cn',
    'canonical_url', 'canonical_lang', 'x_default_url',
    'issues',
  ];
  const csv = [
    header.join(','),
    ...rows.map(r => header.map(k => csvCell(r[k])).join(',')),
  ].join('\n');
  writeFileSync(outPath, csv);
  console.log(`\nCSV: ${outPath}`);

  // Summary
  const total = rows.length;
  const clean = rows.filter(r => !r.issues).length;
  const fetchFail = rows.filter(r => r.http !== 200).length;
  const byIssue = new Map();
  for (const r of rows) {
    if (!r.issues) continue;
    for (const tag of r.issues.split('; ')) {
      const key = tag.split(':')[0];
      byIssue.set(key, (byIssue.get(key) ?? 0) + 1);
    }
  }
  console.log('\nSummary');
  console.log(`  total audited:    ${total}`);
  console.log(`  clean:            ${clean}`);
  console.log(`  fetch failures:   ${fetchFail}`);
  console.log(`  issue categories:`);
  for (const [k, n] of [...byIssue.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${n.toString().padStart(5)}  ${k}`);
  }

  // Per-language breakdown of dirty rows
  const byLang = new Map();
  for (const r of rows) {
    if (!r.issues) continue;
    byLang.set(r.lang, (byLang.get(r.lang) ?? 0) + 1);
  }
  if (byLang.size) {
    console.log('  dirty rows by lang:');
    for (const [l, n] of [...byLang.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${n.toString().padStart(5)}  ${l}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
