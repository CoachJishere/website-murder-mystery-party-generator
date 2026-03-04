import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-2_NmBwqKMi4hqI_HL-LXTnAhZFzS-9bA64Ysb17QRh2MsOA5oH0hAjNQcyE9YwKxNq-CY_2jk0pSdHWOIGGO_g-5HiYSQAA';

const sbHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

const LANG_NAMES = {
  ja: 'Japanese', ko: 'Korean', nl: 'Dutch', sv: 'Swedish',
  da: 'Danish', fi: 'Finnish', 'zh-cn': 'Simplified Chinese',
  fr: 'French', de: 'German', es: 'Spanish', it: 'Italian', pt: 'Portuguese'
};

const SLUG_PATTERNS = {
  // Languages that use prefix: lang-{english-slug}
  ja: 'prefix', ko: 'prefix', 'zh-cn': 'prefix',
  // Languages that use translated slugs
  nl: 'translated', sv: 'translated', da: 'translated', fi: 'translated',
  fr: 'translated', de: 'translated', es: 'translated', it: 'translated', pt: 'translated'
};

async function fetchPosts(lang) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.${lang}&status=eq.published&select=id,slug,title&limit=1000`;
  const res = await fetch(url, { headers: sbHeaders });
  return res.json();
}

async function translatePost(enPost, targetLang) {
  const langName = LANG_NAMES[targetLang];
  const slugPattern = SLUG_PATTERNS[targetLang];
  
  let slugInstruction;
  if (slugPattern === 'prefix') {
    slugInstruction = `The slug MUST be: ${targetLang}-${enPost.slug}`;
  } else {
    slugInstruction = `Create a fully translated slug in ${langName} using only lowercase ASCII letters, numbers, and hyphens. The slug should be a natural translation of the English slug "${enPost.slug}" into ${langName}. Remove diacritics/accents from the slug (e.g., ü→u, ö→o, å→a, é→e).`;
  }

  const prompt = `Translate this English blog post into ${langName}. Return ONLY valid JSON with these exact fields:
{
  "title": "translated title",
  "slug": "translated-slug",
  "content": "full translated markdown content",
  "meta_description": "translated meta description (max 160 chars)",
  "reading_time": <number>
}

IMPORTANT RULES:
- ${slugInstruction}
- Translate ALL content naturally into ${langName} - do not leave English text
- Preserve all markdown formatting (##, **, -, |, etc.)
- Preserve any links but translate link text
- Keep the same structure and sections as the original
- Keep brand names and proper nouns in English
- The reading_time should be the same as the original: ${enPost.reading_time}
- meta_description must be under 160 characters in ${langName}

Here is the English post to translate:

TITLE: ${enPost.title}
SLUG: ${enPost.slug}
META_DESCRIPTION: ${enPost.meta_description}
CONTENT:
${enPost.content}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  
  // Extract JSON from response (might be wrapped in ```json blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  
  return JSON.parse(jsonMatch[0]);
}

async function insertPost(translated, lang) {
  const post = {
    title: translated.title,
    slug: translated.slug,
    content: translated.content,
    meta_description: translated.meta_description,
    reading_time: translated.reading_time || 5,
    language: lang,
    status: 'published'
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify(post)
  });

  if (!res.ok) {
    const err = await res.text();
    // Check if it's a duplicate
    if (err.includes('duplicate') || err.includes('23505')) {
      return { status: 'skip', reason: 'duplicate slug' };
    }
    throw new Error(`Insert error ${res.status}: ${err}`);
  }

  return { status: 'ok' };
}

