import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all optimized English posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const optimized = enPosts.map(p => p.slug);

// Get today's Portuguese posts
const { data: ptPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00');

console.log(`Total English optimized: ${optimized.length}`);
console.log(`Total Portuguese today: ${ptPosts.length}`);
console.log(`\nPosts still needing translation:\n`);

// Simple approach: list all English slugs that need Portuguese versions
let count = 0;
for (let i = 0; i < optimized.length; i++) {
  const enSlug = optimized[i];
  
  // Check if we already translated this one (by checking if any PT post was updated today with similar theme)
  // Since we can't match perfectly by slug (they're translated), just list all English posts
  // and we'll handle duplicates with the "if (!existing)" check in the insert
  
  count++;
  if (count > 14) { // Skip the first 14 we already did
    console.log(`${count}. ${enSlug}`);
  }
}

console.log(`\nTotal remaining: ~${optimized.length - 14}`);
