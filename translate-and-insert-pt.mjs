import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertTranslation(postNum, ptSlug) {
  // Read the English post
  const englishData = JSON.parse(fs.readFileSync(`post-${postNum}-en.json`, 'utf8'));

  // Read the translated content
  const translatedData = JSON.parse(fs.readFileSync(`post-${postNum}-pt.json`, 'utf8'));

  const portuguesePost = {
    title: translatedData.title,
    slug: ptSlug,
    content: translatedData.content,
    meta_description: translatedData.meta_description,
    meta_keywords: englishData.meta_keywords,
    language: 'pt',
    theme: englishData.theme,
    status: 'published',
    featured_image_url: englishData.featured_image_url,
    reading_time: englishData.reading_time,
    author: englishData.author,
    tags: englishData.tags,
    published_at: englishData.published_at,
    post_date: englishData.post_date
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([portuguesePost])
    .select();

  if (error) {
    console.error(`Error inserting post ${postNum}:`, error);
    throw error;
  }

  console.log(`✓ Successfully inserted post ${postNum}: ${ptSlug}`);
  console.log(`  ID: ${data[0].id}`);
  return data[0];
}

// Get post number and slug from command line
const postNum = process.argv[2];
const ptSlug = process.argv[3];

if (!postNum || !ptSlug) {
  console.error('Usage: node translate-and-insert-pt.mjs <post-num> <pt-slug>');
  process.exit(1);
}

insertTranslation(postNum, ptSlug);
