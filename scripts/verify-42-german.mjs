import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get posts with our specific updated_at timestamp
const { data: batchPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'de')
  .eq('updated_at', '2026-02-20T00:00:00+00:00')
  .order('slug', { ascending: true});

console.log(`\nGerman posts with updated_at = 2026-02-20: ${batchPosts.length}\n`);

if (batchPosts.length > 0) {
  console.log('List of posts:\n');
  batchPosts.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.slug}`);
    if ((idx + 1) % 5 === 0) {
      console.log(`   ✅ Batch ${Math.floor(idx / 5) + 1} (${idx - 3}-${idx + 1})`);
    }
  });
}

console.log(`\n${batchPosts.length === 42 ? '🎉 ALL 42 POSTS CONFIRMED! 🎉' : `Status: ${batchPosts.length}/42 posts`}`);