// Topic keywords for matching translated posts to English originals
const ENGLISH_TOPIC_KEYWORDS = {
  'fairy-tale': ['conte-de-fees', 'fiaba', 'conto-de-fadas', 'fairy-tale', 'fairytale', 'marchen', 'sprookje', 'eventyr', 'satu', 'saga'],
  'masquerade': ['bal-masque', 'ballo-maschera', 'mascaras', 'masquerade', 'masque', 'maschere', 'mascarada', 'baile-mascaras', 'maskenball', 'maskerbal', 'maskerad', 'naamioitu'],
  'speakeasy': ['speakeasy', 'clandestino', 'bar-clandestin', 'prohibition', 'proibizionismo', 'proibicionista', 'flusterbar'],
  'detective': ['detective', 'detectives', 'detecteur', 'detetive', 'investigatore', 'investigadores', 'detektiv', 'etsiva'],
  'mountain-lodge': ['montagne', 'montagna', 'montanha', 'chalet', 'lodge', 'mountain', 'berghütte', 'berglodge', 'fjallstuga'],
  'ancient-egypt': ['egypte', 'egitto', 'egito', 'egypt', 'antique', 'antico', 'antigo', 'pharaoh', 'faraone', 'agypten', 'egypten', 'egypti'],
  'spy-thriller': ['espion', 'spionaggio', 'espionagem', 'spy', 'thriller', 'espionnage', 'spion', 'vakooja'],
  'cruise-ship': ['croisiere', 'crociera', 'cruzeiro', 'cruise', 'navire', 'nave', 'navio', 'kreuzfahrt', 'cruiseschip', 'kryssning', 'krydstogt', 'risteily'],
  'art-gallery': ['galerie-dart', 'galleria-arte', 'galeria-arte', 'art-gallery', 'galeries-dart', 'galleria', 'kunstgalerie', 'konstgalleri', 'kunstgalleri', 'taidegalleria'],
  'butler': ['majordome', 'maggiordomo', 'mordomo', 'butler', 'hovmester'],
  'chef': ['chef', 'cuisinier', 'culinario', 'culinari', 'koch', 'kok', 'kokki'],
  'bookstore': ['librairie', 'libreria', 'livraria', 'bookstore', 'buchhandlung', 'boekhandel', 'bokhandel', 'boghandel', 'kirjakauppa'],
  'haunted-mansion': ['manoir-hante', 'villa-stregata', 'mansao-assombrada', 'haunted-mansion', 'hante', 'stregata', 'assombrada', 'spukhaus', 'spookhuis', 'hemsökt', 'hjemsøgt', 'kummitus'],
  'hollywood': ['hollywood'],
  'renaissance': ['renaissance', 'rinascimento', 'renascimento', 'renascentista', 'rinascimentale'],
  'medieval': ['medieval', 'medievale', 'chateau-medieval', 'castello-medievale', 'mittelalter', 'middeleeuws', 'medeltida', 'middelalder', 'keskiaikainen'],
  'victorian': ['victorien', 'vittoriana', 'vitoriana', 'victorian', 'viktorianisch', 'victoriaans', 'viktoriansk'],
  'wild-west': ['far-west', 'selvaggio-west', 'velho-oeste', 'wild-west', 'western', 'wilder-westen', 'wilde-westen', 'vilda-vastern'],
  'beach-resort': ['plage', 'spiaggia', 'praia', 'beach', 'resort', 'bord-de-mer', 'strand', 'ranta'],
  'space-colony': ['spatial', 'spaziale', 'espacial', 'space-colony', 'espace', 'spazio', 'colonie-spatiale', 'colonia-spaziale', 'colonia-espacial', 'weltraum', 'ruimte', 'rymd', 'rum', 'avaruus'],
  'casino': ['casino', 'cassino', 'kasino'],
  'haunted-hotel': ['hotel-hante', 'hotel-infestato', 'hotel-assombrado', 'haunted-hotel', 'hotel-fantasma', 'spukhotel', 'spokhotel'],
  'prohibition': ['prohibition', 'proibizionismo', 'proibicionista', 'bootleg', 'contrabbando'],
  'steampunk': ['steampunk'],
  'jazz': ['jazz', 'soiree-jazz'],
  'journalist': ['journaliste', 'giornalista', 'jornalista', 'journalist', 'reporteres', 'reporter'],
  'lawyer': ['avocat', 'avvocato', 'advogado', 'lawyer', 'legal', 'legale', 'tribunal', 'aula', 'anwalt', 'advocaat', 'advokat', 'asianajaja'],
  'medical-examiner': ['medecin-legiste', 'medico-legale', 'perito-medico', 'medical-examiner', 'forensi', 'forense', 'gerichtsmedizin', 'rechtsarts', 'rattslakar'],
  'birthday': ['anniversaire', 'compleanno', 'aniversario', 'birthday', 'fete-anniversaire', 'geburtstag', 'verjaardag', 'fodelsedag', 'fodselsdag', 'syntymapaiva'],
  'corporate-events': ['entreprise', 'aziendale', 'corporativo', 'corporate', 'team-building', 'eventi-aziendali', 'unternehmen', 'bedrijf', 'foretag', 'virksomhed', 'yritys'],
  'date-night': ['soiree-couple', 'serata-coppia', 'encontro-romantico', 'date-night', 'romantique', 'romantico', 'romanticos', 'romantisch', 'dejt', 'romantisk'],
  'game-night': ['soiree-jeu', 'serata-gioco', 'noite-jogos', 'game-night', 'jeux', 'spieleabend', 'spelavond', 'spelkvall', 'spilleaften', 'peli-ilta'],
  'graduation': ['diplome', 'laurea', 'formatura', 'graduation', 'abschluss', 'afstuderen', 'examen', 'valmistujaiset'],
  'holiday-gatherings': ['fetes', 'festive', 'festivas', 'holiday', 'noel', 'natale', 'natal', 'reunions-festives', 'riunioni-festive', 'reunioes-festivas', 'feiertag', 'feestdag', 'helgdag', 'helligdag', 'juhla'],
  'office-teams': ['bureau', 'ufficio', 'escritorio', 'office-teams', 'equipe-bureau', 'team-ufficio', 'büro', 'kantoor', 'kontor'],
  'small-groups': ['petits-groupes', 'piccoli-gruppi', 'grupos-pequenos', 'small-groups', 'kleine-gruppen', 'kleine-groepen', 'sma-grupper'],
  'teenagers': ['adolescents', 'adolescenti', 'adolescentes', 'teenagers', 'ados', 'jugendliche', 'tieners', 'tonaring', 'teini'],
  'socialite': ['mondain', 'alta-societa', 'alta-sociedade', 'socialite', 'high-society'],
  'archaeological': ['archeologique', 'archeologico', 'arqueologico', 'archaeological', 'fouilles', 'scavo', 'escavacao', 'archaologisch', 'archeologisch', 'arkeologisk'],
  'circus': ['cirque', 'circo', 'circus', 'big-top', 'chapiteau', 'tendone', 'zirkus', 'sirkus'],
  'pirate': ['pirate', 'pirata', 'piratas', 'pirati', 'pirat', 'sjorover', 'merirosvo'],
  'school-reunion': ['reunion-scolaire', 'riunione-scolastica', 'reuniao-escolar', 'school-reunion', 'klassentreffen', 'schoolreunie', 'skoltriff'],
  'train-station': ['gare', 'stazione-treno', 'estacao-trem', 'train-station', 'ferroviaire', 'ferroviarie', 'bahnhof', 'station', 'tagstation', 'juna-asema'],
  'underwater': ['sous-marin', 'subacqueo', 'submarino', 'underwater', 'unterwasser', 'onderwater', 'undervattens', 'undervands', 'vedenalainen'],
  'villain': ['mechant', 'cattivo', 'vilao', 'villain', 'viloes', 'cattivi', 'antagonist', 'bosewicht', 'schurk'],
  'dinner-party': ['diner', 'cena', 'jantar', 'dinner', 'soiree-diner', 'culinaire', 'culinaria', 'culinario', 'abendessen', 'diner', 'middag'],
  'boring': ['ennuyeuse', 'noiose', 'chata', 'boring', 'ennui', 'noia', 'langweilig', 'saai', 'trakig', 'kedelig', 'tylsa'],
  'confusing-clues': ['indices-confus', 'indizi-confusi', 'pistas-confusas', 'confusing-clues', 'pistas', 'verwirrend', 'verwarrend', 'forvirrande'],
  'non-participating': ['ne-participent', 'non-partecipano', 'nao-participam', 'non-participating', 'invites-qui-ne', 'ospiti-che-non', 'nicht-teilnehmen'],
  'overly-complex': ['trop-complexes', 'troppo-complessi', 'excessivamente-complexos', 'overly-complex', 'complexe', 'complessi', 'ubermassig', 'overmatig'],
  'pacing': ['rythme', 'ritmo', 'pacing', 'timing', 'tempo'],
  'unrealistic': ['irrealistes', 'irrealistiche', 'irrealistas', 'unrealistic', 'realisme', 'realismo', 'credibili', 'criveis', 'unrealistisch'],
  'unsatisfying-endings': ['fins-insatisfaisantes', 'finali-insoddisfacenti', 'finais-insatisfatorios', 'unsatisfying-endings', 'conclusion', 'revelacoes', 'unbefriedigend'],
  'breaking-character': ['personnage', 'personaggio', 'personagem', 'breaking-character', 'hors-personnage', 'fuori-personaggio', 'aus-der-rolle'],
  'film-noir': ['film-noir', 'cinema-noir'],
  'superhero': ['super-heros', 'supereroi', 'super-herois', 'superhero', 'superheld', 'supereroi'],
  'zombie': ['zombie', 'zombi', 'zumbi'],
  'vintage-circus': ['cirque-vintage', 'circo-vintage'],
  'celtic': ['celte', 'celtico', 'celta', 'celtic', 'celtica', 'celtique', 'keltisch', 'keltisk'],
  'mayan': ['maya', 'maia', 'mayan'],
  'greek': ['grec', 'greco', 'grego', 'greek', 'grece', 'grecia', 'griechisch', 'grieks', 'grekisk'],
  'aztec': ['azteque', 'azteco', 'asteca', 'aztec', 'aztekisch', 'azteeks', 'aztekisk'],
};

