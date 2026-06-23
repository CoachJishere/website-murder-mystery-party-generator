/**
 * Pick the next blog draft to publish, ordered by LINK-GRAPH IMPORTANCE.
 *
 * Background: the daily publish workflow used to select the oldest draft by
 * `created_at` (chronological). That was blind to SEO value, so high-value
 * hub pages — e.g. `murder-mystery-party-ideas`, an intended link target of
 * 196 other posts — sat unpublished for months while low-traffic theme posts
 * shipped first. Worse, because crosslinks are injected at publish time, every
 * published post that linked to a still-draft target created a live 404. By
 * mid-2026 that had accumulated to 166 dead internal links. See ADR-0021.
 *
 * This script ranks the remaining EN drafts by their intended in-degree in
 * `cross_link_map.json` (how many source posts are designed to link to each),
 * tie-broken by `created_at` ascending. Publishing the most-linked-to pages
 * first means: (a) the highest-equity hubs go live soonest, and (b) by the
 * time a referrer publishes, its target is already live — minimising new dead
 * links going forward.
 *
 * Usage:
 *   node scripts/pick-next-draft.mjs            # prints the single next slug
 *   node scripts/pick-next-draft.mjs --table=30 # prints a ranked table (human)
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.
 * Reads cross_link_map.json from the repo root.
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from './_supabase-node.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP_PATH = join(__dirname, '../cross_link_map.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// --table=N flag → human-readable ranked table instead of bare slug
const tableArg = process.argv.find((a) => a.startsWith('--table'));
const tableN = tableArg ? parseInt(tableArg.split('=')[1] || '30', 10) : 0;

// 1. Intended in-degree from the cross-link map (independent of publish status)
const inDegree = {};
if (existsSync(MAP_PATH)) {
  const map = JSON.parse(readFileSync(MAP_PATH, 'utf-8'));
  for (const src of Object.keys(map)) {
    const linksTo = (map[src] && map[src].links_to) || [];
    for (const target of linksTo) inDegree[target] = (inDegree[target] || 0) + 1;
  }
} else {
  // No map → fall back to pure chronological (the historical behaviour).
  console.error('WARNING: cross_link_map.json not found — falling back to created_at order');
}

// 2. Remaining EN drafts
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const { data: drafts, error } = await supabase
  .from('blog_posts')
  .select('slug, title, created_at')
  .eq('language', 'en')
  .eq('status', 'draft');

if (error) {
  console.error('Supabase query failed:', error.message);
  process.exit(1);
}

if (!drafts || drafts.length === 0) {
  // Emit nothing on stdout so the workflow treats it as "no drafts left".
  if (tableN) console.error('No draft posts remaining.');
  process.exit(0);
}

// 3. Rank: in-degree desc, then created_at asc (stable, matches old tiebreak)
const ranked = drafts
  .map((d) => ({ ...d, importance: inDegree[d.slug] || 0 }))
  .sort((a, b) =>
    b.importance - a.importance ||
    new Date(a.created_at) - new Date(b.created_at)
  );

if (tableN) {
  console.error(`Remaining drafts: ${ranked.length}. Top ${Math.min(tableN, ranked.length)} by link-graph importance:\n`);
  console.error('rank  in-deg  slug');
  ranked.slice(0, tableN).forEach((d, i) => {
    console.error(`${String(i + 1).padStart(4)}  ${String(d.importance).padStart(6)}  ${d.slug}`);
  });
} else {
  // Bare slug on stdout for the workflow to capture.
  process.stdout.write(ranked[0].slug);
}
