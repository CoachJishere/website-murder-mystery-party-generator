// Supabase-driven Pinterest pin generator.
//
// Flow:
//   1. Read pinterest_pins rows where status='approved' (limit configurable)
//   2. For each: lock to status='generating', call Flux 1.1 Pro, composite pin,
//      upload pin + raw image to storage, set status='generated'
//   3. On error: status='failed', generation_error=...
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/pinterest/run-generation.mjs [--limit 5] [--dry-run]

import 'dotenv/config';
import { createClient } from '../_supabase-node.mjs';
import { buildOverlaySvg, callFlux11Pro, composePin, cropToBlogHero } from './lib/compose.mjs';

const BUCKET = 'pinterest-pins';
const DEFAULT_LIMIT = 5;

function parseArgs() {
  const args = { limit: DEFAULT_LIMIT, dryRun: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--limit') { args.limit = parseInt(argv[++i], 10); }
    else if (k === '--dry-run') { args.dryRun = true; }
  }
  return args;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in env`);
  return v;
}

async function uploadToStorage(supabase, key, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`Storage upload failed for ${key}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

async function processRow(supabase, row, { dryRun }) {
  console.log(`\n[${row.id}] ${row.blog_post_title || row.blog_post_url}`);
  console.log(`  prompt: ${row.image_prompt.slice(0, 80)}...`);
  console.log(`  overlay: "${row.overlay_text}"`);

  if (dryRun) { console.log('  (dry-run — skipping)'); return; }

  // Lock the row.
  {
    const { error } = await supabase
      .from('pinterest_pins')
      .update({ status: 'generating', generation_error: null })
      .eq('id', row.id)
      .eq('status', 'approved'); // optimistic — only flip if still approved
    if (error) throw new Error(`Failed to lock row: ${error.message}`);
  }

  try {
    console.log('  → Flux 1.1 Pro...');
    const rawImage = await callFlux11Pro(row.image_prompt);

    console.log('  → Composing overlay + blog hero crop...');
    const overlaySvg = await buildOverlaySvg(row.overlay_text, { font: 'oswald', pill: false });
    const [finalPin, blogHero] = await Promise.all([
      composePin({ imageBuf: rawImage, overlaySvg }),
      cropToBlogHero(rawImage),
    ]);

    console.log('  → Uploading...');
    const [pinUrl, rawUrl, heroUrl] = await Promise.all([
      uploadToStorage(supabase, `pins/${row.id}.png`, finalPin),
      uploadToStorage(supabase, `raw/${row.id}.png`, rawImage),
      uploadToStorage(supabase, `blog-hero/${row.id}.png`, blogHero),
    ]);

    const { error } = await supabase
      .from('pinterest_pins')
      .update({
        status: 'generated',
        pin_image_url: pinUrl,
        raw_image_url: rawUrl,
        blog_hero_url: heroUrl,
        generation_error: null,
      })
      .eq('id', row.id);
    if (error) throw new Error(`Failed to mark generated: ${error.message}`);

    // If this pin links to a blog post and the blog post has no hero image yet,
    // populate it from the just-uploaded blog hero crop.
    if (row.blog_post_id) {
      const { error: heroErr } = await supabase
        .from('blog_posts')
        .update({ featured_image_url: heroUrl })
        .eq('id', row.blog_post_id)
        .or('featured_image_url.is.null,featured_image_url.eq.');
      if (heroErr) console.warn(`  ⚠ Failed to set blog featured_image_url: ${heroErr.message}`);
    }

    console.log(`  ✓ ${pinUrl}`);
  } catch (err) {
    // Defensive: err may be undefined, a string, or an Error without a message.
    const msg = (err && (err.message || err.toString())) || 'Unknown error (err was falsy)';
    console.error(`  ✗ ${msg}`);
    try {
      await supabase
        .from('pinterest_pins')
        .update({ status: 'failed', generation_error: msg.slice(0, 1000) })
        .eq('id', row.id);
    } catch (updateErr) {
      // If even the error-recording update fails, fall back to resetting the row
      // so it isn't stuck in 'generating' forever. Swallow this — don't crash the batch.
      console.error(`  ✗ Could not record failure for ${row.id}:`, (updateErr && updateErr.message) || updateErr);
      try {
        await supabase
          .from('pinterest_pins')
          .update({ status: 'approved' })
          .eq('id', row.id)
          .eq('status', 'generating');
      } catch { /* give up */ }
    }
  }
}

async function main() {
  const { limit, dryRun } = parseArgs();
  const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Recover any rows stuck in 'generating' from a prior crashed run (older than 30 min).
  // Resets them to 'approved' so this run picks them up.
  {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuck, error: stuckErr } = await supabase
      .from('pinterest_pins')
      .update({ status: 'approved' })
      .eq('status', 'generating')
      .lt('updated_at', cutoff)
      .select('id');
    if (stuckErr) console.warn(`Stuck-row recovery query failed: ${stuckErr.message}`);
    else if (stuck && stuck.length) console.log(`Recovered ${stuck.length} stuck 'generating' row(s) from prior run.`);
  }

  const { data: rows, error } = await supabase
    .from('pinterest_pins')
    .select('id, blog_post_id, blog_post_url, blog_post_title, image_prompt, overlay_text')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch approved rows: ${error.message}`);
  if (!rows || rows.length === 0) {
    console.log('No approved rows to generate.');
    return;
  }

  console.log(`Found ${rows.length} approved row(s). Processing sequentially.${dryRun ? ' [DRY RUN]' : ''}`);
  for (const row of rows) await processRow(supabase, row, { dryRun });
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('FATAL:', (err && (err.message || err.toString())) || 'Unknown error');
  process.exit(1);
});
