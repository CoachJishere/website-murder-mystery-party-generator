import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w"
);

const themes = [
  'film noir',
  'spa resort',
  'chef',
  'circus',
  'space colony',
  'beach resort',
  'haunted hotel',
  'train station',
  'underwater'
];

console.log('Searching for Pack 1 blog posts...\n');

for (const theme of themes) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title')
    .eq('language', 'en')
    .ilike('title', `%${theme}%`)
    .limit(1);

  if (error) {
    console.error(`Error searching for ${theme}:`, error);
  } else if (data && data.length > 0) {
    console.log(`${theme.toUpperCase()}: ${data[0].slug}`);
  } else {
    console.log(`${theme.toUpperCase()}: NOT FOUND`);
  }
}
