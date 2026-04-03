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
 */

import { createClient } from '@supabase/supabase-js';
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
      const title = row.getCell(titleCol).value || '';
      const content = row.getCell(contentCol).value || '';
      const meta = row.getCell(metaCol).value || '';
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
  console.log('\n✏️  Updating published posts with audited translations...');
  let updateCount = 0;
  let updateErrors = 0;

  // Process in batches of 1 row at a time (content is too large for bulk upsert)
  for (const record of publishedRows) {
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
        console.log(`  Updated ${updateCount}/${publishedRows.length}...`);
      }
    }
  }
  console.log(`  ✅ Updated ${updateCount} published rows (${updateErrors} errors)`);

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
