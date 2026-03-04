import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  const { data: italianPosts, error } = await supabase
    .from('blog_posts')
    .select('slug, title, created_at')
    .eq('language', 'it')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total Italian posts: ${italianPosts.length}\n`);
  
  // Group by date
  const today = italianPosts.filter(p => p.created_at.startsWith('2026-02-23'));
  console.log(`Created today (2026-02-23): ${today.length}`);
  
  if (today.length > 0) {
    console.log('\nToday\'s posts:');
    today.forEach((p, i) => {
      console.log(`${i + 1}. ${p.slug}`);
    });
  }
}

main();
