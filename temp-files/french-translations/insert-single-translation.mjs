import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const args = process.argv.slice(2);
if (args.length !== 6) {
  console.error('Usage: node insert-single-translation.mjs <slug> <title_fr> <meta_fr> <content_fr_file> <category> <featured_image>');
  process.exit(1);
}

const [slug, title_fr, meta_fr, content_file, category, featured_image] = args;
const content_fr = fs.readFileSync(content_file, 'utf-8');

async function main() {
  const frenchPost = {
    slug,
    language: 'fr',
    title: title_fr,
    meta_description: meta_fr,
    content: content_fr,
    category,
    published_at: '2026-02-16T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
    author: 'Équipe Mystery Maker Party',
    featured_image
  };

  const { error } = await supabase.from('blog_posts').insert(frenchPost);

  if (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }

  console.log(`✅ Inserted: ${title_fr}`);
}

main();
