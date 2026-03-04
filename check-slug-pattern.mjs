import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get first 5 EN posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('id, slug, title')
  .eq('language', 'en')
  .order('id')
  .limit(5);

console.log('First 5 EN posts:');
enPosts.forEach(p => console.log(`  ID ${p.id}: ${p.slug}`));

// Get first 5 DE posts
const { data: dePosts } = await supabase
  .from('blog_posts')
  .select('id, slug, title')
  .eq('language', 'de')
  .order('id')
  .limit(5);

console.log('\nFirst 5 DE posts:');
dePosts.forEach(p => console.log(`  ID ${p.id}: ${p.slug}`));

// Check if they share IDs
const enIds = new Set(enPosts.map(p => p.id));
const deIds = new Set(dePosts.map(p => p.id));
const sharedIds = [...enIds].filter(id => deIds.has(id));

console.log('\nShared IDs:', sharedIds);
