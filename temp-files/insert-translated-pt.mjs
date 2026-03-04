import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the index from command line argument
const index = parseInt(process.argv[2]);
if (!index || index < 1 || index > 20) {
  console.error('Usage: node insert-translated-pt.mjs <index> <title> <content_file>');
  console.error('Example: node insert-translated-pt.mjs 1 "Título" temp-files/translated-1.txt');
  process.exit(1);
}

const title = process.argv[3];
const contentFile = process.argv[4];

// Read the original post data
const sourceData = JSON.parse(await fs.readFile(`temp-files/to-translate-${index}.json`, 'utf8'));
const translatedContent = await fs.readFile(contentFile, 'utf8');

// Create Portuguese post
const portuguesePost = {
  title: title,
  content: translatedContent,
  slug: sourceData.ptSlug,
  meta_description: sourceData.post.meta_description, // Keep English for now
  meta_keywords: sourceData.post.meta_keywords, // Keep English for now
  language: 'pt',
  theme: sourceData.theme,
  status: 'published',
  featured_image_url: sourceData.post.featured_image_url,
  reading_time: sourceData.post.reading_time,
  author: 'AI Assistant',
  tags: [sourceData.theme],
  published_at: '2025-12-19T05:00:19.931+00:00',
  post_date: '2025-12-19'
};

// Insert into database
const { data, error } = await supabase
  .from('blog_posts')
  .insert([portuguesePost])
  .select();

if (error) {
  console.error(`❌ Error inserting post ${index}:`, error);
  process.exit(1);
}

console.log(`✅ ${index}/20 Complete: ${sourceData.ptSlug}`);
console.log(JSON.stringify(data, null, 2));