function matchEnglishToExistingTranslation(enSlug, existingPosts) {
  // Find which topic this English slug belongs to
  const enSlugLower = enSlug.toLowerCase();
  let enTopic = null;

  for (const [topic, keywords] of Object.entries(ENGLISH_TOPIC_KEYWORDS)) {
    if (enSlugLower.includes(topic)) {
      enTopic = topic;
      break;
    }
  }

  if (!enTopic) {
    // Fallback: extract significant words from English slug
    const words = enSlugLower.split('-').filter(w =>
      w.length > 3 && !['how-', 'host', 'that', 'will', 'your', 'make', 'murder', 'mystery', 'party', 'themes', 'guide', 'unique', 'plots', 'best', 'tips', 'ways'].includes(w)
    );
    // Check if any existing post slug/title contains 2+ of these words
    return existingPosts.some(p => {
      const combined = (p.slug + ' ' + p.title).toLowerCase();
      const matches = words.filter(w => combined.includes(w));
      return matches.length >= 2;
    });
  }

  const keywords = ENGLISH_TOPIC_KEYWORDS[enTopic] || [];
  // Also include the topic name itself
  const allKeywords = [enTopic, ...keywords];

  return existingPosts.some(p => {
    const combined = (p.slug + ' ' + p.title).toLowerCase();
    return allKeywords.some(kw => combined.includes(kw));
  });
}

