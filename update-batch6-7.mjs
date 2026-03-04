import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const batch6 = [
  { name: 'Casino', id: 'casino', trimmed: 'casino', before: 2346, time: 14 },
  { name: 'Train Station', id: 'train-station', trimmed: 'train-station', before: 3056, time: 14 },
  { name: 'Unsatisfying Endings', id: 'unsatisfying-endings', trimmed: 'unsatisfying-endings', before: 2947, time: 14 },
  { name: 'Victorian', id: 'victorian', trimmed: 'victorian', before: 2877, time: 14 },
  { name: 'Game Night', id: 'game-night', trimmed: 'game-night', before: 2868, time: 14 }
];

const batch7 = [
  { name: 'Dinner Parties', id: 'dinner-parties', trimmed: 'dinner-parties', before: 2802, time: 14 },
  { name: 'Circus', id: 'circus-murder-mystery-plot', trimmed: 'circus', before: 2771, time: 13 },
  { name: 'Medieval', id: 'medieval-murder-mystery-plot', trimmed: 'medieval', before: 2764, time: 14 },
  { name: 'Pirate', id: 'pirate-murder-mystery-plot', trimmed: 'pirate', before: 2709, time: 13 },
  { name: 'Ancient Egypt', id: 'ancient-egypt', trimmed: 'ancient-egypt', before: 2747, time: 14 }
];

console.log('=== UPDATING BATCH 6 ===\n');

for (const post of batch6) {
  const postId = readFileSync(`batch6-${post.id}-id.txt`, 'utf-8').trim();
  const trimmedContent = readFileSync(`trimmed-${post.trimmed}.md`, 'utf-8');
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
    console.log(`✅ Success: ${post.before}w → ${wordCount}w (${readingTime} min)\n`);
  }
}

console.log('=== UPDATING BATCH 7 ===\n');

for (const post of batch7) {
  const postId = readFileSync(`batch7-${post.id}-id.txt`, 'utf-8').trim();
  const trimmedContent = readFileSync(`trimmed-${post.trimmed}.md`, 'utf-8');
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
    console.log(`✅ Success: ${post.before}w → ${wordCount}w (${readingTime} min)\n`);
  }
}

console.log('=== ALL 35 POSTS COMPLETE! ===');
