import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  {
    name: 'Date Night',
    idFile: 'batch4-date-night-id.txt',
    contentFile: 'trimmed-date-night.md',
    before: { words: 3382, time: 13 }
  },
  {
    name: 'Office Teams',
    idFile: 'batch4-office-teams-id.txt',
    contentFile: 'trimmed-office-teams.md',
    before: { words: 3359, time: 14 }
  }
];

console.log('=== UPDATING FINAL BATCH 4 POSTS ===\n');

for (const post of posts) {
  const postId = readFileSync(post.idFile, 'utf-8').trim();
  const trimmedContent = readFileSync(post.contentFile, 'utf-8');
  const wordCount = trimmedContent.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  console.log(`Updating ${post.name}...`);
  
  const { error } = await supabase
    .from('blog_posts')
    .update({
      content: trimmedContent,
      reading_time: readingTime,
      updated_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) {
    console.error(`❌ Error: ${error.message}`);
  } else {
    console.log(`✅ Successfully updated ${post.name}`);
    console.log(`   Before: ${post.before.words} words (${post.before.time} min)`);
    console.log(`   After: ${wordCount} words (${readingTime} min)`);
    console.log(`   Trimmed: ${post.before.words - wordCount} words\n`);
  }
}

console.log('=== BATCH 4 COMPLETE ===');
