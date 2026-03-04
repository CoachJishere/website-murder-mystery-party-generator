import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get batch range from command line (e.g., "6 10" for posts 6-10)
const start = parseInt(process.argv[2]);
const end = parseInt(process.argv[3]);

if (!start || !end) {
  console.error('Usage: node extract-posts-batch.mjs <start> <end>');
  console.error('Example: node extract-posts-batch.mjs 6 10');
  process.exit(1);
}

console.log(`Extracting posts ${start}-${end}...`);

const { data: posts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

const batch = posts.slice(start - 1, end);

console.log(`\nFound ${batch.length} posts in batch ${start}-${end}:`);
batch.forEach((p, idx) => {
  console.log(`${start + idx}. ${p.slug}`);
});

// Save batch
writeFileSync(
  `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/batch-${start}-${end}.json`,
  JSON.stringify(batch, null, 2)
);

console.log(`\nSaved to temp-files/batch-${start}-${end}.json`);
