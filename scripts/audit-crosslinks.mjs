/**
 * Audit cross-link conventions across all published blog_posts rows.
 *
 * For each row this script extracts every internal markdown link `[text](/...)`
 * and categorizes it as:
 *   - cross_blog : `/{lang?}/blog/{slug}` — should be prefixed with the row's own language
 *   - anchor     : `#slug` (same-page) — must resolve to an H2 the row actually renders
 *   - other      : any other `/...` route (kept for completeness)
 *
 * For cross_blog links a "wrong prefix" is anything where the path's language
 * segment doesn't match the row's language. Bare `/blog/X` on a non-EN row is
 * wrong; `/en/blog/X` on a ko row is wrong; `/ko/blog/X` on an en row is wrong.
 * EN rows accept either `/blog/X` (canonical) or `/en/blog/X` (the localized
 * convention applied to non-EN rows).
 *
 * For anchors, we replay rehype-slug across the row's H2+H3 headings (same as
 * verify-anchors.mjs) — anchors that don't resolve to a real heading slug are
 * "dead".
 *
 * Output: temp-files/crosslink-audit-<ISO>.csv with one row per cell.
 *         Console: aggregate counts per language + top offenders.
 *
 * Usage:
 *   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/audit-crosslinks.mjs
 *   Falls back to VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY for read-only.
 *
 * Optional:
 *   LANG_FILTER=ko,zh-cn     restrict to specific languages
 *   SLUG_FILTER=substring    restrict to slugs matching the substring
 */

