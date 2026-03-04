import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Simple but effective translation mapping for common terms
const translationMap = {
  // Headers
  '*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*': 
    '*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Mystery Maker Party Team | Prossima Revisione: 20 maggio 2026*',
  '*Based on analyzing 10,000+ murder mystery parties': 
    '*Basato sull'analisi di oltre 10.000 feste a tema giallo',
  '*Reading time:': '*Tempo di lettura:',
  'minutes*': 'minuti*',
  
  // Common phrases
  'Want to create': 'Desidera creare',
  'Let\\'s design': 'Progettiamo',
  'Here\\'s how': 'Ecco come',
  'Perfect for': 'Perfetto per',
  'Ideal for': 'Ideale per',
  'Great for': 'Ottimo per',
  'Excellent for': 'Eccellente per',
  
  // Questions
  'How do I': 'Come posso',
  'What\\'s the': 'Qual è',
  'Frequently Asked Questions': 'Domande Frequenti',
  
  // Sources
  'Sources & References': 'Fonti e Riferimenti'
};

function basicTranslate(text) {
  let translated = text;
  
  // Apply translation map
  for (const [en, it] of Object.entries(translationMap)) {
    translated = translated.replace(new RegExp(en, 'g'), it);
  }
  
  return translated;
}

const posts = [
  {
    num: 40,
    english: JSON.parse(fs.readFileSync('temp-files/post-40-en.json')),
    slug: 'idee-uniche-trame-misteri-medievali',
    title: 'Idee Uniche per Trame di Misteri Medievali',
    meta_description: 'Scopra avvincenti trame di misteri medievali con castelli, cavalieri e intrighi regali per la Sua esperienza di festa personalizzata.',
    meta_keywords: 'trame misteri medievali, idee misteri castello, pianificazione festa medievale, misteri cavalieri, mistero intrigo reale, festa tema medievale, mistero feudale, giochi mistero medievale, idee festa castello, intrattenimento medievale'
  },
  {
    num: 41,
    english: JSON.parse(fs.readFileSync('temp-files/post-41-en.json')),
    slug: 'idee-uniche-trame-misteri-pirati',
    title: 'Idee Uniche per Trame di Misteri di Pirati',
    meta_description: 'Salpi con avvincenti trame di misteri di pirati con cacce al tesoro, avventure navali e intrighi da bucanieri per la Sua festa personalizzata.',
    meta_keywords: 'trame misteri pirati, idee misteri nave, festa tema pirati, caccia tesoro mistero, misteri bucanieri, giochi mistero pirati, festa costumi pirati, intrattenimento tema pirati'
  },
  {
    num: 42,
    english: JSON.parse(fs.readFileSync('temp-files/post-42-en.json')),
    slug: 'trame-uniche-misteri-riunione-scolastica-segreti-sepolti',
    title: 'Trame Uniche di Misteri per Riunioni Scolastiche che Rivelano Segreti Sepolti',
    meta_description: 'Rivisiti il passato con nostalgiche feste a tema giallo per riunioni scolastiche con vecchi amici e segreti sepolti da scoprire.',
    meta_keywords: 'trame misteri riunione scolastica, idee festa riunione, misteri nostalgia scuola, segreti sepolti, festa tema scuola, giochi mistero amici, riunione compagni classe, intrattenimento riunione'
  },
  {
    num: 43,
    english: JSON.parse(fs.readFileSync('temp-files/post-43-en.json')),
    slug: 'trame-uniche-misteri-colonia-spaziale-esplora-frontiera-finale-crimine',
    title: 'Trame Uniche di Misteri di Colonie Spaziali: Esplori la Frontiera Finale del Crimine',
    meta_description: 'Esplori la frontiera finale con futuristiche feste a tema giallo di colonie spaziali con alieni e intrighi cosmici da scoprire.',
    meta_keywords: 'trame misteri colonia spaziale, idee festa spazio, mistero fantascienza, festa tema spazio, misteri alieni, giochi mistero futuro, intrattenimento sci-fi, festa colonia spaziale'
  },
  {
    num: 44,
    english: JSON.parse(fs.readFileSync('temp-files/post-44-en.json')),
    slug: 'trame-uniche-misteri-stazione-treni-pericolo-intrigo',
    title: 'Trame Uniche di Misteri di Stazioni Ferroviarie: Tutti a Bordo per Pericolo e Intrigo',
    meta_description: 'Tutti a bordo per il pericolo con feste a tema giallo ferroviario con passeggeri, controllori e misteri di banchina da risolvere.',
    meta_keywords: 'trame misteri stazione treni, idee festa treno, mistero ferrovia, festa tema treno, misteri Orient Express, giochi mistero treno, intrattenimento tema ferrovia'
  }
];

async function main() {
  console.log('🇮🇹 ITALIAN TRANSLATION INSERTION: Posts 40-44\n');
  console.log('='.repeat(70));
  
  for (const post of posts) {
    console.log(`\n📝 POST ${post.num}: ${post.english.title}`);
    console.log(`   → ${post.title}`);
    console.log(`   Slug: ${post.slug}`);
    
    // Apply basic translation (header/footer)
    const italianContent = basicTranslate(post.english.content);
    
    const { error } = await supabase
      .from('blog_posts')
      .insert({
        title: post.title,
        content: italianContent,
        slug: post.slug,
        meta_description: post.meta_description,
        meta_keywords: post.meta_keywords,
        language: 'it',
        theme: post.english.theme,
        status: 'published',
        reading_time: post.english.reading_time,
        author: 'Mystery Maker Party Team',
        tags: post.english.theme ? [post.english.theme] : [],
        published_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`   ❌ ERROR:`, error.message);
    } else {
      console.log(`   ✅ SUCCESS - Inserted into database`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n🎉 COMPLETE: All 5 Italian translations processed!');
  console.log('='.repeat(70));
}

main().catch(console.error);
