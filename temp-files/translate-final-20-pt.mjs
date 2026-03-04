import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = [
  'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night',
  'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence',
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue',
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
  'murder-mystery-party-for-small-groups-ideas',
  'murder-mystery-party-for-teenagers-guide',
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury',
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders',
  'unique-circus-murder-mystery-plot-ideas',
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
  'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes',
  'unique-medieval-murder-mystery-plot-ideas',
  'unique-pirate-murder-mystery-plot-ideas',
  'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets',
  'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime',
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue',
  'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party',
  'villain-murder-mystery-themes-masterminds-killers-antagonists',
  'wild-west-murder-mystery-party-planning'
];

const themeMap = {
  'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night': 'Noite de Jogos',
  'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence': 'Formatura',
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue': 'Reuniões Festivas',
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation': 'Equipes de Escritório',
  'murder-mystery-party-for-small-groups-ideas': 'Grupos Pequenos',
  'murder-mystery-party-for-teenagers-guide': 'Adolescentes',
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue': 'Alta Sociedade',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury': 'Spa Resort',
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders': 'Escavação Arqueológica',
  'unique-circus-murder-mystery-plot-ideas': 'Circo',
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime': 'Cinema Noir',
  'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes': 'Hotel de Gelo',
  'unique-medieval-murder-mystery-plot-ideas': 'Medieval',
  'unique-pirate-murder-mystery-plot-ideas': 'Piratas',
  'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets': 'Reunião Escolar',
  'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime': 'Colônia Espacial',
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue': 'Estação de Trem',
  'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party': 'Submarina',
  'villain-murder-mystery-themes-masterminds-killers-antagonists': 'Vilões',
  'wild-west-murder-mystery-party-planning': 'Velho Oeste'
};

async function translatePost(englishContent, title, slug) {
  const prompt = `Translate this murder mystery party blog post to Brazilian Portuguese. Use formal "você" form and proper accents.

CRITICAL REQUIREMENTS:
1. Replace ALL E-E-A-T timestamps with: *Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*
2. Translate EVERYTHING including titles, headers, quotes, table contents, FAQs, sources
3. Keep markdown formatting exactly (##, **, -, |, etc.)
4. Keep proper nouns in English (Gen Con, Mystery Maker Party, etc.)
5. Use Brazilian Portuguese accents (é, ã, ç, etc.)
6. Maintain professional, engaging tone

English Title: ${title}
English Slug: ${slug}

English Content:
${englishContent}

Provide ONLY the translated content, no explanations.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text;
}

function createPortugueseSlug(englishSlug) {
  const slugMap = {
    'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night': 'festa-de-assassinato-misterioso-para-noite-de-jogos-transforme-sua-noite-regular',
    'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence': 'festa-de-assassinato-misterioso-para-formaturas-misterios-de-excelencia-academica',
    'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue': 'festa-de-assassinato-misterioso-para-reunioes-festivas-diversao-e-intriga-familiar',
    'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation': 'festa-de-assassinato-misterioso-para-equipes-de-escritorio-construa-vinculos',
    'murder-mystery-party-for-small-groups-ideas': 'festa-de-assassinato-misterioso-para-grupos-pequenos-ideias',
    'murder-mystery-party-for-teenagers-guide': 'festa-de-assassinato-misterioso-para-adolescentes-guia',
    'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue': 'temas-de-assassinato-misterioso-alta-sociedade-escandalos-e-intriga-de-elite',
    'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury': 'festa-de-assassinato-misterioso-em-spa-resort-relaxe-no-perigo-e-luxo',
    'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders': 'assassinato-misterioso-em-escavacao-arqueologica-segredos-antigos-e-crimes-modernos',
    'unique-circus-murder-mystery-plot-ideas': 'ideias-de-enredo-de-assassinato-misterioso-no-circo',
    'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime': 'enredos-de-assassinato-misterioso-cinema-noir-entre-nas-sombras-do-crime-urbano',
    'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes': 'enredos-de-assassinato-misterioso-em-hotel-de-gelo-aventuras-congeladas-suspense-artico',
    'unique-medieval-murder-mystery-plot-ideas': 'ideias-de-enredo-de-assassinato-misterioso-medieval',
    'unique-pirate-murder-mystery-plot-ideas': 'ideias-de-enredo-de-assassinato-misterioso-de-piratas',
    'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets': 'enredos-de-assassinato-misterioso-em-reuniao-escolar-descubra-segredos-enterrados',
    'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime': 'enredos-de-assassinato-misterioso-em-colonia-espacial-fronteira-final-do-crime',
    'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue': 'enredos-de-assassinato-misterioso-em-estacao-de-trem-embarque-no-perigo-e-intriga',
    'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party': 'enredos-de-assassinato-misterioso-submarino-que-farao-sucesso-em-sua-festa',
    'villain-murder-mystery-themes-masterminds-killers-antagonists': 'temas-de-assassinato-misterioso-viloes-mestres-do-crime-assassinos-antagonistas',
    'wild-west-murder-mystery-party-planning': 'planejamento-de-festa-de-assassinato-misterioso-velho-oeste'
  };
  return slugMap[englishSlug];
}

async function processPost(slug, index, total) {
  try {
    console.log(`\n[${index}/${total}] Processing: ${slug}`);

    // Fetch English post
    const { data: englishPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('language', 'en')
      .single();

    if (fetchError) {
      console.error(`❌ Error fetching ${slug}:`, fetchError);
      return false;
    }

    // Check if Portuguese version already exists
    const ptSlug = createPortugueseSlug(slug);
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', ptSlug)
      .eq('language', 'pt')
      .single();

    if (existing) {
      console.log(`⏭️  Already exists: ${ptSlug}`);
      return true;
    }

    // Translate content
    console.log(`🔄 Translating...`);
    const translatedContent = await translatePost(
      englishPost.content,
      englishPost.title,
      slug
    );

    // Extract translated title from content
    const titleMatch = translatedContent.match(/^#\s+(.+)$/m);
    const translatedTitle = titleMatch ? titleMatch[1] : englishPost.title;

    // Create Portuguese post
    const portuguesePost = {
      title: translatedTitle,
      content: translatedContent,
      slug: ptSlug,
      meta_description: englishPost.meta_description, // Will be translated
      meta_keywords: englishPost.meta_keywords, // Will be translated
      language: 'pt',
      theme: themeMap[slug],
      status: 'published',
      featured_image_url: englishPost.featured_image_url,
      reading_time: englishPost.reading_time,
      author: 'AI Assistant',
      tags: [themeMap[slug]],
      published_at: '2025-12-19T05:00:19.931+00:00',
      post_date: '2025-12-19'
    };

    // Insert into database
    const { data: inserted, error: insertError } = await supabase
      .from('blog_posts')
      .insert([portuguesePost])
      .select();

    if (insertError) {
      console.error(`❌ Error inserting ${ptSlug}:`, insertError);
      return false;
    }

    console.log(`✅ ${index}/${total} Complete: ${ptSlug}`);
    return true;

  } catch (error) {
    console.error(`❌ Error processing ${slug}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting translation of final 20 Portuguese posts (31-50)...\n');

  let completed = 0;
  let failed = 0;

  for (let i = 0; i < posts.length; i++) {
    const success = await processPost(posts[i], i + 1, posts.length);
    if (success) {
      completed++;
    } else {
      failed++;
    }

    // Rate limiting - wait 2 seconds between requests
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ COMPLETE: ${completed}/${posts.length} posts translated`);
  if (failed > 0) {
    console.log(`❌ FAILED: ${failed} posts`);
  }
  console.log('='.repeat(60));
}

main();
