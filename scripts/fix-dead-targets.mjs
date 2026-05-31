/**
 * Fix dead cross-blog target slugs across blog_posts content and cross_link_map.json.
 *
 * Default mode is dry-run: the script computes the rename plan from the latest
 * `temp-files/crosslink-dead-targets-*.json` audit output (or an explicit
 * --rename flag), writes a per-cell diff preview to
 * `temp-files/fix-dead-targets-plan-<ISO>.json`, and exits without touching
 * Supabase or the map.
 *
 * Modes:
 *   (no flag)               dry-run — write plan, print summary, exit
 *   --apply                 patch DB + cross_link_map.json
 *   --apply --slug=<slug>   apply only to cells whose slug matches (defaults to
 *                           the cell with the smallest blast radius if you
 *                           pass --apply --slug=smallest, useful for the
 *                           single-slug verification step)
 *   --rename=<old>=<new>    instead of reading the audit output, use an
 *                           explicit rename pair (repeatable). For the EN slug
 *                           rename protocol.
 *
 * Cell-by-cell semantics:
 *   - Fetches each affected cell individually.
 *   - For each cell, computes the replacement, counts before/after, and writes
 *     a single UPDATE per cell.
 *   - Skips cells where the replacement count is 0 (no change needed).
 *   - Aborts on any UPDATE error and reports which cells succeeded so the run
 *     is resumable.
 *
 * Map updates (always run with --apply, alongside DB writes):
 *   - links_to: replace old slug with new slug (or remove if new slug already present)
 *   - insertions[].target_slug + replacement URL: rewrite
 *   - lang_insertions[lang][].target_slug + replacement URL: rewrite (per lang)
 *   - Dangling links_to entries (those passed via --remove-dangling) are
 *     dropped from the links_to array.
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_KEY (or VITE_* fallbacks for dry-run).
 */

import { createClient } from './_supabase-node.mjs';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const APPLY = process.argv.includes('--apply');
const args = process.argv.slice(2);
const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const renameArgs = args.filter(a => a.startsWith('--rename=')).map(a => {
  const [, pair] = a.split('=', 2);
  const [oldSlug, newSlug] = pair.split('=');
  if (!oldSlug || !newSlug) throw new Error(`Bad --rename arg: ${a} (expected --rename=old=new)`);
  return { oldSlug, newSlug };
});
const removeDangling = args.includes('--remove-dangling');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_KEY');
  process.exit(1);
}
if (APPLY && !process.env.SUPABASE_SERVICE_KEY) {
  console.error('--apply requires SUPABASE_SERVICE_KEY (anon cannot write)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function loadRenamePlan() {
  if (renameArgs.length) return renameArgs;
  // Read the most recent dead-targets audit output and take entries with
  // exactly one candidate.
  const files = readdirSync('temp-files')
    .filter(f => f.startsWith('crosslink-dead-targets-') && f.endsWith('.json'))
    .sort();
  if (!files.length) throw new Error('No temp-files/crosslink-dead-targets-*.json found. Run audit-crosslinks.mjs first.');
  const latest = `temp-files/${files[files.length - 1]}`;
  console.log(`Loading rename plan from ${latest}`);
  const audit = JSON.parse(readFileSync(latest, 'utf8'));
  const plan = audit.summary
    .filter(t => t.candidates.length === 1)
    .map(t => ({ oldSlug: t.target, newSlug: t.candidates[0], refs: t.refs }));
  return plan;
}

function makeReplacers(plan) {
  // For each rename, build two regexes:
  //   1) bare /blog/<old>           (EN convention)
  //   2) /<lang>/blog/<old>         (localized convention; preserve lang)
  // We match the URL inside Markdown links: `](/blog/<old>)` or `](/<lang>/blog/<old>)`.
  // The trailing `)` is part of the match so we don't accidentally hit a longer
  // slug that has the old slug as a prefix.
  return plan.map(p => {
    const escaped = p.oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return {
      ...p,
      bareRe: new RegExp(`\\]\\(/blog/${escaped}\\)`, 'g'),
      langRe: new RegExp(`\\]\\(/([a-z]{2}(?:-[a-z]{2})?)/blog/${escaped}\\)`, 'g'),
      bareSub: `](/blog/${p.newSlug})`,
      langSub: (m, lang) => `](/${lang}/blog/${p.newSlug})`,
    };
  });
}

function rewriteContent(content, replacers) {
  let next = content;
  let totalReplacements = 0;
  const perRename = [];
  for (const r of replacers) {
    let count = 0;
    next = next.replace(r.bareRe, () => { count++; return r.bareSub; });
    next = next.replace(r.langRe, (m, lang) => { count++; return r.langSub(m, lang); });
    if (count) {
      perRename.push({ old: r.oldSlug, new: r.newSlug, count });
      totalReplacements += count;
    }
  }
  return { next, totalReplacements, perRename };
}

async function fetchAffectedCells(plan) {
  // Pull all published rows, then filter in JS for ones that mention any old slug.
  // (Could push some of this to SQL with .or() but the LIKEs get ugly; 1646 rows
  // fits comfortably in memory and we already do this in the audit.)
  const all = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, language, content')
      .eq('status', 'published')
      .range(from, from + 499);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 500) break;
  }
  const oldSlugs = plan.map(p => p.oldSlug);
  return all.filter(r => r.content && oldSlugs.some(s => r.content.includes(`/blog/${s})`)));
}

