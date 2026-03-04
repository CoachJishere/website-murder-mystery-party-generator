import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const postIndex = parseInt(process.argv[2]) || 0;
const batch = JSON.parse(readFileSync('temp-files/italian_batch2.json', 'utf-8'));
const post = batch[postIndex];

if (!post) {
  console.error(`Post ${postIndex} not found in batch`);
  process.exit(1);
}

console.log(`\n=== Post ${postIndex + 1}/10 ===`);
console.log(`Slug: ${post.slug}`);
console.log(`Title: ${post.title}`);
console.log(`\nSaving to article_to_translate.json for translation...`);

const translationRequest = {
  index: postIndex,
  slug: post.slug,
  title: post.title,
  meta_description: post.meta_description,
  excerpt: post.excerpt,
  content: post.content,
  original_post: post
};

writeFileSync('article_to_translate.json', JSON.stringify(translationRequest, null, 2));
console.log('\n✓ Saved to article_to_translate.json');
console.log('\nPlease translate this post to Italian following these requirements:');
console.log('- E-E-A-T dates: "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*"');
console.log('- Research: "*Basato sull\'analisi di oltre 10.000 feste misteriose e ricerca su [theme]*"');
console.log('- Table headers: "| Statistica | Valore | Fonte |"');
console.log('- Reading time: "Tempo di lettura: X minuti"');
console.log('- Use formal "Lei", proper accents (à, è, é, ì, ò, ù)');
console.log('\nSave translation to translation_it.txt');
