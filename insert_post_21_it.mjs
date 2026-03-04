import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the original English post
const originalPost = JSON.parse(readFileSync('post_it_21.json', 'utf8'));

// Read the translation
const translation = readFileSync('post_21_italian_translation.txt', 'utf8');

// Parse the translation file
const lines = translation.split('\n');
let title = '';
let meta_description = '';
let slug = '';
let content = '';

let section = '';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line === 'TITLE:') {
    section = 'title';
    continue;
  } else if (line === 'META_DESCRIPTION:') {
    section = 'meta_description';
    continue;
  } else if (line === 'SLUG:') {
    section = 'slug';
    continue;
  } else if (line === 'CONTENT:') {
    section = 'content';
    continue;
  }
  
  if (section === 'title' && line.trim()) {
    title = line.trim();
    section = '';
  } else if (section === 'meta_description' && line.trim()) {
    meta_description = line.trim();
    section = '';
  } else if (section === 'slug' && line.trim()) {
    slug = line.trim();
    section = '';
  } else if (section === 'content') {
    content += line + '\n';
  }
}

content = content.trim();

console.log('Inserting Italian translation for Post 21...');
console.log(`Title: ${title}`);
console.log(`Slug: ${slug}`);
console.log(`Content length: ${content.length} characters\n`);

// Check if already exists
const { data: existing } = await supabase
  .from('blog_posts')
  .select('id')
  .eq('slug', slug)
  .eq('language', 'it')
  .single();

if (existing) {
  console.log('⚠️  Post already exists. Updating...');
  const { error } = await supabase
    .from('blog_posts')
    .update({
      title: title,
      meta_description: meta_description,
      content: content,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id);
  
  if (error) {
    console.error('❌ Error updating:', error);
  } else {
    console.log('✅ 1/5 Updated successfully');
  }
} else {
  // Insert new post
  const { error } = await supabase
    .from('blog_posts')
    .insert({
      slug: slug,
      title: title,
      meta_description: meta_description,
      meta_keywords: originalPost.meta_keywords,
      content: content,
      language: 'it',
      theme: originalPost.theme,
      status: originalPost.status,
      reading_time: originalPost.reading_time,
      author: originalPost.author,
      tags: originalPost.tags,
      published_at: originalPost.published_at,
      post_date: originalPost.post_date
    });
  
  if (error) {
    console.error('❌ Error inserting:', error);
  } else {
    console.log('✅ 1/5 Inserted successfully');
  }
}
