import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all English optimized posts
const { data: enPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (enError) {
  console.error('Error fetching English posts:', enError);
  process.exit(1);
}

// Get existing Portuguese posts from today
const { data: ptPosts, error: ptError } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00');

if (ptError) {
  console.error('Error fetching Portuguese posts:', ptError);
  process.exit(1);
}

const ptSlugs = new Set(ptPosts.map(p => p.slug.replace(/-pt$/, '')));
const remaining = enPosts.filter(post => !ptSlugs.has(post.slug));

console.log(`English posts: ${enPosts.length}`);
console.log(`Portuguese completed: ${ptPosts.length}`);
console.log(`Remaining to translate: ${remaining.length}`);
console.log('\nRemaining posts to translate:');
remaining.forEach((post, i) => {
  console.log(`${i + 1}. ${post.slug}`);
});
