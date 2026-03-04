import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(supabaseUrl, supabaseKey);

// Load the missing posts
const missing = JSON.parse(fs.readFileSync('sv-missing-posts-final.json', 'utf8'));

console.log(`Fetching ${missing.length} posts...\n`);

const allPosts = [];

for (const post of missing) {
  console.log(`Fetching: ${post.title}...`);
  
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', post.id)
    .single();
  
  if (error) {
    console.error(`  Error: ${error.message}`);
    continue;
  }
  
  allPosts.push(data);
  console.log(`  ✓ Fetched (${data.content.length} chars)`);
}

console.log(`\n✓ Fetched ${allPosts.length} posts`);

// Save to file
fs.writeFileSync('sv-batch-all-posts.json', JSON.stringify(allPosts, null, 2));
console.log('✓ Saved to sv-batch-all-posts.json');

