/**
 * Sync blog_map.xlsx → Supabase blog_posts table
 *
 * This script:
 * 1. Reads all rows from blog_map.xlsx
 * 2. For published posts: upserts with audited translations (preserves status/published_at)
 * 3. Deletes all existing draft rows in Supabase
 * 4. Inserts new draft rows with staggered created_at dates (oldest first for daily publishing)
 *
 * Environment variables required:
 *   SUPABASE_URL — project URL
 *   SUPABASE_SERVICE_KEY — service role key (not anon key)
 *
 * Usage:
 *   node scripts/sync-blog-map.mjs
 *
 * By default, Step 2 (overwriting already-published rows from xlsx) is skipped
 * entirely — the live DB is canonical for published content (ADR-0026). To force
 * it, first dry-run with SYNC_OVERWRITE_PUBLISHED=true alone: it computes and
 * prints how many rows would actually change (a full corpus-wide check on
 * 2026-09-14 found xlsx had drifted on 70% of titles / 99% of content by then —
 * expected, not a bug, but large enough that this flag alone used to be
 * dangerous). It refuses to write anything until you re-run with
 * SYNC_OVERWRITE_PUBLISHED=true SYNC_OVERWRITE_CONFIRM_COUNT=<N> matching the
 * printed count, proving you actually looked at the diff first.
 */

import { createClient } from './_supabase-node.mjs';
import { sanitizeBrandLeakRot, bumpLastUpdated } from './_brand-sanitizer.mjs';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Language column mapping in blog_map.xlsx
// Each entry: [titleCol, contentCol, metaCol, keywordsCol, langCode]
const LANGS = [
  [4, 5, 6, 7, 'en'],
  [8, 9, 10, 11, 'es'],
  [12, 13, 14, 15, 'fr'],
  [16, 17, 18, 19, 'de'],
  [20, 21, 22, 23, 'it'],
  [24, 25, 26, 27, 'da'],
  [28, 29, 30, 31, 'fi'],
  [32, 33, 34, 35, 'nl'],
  [36, 37, 38, 39, 'sv'],
  [40, 41, 42, 43, 'pt'],
  [44, 45, 46, 47, 'ko'],
  [48, 49, 50, 51, 'ja'],
  [52, 53, 54, 55, 'zh-cn'],
];