function isPostTranslated(enSlug, lang, existingSlugs) {
  // Check prefix pattern: lang-slug
  if (existingSlugs.has(`${lang}-${enSlug}`)) return true;
  // Check suffix pattern: slug-lang
  if (existingSlugs.has(`${enSlug}-${lang}`)) return true;
  // Check exact match (shouldn't happen but just in case)
  if (existingSlugs.has(enSlug)) return true;
  return false;
}

async function main() {
  const targetLang = process.argv[2];
  if (!targetLang || !LANG_NAMES[targetLang]) {
    console.log('Usage: node bulk-translate.mjs <lang>');
    console.log('Languages: ' + Object.keys(LANG_NAMES).join(', '));
    process.exit(1);
  }

  console.log(`\n=== Translating to ${LANG_NAMES[targetLang]} (${targetLang}) ===\n`);

  // Fetch English posts
  const enRes = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?language=eq.en&status=eq.published&select=id,slug,title,content,meta_description,reading_time&limit=100`, { headers: sbHeaders });
  const enPosts = await enRes.json();
  console.log(`English posts: ${enPosts.length}`);

  // Fetch existing translations
  const existing = await fetchPosts(targetLang);
  const existingSlugs = new Set(existing.map(p => p.slug));
  console.log(`Existing ${targetLang} posts: ${existing.length}`);

  // Find which EN posts need translation
  // For prefix/suffix langs, we can check directly
  // For translated slug langs, we can't easily check, so we translate all and rely on slug uniqueness
  const slugPattern = SLUG_PATTERNS[targetLang];
  let toTranslate;

  if (slugPattern === 'prefix') {
    toTranslate = enPosts.filter(p => !isPostTranslated(p.slug, targetLang, existingSlugs));
  } else {
    // For translated slug langs, use topic-matching to skip already-translated posts
    if (existing.length >= 61) {
      console.log(`Already have ${existing.length} posts, skipping.`);
      return;
    }
    toTranslate = enPosts.filter(p => !matchEnglishToExistingTranslation(p.slug, existing));
  }

  console.log(`Posts to translate: ${toTranslate.length}\n`);

  let translated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < toTranslate.length; i++) {
    const enPost = toTranslate[i];
    const label = `[${i + 1}/${toTranslate.length}] ${enPost.slug.substring(0, 50)}`;

    try {
      console.log(`🔄 ${label}...`);
      const result = await translatePost(enPost, targetLang);
      const insertResult = await insertPost(result, targetLang);

      if (insertResult.status === 'skip') {
        console.log(`⏭️  ${label} (already exists)`);
        skipped++;
      } else {
        console.log(`✅ ${label}`);
        translated++;
      }
    } catch (e) {
      console.error(`❌ ${label}: ${e.message.substring(0, 100)}`);
      failed++;
      // Rate limit handling
      if (e.message.includes('429') || e.message.includes('rate')) {
        console.log('   Rate limited, waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
      }
    }

    // Small delay between API calls
    if (i < toTranslate.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n========================================`);
  console.log(`DONE: ${translated} translated, ${skipped} skipped, ${failed} failed`);
  console.log(`Total ${targetLang} posts now: ${existing.length + translated}`);
}

main().catch(console.error);
