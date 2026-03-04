import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const translationMap = {
  6: {
    slug: '5-vakoojathriller-murhamysteeriteemaa-jotka-saavat-vieraasi-toimimaan-peitetehtavissa',
    title: '5 vakoojathriller-murhamysteeriteemaa, jotka saavat vieraasi toimimaan peitetehtävissä',
    description: 'Sukella peitetehtäviin vakoojateemaisten murhamysteerijuhlien kanssa, jotka sisältävät salaisia agentteja, kaksoispeliä ja kansainvälistä juonittelua.'
  },
  7: {
    slug: '5-vintage-sirkus-murhamysteeriteemaa-astu-sisaan-intriigien-sirkuskupoliin',
    title: '5 vintage-sirkus-murhamysteeriteemaa: Astu sisään intriigien sirkuskupoliin',
    description: 'Astu sirkuskupoliin vintage-sirkusmurhamysteereillä, jotka sisältävät taitureita, klovneja ja karnevaalista juonittelua.'
  },
  8: {
    slug: 'muinainen-egypti-murhamysteeri-juhlien-opas',
    title: 'Muinainen Egypti murhamysterijuhlien opas',
    description: 'Luo muinaisen Egyptin murhamysteeri faaraoiden, pyramidien ja faaraallisten juonittelujen kanssa tällä kattavalla oppaalla.'
  },
  9: {
    slug: 'taidegalleria-murhamysterijuhla-suunnittelu-luo-hienostuneita-luovia-rikoksia',
    title: 'Taidegalleria-murhamysterijuhla suunnittelu: Luo hienostuneita luovia rikoksia',
    description: 'Suunnittele hienostunut taidegalleriamurhamysteeri, jossa yhdistyvät kuvataide, esteettinen tunnelma ja luovat rikokset.'
  },
  10: {
    slug: 'kirjakauppa-murhamysterijuhla-suunnittelu-kaanna-sivu-kirjalliseen-murhaan',
    title: 'Kirjakauppa-murhamysterijuhla suunnittelu: Käännä sivu kirjalliseen murhaan',
    description: 'Käännä sivu kirjalliseen murhaan kirjakauppamurhamysteereillä, jotka sisältävät kirjailijoita, kirjailijahahmoja ja kirjallisia juonia.'
  }
};

async function translatePost(postNum) {
  console.log(`\nTranslating Post ${postNum}...`);
  
  const post = JSON.parse(readFileSync(`/tmp/fi-post-${postNum}.json`, 'utf8'));
  
  const prompt = `Translate this complete English murder mystery blog post to Finnish. Use formal, professional Finnish throughout.

FINNISH FORMAT REQUIREMENTS:
- E-E-A-T: *Julkaistu: 16. helmikuuta 2026 | Päivitetty: 20. helmikuuta 2026 | Kirjoittaja: Mystery Maker Party Team | Seuraava tarkistus: 20. toukokuuta 2026*
- Research note: *Perustuu yli 10 000 murhamysteerin ja [teema] tutkimuksen analysointiin*
- Table headers: | Mittari | Arvo | Lähde |
- Natural Finnish grammar (Uralic language structure)
- Proper Finnish case system
- Formal tone throughout

TRANSLATE COMPLETE CONTENT INCLUDING:
- All sections and subsections
- All tables with Finnish headers
- All FAQ questions and answers
- All character roles and descriptions
- All theme details

English Title: ${post.title}

English Content:
${post.content}

Return ONLY the translated Finnish content, starting with the E-E-A-T line.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const translatedContent = message.content[0].text;
  
  // Insert into database
  const meta = translationMap[postNum];
  const { error } = await supabase
    .from('blog_posts')
    .insert({
      title: meta.title,
      slug: meta.slug,
      content: translatedContent,
      meta_description: meta.description,
      language: 'fi'
    });

  if (error) {
    console.error(`❌ Error inserting post ${postNum}:`, error);
    return false;
  } else {
    console.log(`✅ ${postNum}/10 - ${meta.title.substring(0, 50)}...`);
    return true;
  }
}

async function main() {
  console.log('Starting Finnish Batch 2 Translation (Posts 6-10)...\n');
  
  for (let i = 6; i <= 10; i++) {
    await translatePost(i);
    // Small delay between translations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Finnish Batch 2 Complete!');
}

main().catch(console.error);
