import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const GERMAN_EEAT = '*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*';

// Fetch all English posts updated >= 2026-02-20
console.log('Fetching English posts...');
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${posts.length} posts`);

// Get posts 6-47 (index 5-46)
const postsToTranslate = posts.slice(5, 47);
console.log(`\nProcessing ${postsToTranslate.length} posts (6-47):\n`);

// Output list for reference
postsToTranslate.forEach((post, idx) => {
  console.log(`${idx + 6}. ${post.slug}`);
});

// Save summary
const summary = postsToTranslate.map((p, idx) => ({
  number: idx + 6,
  slug: p.slug,
  title: p.title,
  id: p.id
}));

writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/german-translation-summary.json',
  JSON.stringify(summary, null, 2)
);

console.log('\nSummary saved to temp-files/german-translation-summary.json');
console.log('\nReady to begin translation process.');
