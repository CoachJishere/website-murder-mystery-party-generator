import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all English posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, meta_description, reading_time, theme, tags, created_at, post_date, published_at')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

// Get existing Portuguese posts
const { data: ptPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00');

const ptSlugs = new Set(ptPosts.map(p => p.slug.replace(/-pt$/, '')));

// Filter to posts that don't have Portuguese versions yet
const remaining = enPosts.filter(p => {
  // Check if we already translated this (bookstore)
  if (p.slug === 'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder') {
    return false;
  }
  return true;
});

console.log(`Remaining to translate: ${remaining.length}`);

// Save list of remaining slugs
const slugs = remaining.map(p => p.slug);
writeFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/remaining-slugs.json', JSON.stringify(slugs, null, 2));

console.log('\nSaved remaining-slugs.json with', slugs.length, 'posts');
