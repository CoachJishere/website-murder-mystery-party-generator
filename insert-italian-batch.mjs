import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const italianPosts = JSON.parse(fs.readFileSync('italian-posts-data.json'));

function translateContent(content) {
  return content
    .replace(
      '*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*',
      '*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Mystery Maker Party Team | Prossima Revisione: 20 maggio 2026*'
    )
    .replace(/\*Reading time: (\d+) minutes\*/, '*Tempo di lettura: $1 minuti*')
    .replace(/\*Based on analyzing 10,000\+ murder mystery parties/g, '*Basato sull\'analisi di oltre 10.000 feste a tema giallo');
}

async function main() {
  console.log('🇮🇹 INSERTING ITALIAN POSTS 40-44\n');
  console.log('='.repeat(70));
  
  let success = 0;
  let failed = 0;
  
  for (const itPost of italianPosts) {
    const enFile = `temp-files/post-${itPost.num}-en.json`;
    const enPost = JSON.parse(fs.readFileSync(enFile));
    
    console.log(`\n📝 POST ${itPost.num}: ${enPost.title}`);
    console.log(`   IT: ${itPost.title}`);
    console.log(`   Slug: ${itPost.slug}`);
    
    const italianContent = translateContent(enPost.content);
    
    const { error } = await supabase
      .from('blog_posts')
      .insert({
        title: itPost.title,
        content: italianContent,
        slug: itPost.slug,
        meta_description: itPost.meta_description,
        meta_keywords: itPost.meta_keywords,
        language: 'it',
        theme: enPost.theme,
        status: 'published',
        reading_time: enPost.reading_time,
        author: 'Mystery Maker Party Team',
        tags: enPost.theme ? [enPost.theme] : [],
        published_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`   ❌ ERROR: ${error.message}`);
      failed++;
    } else {
      console.log(`   ✅ SUCCESS`);
      success++;
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n✨ RESULTS: ${success} succeeded, ${failed} failed`);
  console.log('='.repeat(70));
}

main().catch(console.error);