function estimateReadingTime(content) {
  if (!content) return 5;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Brand-leak sanitizer + Last-updated auto-bump live in
// ./_brand-sanitizer.mjs (shared with scripts/clean-blog-map.mjs).

// Bulk-fetches every published post's current live content, keyed by
// "slug|language", so the SYNC_OVERWRITE_PUBLISHED safety check can diff
// against it without one query per row.
async function fetchLiveContentMap(supabase) {
  const map = new Map();
  const pageSize = 500;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, language, title, content, meta_description, meta_keywords')
      .eq('status', 'published')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      map.set(`${row.slug}|${row.language}`, row);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

async function main() {
  const xlsxPath = join(__dirname, '..', 'blog_map.xlsx');
  console.log(`Reading ${xlsxPath}...`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const ws = workbook.getWorksheet(1);

  // ── Step 0: Get current Supabase state ──
  console.log('\n📊 Checking current Supabase state...');
  const { data: publishedSlugs } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('language', 'en')
    .eq('status', 'published');

  const supabasePublished = new Set((publishedSlugs || []).map(r => r.slug));
  console.log(`  Supabase has ${supabasePublished.size} published slugs`);

  // ── Step 1: Read all rows from xlsx ──
  console.log('\n📖 Reading blog_map.xlsx...');
  const publishedRows = []; // rows whose slug is published in Supabase
  const draftRows = [];     // everything else

  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    const slug = row.getCell(1).value;
    const xlsxStatus = (row.getCell(3).value || '').toString().toLowerCase();

    if (!slug) continue;

    const isPublished = supabasePublished.has(slug);

    for (const [titleCol, contentCol, metaCol, kwCol, lang] of LANGS) {
      const title = sanitizeBrandLeakRot(row.getCell(titleCol).value || '');
      const content = bumpLastUpdated(sanitizeBrandLeakRot(row.getCell(contentCol).value || ''), lang);
      const meta = sanitizeBrandLeakRot(row.getCell(metaCol).value || '');
      const keywords = row.getCell(kwCol).value || '';

      // Skip rows with no content for this language
      if (!content && !title) continue;

      const record = {
        slug,
        language: lang,
        title: String(title),
        content: String(content),
        meta_description: String(meta),
        meta_keywords: String(keywords),
        reading_time: estimateReadingTime(String(content)),
        author: 'AI Assistant',
        updated_at: new Date().toISOString(),
      };

      if (isPublished) {
        publishedRows.push(record);
      } else {
        draftRows.push(record);
      }
    }
  }

  console.log(`  Published rows to update: ${publishedRows.length} (${publishedRows.length / 13} slugs)`);
  console.log(`  Draft rows to insert: ${draftRows.length} (${draftRows.length / 13} slugs)`);

  // ── Step 2: Update published posts with audited translations ──
  // GUARD (ADR-0026): by DEFAULT we do NOT overwrite already-published posts.
  // The live DB is the source of truth for published content — title/meta/body
  // are routinely edited directly in Supabase for SEO and enriched with blog→
  // landing crosslinks (ADR-0023) that don't exist in this workbook. Blindly
  // pushing xlsx over them silently reverts that work. xlsx's job is to SEED NEW
  // DRAFTS (Steps 3–4), not to be canonical for live posts.
  // To deliberately force-push xlsx onto published posts (an intentional,
  // reviewed reseed), run with SYNC_OVERWRITE_PUBLISHED=true.
  const OVERWRITE_PUBLISHED = process.env.SYNC_OVERWRITE_PUBLISHED === 'true';
  let updateCount = 0;
  let updateErrors = 0;

  if (!OVERWRITE_PUBLISHED) {
    console.log(`\n⏭️  Skipping ${publishedRows.length} published rows — live DB is source of truth (ADR-0026).`);
    console.log('    To force-push xlsx onto published posts, re-run with SYNC_OVERWRITE_PUBLISHED=true.');
  } else {
    // SAFETY CHECK (added 2026-09-14): a corpus-wide drift check found xlsx had
    // silently drifted from live Supabase on 70% of titles and 99% of content
    // (by content length) across the whole published corpus — the fully-realized,
    // expected result of ADR-0026's "xlsx seeds drafts, DB is canonical once
    // published" model, since nothing ever writes live edits back into xlsx.
    // SYNC_OVERWRITE_PUBLISHED alone used to be enough to fire a full-corpus
    // overwrite with no visibility into how much it would actually change. This
    // forces a dry-run-then-confirm two-step: compute the real diff count first,
    // then require the operator to pass that exact count back to prove they saw
    // it before anything is written.
    console.log(`\n🔎 SYNC_OVERWRITE_PUBLISHED=true — computing live diff before writing anything...`);
    const liveMap = await fetchLiveContentMap(supabase);
    const changed = [];
    const unchanged = [];
    for (const record of publishedRows) {
      const live = liveMap.get(`${record.slug}|${record.language}`);
      const isSame =
        live &&
        live.title === record.title &&
        live.content === record.content &&
        live.meta_description === record.meta_description &&
        live.meta_keywords === record.meta_keywords;
      (isSame ? unchanged : changed).push(record);
    }

    console.log(`  ${changed.length} of ${publishedRows.length} published rows would actually change.`);
    console.log(`  ${unchanged.length} are already identical (no-op).`);
    if (changed.length > 0) {
      console.log(`  First ${Math.min(20, changed.length)} that would change:`);
      changed.slice(0, 20).forEach((r) => console.log(`    ${r.slug} (${r.language})`));
      if (changed.length > 20) console.log(`    ... and ${changed.length - 20} more`);
    }

    const confirmRaw = process.env.SYNC_OVERWRITE_CONFIRM_COUNT;
    const confirmCount = confirmRaw !== undefined ? Number(confirmRaw) : NaN;
    if (confirmCount !== changed.length) {
      console.error(
        `\n🛑 Refusing to write. This run would change ${changed.length} rows, but ` +
          `SYNC_OVERWRITE_CONFIRM_COUNT=${confirmRaw ?? '(not set)'}. Review the list above, ` +
          `then re-run with SYNC_OVERWRITE_PUBLISHED=true SYNC_OVERWRITE_CONFIRM_COUNT=${changed.length} ` +
          `to confirm you've actually looked at what this would overwrite.`
      );
      process.exit(1);
    }

    console.log(`\n✏️  Confirmed — overwriting ${changed.length} published rows with xlsx content (${unchanged.length} no-ops skipped)...`);
    // Process one row at a time (content is too large for bulk upsert)
    for (const record of changed) {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          title: record.title,
          content: record.content,
          meta_description: record.meta_description,
          meta_keywords: record.meta_keywords,
          reading_time: record.reading_time,
          updated_at: record.updated_at,
        })
        .eq('slug', record.slug)
        .eq('language', record.language);

      if (error) {
        console.error(`  ❌ Error updating ${record.slug}/${record.language}: ${error.message}`);
        updateErrors++;
      } else {
        updateCount++;
        if (updateCount % 100 === 0) {
          console.log(`  Updated ${updateCount}/${changed.length}...`);
        }
      }
    }
    console.log(`  ✅ Updated ${updateCount} published rows (${updateErrors} errors)`);
  }

  // ── Step 3: Delete all existing draft rows ──
  console.log('\n🗑️  Deleting all existing draft rows...');
  const { error: deleteError, count: deleteCount } = await supabase
    .from('blog_posts')
    .delete({ count: 'exact' })
    .eq('status', 'draft');

  if (deleteError) {
    console.error(`  ❌ Error deleting drafts: ${deleteError.message}`);
    process.exit(1);
  }
  console.log(`  ✅ Deleted ${deleteCount} draft rows`);

  // ── Step 4: Insert new draft rows with staggered created_at ──
  console.log('\n📥 Inserting new draft rows...');

  // Group draft rows by slug to assign staggered dates
  const slugOrder = [];
  const slugMap = new Map();
  for (const record of draftRows) {
    if (!slugMap.has(record.slug)) {
      slugMap.set(record.slug, []);
      slugOrder.push(record.slug);
    }
    slugMap.get(record.slug).push(record);
  }

  // Stagger created_at: one slug per day, starting from tomorrow
  const baseDate = new Date();
  baseDate.setUTCHours(0, 0, 0, 0);
  baseDate.setUTCDate(baseDate.getUTCDate() + 1); // start tomorrow

  let insertCount = 0;
  let insertErrors = 0;

  for (let i = 0; i < slugOrder.length; i++) {
    const slug = slugOrder[i];
    const records = slugMap.get(slug);

    // All language variants of a slug share the same created_at
    const createdAt = new Date(baseDate);
    createdAt.setUTCDate(baseDate.getUTCDate() + i);

    for (const record of records) {
      record.status = 'draft';
      record.created_at = createdAt.toISOString();
    }

    // Insert one language at a time (content too large for batch)
    for (const record of records) {
      const { error } = await supabase
        .from('blog_posts')
        .insert(record);

      if (error) {
        console.error(`  ❌ Error inserting ${record.slug}/${record.language}: ${error.message}`);
        insertErrors++;
      } else {
        insertCount++;
        if (insertCount % 100 === 0) {
          console.log(`  Inserted ${insertCount}/${draftRows.length}...`);
        }
      }
    }
  }
  console.log(`  ✅ Inserted ${insertCount} draft rows (${insertErrors} errors)`);

  // ── Step 5: Final verification ──
  console.log('\n🔍 Verifying final state...');
  const { data: finalCounts } = await supabase.rpc('get_blog_counts').single();

  // Fallback: manual count
  const { count: totalPublished } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  const { count: totalDrafts } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft');

  const { count: totalRows } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true });

  console.log(`  Total rows: ${totalRows}`);
  console.log(`  Published: ${totalPublished}`);
  console.log(`  Drafts: ${totalDrafts}`);
  console.log(`  Draft slugs: ${Math.round(totalDrafts / 13)} (at 1/day = ~${Math.round(totalDrafts / 13)} days of content)`);

  // Check that daily publisher will work
  const { data: nextDraft } = await supabase
    .from('blog_posts')
    .select('slug, title, created_at')
    .eq('language', 'en')
    .eq('status', 'draft')
    .order('created_at', { ascending: true })
    .limit(1);

  if (nextDraft && nextDraft.length > 0) {
    console.log(`\n📅 Next post to be published by daily action:`);
    console.log(`  "${nextDraft[0].title}"`);
    console.log(`  Slug: ${nextDraft[0].slug}`);
    console.log(`  Created at: ${nextDraft[0].created_at}`);
  }

  console.log('\n✅ Sync complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
