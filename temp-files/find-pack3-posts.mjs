import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w"
);

const themes = [
  'journalist',
  'reporter',
  'medical examiner',
  'forensic',
  'butler',
  'domestic',
  'socialite',
  'high society',
  'villain',
  'antagonist',
  'amateur detective',
  'date night',
  'small group',
  'couples',
  'teenager',
  'teen',
  'bachelorette',
  'baby shower',
  'retirement',
  'engagement party',
  'anniversary',
  'gender reveal',
  'bridal shower',
  'rehearsal dinner',
  'wine tasting',
  'cooking class',
  'game night'
];

console.log('🔍 Searching for Pack 3 blog posts...\n');

const foundPosts = [];

for (const theme of themes) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title')
    .eq('language', 'en')
    .ilike('title', `%${theme}%`)
    .limit(2);

  if (data && data.length > 0) {
    for (const post of data) {
      if (!foundPosts.find(p => p.slug === post.slug)) {
        foundPosts.push(post);
        console.log(`✓ ${post.title}`);
        console.log(`  ${post.slug}\n`);
      }
    }
  }
}

console.log(`📊 Found ${foundPosts.length} unique Pack 3 posts\n`);
