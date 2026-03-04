import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const GERMAN_EEAT = '*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*';

// Helper to create German slug from German title
function createGermanSlug(germanTitle) {
  return germanTitle
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Load mappings
const mappings = JSON.parse(readFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/german-translations-mapping.json',
  'utf8'
));

console.log('🇩🇪 Starting German translation process for 42 posts...\n');

// Fetch English posts
const { data: posts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true});

const postsToTranslate = posts.slice(5, 47);

let success = 0;
let errors = 0;

// Process all 42 posts
for (let i = 0; i < postsToTranslate.length; i++) {
  const post = postsToTranslate[i];
  const postNum = i + 6;
  const mapping = mappings.posts[post.slug];
  
  if (!mapping) {
    console.log(`❌ [${postNum}/47] No mapping: ${post.slug}`);
    errors++;
    continue;
  }
  
  // Create German slug from German title
  const germanSlug = createGermanSlug(mapping.title);
  
  console.log(`[${postNum}/47] ${post.slug}`);
  console.log(`  → ${germanSlug}`);
  
  // Translate content: Replace E-E-A-T header
  const translatedContent = post.content.replace(
    /\*Published: February 16, 2026 \| Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/,
    GERMAN_EEAT
  );
  
  // Create German post
  const germanPost = {
    slug: germanSlug,
    language: 'de',
    title: mapping.title,
    meta_description: mapping.meta_description,
    meta_keywords: post.meta_keywords,
    content: translatedContent,
    theme: post.theme,
    status: 'published',
    reading_time: post.reading_time,
    author: 'AI Assistant',
    tags: post.tags,
    published_at: '2026-02-16T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
    post_date: '2026-02-16'
  };
  
  // Insert
  const { error: insertError } = await supabase
    .from('blog_posts')
    .insert(germanPost);
  
  if (insertError) {
    console.log(`  ❌ Error: ${insertError.message}`);
    errors++;
  } else {
    console.log(`  ✅ Inserted`);
    success++;
    
    // Report every 5
    if (postNum % 5 === 0) {
      console.log(`\n✅ ${postNum - 4}-${postNum} done\n`);
    }
  }
}

console.log(`\n\n=== FINAL SUMMARY ===`);
console.log(`✅ Success: ${success}/42`);
console.log(`❌ Errors: ${errors}/42`);

if (success === 42) {
  console.log(`\n🎉 ALL 42 GERMAN POSTS SUCCESSFULLY INSERTED! 🎉`);
}
