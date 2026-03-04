import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('📚 Fetching English posts to translate...\n');

const { data: englishPosts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${englishPosts.length} posts\n`);

// Save to file for batch processing
writeFileSync(
  'temp-files/posts-to-translate-pt.json',
  JSON.stringify(englishPosts, null, 2)
);

console.log('✅ Saved to temp-files/posts-to-translate-pt.json');
console.log(`\n📊 Ready to translate ${englishPosts.length} posts to Portuguese`);
