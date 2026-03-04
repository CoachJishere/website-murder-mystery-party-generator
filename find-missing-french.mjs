import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Fetching English posts...');
const { data: enPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('id, title, slug')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('id', { ascending: true });

if (enError) {
  console.error('Error fetching English posts:', enError);
  process.exit(1);
}

console.log('Fetching French posts...');
const { data: frPosts, error: frError } = await supabase
  .from('blog_posts')
  .select('id, title, slug')
  .eq('language', 'fr')
  .eq('status', 'published')
  .order('id', { ascending: true });

if (frError) {
  console.error('Error fetching French posts:', frError);
  process.exit(1);
}

console.log(`\nEnglish posts: ${enPosts.length}`);
console.log(`French posts: ${frPosts.length}`);
console.log(`Missing: ${enPosts.length - frPosts.length}`);

// French slugs have -fr at the END, not fr- at the beginning
// Remove -fr suffix from French slugs for comparison
const frSlugs = new Set(frPosts.map(p => p.slug.replace(/-fr$/, '')));

const missingPosts = enPosts.filter(enPost => {
  return !frSlugs.has(enPost.slug);
});

console.log('\n=== MISSING FRENCH TRANSLATIONS ===\n');
missingPosts.forEach((post, i) => {
  console.log(`${i + 1}. ID: ${post.id}`);
  console.log(`   Title: ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log('');
});

const output = {
  summary: {
    totalEnglish: enPosts.length,
    totalFrench: frPosts.length,
    missingCount: missingPosts.length
  },
  missingPosts: missingPosts
};

fs.writeFileSync('missing-french-posts.json', JSON.stringify(output, null, 2));
console.log('✓ Saved to missing-french-posts.json');
