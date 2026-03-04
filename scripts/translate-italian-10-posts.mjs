import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Translate slug to Italian
function translateSlug(englishSlug) {
  const slugMap = {
    'murder-mystery': 'mistero-omicidio',
    'party': 'festa',
    'parties': 'feste',
    'planning': 'pianificazione',
    'ideas': 'idee',
    'guide': 'guida',
    'tips': 'consigli',
    'themes': 'temi',
    'theme': 'tema',
    'costumes': 'costumi',
    'decorations': 'decorazioni',
    'venue': 'locale',
    'venues': 'locali',
    'budget': 'budget',
    'setup': 'preparazione',
    'guests': 'ospiti',
    'clues': 'indizi',
    'characters': 'personaggi',
    'detective': 'detective',
    'investigation': 'indagine',
    'mystery': 'mistero',
    'scenario': 'scenario',
    'plot': 'trama',
    'atmosphere': 'atmosfera',
    'reveal': 'rivelazione',
    'solution': 'soluzione',
    'best': 'migliori',
    'top': 'top',
    'how-to': 'come',
    'ultimate': 'definitiva',
    'complete': 'completa',
    'perfect': 'perfetta',
    'professional': 'professionale',
    'creative': 'creativa',
    'unique': 'unica',
    'unforgettable': 'indimenticabile',
    'outdoor': 'esterno',
    'indoor': 'interno',
    'virtual': 'virtuale',
    'classic': 'classica',
    'modern': 'moderna',
    'historical': 'storica',
    'vintage': 'vintage',
    'elegant': 'elegante',
    'fun': 'divertente',
    'scary': 'spaventosa',
    'dramatic': 'drammatica',
    'romantic': 'romantica',
    'comedy': 'commedia',
    'thriller': 'thriller',
    'noir': 'noir',
    'victorian': 'vittoriana',
    'gothic': 'gotica',
    'glamorous': 'glamour',
    '1920s': 'anni-20',
    'gatsby': 'gatsby',
    'speakeasy': 'speakeasy',
    'mansion': 'villa',
    'castle': 'castello',
    'restaurant': 'ristorante',
    'hotel': 'hotel',
    'train': 'treno',
    'cruise': 'crociera',
    'theater': 'teatro',
    'museum': 'museo',
    'library': 'biblioteca',
    'school': 'scuola',
    'office': 'ufficio',
    'hospital': 'ospedale',
    'casino': 'casino',
    'spa': 'spa',
    'beach': 'spiaggia',
    'garden': 'giardino',
    'forest': 'foresta',
    'dinner': 'cena',
    'lunch': 'pranzo',
    'brunch': 'brunch',
    'cocktail': 'cocktail',
    'wine': 'vino',
    'food': 'cibo',
    'menu': 'menu',
    'drinks': 'bevande',
    'music': 'musica',
    'dance': 'ballo',
    'game': 'gioco',
    'games': 'giochi',
    'prizes': 'premi',
    'awards': 'premi',
    'invitations': 'inviti',
    'script': 'sceneggiatura',
    'storyline': 'trama',
    'backstory': 'retroscena',
    'motive': 'movente',
    'alibi': 'alibi',
    'weapon': 'arma',
    'evidence': 'prove',
    'red-herrings': 'falsi-indizi',
    'twists': 'colpi-di-scena',
    'ending': 'finale',
    'beginner': 'principianti',
    'advanced': 'avanzato',
    'expert': 'esperto',
    'small': 'piccola',
    'large': 'grande',
    'medium': 'media',
    'intimate': 'intima',
    'corporate': 'aziendale',
    'team-building': 'team-building',
    'birthday': 'compleanno',
    'anniversary': 'anniversario',
    'wedding': 'matrimonio',
    'holiday': 'vacanza',
    'christmas': 'natale',
    'halloween': 'halloween',
    'new-year': 'capodanno',
    'valentines': 'san-valentino',
    'easter': 'pasqua',
    'thanksgiving': 'ringraziamento',
    'summer': 'estate',
    'winter': 'inverno',
    'spring': 'primavera',
    'fall': 'autunno',
    'autumn': 'autunno',
    'kids': 'bambini',
    'teens': 'adolescenti',
    'adults': 'adulti',
    'families': 'famiglie',
    'seniors': 'anziani',
    'couples': 'coppie',
    'singles': 'single',
    'women': 'donne',
    'men': 'uomini',
    'mixed': 'misto',
    'host': 'ospitante',
    'hosting': 'ospitare',
    'organize': 'organizzare',
    'plan': 'pianificare',
    'create': 'creare',
    'design': 'progettare',
    'prepare': 'preparare',
    'run': 'gestire',
    'execute': 'eseguire',
    'manage': 'gestire',
    'coordinate': 'coordinare',
    'facilitate': 'facilitare',
    'moderate': 'moderare',
    'engage': 'coinvolgere',
    'entertain': 'intrattenere',
    'impress': 'impressionare',
    'surprise': 'sorprendere',
    'delight': 'deliziare',
    'memorable': 'memorabile',
    'successful': 'successo',
    'amazing': 'incredibile',
    'spectacular': 'spettacolare',
    'extraordinary': 'straordinaria',
    'exceptional': 'eccezionale',
    'outstanding': 'eccezionale',
    'superb': 'superba',
    'brilliant': 'brillante',
    'fantastic': 'fantastica',
    'wonderful': 'meravigliosa',
    'fabulous': 'favolosa',
    'magnificent': 'magnifica',
    'splendid': 'splendida',
    'marvelous': 'meravigliosa'
  };

  let italianSlug = englishSlug;

  // Sort by length descending to replace longer phrases first
  const sortedEntries = Object.entries(slugMap).sort((a, b) => b[0].length - a[0].length);

  for (const [eng, ita] of sortedEntries) {
    const regex = new RegExp(eng, 'g');
    italianSlug = italianSlug.replace(regex, ita);
  }

  return italianSlug;
}

