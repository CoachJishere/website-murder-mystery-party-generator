/**
 * Verify in-page anchor links across all blog posts.
 *
 * For every published row in `blog_posts`, parses the markdown content for
 *  (a) every `## H2` heading and the slug it would render to via rehype-slug
 *  (b) every `[link](#anchor)` reference inside the same content
 * Reports any anchor that doesn't resolve to a real H2 slug on the page.
 *
 * Why this matters: the GEO-optimized fix-step / setup-checklist / TOC blocks
 * use `[name](#anchor)` patterns where `#anchor` is the slugified target H2.
 * If unicode/punctuation slugify rules diverge between what we hand-wrote and
 * what rehype-slug computes at render time, the link is silently dead. This
 * script catches those before they hit production.
 *
 * Usage: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/verify-anchors.mjs
 *        Optional: SLUG_FILTER=substring  LANG_FILTER=da,ja,zh-cn
 */

import { createClient } from './_supabase-node.mjs';
import GithubSlugger from 'github-slugger';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SLUG_FILTER = process.env.SLUG_FILTER || '';
const LANG_FILTER = (process.env.LANG_FILTER || '').split(',').filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL/SUPABASE_KEY (anon key works for read-only blog SELECT)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function extractH2Slugs(content) {
  // rehype-slug uses a fresh github-slugger per page (resets uniqueness counter).
  const slugger = new GithubSlugger();
  const slugs = new Set();
  for (const m of content.matchAll(/^##\s+(.+)$/gm)) {
    slugs.add(slugger.slug(m[1].trim()));
  }
  // Also include H3s — some posts (spy-thriller, casino) anchor to ### Theme N
  const h3Slugger = new GithubSlugger();
  // Reuse same slugger to mirror render-time behavior where ALL headings share
  // the uniqueness counter; reset and replay in document order.
  const replay = new GithubSlugger();
  const docHeadings = [...content.matchAll(/^(#{2,3})\s+(.+)$/gm)];
  const renderedSlugs = new Set();
  for (const m of docHeadings) {
    renderedSlugs.add(replay.slug(m[2].trim()));
  }
  return renderedSlugs;
}

function extractAnchorRefs(content) {
  const refs = [];
  for (const m of content.matchAll(/\[([^\]]+)\]\(#([^)]+)\)/g)) {
    refs.push({ text: m[1].trim(), anchor: m[2].trim() });
  }
  return refs;
}

async function fetchAll() {
  // Supabase caps a single SELECT at 1000 rows; paginate via .range().
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

async function main() {
  const rows = await fetchAll();

  const filtered = SLUG_FILTER
    ? rows.filter(r => r.slug.includes(SLUG_FILTER))
    : rows;

  let totalRefs = 0;
  let totalBroken = 0;
  const brokenByCell = [];

  for (const row of filtered) {
    if (!row.content) continue;
    const headingSlugs = extractH2Slugs(row.content);
    const refs = extractAnchorRefs(row.content);
    const broken = refs.filter(r => !headingSlugs.has(r.anchor));
    totalRefs += refs.length;
    totalBroken += broken.length;
    if (broken.length) {
      brokenByCell.push({ language: row.language, slug: row.slug, broken });
    }
  }

  console.log(`Scanned ${filtered.length} cells, ${totalRefs} anchor refs total.`);
  console.log(`Broken: ${totalBroken} refs across ${brokenByCell.length} cells.\n`);

  if (brokenByCell.length === 0) {
    console.log('All anchors resolve cleanly.');
    return;
  }

  // Print broken anchors grouped by cell, with the closest available headings
  // for each broken ref so the fix is mechanical.
  for (const cell of brokenByCell.slice(0, 50)) {
    console.log(`[${cell.language}] ${cell.slug}`);
    const headings = [...extractH2Slugs(filtered.find(r => r.language === cell.language && r.slug === cell.slug).content)];
    for (const b of cell.broken) {
      console.log(`  - "${b.text}" → #${b.anchor}`);
      // Find closest heading by simple substring match
      const close = headings.filter(h => h.includes(b.anchor.slice(0, 10)) || b.anchor.includes(h.slice(0, 10)));
      if (close.length) console.log(`    closest: ${close.slice(0, 3).map(c => '#' + c).join(', ')}`);
    }
  }
  if (brokenByCell.length > 50) {
    console.log(`\n... and ${brokenByCell.length - 50} more cells.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
