import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function checkStatus() {
  // Get all optimized English posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
  console.log(`Total optimized English posts: ${optimized.length}\n`);

  // Get existing Italian posts
  const { data: italian } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'it')
    .order('slug');

  console.log(`Total Italian posts: ${italian.length}\n`);

  // Check which optimized posts have Italian versions
  let hasItalian = 0;
  let needsItalian = 0;
  const missing = [];

  for (const post of optimized) {
    const italianSlug = post.slug + '-it';
    const exists = italian.some(it => it.slug === italianSlug);

    if (exists) {
      hasItalian++;
    } else {
      needsItalian++;
      missing.push({
        num: needsItalian,
        title: post.title,
        slug: post.slug
      });
    }
  }

  console.log(`✅ Optimized posts WITH Italian translation: ${hasItalian}/47`);
  console.log(`❌ Optimized posts MISSING Italian translation: ${needsItalian}/47\n`);

  if (missing.length > 0) {
    console.log('MISSING TRANSLATIONS:\n');
    missing.forEach(m => {
      console.log(`${m.num}. ${m.title}`);
      console.log(`   Slug: ${m.slug}\n`);
    });
  }
}

checkStatus();