// Translate content using Claude API
async function translateToItalian(englishContent, title, metaDescription) {
  const prompt = `You are a professional translator specializing in Italian (Italy). Translate the following murder mystery party blog post from English to Italian.

CRITICAL TRANSLATION REQUIREMENTS:
1. Use formal "Lei" form throughout (not informal "tu")
2. Preserve ALL markdown formatting exactly (headers, lists, bold, italic, etc.)
3. Preserve ALL HTML entities and special characters
4. Translate these specific phrases EXACTLY as shown:
   - "*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*"
     → "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*"

   - "*Based on analysis of 10,000+ murder mystery parties and expert event planning research*"
     → "*Basato sull'analisi di oltre 10.000 feste misteriose e ricerche di esperti di pianificazione eventi*"

5. Use proper Italian accents (à, è, é, ì, ò, ù)
6. Keep all URLs, links, and image paths unchanged
7. Translate SEO content naturally for Italian readers
8. Maintain professional, engaging tone
9. Keep the same structure and paragraph breaks

TITLE TO TRANSLATE:
${title}

META DESCRIPTION TO TRANSLATE:
${metaDescription}

CONTENT TO TRANSLATE:
${englishContent}

Return a JSON object with this exact structure:
{
  "title": "translated Italian title",
  "meta_description": "translated Italian meta description",
  "content": "translated Italian content with all markdown preserved"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const responseText = message.content[0].text;

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in translation response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  console.log('='.repeat(80));
  console.log('ITALIAN TRANSLATION - Posts 10-19');
  console.log('='.repeat(80));
  console.log('\nStep 1: Fetching optimized English posts...\n');

  // Get the posts
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
  console.log(`Total optimized posts: ${posts.length}`);

  const postsToTranslate = posts.slice(9, 19);
  console.log(`\nPosts 10-19 (${postsToTranslate.length} posts):`);
  postsToTranslate.forEach((p, i) => {
    console.log(`  ${i+10}. ${p.slug}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('Step 2: Translating and inserting posts...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < postsToTranslate.length; i++) {
    const post = postsToTranslate[i];
    const num = i + 1;
    const total = postsToTranslate.length;

    console.log(`[${ num}/${total}] ${post.slug}`);
    console.log(`  English title: ${post.title.substring(0, 60)}...`);

    // Create Italian slug
    const italianSlug = translateSlug(post.slug);
    console.log(`  Italian slug: ${italianSlug}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', italianSlug)
      .eq('language', 'it')
      .single();

    if (existing) {
      console.log(`  ⊘ Already exists (id: ${existing.id})\n`);
      skipCount++;
      continue;
    }

    try {
      // Translate using Claude API
      console.log('  🔄 Translating with Claude API...');
      const translation = await translateToItalian(post.content, post.title, post.meta_description);

      console.log(`  Italian title: ${translation.title.substring(0, 60)}...`);

      // Insert Italian post
      const italianPost = {
        slug: italianSlug,
        title: translation.title,
        content: translation.content,
        meta_description: translation.meta_description,
        language: 'it',
        published: post.published,
        category: post.category,
        featured_image: post.featured_image,
        author: post.author,
        tags: post.tags,
        schema_markup: post.schema_markup,
        reading_time: post.reading_time,
        created_at: post.created_at,
        updated_at: new Date().toISOString()
      };

      const { data: inserted, error: insertError } = await supabase
        .from('blog_posts')
        .insert(italianPost)
        .select();

      if (insertError) {
        throw insertError;
      }

      console.log(`  ✅ ${num}/${total} Inserted successfully (id: ${inserted[0].id})\n`);
      successCount++;

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successfully inserted: ${successCount}`);
  console.log(`⊘ Skipped (already exist): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`Total processed: ${successCount + skipCount + errorCount}/${total}`);
  console.log('='.repeat(80));
}

main();
