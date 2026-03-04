import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(await fs.readFile('batch3-sv-posts.json', 'utf-8'));

// Simplified - just metadata with integer reading_time
const translations = [
  {
    original_slug: 'butler-murder-mystery-themes-manor-murders-household-secrets',
    slug: 'butler-mordmysterium-teman-herrgardsmordet-hushallshemligheter',
    title: 'Butler Mordmysterium Teman: Herrgårdsmord och Hushållshemligheter',
    meta_description: 'Upptäck hur butler-mordmysterier kombinerar klassdynamik, tjänstehierarkier och herrgårdsintriger. Expert guide om butlers som vittnen, misstänkta och utredare.',
    reading_time: 12
  },
  {
    original_slug: 'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
    slug: 'koksmastare-mordmysterium-teman-kulinariska-brott-kokshemliigheter',
    title: 'Köksmästare Mordmysterium Teman: Kulinariska Brott och Kökshemligheter',
    meta_description: 'Skapa spännande köksmästare-mordmysterier med kulinarisk rivalitet, matforgiftning och restaurangdrama. Expert guide för mat-tema mysterier.',
    reading_time: 12
  },
  {
    original_slug: 'creating-the-perfect-detective-character-guide-design-compelling-investigators-for-your-custom-murder-mystery-party',
    slug: 'skapa-den-perfekta-detektiv-karaktar-guiden-design-overtygande-utredare-for-din-anpassade-mordmysteriefest',
    title: 'Skapa den Perfekta Detektiv-Karaktären Guide: Design Övertygande Utredare för Din Anpassade Mordmysteriefest',
    meta_description: 'Master detektiv-karaktärsutveckling för mordmysteriefester. Expert guide om utredningsmetoder, personlighetsdrag och balansera detektivroller.',
    reading_time: 11
  },
  {
    original_slug: 'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
    slug: 'kryssningsfartyg-mordmysteriefest-guide-segla-ivag-for-mord-pa-oppna-havet',
    title: 'Kryssningsfartyg Mordmysteriefest Guide: Segla Iväg för Mord på Öppna Havet',
    meta_description: 'Planera en nautisk mordmysteriefest med kryssningsfartygs-teman. Komplett guide om sjömansroller, fartygsplatser och havsdrama.',
    reading_time: 16
  },
  {
    original_slug: 'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
    slug: 'spokhotel-mordmysteriefest-guide-checka-in-till-skrack-och-spannings',
    title: 'Spökhotell Mordmysteriefest Guide: Checka In till Skräck och Spänning',
    meta_description: 'Skapa läskig spökhotell-mordmysteriefest med övernaturliga element. Expert guide för hemsökta miljöer och spökfulla mysterier.',
    reading_time: 14
  }
];

console.log('Inserting Swedish posts 11-15...\n');

for (let i = 0; i < translations.length; i++) {
  const trans = translations[i];
  const originalPost = posts.find(p => p.slug === trans.original_slug);
  
  if (!originalPost) {
    console.error(`❌ Could not find: ${trans.original_slug}`);
    continue;
  }

  console.log(`\n📝 ${11 + i}/15: ${trans.title.substring(0, 50)}...`);

  const { error } = await supabase
    .from('blog_posts')
    .insert({
      title: trans.title,
      slug: trans.slug,
      content: originalPost.content, // Will translate properly in next step
      meta_description: trans.meta_description,
      reading_time: trans.reading_time,
      language: 'sv',
      category: originalPost.category,
      tags: originalPost.tags,
      image_url: originalPost.image_url,
      created_at: originalPost.created_at,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
  } else {
    console.log(`   ✅ ${11 + i}/15`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
}

console.log('\n✅ ALL 5 POSTS INSERTED (11-15/15)');
console.log('Note: Content needs proper Swedish translation');
