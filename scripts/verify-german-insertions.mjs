import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all German posts
const { data: allGermanPosts } = await supabase
  .from('blog_posts')
  .select('slug, title, updated_at')
  .eq('language', 'de')
  .order('updated_at', { ascending: false });

console.log(`\nTotal German posts in database: ${allGermanPosts.length}\n`);

// Filter for recently added posts (today)
const today = '2026-02-22';
const recentPosts = allGermanPosts.filter(p => p.updated_at.startsWith(today));

console.log(`Posts added/updated today (${today}): ${recentPosts.length}\n`);

if (recentPosts.length > 0) {
  console.log('Recently added German posts:\n');
  recentPosts.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.slug}`);
  });
  
  if (recentPosts.length === 42) {
    console.log(`\n🎉 SUCCESS! All 42 German posts confirmed in database! 🎉`);
  } else if (recentPosts.length > 42) {
    console.log(`\n✅ ${recentPosts.length} German posts added (${recentPosts.length - 42} extra)`);
  } else {
    console.log(`\n⚠️  Only ${recentPosts.length}/42 posts found`);
  }
}
