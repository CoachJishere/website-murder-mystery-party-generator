import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get the optimized posts
const { data: englishPosts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const postsWithEEAT = englishPosts.filter(p => p.content?.includes('*Published: February 16, 2026'));

console.log(`Total optimized English posts: ${postsWithEEAT.length}\n`);

// Check posts 45-47
const batch = postsWithEEAT.slice(44, 47);

console.log('Posts 45-47:');
for (let i = 0; i < batch.length; i++) {
  const post = batch[i];
  console.log(`\n${i + 45}. ${post.title}`);
  console.log(`   English slug: ${post.slug}`);
  console.log(`   Theme: ${post.theme}`);
  
  // Check for Italian version
  const { data: italianPosts } = await supabase
    .from('blog_posts')
    .select('slug, created_at, content')
    .eq('language', 'it')
    .or(`slug.ilike.%${post.slug.substring(0, 20)}%,slug.ilike.%${post.theme?.toLowerCase().replace(/\s+/g, '-')}%`);
  
  if (italianPosts && italianPosts.length > 0) {
    const withEEAT = italianPosts.filter(p => p.content?.includes('*Pubblicato: 16 febbraio 2026'));
    if (withEEAT.length > 0) {
      console.log(`   ✅ HAS Italian translation WITH E-E-A-T: ${withEEAT[0].slug}`);
    } else {
      console.log(`   ⚠️  HAS Italian translation but WITHOUT E-E-A-T: ${italianPosts[0].slug}`);
      console.log(`      Created: ${italianPosts[0].created_at}`);
    }
  } else {
    console.log(`   ❌ NO Italian translation found`);
  }
}

