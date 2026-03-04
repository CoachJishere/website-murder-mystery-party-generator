import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, language, content')
    .order('title');

  // English optimized
  const enOptimized = allPosts.filter(p => 
    p.language === 'en' && p.content && p.content.includes('*Published:')
  );

  const italian = allPosts.filter(p => p.language === 'it');

  console.log(`\n📊 ANALYSIS BY CONTENT`);
  console.log(`════════════════════════════\n`);
  console.log(`English posts with "*Published:" marker: ${enOptimized.length}`);
  console.log(`Italian posts total: ${italian.length}\n`);

  // User said "7/47 done, 40 remaining"
  // So there should be 47 English posts that need Italian versions
  console.log(`User reported: 7/47 done, 40 remaining`);
  console.log(`This means: 47 total target posts\n`);

  // Check Italian posts created today
  const { data: todayPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, created_at')
    .eq('language', 'it')
    .gte('created_at', '2026-02-23')
    .order('created_at');

  console.log(`✅ Italian posts created today (2026-02-23): ${todayPosts.length}\n`);
  todayPosts.forEach((p, i) => {
    const time = new Date(p.created_at).toLocaleTimeString();
    console.log(`${i + 1}. ${p.slug} (${time})`);
  });

  // If user started with 7 and we added 4, that's 11 total
  console.log(`\n📈 PROGRESS CALCULATION`);
  console.log(`════════════════════════════`);
  console.log(`Started with: 7 done`);
  console.log(`Added today: ${todayPosts.length}`);
  console.log(`Current total: ${7 + todayPosts.length} / 47`);
  console.log(`Still needed: ${47 - 7 - todayPosts.length}`);
}

main();
