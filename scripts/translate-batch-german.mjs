import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// German E-E-A-T
const GERMAN_EEAT = '*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*';

// Get batch number from command line
const batchNum = parseInt(process.argv[2]) || 1;
const batchSize = 5;
const startIdx = (batchNum - 1) * batchSize;
const endIdx = startIdx + batchSize;

console.log(`Processing batch ${batchNum} (posts ${startIdx + 6}-${Math.min(endIdx + 5, 47)})`);

// Read posts
const posts = JSON.parse(readFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/posts-to-translate-de.json', 'utf8'));

const batchPosts = posts.slice(startIdx, endIdx);

console.log(`Translating ${batchPosts.length} posts...`);

for (const post of batchPosts) {
  console.log(`\nTranslating: ${post.slug}`);
  
  // Output the post data for manual translation
  console.log(JSON.stringify({
    slug: post.slug,
    title: post.title,
    meta_description: post.meta_description,
    content_length: post.content.length
  }, null, 2));
}