import { createClient } from './_supabase-node.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import GithubSlugger from 'github-slugger';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const LANG_FILTER = (process.env.LANG_FILTER || '').split(',').filter(Boolean);
const SLUG_FILTER = process.env.SLUG_FILTER || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL/SUPABASE_KEY (anon key works for read-only blog SELECT)');
  process.exit(1);
}

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'da', 'sv', 'fi', 'ko', 'ja', 'zh-cn'];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function extractHeadingSlugs(content) {
  // Mirror render-time slugging: one slugger walks H2+H3 in document order so
  // the uniqueness counter matches what rehype-slug computes.
  const slugger = new GithubSlugger();
  const slugs = new Set();
  for (const m of content.matchAll(/^(#{2,3})\s+(.+)$/gm)) {
    slugs.add(slugger.slug(m[2].trim()));
  }
  return slugs;
}

function extractInternalLinks(content) {
  // [text](/path[#anchor]) — internal links only (skip http/https/mailto).
  const links = [];
  for (const m of content.matchAll(/\[([^\]]+)\]\((\/[^)\s]*|#[^)\s]+)\)/g)) {
    links.push({ text: m[1].trim(), href: m[2].trim() });
  }
  return links;
}

function categorize(href) {
  if (href.startsWith('#')) return 'anchor';
  // /blog/<slug> or /<lang>/blog/<slug>
  const blogMatch = href.match(/^\/(?:([a-z]{2}(?:-[a-z]{2})?)\/)?blog\/([^/?#]+)$/);
  if (blogMatch) {
    return { type: 'cross_blog', lang: blogMatch[1] || null, targetSlug: blogMatch[2] };
  }
  return 'other';
}

function isWrongPrefix(rowLang, linkLang) {
  if (rowLang === 'en') {
    // EN row: bare `/blog/X` is canonical; `/en/blog/X` also acceptable. Any
    // other language prefix is wrong (would point to a different localized
    // page).
    return linkLang !== null && linkLang !== 'en';
  }
  // Non-EN row: must carry its own language prefix.
  return linkLang !== rowLang;
}

async function fetchAll() {
  const all = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    let q = supabase
      .from('blog_posts')
      .select('language, slug, content')
      .eq('status', 'published')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (LANG_FILTER.length) q = q.in('language', LANG_FILTER);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

async function fetchAllSlugs() {
  // EN-only across all statuses — slug space is shared (canonical) across langs.
  const slugs = new Set();
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('language', 'en')
      .range(from, from + 499);
    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach(r => slugs.add(r.slug));
    if (data.length < 500) break;
  }
  return slugs;
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const rows = await fetchAll();
  const allDbSlugs = await fetchAllSlugs();
  console.log(`Loaded ${allDbSlugs.size} canonical EN slugs from DB for dead-target check.`);
  const filtered = SLUG_FILTER ? rows.filter(r => r.slug.includes(SLUG_FILTER)) : rows;
  console.log(`Scanning ${filtered.length} published cells across ${new Set(filtered.map(r => r.language)).size} languages.`);

  const csvRows = [
    ['slug', 'lang', 'n_links_total', 'n_cross_blog', 'n_anchors', 'n_other', 'n_wrong_prefix', 'n_dead_anchors', 'n_dead_targets', 'sample_issues'],
  ];
  const byLang = new Map();
  const wrongPrefixCells = [];
  const deadAnchorCells = [];
  const deadTargetCells = [];
  const deadTargetTally = new Map(); // target_slug -> ref count

  for (const row of filtered) {
    if (!row.content) continue;
    const links = extractInternalLinks(row.content);
    const headingSlugs = extractHeadingSlugs(row.content);

    let nCrossBlog = 0, nAnchors = 0, nOther = 0, nWrongPrefix = 0, nDeadAnchors = 0, nDeadTargets = 0;
    const sampleIssues = [];
    const wrongPrefixSamples = [];
    const deadAnchorSamples = [];
    const deadTargetSamples = [];

    for (const link of links) {
      const cat = categorize(link.href);
      if (cat === 'anchor') {
        nAnchors++;
        const anchor = link.href.slice(1);
        if (!headingSlugs.has(anchor)) {
          nDeadAnchors++;
          if (sampleIssues.length < 3) sampleIssues.push(`dead anchor #${anchor}`);
          deadAnchorSamples.push({ text: link.text, anchor });
        }
      } else if (cat === 'other') {
        nOther++;
      } else if (cat.type === 'cross_blog') {
        nCrossBlog++;
        if (isWrongPrefix(row.language, cat.lang)) {
          nWrongPrefix++;
          if (sampleIssues.length < 3) {
            sampleIssues.push(`wrong-prefix ${link.href} (expected /${row.language}/blog/${cat.targetSlug})`);
          }
          wrongPrefixSamples.push({ href: link.href, targetSlug: cat.targetSlug, currentLang: cat.lang });
        }
        if (!allDbSlugs.has(cat.targetSlug)) {
          nDeadTargets++;
          if (sampleIssues.length < 3) sampleIssues.push(`dead target ${cat.targetSlug}`);
          deadTargetSamples.push({ href: link.href, targetSlug: cat.targetSlug });
          deadTargetTally.set(cat.targetSlug, (deadTargetTally.get(cat.targetSlug) || 0) + 1);
        }
      }
    }

    csvRows.push([
      row.slug,
      row.language,
      links.length,
      nCrossBlog,
      nAnchors,
      nOther,
      nWrongPrefix,
      nDeadAnchors,
      nDeadTargets,
      sampleIssues.join(' | '),
    ]);

    const lang = byLang.get(row.language) || { cells: 0, links: 0, wrong: 0, dead: 0, deadTargets: 0, cellsWithWrong: 0, cellsWithDead: 0, cellsWithDeadTargets: 0 };
    lang.cells++;
    lang.links += links.length;
    lang.wrong += nWrongPrefix;
    lang.dead += nDeadAnchors;
    lang.deadTargets += nDeadTargets;
    if (nWrongPrefix) lang.cellsWithWrong++;
    if (nDeadAnchors) lang.cellsWithDead++;
    if (nDeadTargets) lang.cellsWithDeadTargets++;
    byLang.set(row.language, lang);

    if (nWrongPrefix) wrongPrefixCells.push({ slug: row.slug, lang: row.language, n: nWrongPrefix, samples: wrongPrefixSamples });
    if (nDeadAnchors) deadAnchorCells.push({ slug: row.slug, lang: row.language, n: nDeadAnchors, samples: deadAnchorSamples });
    if (nDeadTargets) deadTargetCells.push({ slug: row.slug, lang: row.language, n: nDeadTargets, samples: deadTargetSamples });
  }

  // Emit CSV
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = `temp-files/crosslink-audit-${stamp}.csv`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, csvRows.map(r => r.map(csvEscape).join(',')).join('\n'));
  console.log(`\nCSV written: ${outPath}`);

  // Also emit a fix-list JSON (slug,lang pairs with wrong prefixes) so the fix
  // script has a deterministic input that doesn't depend on re-running the audit.
  const fixListPath = `temp-files/crosslink-fixlist-${stamp}.json`;
  writeFileSync(fixListPath, JSON.stringify(wrongPrefixCells, null, 2));
  console.log(`Fix-list written: ${fixListPath}`);

  // And the dead-anchor surfacing for human review.
  const deadPath = `temp-files/crosslink-dead-anchors-${stamp}.json`;
  writeFileSync(deadPath, JSON.stringify(deadAnchorCells, null, 2));
  console.log(`Dead-anchor list written: ${deadPath}`);

  // Dead-target slug rollup with candidate substitutes (longest common-prefix
  // sibling). When exactly one candidate exists this is a deterministic rename
  // that a fix script can apply.
  const deadTargetsArr = [...deadTargetTally].sort((a, b) => b[1] - a[1]).map(([target, refs]) => {
    const prefix = target.slice(0, 30);
    const candidates = [...allDbSlugs].filter(s => s.startsWith(prefix) && s !== target);
    return { target, refs, candidates };
  });
  const deadTargetsPath = `temp-files/crosslink-dead-targets-${stamp}.json`;
  writeFileSync(deadTargetsPath, JSON.stringify({ summary: deadTargetsArr, perCell: deadTargetCells }, null, 2));
  console.log(`Dead-target list written: ${deadTargetsPath}`);

  // Aggregate console output, ordered by SUPPORTED_LANGS.
  console.log('\nBy language:');
  const header = ['lang', 'cells', 'links', 'wrong-pref', 'dead-anch', 'dead-targets', 'cells-w-wrong', 'cells-w-dead-anch', 'cells-w-dead-tgt'];
  console.log(header.join('\t'));
  for (const lang of SUPPORTED_LANGS) {
    const l = byLang.get(lang);
    if (!l) continue;
    console.log([lang, l.cells, l.links, l.wrong, l.dead, l.deadTargets, l.cellsWithWrong, l.cellsWithDead, l.cellsWithDeadTargets].join('\t'));
  }
  for (const [lang, l] of byLang) {
    if (SUPPORTED_LANGS.includes(lang)) continue;
    console.log([lang + ' (UNEXPECTED)', l.cells, l.links, l.wrong, l.dead, l.deadTargets, l.cellsWithWrong, l.cellsWithDead, l.cellsWithDeadTargets].join('\t'));
  }

  // Top offenders summary
  if (wrongPrefixCells.length) {
    console.log(`\nTop 10 cells with wrong-prefix cross-blog links:`);
    wrongPrefixCells.sort((a, b) => b.n - a.n).slice(0, 10).forEach(c => {
      console.log(`  [${c.lang}] ${c.slug}  (${c.n} bad links)`);
    });
  }
  if (deadAnchorCells.length) {
    console.log(`\nTop 10 cells with dead anchors:`);
    deadAnchorCells.sort((a, b) => b.n - a.n).slice(0, 10).forEach(c => {
      console.log(`  [${c.lang}] ${c.slug}  (${c.n} dead)`);
    });
  }
  if (deadTargetsArr.length) {
    const unambig = deadTargetsArr.filter(t => t.candidates.length === 1);
    const ambig = deadTargetsArr.filter(t => t.candidates.length !== 1);
    console.log(`\nDead cross-blog target slugs: ${deadTargetsArr.length} distinct, ${deadTargetsArr.reduce((a,t)=>a+t.refs,0)} refs.`);
    console.log(`  ${unambig.length} have exactly 1 candidate substitute (mechanically fixable)`);
    console.log(`  ${ambig.length} have 0 or 2+ candidates (need human review)`);
    console.log(`\nTop 15 dead targets:`);
    deadTargetsArr.slice(0, 15).forEach(t => {
      console.log(`  [${t.refs} refs] ${t.target}`);
      if (t.candidates.length === 1) console.log(`    → ${t.candidates[0]}`);
      else if (t.candidates.length > 1) console.log(`    AMBIG: ${t.candidates.join(' | ')}`);
      else console.log(`    NO CANDIDATE`);
    });
  }

  // cross_link_map.json integrity check
  console.log('\nVerifying cross_link_map.json integrity...');
  const map = JSON.parse(await import('fs').then(f => f.promises.readFile('cross_link_map.json', 'utf8')));
  const mapSlugs = new Set(Object.keys(map));

  // Check against all DB slugs (any status), not just published — the map is
  // forward-looking and will include drafts.
  const missingFromDb = [...mapSlugs].filter(s => !allDbSlugs.has(s));
  console.log(`  Map slugs not present in DB (any status): ${missingFromDb.length}${missingFromDb.length ? ' → ' + missingFromDb.slice(0, 10).join(', ') + (missingFromDb.length > 10 ? '...' : '') : ''}`);

  // Dangling targets: links_to references slugs not in the map
  const danglingTargets = new Set();
  for (const [slug, entry] of Object.entries(map)) {
    for (const target of entry.links_to || []) {
      if (!mapSlugs.has(target)) danglingTargets.add(`${slug} → ${target}`);
    }
  }
  console.log(`  Dangling links_to references: ${danglingTargets.size}${danglingTargets.size ? '\n    ' + [...danglingTargets].slice(0, 10).join('\n    ') : ''}`);

  // Bidirectionality distribution
  let bidir = 0, oneway = 0;
  for (const [slug, entry] of Object.entries(map)) {
    for (const target of entry.links_to || []) {
      if (map[target]?.links_to?.includes(slug)) bidir++;
      else oneway++;
    }
  }
  console.log(`  Bidirectional pairs: ${bidir / 2} | One-way refs: ${oneway} (informational, not a hard requirement)`);
}

main().catch(err => { console.error(err); process.exit(1); });
