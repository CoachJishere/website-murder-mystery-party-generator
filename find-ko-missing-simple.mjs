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
    .select('id, slug, title, content, meta_description')
    .eq('language', 'en')
    .eq('status', 'published')
    .order('created_at', { ascending: true });

  if (enError) {
    console.error('Error fetching English posts:', enError);
    return;
  }

  console.log(`Total English posts: ${enPosts.length}`);

  // Get all Korean posts
  const { data: koPosts, error: koError } = await supabase
    .from('blog_posts')
    .select('id, slug, title, content')
    .eq('language', 'ko')
    .eq('status', 'published');

  if (koError) {
    console.error('Error fetching Korean posts:', koError);
    return;
  }

  console.log(`Total Korean posts: ${koPosts.length}`);
  console.log(`Missing: ${enPosts.length - koPosts.length} posts\n`);

  // Extract unique English slug patterns from Korean content
  // Korean posts contain metadata headers with English slug references
  const koEnglishSlugs = new Set();

  for (const koPost of koPosts) {
    // Try to extract English slug from content metadata
    const content = koPost.content || '';

    // Look for patterns like "원본 영어 포스트: /blog/..." or similar
    // Or check if the content mentions the English slug
    const slugMatch = content.match(/\/blog\/([\w-]+)/);
    if (slugMatch) {
      koEnglishSlugs.add(slugMatch[1]);
    }

    // Also check for metadata patterns
    const metaMatch = content.match(/영어 원문[:\s]+(.+)/);
    if (metaMatch) {
      const slug = metaMatch[1].split('/').pop()?.trim();
      if (slug) {
        koEnglishSlugs.add(slug);
      }
    }
  }

  console.log('Extracted English slug references from Korean content:', koEnglishSlugs.size);

  // Find English posts that don't have Korean translations
  // Since we can't rely on slug matching, we'll just list all English posts
  // and manually identify the missing ones

  const missingPosts = [];

  // Simple approach: Since we know we're missing 9 posts,
  // we need to identify which ones by theme/title pattern

  // Let's create a list of all English posts for manual review
  console.log('\n=== ALL ENGLISH POSTS (for reference) ===\n');

  enPosts.forEach((post, idx) => {
    console.log(`${idx + 1}. ${post.title}`);
    console.log(`   ID: ${post.id}`);
    console.log(`   Slug: ${post.slug}\n`);
  });

  // Save all English posts for fetching
  fs.writeFileSync('ko-all-english-posts.json', JSON.stringify({
    language: 'ko',
    total_english: enPosts.length,
    total_korean: koPosts.length,
    missing_count: enPosts.length - koPosts.length,
    all_english_posts: enPosts.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      meta_description: p.meta_description
    }))
  }, null, 2));

  console.log('✓ Saved all English posts to ko-all-english-posts.json');

  return enPosts;
}

findMissingKoreanPosts();
