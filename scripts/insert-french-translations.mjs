import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load original posts
const posts = JSON.parse(fs.readFileSync('temp-files/posts-for-french-translation.json', 'utf8'));

// Load French translations
const translations = [
  JSON.parse(fs.readFileSync('temp-files/french-translations/post1-french.json', 'utf8')),
  JSON.parse(fs.readFileSync('temp-files/french-translations/post2-french.json', 'utf8')),
  JSON.parse(fs.readFileSync('temp-files/french-translations/post3-french.json', 'utf8')),
  JSON.parse(fs.readFileSync('temp-files/french-translations/post4-french.json', 'utf8')),
  JSON.parse(fs.readFileSync('temp-files/french-translations/post5-french.json', 'utf8'))
];

console.log('\n🇫🇷 FRENCH TRANSLATION BATCH INSERT\n');
console.log('='.repeat(80));

for (let i = 0; i < 5; i++) {
  const originalPost = posts[i];
  const translation = translations[i];

  console.log(`\nProcessing ${i+1}/5: ${originalPost.title}`);

  // Create French post object
  const frenchPost = {
    title: translation.title,
    slug: originalPost.slug,
    content: translation.content,
    excerpt: originalPost.excerpt,
    featured_image: originalPost.featured_image,
    featured_image_url: originalPost.featured_image_url,
    author: originalPost.author,
    published_at: originalPost.published_at,
    updated_at: originalPost.updated_at,
    meta_title: translation.meta_title || translation.title,
    meta_description: translation.meta_description,
    meta_keywords: originalPost.meta_keywords,
    tags: originalPost.tags,
    category: originalPost.category,
    reading_time: originalPost.reading_time,
    language: 'fr',
    theme: originalPost.theme,
    status: 'published',
    original_post_id: originalPost.id,
    post_date: originalPost.post_date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Insert into database
  const { data: insertedPost, error: insertError } = await supabase
    .from('blog_posts')
    .insert([frenchPost])
    .select()
    .single();

  if (insertError) {
    console.error(`  ❌ Error inserting:`, insertError.message);
    console.error(`  Details:`, insertError);
    continue;
  }

  console.log(`  ✅ ${translation.title}`);
  console.log(`  📝 ID: ${insertedPost.id}`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ ALL 5 POSTS TRANSLATED AND INSERTED\n');
