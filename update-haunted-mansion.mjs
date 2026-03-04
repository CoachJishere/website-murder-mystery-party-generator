import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const postId = readFileSync('batch4-haunted-mansion-id.txt', 'utf-8').trim();
const trimmedContent = readFileSync('trimmed-haunted-mansion.md', 'utf-8');
const wordCount = trimmedContent.split(/\s+/).length;
const readingTime = Math.ceil(wordCount / 200);

console.log(`Updating Haunted Mansion post...`);
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
  console.log('✅ Successfully updated Haunted Mansion post');
  console.log(`   Before: 2,455 words (14 min)`);
  console.log(`   After: ${wordCount} words (${readingTime} min)`);
  console.log(`   Trimmed: ${2455 - wordCount} words`);
}
