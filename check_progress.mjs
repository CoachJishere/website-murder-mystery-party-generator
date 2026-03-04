import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  // Get English optimized posts
  const { data: enPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, content')
    .eq('language', 'en')
    .order('slug');

  const optimized = enPosts.filter(p => p.content && p.content.includes('*Published:'));

  // Get Italian posts
  const { data: itPosts } = await supabase
    .from('blog_posts')
    .select('slug, created_at')
    .eq('language', 'it')
    .order('created_at', { ascending: false });

  const today = itPosts.filter(p => p.created_at.startsWith('2026-02-23'));

  console.log(`📊 TRANSLATION PROGRESS REPORT`);
  console.log(`═══════════════════════════════════════\n`);
  console.log(`English optimized posts: ${optimized.length}`);
  console.log(`Total Italian posts: ${itPosts.length}`);
  console.log(`Italian posts created today: ${today.length}\n`);
  
  console.log(`✅ Completed today:`);
  today.forEach((p, i) => {
    console.log(`${i + 1}. ${p.slug}`);
  });

  // Find remaining
  const itSlugs = new Set(itPosts.map(p => p.slug));
  const remaining = optimized.filter(p => !itSlugs.has(p.slug));

  console.log(`\n📋 Remaining to translate: ${remaining.length}\n`);
  console.log(`TARGET: ${optimized.length}/${optimized.length} Italian translations`);
  console.log(`CURRENT: ${itPosts.length}/${optimized.length} (${Math.round(itPosts.length/optimized.length*100)}%)`);
  console.log(`NEEDED: ${remaining.length} more translations\n`);
}

main();
