import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Fetching English posts 58-61 for German Batch 3...\n');

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, meta_description')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('id', { ascending: true })
  .range(57, 60);  // Posts 58-61 (0-indexed 57-60)

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const outputPath = "/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/german-batch-3-posts-58-61.json";
fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));

console.log(`✓ Fetched ${posts.length} posts for German Batch 3 (58-61)`);
console.log('\nPosts retrieved:');
posts.forEach((post, idx) => {
  console.log(`  ${idx + 1}. [ID: ${post.id}] ${post.title}`);
  console.log(`     Slug: ${post.slug}`);
});
console.log(`\n✓ Saved to: german-batch-3-posts-58-61.json`);
