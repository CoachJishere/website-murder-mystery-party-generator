import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load posts
const content = fs.readFileSync('batch4-sv-posts.json', 'utf8');
const jsonStart = content.indexOf('[');
const jsonContent = content.substring(jsonStart);
const posts = JSON.parse(jsonContent);

console.log(`Loaded ${posts.length} posts for Swedish translation\n`);

// Manual translation templates - I'll provide the Swedish translations
const translations = {
  16: {
    slug: 'sa-fixar-du-gasten-som-bryter-karaktaren-hall-din-mordmysterium-fest-uppslukande',
    title: 'Så fixar du gästen som bryter karaktären: Håll din mordmysteriefest uppslukande',
    meta_description: 'Håll alla i karaktär med engagerande anpassade roller och tydliga riktlinjer som upprätthåller inlevelse genom hela festen.',
    meta_keywords: 'mordmysterium karaktärsbrott, hålla gäster i karaktär, rollspelsinlevelse, karaktärskonsistens, mordmysterium skådespelartips, stanna i karaktär, karaktärsengagemang, rollspelsriktlinjer, uppslukande mysteriefest, karaktärsutveckling'
  },
  17: {
    slug: 'hur-man-arrangerar-en-sagolik-mordmysteriefest-det-var-en-gang-ett-brott',
    title: 'Hur man arrangerar en sagolik mordmysteriefest: Det var en gång ett brott',
    meta_description: 'Det var en gång ett brott med sagolika mordmysteriefester med älskade karaktärer med mörka hemligheter.',
    meta_keywords: 'sagolik mordmysteriefest, sagotema mysterium, sagotema fest, älskade karaktärer mysterium, sagotema mysterium, fantasi mordmysterium, sagotema fest idéer'
  },
  18: {
    slug: 'hur-man-arrangerar-en-hollywood-mordmysteriefest',
    title: 'Hur man arrangerar en Hollywood mordmysteriefest',
    meta_description: 'Skapa glamorösa Hollywood mordmysteriefester med anpassade kändiskaraktärer och röda mattan drama.',
    meta_keywords: 'Hollywood mordmysteriefest, kändis mysteriumfest, röda mattan mysterium, Hollywood tema mysterium, kändis karaktärer, glamourös mysteriumfest, Hollywood mysterium idéer'
  },
  19: {
    slug: 'medeltida-mordmysteriefest-steg-for-steg-guide',
    title: 'Medeltida mordmysteriefest: Steg-för-steg guide',
    meta_description: 'Planera en oförglömlig medeltida mordmysteriefest med vår kompletta guide. Slottsteman, karaktärer och intrig.',
    meta_keywords: 'medeltida mordmysteriefest, slottstema mysterium, medeltida mysterium, riddare mysterium, kungligt intrig mysterium, medeltida karaktärer, slottsfest mysterium'
  },
  20: {
    slug: 'hur-man-arrangerar-en-forbudstiden-mordmysteriefest-langare-din-vag-till-spanningen',
    title: 'Hur man arrangerar en förbudstiden mordmysteriefest: Långare din väg till spänningen',
    meta_description: 'Långare din väg till spänning med autentiska förbudstiden mordmysteriefester med speakeasy och gangster drama.',
    meta_keywords: 'förbudstiden mordmysteriefest, speakeasy mysterium, 1920-tal mysterium, gangster mysteriumfest, jazztiden mysterium, förbudstiden tema, speakeasy mysterium idéer'
  }
};

async function insertSwedishPost(post, postNumber) {
  console.log(`\nProcessing post ${postNumber}/20: ${post.slug}`);
  
  const translation = translations[postNumber];
  
  if (!translation) {
    console.log(`❌ No translation template for post ${postNumber}`);
    return;
  }

  console.log(`Translation template found for: ${translation.slug}`);
  console.log(`This is a placeholder - manual translation required`);
  console.log(`\nPost info:`);
  console.log(`  English title: ${post.title}`);
  console.log(`  Swedish title: ${translation.title}`);
  console.log(`  Swedish slug: ${translation.slug}`);
  console.log(`  Content length: ${post.content.length} chars`);
  console.log(`  Theme: ${post.theme}`);
  console.log(`  Reading time: ${post.reading_time} minutes`);
  
  // Save post for manual translation
  fs.writeFileSync(
    `sv-to-translate-${postNumber}.json`,
    JSON.stringify({
      postNumber,
      original: {
        title: post.title,
        slug: post.slug,
        content: post.content,
        meta_description: post.meta_description,
        meta_keywords: post.meta_keywords,
        theme: post.theme,
        reading_time: post.reading_time
      },
      swedish: translation
    }, null, 2)
  );
  
  console.log(`✓ Saved to sv-to-translate-${postNumber}.json for manual translation`);
}

async function processAllPosts() {
  console.log('Preparing Swedish translation batch 4 (posts 16-20)...\n');

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const postNumber = i + 16;

    try {
      await insertSwedishPost(post, postNumber);
      console.log(`✓ ${postNumber}/20 prepared\n`);
    } catch (error) {
      console.error(`\n❌ ERROR on post ${postNumber}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('BATCH 4 PREPARED - Ready for manual translation');
  console.log('Files created: sv-to-translate-16.json through sv-to-translate-20.json');
  console.log('='.repeat(60));
}

processAllPosts();
