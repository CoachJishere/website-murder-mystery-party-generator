import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load translated posts
const translatedPosts = JSON.parse(
  readFileSync(join(__dirname, 'german-translated-batch-2-10.json'), 'utf-8')
);

console.log(`Inserting ${translatedPosts.length} German posts into Supabase...\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (let i = 0; i < translatedPosts.length; i++) {
  const post = translatedPosts[i];
  const postNumber = i + 2;

  console.log(`[${postNumber}/10] Processing: ${post.slug.substring(0, 50)}...`);

  try {
    // Check if German version already exists
    const { data: existing, error: checkError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', post.slug)
      .eq('language', 'de')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      console.log(`  ⊘ German version already exists (id: ${existing.id})`);
      skipCount++;
      continue;
    }

    // Insert German version
    const germanPost = {
      slug: post.slug,
      title: post.title,
      content: post.content,
      meta_description: post.meta_description,
      language: 'de',
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(germanPost)
      .select();

    if (error) throw error;

    console.log(`  ✓ Inserted successfully (id: ${data[0].id})`);
    successCount++;

  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n========== SUMMARY ==========`);
console.log(`Total posts processed: ${translatedPosts.length}`);
console.log(`✓ Successfully inserted: ${successCount}`);
console.log(`⊘ Skipped (already exist): ${skipCount}`);
console.log(`✗ Errors: ${errorCount}`);
console.log(`============================\n`);

if (successCount > 0) {
  console.log(`Verifying insertions...`);

  // Verify all German posts exist
  const { data: germanPosts, error } = await supabase
    .from('blog_posts')
    .select('slug, title, language')
    .eq('language', 'de')
    .in('slug', translatedPosts.map(p => p.slug));

  if (error) {
    console.error('Verification error:', error.message);
  } else {
    console.log(`\n✓ Verified ${germanPosts.length} German posts in database`);
    germanPosts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.slug.substring(0, 40)}...`);
    });
  }
}
