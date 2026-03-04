import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('Fetching posts...');
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, slug, title, meta_description, content, categories, tags, theme, reading_time')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true});

if (error || !posts) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${posts.length} posts`);

const postsToTranslate = posts.slice(5, 47);
console.log(`Extracting ${postsToTranslate.length} posts (6-47)...`);

// Create summary file
const summary = postsToTranslate.map((p, idx) => ({
  postNum: idx + 6,
  slug: p.slug,
  title: p.title
}));

writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/de-translation-list.json',
  JSON.stringify(summary, null, 2)
);

console.log('Summary saved to temp-files/de-translation-list.json');
console.log('\nList of posts to translate:');
summary.forEach(p => console.log(`${p.postNum}. ${p.slug}`));
