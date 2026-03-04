import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the English posts
const englishPosts = JSON.parse(fs.readFileSync('temp-files/batch1-posts-for-italian.json', 'utf-8'));

console.log(`Found ${englishPosts.length} posts to translate\n`);

// Translation mapping for common terms
const translations = {
  // Headers
  'Market Trends & Popularity': 'Tendenze di Mercato e Popolarità',
  'What 10,000+ Murder Mystery Parties Taught Us': 'Cosa Ci Hanno Insegnato Oltre 10.000 Feste Misteriose',
  'Sources & References': 'Fonti e Riferimenti',
  'Frequently Asked Questions': 'Domande Frequenti',

  // Table headers
  'Statistic': 'Statistica',
  'Value': 'Valore',
  'Source': 'Fonte',

  // Reading time
  'minute read': 'minuti di lettura',

  // E-E-A-T
  'Published': 'Pubblicato',
  'Updated': 'Aggiornato',
  'Author': 'Autore',
  'Next Review': 'Prossima revisione',
  'Mystery Maker Party Team': 'Team Mystery Maker Party',

  // Research line
  'Based on analyzing 10,000+ murder mystery parties': 'Basato sull\'analisi di oltre 10.000 feste misteriose'
};

async function translateAndInsert(post, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`POST ${index + 1}: ${post.slug}`);
  console.log(`${'='.repeat(80)}`);

  // Save post for manual translation
  const postFile = `temp-files/italian-post-${index + 1}.json`;
  fs.writeFileSync(postFile, JSON.stringify(post, null, 2));

  console.log(`✅ Saved English post to ${postFile}`);
  console.log(`\nPost details:`);
  console.log(`- Title: ${post.title}`);
  console.log(`- Slug: ${post.slug}`);
  console.log(`- Theme: ${post.theme}`);
  console.log(`- Reading time: ${post.reading_time}`);
  console.log(`- Content length: ${post.content.length} characters`);

  return postFile;
}

// Process all 5 posts
for (let i = 0; i < englishPosts.length; i++) {
  await translateAndInsert(englishPosts[i], i);
}

console.log(`\n${'='.repeat(80)}`);
console.log('All posts saved for translation');
console.log(`${'='.repeat(80)}`);
