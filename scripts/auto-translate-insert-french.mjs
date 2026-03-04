import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const translateContentBasic = (content) => {
  // Basic translation of E-E-A-T and common patterns
  let translated = content;
  
  // E-E-A-T header
  translated = translated.replace(
    /\*Published: February 16, 2026 \| Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/g,
    '*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*'
  );
  
  // Common headers
  translated = translated.replace(/## Quick Start/g, '## Démarrage Rapide');
  translated = translated.replace(/## Step-by-Step Guide/g, '## Guide Étape par Étape');
  translated = translated.replace(/## Frequently Asked Questions/g, '## Questions Fréquemment Posées');
  translated = translated.replace(/## Sources & References/g, '## Sources et Références');
  translated = translated.replace(/\*Reading time: (\d+) minutes\*/g, '*Temps de lecture : $1 minutes*');
  
  // Key phrases
  translated = translated.replace(/Based on analyzing 10,000\+ murder mystery parties/g, 'Basé sur l\'analyse de plus de 10 000 soirées murder mystery');
  
  return translated;
};

const translateTitle = (title) => {
  const translations = {
    'How to Host a Fairy Tale Murder Mystery Party: Once Upon a Crime': 'Comment Organiser une Soirée Murder Mystery de Conte de Fées : Il Était une Fois un Crime',
    'Medieval Murder Mystery Party: Step-by-Step Guide': 'Soirée Murder Mystery Médiévale : Guide Étape par Étape',
    'How to Host a Prohibition Era Murder Mystery: Bootleg Your Way to Excitement': 'Comment Organiser un Murder Mystery de l\'Ère de la Prohibition : De la Contrebande à l\'Excitation',
    'How to Host a Steampunk Murder Mystery Party: Gear Up for Victorian Sci-Fi Crime': 'Comment Organiser une Soirée Murder Mystery Steampunk : Préparez-vous pour un Crime Sci-Fi Victorien',
    'Superhero Murder Mystery Party: Planning Guide': 'Soirée Murder Mystery de Super-Héros : Guide de Planification',
    'Zombie Murder Mystery Party: Complete Planning Guide': 'Soirée Murder Mystery Zombie : Guide de Planification Complet'
  };
  return translations[title] || title;
};

const translateMetaDesc = (desc) => {
  // Basic translations for meta descriptions
  return desc
    .replace(/murder mystery/gi, 'murder mystery')
    .replace(/party/gi, 'soirée')
    .replace(/planning/gi, 'planification')
    .replace(/guide/gi, 'guide');
};

// Get remaining slugs
const remainingSlugs = JSON.parse(process.argv[2] || '[]');

console.log(`\nProcessing ${remainingSlugs.length} posts...\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < remainingSlugs.length && i < 5; i++) {
  const slug = remainingSlugs[i];
  
  // Fetch English post
  const { data: enPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .eq('slug', slug)
    .single();
  
  if (fetchError) {
    console.error(`❌ Error fetching ${slug}`);
    errorCount++;
    continue;
  }
  
  // Create French version
  const frPost = {
    title: translateTitle(enPost.title),
    slug: `${enPost.slug}-fr`,
    content: translateContentBasic(enPost.content),
    meta_description: translateMetaDesc(enPost.meta_description),
    meta_keywords: enPost.meta_keywords,
    language: 'fr',
    theme: enPost.theme,
    status: 'published',
    author: 'AI Assistant',
    tags: enPost.tags,
    reading_time: enPost.reading_time
  };
  
  // Insert
  const { error: insertError } = await supabase
    .from('blog_posts')
    .insert(frPost);
  
  if (insertError) {
    console.error(`❌ Error inserting ${slug}: ${insertError.message}`);
    errorCount++;
  } else {
    console.log(`✅ ${i + 17}. ${slug.substring(0, 50)}...`);
    successCount++;
  }
}

console.log(`\n=== BATCH COMPLETE ===`);
console.log(`Success: ${successCount}`);
console.log(`Errors: ${errorCount}`);

