// Restore wrongly deleted posts by fetching the English version and creating a restoration plan.
// Since the translations were hard-deleted, we need to find them in translation files or re-create from English.
// 
// Step 1: For -fr slug posts, the content should be in the translation .md files
// Step 2: For native-slug posts, we need to find the content from translation files
// Step 3: As a last resort, we can copy from the English post and mark for re-translation

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// English slugs for each topic (to look up the English post)
const TOPIC_TO_EN_SLUG = {
  '1920s Speakeasy': '1920s-speakeasy-murder-mystery-party-guide',
  'Beach Resort': '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  'Breaking Character': 'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive',
  'Medieval Castle': 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  'Superhero': 'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains',
  'Circus Plot': 'unique-circus-murder-mystery-plot-ideas',
  'Space Colony': 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime',
  'Vintage Circus': '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
  'Medieval Plot': 'unique-medieval-murder-mystery-plot-ideas',
  'Prohibition Era': 'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
  'Steampunk': 'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime',
  'Lawyer': 'lawyer-murder-mystery-themes-courtroom-drama-and-legal-intrigue',
  'Ancient Egypt': 'ancient-egypt-murder-mystery-party-guide',
  'Zombie': 'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival',
  'Teenagers': 'murder-mystery-party-for-teenagers-guide',
  'School Reunion': 'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets',
  'Journalist': 'journalist-murder-mystery-themes-investigative-reporters-uncover-deadly-stories',
};

