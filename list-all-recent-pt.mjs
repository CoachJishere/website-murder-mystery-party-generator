import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: ptPosts } = await supabase
  .from('blog_posts')
  .select('slug, title, updated_at')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00') // Today's translations
  .order('updated_at');

console.log(`Portuguese posts created TODAY (${ptPosts.length} total):\n`);
ptPosts.forEach((p, i) => {
  console.log(`${i+1}. ${p.slug}`);
  console.log(`   ${p.title}`);
  console.log(`   Updated: ${p.updated_at}\n`);
});
