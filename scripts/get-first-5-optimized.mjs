import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('slug, title, reading_time, content')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
console.log(`Found ${optimized.length} total optimized posts`);
console.log('\nFirst 5 optimized posts for Portuguese batch 1:\n');

const batch1 = optimized.slice(0, 5);
batch1.forEach((p, i) => {
  console.log(`${i + 1}. ${p.slug}`);
  console.log(`   Title: ${p.title}`);
  console.log(`   Reading time: ${p.reading_time} min`);
  console.log('');
});
