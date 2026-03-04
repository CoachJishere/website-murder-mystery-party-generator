import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const postId = readFileSync('batch4-bookstore-id.txt', 'utf-8').trim();
const trimmedContent = readFileSync('trimmed-bookstore.md', 'utf-8');
const wordCount = trimmedContent.split(/\s+/).length;
const readingTime = Math.ceil(wordCount / 200);

console.log(`\nUpdating Bookstore post...`);
console.log(`Word count: ${wordCount}`);
console.log(`Reading time: ${readingTime} min`);

const { error } = await supabase
  .from('blog_posts')
  .update({
    content: trimmedContent,
    reading_time: readingTime,
    updated_at: new Date().toISOString()
  })
  .eq('id', postId);

if (error) {
  console.error('❌ Error:', error.message);
} else {
  console.log('✅ Successfully updated Bookstore post');
  console.log(`   Before: 3,456 words (15 min)`);
  console.log(`   After: ${wordCount} words (${readingTime} min)`);
  console.log(`   Trimmed: ${3456 - wordCount} words`);
}
