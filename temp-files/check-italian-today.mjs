import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('slug, title, created_at')
  .eq('language', 'it')
  .order('created_at', { ascending: false })
  .limit(50);

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Total Italian posts: ${data.length}`);
  console.log('\nRecent Italian posts:');
  data.slice(0, 10).forEach((p, i) => {
    console.log(`${i + 1}. ${p.slug}`);
    console.log(`   Created: ${p.created_at}`);
  });
}