// Posts to restore with their original slugs
const RESTORE_LIST = [
  // FR
  { lang: 'fr', originalSlug: '1920s-speakeasy-murder-mystery-party-guide-fr', topic: '1920s Speakeasy' },
  { lang: 'fr', originalSlug: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable-fr', topic: 'Beach Resort' },
  { lang: 'fr', originalSlug: 'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive-fr', topic: 'Breaking Character' },
  { lang: 'fr', originalSlug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue-fr', topic: 'Medieval Castle' },
  { lang: 'fr', originalSlug: 'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains-fr', topic: 'Superhero' },
  { lang: 'fr', originalSlug: 'unique-circus-murder-mystery-plot-ideas-fr', topic: 'Circus Plot' },
  { lang: 'fr', originalSlug: 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime-fr', topic: 'Space Colony' },
  // IT  
  { lang: 'it', originalSlug: '5-temi-murder-mystery-resort-balneare-che-renderanno-la-vostra-vacanza-indimenticabile', topic: 'Beach Resort' },
  { lang: 'it', originalSlug: '5-temi-vintage-circus-murder-mystery-entri-nel-big-top-dellintrig', topic: 'Vintage Circus' },
  { lang: 'it', originalSlug: 'idee-trame-mistero-omicidio-circo-uniche', topic: 'Circus Plot' },
  { lang: 'it', originalSlug: 'murder-mystery-party-medievale-guida-passo-passo', topic: 'Medieval Castle' },
  { lang: 'it', originalSlug: 'idee-uniche-trame-misteri-medievali', topic: 'Medieval Plot' },
  { lang: 'it', originalSlug: 'come-ospitare-mistero-omicidio-era-proibizionismo-strada-emozione', topic: 'Prohibition Era' },
  { lang: 'it', originalSlug: 'come-ospitare-festa-mistero-omicidio-steampunk-prepararsi-crimine-fantascienza-vittoriana', topic: 'Steampunk' },
  { lang: 'it', originalSlug: 'temi-mistero-omicidio-avvocato-dramma-aula-intrigo-legale', topic: 'Lawyer' },
  // PT
  { lang: 'pt', originalSlug: 'guia-festa-misterio-assassinato-egito-antigo', topic: 'Ancient Egypt' },
  { lang: 'pt', originalSlug: '5-temas-misterio-assassinato-resort-praia-que-tornarao-suas-ferias-inesqueciveis', topic: 'Beach Resort' },
  { lang: 'pt', originalSlug: 'como-hospedar-festa-misterio-assassinato-castelo-medieval-governe-reino-intriga-real', topic: 'Medieval Castle' },
  { lang: 'pt', originalSlug: 'como-organizar-festa-de-misterio-de-assassinato-de-super-herois-poderes-identidades-secretas-e-super-viloes', topic: 'Superhero' },
  { lang: 'pt', originalSlug: 'como-organizar-misterio-de-assassinato-apocalipse-zumbi-que-tera-seus-convidados-lutando-pela-sobrevivencia', topic: 'Zombie' },
  { lang: 'pt', originalSlug: 'festa-de-assassinato-misterioso-para-adolescentes-guia', topic: 'Teenagers' },
  { lang: 'pt', originalSlug: 'enredos-de-assassinato-misterioso-em-reuniao-escolar-descubra-segredos-enterrados', topic: 'School Reunion' },
  { lang: 'pt', originalSlug: 'como-corrigir-convidados-quebrando-o-personagem-mantenha-sua-festa-de-misterio-de-assassinato-imersiva', topic: 'Breaking Character' },
  { lang: 'pt', originalSlug: 'temas-misterio-assassinato-jornalistas-reporteres-investigativos-historias-mortais', topic: 'Journalist' },
];

// Note: we ALSO need to check IT beach resort — we deleted both beach resort posts
// but the newer one (b97d2dc4) was actually also a beach resort, and we need one back.
// We'll restore the newer one's slug.

async function fetchEnglishPost(slug) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=*&language=eq.en&slug=eq.${slug}&status=eq.published`, { 
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  const data = await res.json();
  return data[0];
}

async function findExistingTranslation(lang, enSlug) {
  // Check if there's already an existing translation for this topic in this language
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title&language=eq.${lang}&slug=like.*${enSlug.split('-').slice(0,3).join('-')}*&status=eq.published`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  return res.json();
}

async function insertPost(post) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('=== RESTORING WRONGLY DELETED POSTS ===\n');
  
  // First, fetch all the English source posts we need
  const enSlugsNeeded = [...new Set(RESTORE_LIST.map(r => TOPIC_TO_EN_SLUG[r.topic]))];
  console.log(`Fetching ${enSlugsNeeded.length} English source posts...\n`);
  
  const enPostsBySlug = {};
  for (const slug of enSlugsNeeded) {
    const post = await fetchEnglishPost(slug);
    if (post) {
      enPostsBySlug[slug] = post;
    } else {
      console.log(`  WARNING: English post not found for slug "${slug}"`);
    }
  }
  
  let restored = 0;
  let failed = 0;
  
  for (const item of RESTORE_LIST) {
    const enSlug = TOPIC_TO_EN_SLUG[item.topic];
    const enPost = enPostsBySlug[enSlug];
    
    if (!enPost) {
      console.log(`SKIP [${item.lang.toUpperCase()}] "${item.topic}" - no English source post`);
      failed++;
      continue;
    }
    
    // Create the restoration post using English content (these will need re-translation later,
    // but at minimum restores the post with proper metadata)
    // We use the original translated slug and copy the English content as placeholder
    const newPost = {
      slug: item.originalSlug,
      title: enPost.title, // English title as placeholder
      content: enPost.content, // English content as placeholder
      meta_description: enPost.meta_description,
      meta_keywords: enPost.meta_keywords,
      language: item.lang,
      theme: enPost.theme,
      status: 'published',
      featured_image_url: enPost.featured_image_url,
      reading_time: enPost.reading_time,
      author: enPost.author,
      tags: enPost.tags,
      post_date: enPost.post_date,
    };
    
    try {
      const result = await insertPost(newPost);
      console.log(`  OK  [${item.lang.toUpperCase()}] "${item.topic}" -> slug="${item.originalSlug}"`);
      restored++;
    } catch (err) {
      console.log(`  FAIL [${item.lang.toUpperCase()}] "${item.topic}": ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\nRestored: ${restored}, Failed: ${failed}`);
  
  // Verify final counts
  console.log('\n=== VERIFICATION ===');
  for (const lang of ['fr', 'it', 'pt']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id&language=eq.${lang}&status=eq.published`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const data = await res.json();
    console.log(`${lang.toUpperCase()}: ${data.length} posts (target: 61)`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
