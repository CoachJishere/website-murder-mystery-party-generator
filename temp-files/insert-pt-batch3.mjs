import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(fs.readFileSync('temp-files/batch3-posts.json', 'utf-8'));

// Portuguese translations will be loaded from separate JSON file
const translations = JSON.parse(fs.readFileSync('temp-files/batch3-pt-content.json', 'utf-8'));

console.log('Starting Portuguese insertions for Batch 3 (Posts 11-15)...\n');

let successCount = 0;
let skipCount = 0;

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const translation = translations[i];

  console.log(`\n[${i + 11}/15] Processing: ${post.slug}`);
  console.log(`Portuguese slug: ${translation.slug}`);

  // Check if already exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', translation.slug)
    .eq('language', 'pt')
    .single();

  if (existing) {
    console.log(`⊘ Already exists - skipping`);
    skipCount++;
    continue;
  }

  const portuguesePost = {
    slug: translation.slug,
    title: translation.title,
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'pt',
    reading_time: post.reading_time,
    theme: post.theme,
    status: 'published',
    author: 'AI Assistant',
    tags: post.tags,
    created_at: post.created_at,
    updated_at: new Date().toISOString(),
    post_date: post.post_date,
    published_at: post.published_at
  };

  const { error } = await supabase
    .from('blog_posts')
    .insert(portuguesePost);

  if (error) {
    console.log(`✗ Error: ${error.message}`);
  } else {
    console.log(`✅ Inserted successfully`);
    successCount++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✓ Batch 3 Complete`);
console.log(`Success: ${successCount}, Skipped: ${skipCount}`);
console.log(`${'='.repeat(50)}`);
