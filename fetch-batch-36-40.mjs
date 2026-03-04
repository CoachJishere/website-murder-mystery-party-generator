import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function fetchBatch() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
  const batch = posts.slice(35, 40);  // Posts 36-40

  console.log(`Found ${batch.length} posts for batch 36-40:\n`);
  batch.forEach((post, idx) => {
    console.log(`Post ${36 + idx}: ${post.slug}`);
    console.log(`Title: ${post.title}`);
    console.log(`ID: ${post.id}`);
    console.log('---');
  });

  // Save to file for translation
  fs.writeFileSync('batch-36-40.json', JSON.stringify(batch, null, 2));
  console.log('\nSaved to batch-36-40.json');
}

fetchBatch();