function rewriteMap(map, plan) {
  // Deep-ish clone via JSON round-trip — the map is small (420 entries) and we
  // want a clean before/after for the diff print.
  const next = JSON.parse(JSON.stringify(map));
  const renamesByOld = new Map(plan.map(p => [p.oldSlug, p.newSlug]));
  let mapChanges = 0;

  // Top-level keys: if the map keys an OLD slug, rename it (rare but possible).
  for (const oldSlug of renamesByOld.keys()) {
    if (next[oldSlug]) {
      const newSlug = renamesByOld.get(oldSlug);
      if (!next[newSlug]) {
        next[newSlug] = next[oldSlug];
        delete next[oldSlug];
        mapChanges++;
      } else {
        // Both keys exist — leave it alone, log a warning later
        console.warn(`  Map: both ${oldSlug} and ${newSlug} are keys; not merging automatically`);
      }
    }
  }

  for (const [slug, entry] of Object.entries(next)) {
    // links_to: replace old with new (de-dup if new already present)
    if (Array.isArray(entry.links_to)) {
      const before = entry.links_to.slice();
      const after = [];
      const seen = new Set();
      for (const t of before) {
        const mapped = renamesByOld.has(t) ? renamesByOld.get(t) : t;
        if (!seen.has(mapped)) { after.push(mapped); seen.add(mapped); }
      }
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        entry.links_to = after;
        mapChanges++;
      }
    }

    // insertions[]: rewrite target_slug + replacement URL
    for (const grp of ['insertions', 'lang_insertions']) {
      if (!entry[grp]) continue;
      const arrays = grp === 'insertions' ? [entry[grp]] : Object.values(entry[grp]);
      for (const arr of arrays) {
        if (!Array.isArray(arr)) continue;
        for (const ins of arr) {
          if (renamesByOld.has(ins.target_slug)) {
            const oldS = ins.target_slug;
            const newS = renamesByOld.get(oldS);
            ins.target_slug = newS;
            // Rewrite the replacement URL — same regex logic as content rewrite
            if (ins.replacement) {
              const escaped = oldS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              ins.replacement = ins.replacement
                .replace(new RegExp(`\\]\\(/blog/${escaped}\\)`, 'g'), `](/blog/${newS})`)
                .replace(new RegExp(`\\]\\(/([a-z]{2}(?:-[a-z]{2})?)/blog/${escaped}\\)`, 'g'), (m, lang) => `](/${lang}/blog/${newS})`);
            }
            mapChanges++;
          }
        }
      }
    }
  }

  return { next, mapChanges };
}

