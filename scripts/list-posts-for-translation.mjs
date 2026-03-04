import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));

  console.log(`Found ${optimized.length} optimized posts\n`);

  // Split into batches of 10
  const batches = [];
  for (let i = 0; i < optimized.length; i += 10) {
    batches.push(optimized.slice(i, i + 10));
  }

  batches.forEach((batch, batchIndex) => {
    const output = batch.map((post, idx) => 
      `${batchIndex * 10 + idx + 1}. ${post.title}\n   ID: ${post.id}\n   Slug: ${post.slug}\n   Theme: ${post.theme || 'N/A'}`
    ).join('\n\n');

    writeFileSync(`temp-files/batch-${batchIndex + 1}-posts.txt`, output);
    console.log(`Batch ${batchIndex + 1}: Posts ${batchIndex * 10 + 1}-${Math.min((batchIndex + 1) * 10, optimized.length)} saved`);
  });

  // Save full list for easy access
  writeFileSync(`temp-files/all-posts-to-translate.json`, JSON.stringify(optimized.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug
  })), null, 2));

  console.log(`\n✅ Created ${batches.length} batch files`);
  console.log(`Total posts: ${optimized.length}`);
}

main();
