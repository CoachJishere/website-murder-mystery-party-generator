import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// First, let's search for the posts
const patterns = [
  'fix-guests-breaking-character',
  'film-noir',
  'space-colony',
  'spa-resort',
  'haunted-hotel'
];

console.log('=== BATCH 5: Problem-Solving & Plot Guides ===\n');

for (const pattern of patterns) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, language, status, reading_time, content')
    .ilike('slug', `%${pattern}%`)
    .eq('language', 'en')
    .eq('status', 'published');

  if (error || !data || data.length === 0) {
    console.log(`❌ No match for ${pattern}`);
  } else if (data.length > 1) {
    console.log(`⚠️  Multiple matches for ${pattern}:`);
    data.forEach(p => console.log(`   - ${p.slug}`));
  } else {
    const post = data[0];
    const wordCount = post.content.split(/\s+/).length;
    console.log(`✅ ${post.title}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Current: ${wordCount} words (${post.reading_time} min)\n`);
    
    writeFileSync(`batch5-${pattern}-full.txt`, post.content);
    writeFileSync(`batch5-${pattern}-id.txt`, post.id);
  }
}
