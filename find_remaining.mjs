import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  // Get English posts with "Published:" in content (optimized marker)
  const { data: allEnglish, error: enError } = await supabase
    .from('blog_posts')
    .select('slug, title, content')
    .eq('language', 'en')
    .order('slug');

  if (enError) {
    console.error('Error:', enError);
    return;
  }

  const optimizedEnglish = allEnglish.filter(p => 
    p.content && p.content.includes('*Published:')
  );

  console.log(`English posts with optimized content: ${optimizedEnglish.length}`);

  // Get Italian posts
  const { data: italian, error: itError } = await supabase
    .from('blog_posts')
    .select('slug, title')
    .eq('language', 'it');

  if (itError) {
    console.error('Error:', itError);
    return;
  }

  console.log(`Italian posts: ${italian.length}`);

  // Find which English slugs don't have Italian equivalents
  const italianSlugs = new Set(italian.map(p => p.slug));
  const remaining = optimizedEnglish.filter(p => !italianSlugs.has(p.slug));

  console.log(`\nRemaining to translate: ${remaining.length}\n`);
  
  remaining.slice(0, 40).forEach((post, i) => {
    console.log(`${i + 1}. ${post.slug}`);
  });
}

main();
