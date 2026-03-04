import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w'
);

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, meta_description')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('id', { ascending: true })
  .range(10, 19);  // Posts 11-20 (0-indexed, so 10-19)

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

fs.writeFileSync('french-batch-2-source-posts.json', JSON.stringify(posts, null, 2));
console.log(`Fetched ${posts.length} posts for French Batch 2`);
console.log('Titles:', posts.map(p => p.title));
