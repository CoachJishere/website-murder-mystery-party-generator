import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const englishSlug = process.argv[2];

if (!englishSlug) {
  console.error('Usage: node translate-pt-single.mjs <english-slug>');
  process.exit(1);
}

// Fetch the English post
const { data: post, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', englishSlug)
  .eq('language', 'en')
  .single();

if (error || !post) {
  console.error('Post not found:', englishSlug);
  process.exit(1);
}

// Export for manual translation
const exportData = {
  english_slug: post.slug,
  english_title: post.title,
  english_meta_description: post.meta_description,
  english_content: post.content,
  reading_time: post.reading_time,
  theme: post.theme,
  tags: post.tags,
  created_at: post.created_at,
  post_date: post.post_date,
  published_at: post.published_at
};

const filename = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/single-post-${englishSlug}.json`;
await fs.writeFile(filename, JSON.stringify(exportData, null, 2));

console.log(`\n✅ Exported post for translation:`);
console.log(`   English Slug: ${post.slug}`);
console.log(`   Title: ${post.title}`);
console.log(`   Content Length: ${post.content.length} characters`);
console.log(`   File: ${filename}`);
console.log(`\nNext: Translate and provide Portuguese title, meta_description, content, and slug`);
