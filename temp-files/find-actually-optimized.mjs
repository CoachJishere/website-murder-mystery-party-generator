import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w"
);

console.log('🔍 Finding all posts with E-E-A-T optimization signals...\n');

// Search for posts updated Feb 20-21, 2026 with E-E-A-T signals
const { data: recentPosts, error } = await supabase
  .from('blog_posts')
  .select('slug, title, content, updated_at, reading_time')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('updated_at', { ascending: false })
  .limit(100);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${recentPosts.length} posts updated since Feb 20, 2026\n`);

const optimizedPosts = [];

for (const post of recentPosts) {
  const hasEEAT = post.content.includes('*Published: February 16, 2026') &&
                  post.content.includes('Updated: February 20, 2026') &&
                  post.content.includes('Author: Mystery Maker Party Team');

  const hasStats = post.content.includes('Market Trends & Popularity') &&
                   post.content.includes('| Statistic | Value | Source |');

  const hasSources = post.content.includes('## Sources & References');

  if (hasEEAT && hasStats && hasSources) {
    optimizedPosts.push({
      slug: post.slug,
      title: post.title,
      reading_time: post.reading_time,
      updated_at: post.updated_at
    });
  }
}

console.log(`\n✅ Found ${optimizedPosts.length} fully optimized posts:\n`);

optimizedPosts.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Reading time: ${post.reading_time} min | Updated: ${post.updated_at}\n`);
});

console.log(`\n📊 Total optimized posts: ${optimizedPosts.length}`);