async function main() {
  const plan = loadRenamePlan();
  console.log(`Rename plan: ${plan.length} pairs`);
  for (const p of plan) {
    console.log(`  ${p.oldSlug}  →  ${p.newSlug}${p.refs ? `  (${p.refs} refs in audit)` : ''}`);
  }
  if (!plan.length) { console.log('Nothing to do.'); return; }

  const replacers = makeReplacers(plan);
  const affected = await fetchAffectedCells(plan);
  console.log(`\n${affected.length} cells reference at least one old slug.`);

  // Filter by --slug if provided
  let toProcess = affected;
  if (slugArg) {
    if (slugArg === 'smallest') {
      // Pick the source slug with the fewest affected cells, so we can verify
      // on a low-blast-radius cell first.
      const bySlug = new Map();
      for (const r of affected) { bySlug.set(r.slug, (bySlug.get(r.slug) || 0) + 1); }
      const smallest = [...bySlug.entries()].sort((a, b) => a[1] - b[1])[0][0];
      console.log(`--slug=smallest → ${smallest} (${bySlug.get(smallest)} cells)`);
      toProcess = affected.filter(r => r.slug === smallest);
    } else {
      toProcess = affected.filter(r => r.slug === slugArg);
      console.log(`--slug=${slugArg} → ${toProcess.length} cells`);
    }
  }

  // Compute the diff plan
  const planRows = [];
  for (const row of toProcess) {
    const { next, totalReplacements, perRename } = rewriteContent(row.content, replacers);
    if (totalReplacements === 0) continue;
    planRows.push({
      id: row.id,
      slug: row.slug,
      language: row.language,
      replacements: totalReplacements,
      perRename,
      // Don't dump full before/after content — too large. Sample one diff window per rename.
      samples: perRename.map(pr => {
        const oldUrl = `](/blog/${pr.old})`;
        const idx = row.content.indexOf(oldUrl);
        if (idx === -1) {
          // Try lang-prefixed form
          const langMatch = row.content.match(new RegExp(`\\]\\(/[a-z-]+/blog/${pr.old.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\)`));
          if (langMatch) return { rename: `${pr.old} → ${pr.new}`, window: row.content.substr(Math.max(0, row.content.indexOf(langMatch[0])-30), 100) };
          return { rename: `${pr.old} → ${pr.new}`, window: '<no sample>' };
        }
        return { rename: `${pr.old} → ${pr.new}`, window: row.content.substr(Math.max(0, idx - 30), 120) };
      }),
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const planPath = `temp-files/fix-dead-targets-plan-${stamp}.json`;
  mkdirSync(dirname(planPath), { recursive: true });
  writeFileSync(planPath, JSON.stringify({ plan, planRows }, null, 2));
  console.log(`\nPlan written: ${planPath}  (${planRows.length} cells, ${planRows.reduce((a, r) => a + r.replacements, 0)} replacements)`);

  // Map rewrite preview (always computed; only written with --apply)
  const map = JSON.parse(readFileSync('cross_link_map.json', 'utf8'));
  const { next: nextMap, mapChanges } = rewriteMap(map, plan);
  console.log(`Map: ${mapChanges} changes pending`);

  // Optional: remove dangling links_to under one-off keys
  let danglingRemoved = 0;
  if (removeDangling) {
    const KNOWN_DANGLING = {
      'murder-mystery-party-for-adults-guide': [
        'murder-mystery-party-for-true-crime-fans',
        'murder-mystery-dinner-party-ideas',
        'murder-mystery-cocktail-party',
        'murder-mystery-dinner-party-games',
        'how-to-host-murder-mystery-party-without-experience',
        'prohibition-era-murder-mystery-party',
      ],
    };
    for (const [source, dang] of Object.entries(KNOWN_DANGLING)) {
      const entry = nextMap[source];
      if (!entry?.links_to) continue;
      const before = entry.links_to.length;
      entry.links_to = entry.links_to.filter(t => !dang.includes(t));
      danglingRemoved += before - entry.links_to.length;
    }
    console.log(`Dangling links_to removed (preview): ${danglingRemoved}`);
  }

  if (!APPLY) {
    console.log(`\nDry-run only. Re-run with --apply to write changes.`);
    return;
  }

  // === APPLY MODE ===
  console.log('\n=== APPLYING ===');

  // Patch each cell individually
  const succeeded = [];
  const failed = [];
  for (const row of toProcess) {
    const { next: nextContent, totalReplacements } = rewriteContent(row.content, replacers);
    if (totalReplacements === 0) continue;
    const { error } = await supabase
      .from('blog_posts')
      .update({ content: nextContent })
      .eq('id', row.id);
    if (error) {
      failed.push({ id: row.id, slug: row.slug, language: row.language, error: error.message });
      console.error(`  FAIL [${row.language}] ${row.slug}: ${error.message}`);
      // Abort on first failure so the user can inspect; everything succeeded so far is durable.
      break;
    } else {
      succeeded.push({ id: row.id, slug: row.slug, language: row.language, replacements: totalReplacements });
      console.log(`  OK   [${row.language}] ${row.slug}  (${totalReplacements} replacements)`);
    }
  }

  // Write the updated map only if no failures and we're processing the full set
  // (i.e. no --slug filter). The map update is global and shouldn't ship
  // partially with content updates.
  if (!slugArg && !failed.length && mapChanges) {
    writeFileSync('cross_link_map.json', JSON.stringify(nextMap, null, 2) + '\n');
    console.log(`\ncross_link_map.json updated: ${mapChanges} changes${danglingRemoved ? `, ${danglingRemoved} dangling refs removed` : ''}`);
  } else if (slugArg) {
    console.log(`\nSkipped map update (--slug filter active — map update happens on full run)`);
  } else if (failed.length) {
    console.log(`\nSkipped map update due to ${failed.length} cell failure(s)`);
  }

  console.log(`\nDone. Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  if (failed.length) {
    writeFileSync(`temp-files/fix-dead-targets-failed-${stamp}.json`, JSON.stringify(failed, null, 2));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
