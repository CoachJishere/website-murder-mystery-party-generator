import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  { name: 'Breaking Character', idFile: 'fix-guests-breaking-character', trimmedFile: 'breaking-character', before: 3335, time: 13 },
  { name: 'Film Noir', idFile: 'film-noir', trimmedFile: 'film-noir', before: 3320, time: 14 },
  { name: 'Space Colony', idFile: 'space-colony', trimmedFile: 'space-colony', before: 3244, time: 15 },
  { name: 'Spa Resort', idFile: 'spa-resort', trimmedFile: 'spa-resort', before: 3150, time: 15 },
  { name: 'Haunted Hotel', idFile: 'haunted-hotel', trimmedFile: 'haunted-hotel', before: 3130, time: 15 }
];

console.log('=== UPDATING BATCH 5 POSTS ===\n');

for (const post of posts) {
  const postId = readFileSync(`batch5-${post.idFile}-id.txt`, 'utf-8').trim();
  const trimmedContent = readFileSync(`trimmed-${post.trimmedFile}.md`, 'utf-8');
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
    console.log(`   Before: ${post.before} words (${post.time} min)`);
    console.log(`   After: ${wordCount} words (${readingTime} min)`);
    console.log(`   Trimmed: ${post.before - wordCount} words\n`);
  }
}

console.log('=== BATCH 5 COMPLETE ===');
