import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read posts
const posts = JSON.parse(fs.readFileSync('posts-to-translate-ja.json', 'utf-8'));

console.log(`Processing ${posts.length} posts for translation`);

// Process in batches
const batchSize = 5;
let processedCount = 0;

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  
  // Save each post individually for translation
  const filename = `to-translate-${i + 6}-${post.slug}.json`;
  fs.writeFileSync(filename, JSON.stringify(post, null, 2));
  
  processedCount++;
  
  if (processedCount % batchSize === 0) {
    console.log(`✅ Prepared posts ${processedCount - batchSize + 6}-${processedCount + 5} for translation`);
  }
}

console.log(`\n✅ All ${posts.length} posts prepared for translation`);
console.log('Files saved as: to-translate-[number]-[slug].json');
