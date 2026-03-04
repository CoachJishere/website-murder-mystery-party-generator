import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: frPosts } = await supabase
  .from('blog_posts')
  .select('id, title, slug')
  .eq('language', 'fr')
  .eq('status', 'published')
  .order('id', { ascending: true })
  .limit(10);

console.log('Sample French posts:');
frPosts.forEach(post => {
  console.log(`- ${post.slug}`);
});
