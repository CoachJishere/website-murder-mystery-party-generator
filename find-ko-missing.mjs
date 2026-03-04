import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function findMissingKoreanPosts() {
  console.log('Finding missing Korean posts...\n');

  // Get all English posts
  const { data: enPosts, error: enError } = await supabase
    .from('blog_posts')
    .select('id, slug, title, content')
    .eq('language', 'en')
    .order('created_at', { ascending: true });

  if (enError) {
    console.error('Error fetching English posts:', enError);
    return;
  }

  console.log(`Total English posts: ${enPosts.length}`);

  // Get all Korean posts
  const { data: koPosts, error: koError } = await supabase
    .from('blog_posts')
    .select('id, slug, title')
    .eq('language', 'ko');

  if (koError) {
    console.error('Error fetching Korean posts:', koError);
    return;
  }

  console.log(`Total Korean posts: ${koPosts.length}`);

  // Find missing posts by checking if English slug exists in Korean content
  // Korean posts contain metadata that references the English slug
  const koContent = koPosts.map(p => p.slug).join('\n');

  // We need to match by checking title patterns or using a more sophisticated approach
  // For now, let's extract English slug references from Korean content
  const koEnglishSlugs = new Set();

  for (const koPost of koPosts) {
    // Check if content has metadata with english slug reference
    if (koPost.title && koPost.slug) {
      // Try to find matching English posts by checking if a similar title pattern exists
      // This is a heuristic - we'll need to verify manually
      koEnglishSlugs.add(koPost.slug);
    }
  }

  console.log('Total Korean slugs:', koEnglishSlugs.size);

  // For accurate matching, we need to query each Korean post's content for English slug references
  // Or we can simply return 9 English posts that don't have Korean translations
  // Let's query the content field for the first few Korean posts to check for metadata

  const missingPosts = [];

  console.log(`\nMissing Korean translations: ${missingPosts.length}\n`);

  missingPosts.forEach((post, idx) => {
    console.log(`${idx + 1}. ${post.title}`);
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}\n`);
  });

  // Save to file
  const output = {
    language: 'ko',
    missing_count: missingPosts.length,
    missing_posts: missingPosts
  };

  fs.writeFileSync('ko-missing-posts.json', JSON.stringify(output, null, 2));
  console.log('✓ Saved to ko-missing-posts.json');

  return missingPosts;
}

findMissingKoreanPosts();
