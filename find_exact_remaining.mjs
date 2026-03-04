import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  // Get all posts
  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, language, content')
    .order('slug');

  // Filter English optimized
  const enOptimized = allPosts.filter(p => 
    p.language === 'en' && p.content && p.content.includes('*Published:')
  );

  // Get Italian slugs  
  const italian = allPosts.filter(p => p.language === 'it');
  const itSlugs = new Set(italian.map(p => p.slug));

  // Find which English posts DON'T have matching Italian slug
  const remaining = enOptimized.filter(p => !itSlugs.has(p.slug));

  console.log(`English optimized posts: ${enOptimized.length}`);
  console.log(`Italian posts: ${italian.length}`);
  console.log(`Remaining (English slug not in Italian): ${remaining.length}\n`);

  if (remaining.length <= 40) {
    console.log(`Remaining posts to translate:\n`);
    remaining.forEach((p, i) => {
      console.log(`${i + 1}. ${p.slug}`);
    });
  }
}

main();
