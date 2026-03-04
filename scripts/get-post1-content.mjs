import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
const post1 = optimized[0];

console.log('Post 1:', post1.slug);
console.log('Title:', post1.title);
console.log('Length:', post1.content.length, 'characters');
console.log('Word count (estimate):', Math.round(post1.content.length / 5));

// Save to file for translation
writeFileSync('temp-files/post1-english.md', post1.content, 'utf-8');
console.log('\nSaved to temp-files/post1-english.md');
console.log('Ready for translation');
