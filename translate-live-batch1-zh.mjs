import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch first 5 LIVE English posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('slug')
  .limit(5);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Fetched posts for Batch 1 (1-5):');
posts.forEach((p, i) => {
  console.log(`${i + 1}. ${p.slug}`);
  console.log(`   Title: ${p.title}`);
  console.log(`   Content length: ${p.content?.length || 0} chars\n`);
});

console.log('\nTotal posts:', posts.length);
