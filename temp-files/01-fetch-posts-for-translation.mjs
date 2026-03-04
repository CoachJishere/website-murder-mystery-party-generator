import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  console.log('📚 Fetching English posts for translation...\n');

  // Fetch all English posts updated since Feb 20, 2026
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  if (error) {
    console.error('❌ Error fetching posts:', error.message);
    process.exit(1);
  }

  // Filter to only optimized posts with E-E-A-T signals
  const optimized = posts.filter(p =>
    p.content && p.content.includes('*Published: February 16, 2026')
  );

  console.log(`✅ Found ${optimized.length} optimized posts`);
  console.log(`\nPosts to translate:`);

  // Display list
  optimized.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title} (${p.slug})`);
  });

  // Save to JSON file
  const outputFile = 'temp-files/posts-to-translate-spanish.json';
  writeFileSync(outputFile, JSON.stringify(optimized, null, 2));

  console.log(`\n✅ Saved ${optimized.length} posts to ${outputFile}`);
  console.log('\nNext steps:');
  console.log('1. I will translate these posts in batches');
  console.log('2. Then run the insert script to add them to the database');
}

main();
