import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  // Get all English posts
  const { data: englishPosts, error: enError } = await supabase
    .from('blog_posts')
    .select('slug, title, content')
    .eq('language', 'en')
    .order('slug');

  if (enError) {
    console.error('Error fetching English posts:', enError);
    return;
  }

  // Filter for posts with optimized content (containing "Pubblicato:" or long content)
  const optimizedPosts = englishPosts.filter(p => 
    p.content && (p.content.includes('Published:') || p.content.length > 5000)
  );

  console.log(`Total English optimized posts: ${optimizedPosts.length}`);

  // Get existing Italian posts
  const { data: italianPosts, error: itError } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('language', 'it');

  if (itError) {
    console.error('Error fetching Italian posts:', itError);
    return;
  }

  console.log(`Existing Italian posts: ${italianPosts.length}`);

  // Find remaining posts
  const italianSlugs = new Set(italianPosts.map(p => p.slug));
  const remaining = optimizedPosts.filter(p => !italianSlugs.has(p.slug));

  console.log(`\nRemaining posts to translate: ${remaining.length}\n`);
  
  remaining.forEach((post, i) => {
    console.log(`${i + 1}. ${post.slug}`);
  });
}

main();
