import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch all optimized English posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
console.log(`Found ${optimized.length} optimized posts`);

// Get already translated posts
const { data: existing } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'it');

const existingSlugs = new Set(existing?.map(p => p.slug) || []);
console.log(`Already translated: ${existingSlugs.size} posts`);

// Find remaining posts (skip first 5 which are already done)
const remaining = optimized.slice(5);
console.log(`Remaining to translate: ${remaining.length} posts\n`);

// Save to file for translation
import { writeFileSync } from 'fs';
writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/remaining-posts-to-translate.json',
  JSON.stringify(remaining, null, 2)
);

console.log('Saved remaining posts to temp-files/remaining-posts-to-translate.json');
console.log('\nFirst 5 posts to translate:');
remaining.slice(0, 5).forEach((p, i) => {
  console.log(`${i + 6}. ${p.title} (${p.slug})`);
});
