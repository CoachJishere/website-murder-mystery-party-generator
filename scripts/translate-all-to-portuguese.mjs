import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Translation mapping for common terms
const slugTranslations = {
  'murder-mystery': 'misterio-assassinato',
  'party': 'festa',
  'guide': 'guia',
  'planning': 'planejamento',
  'themes': 'temas',
  'ideas': 'ideias',
  'plot': 'enredo',
  'unique': 'unicos',
  'how-to-host': 'como-organizar',
  'beach-resort': 'resort-praia',
  'casino': 'cassino',
  'haunted-mansion': 'mansao-assombrada',
  'mountain-lodge': 'chalé-montanha',
  'renaissance': 'renascimento',
  'spy-thriller': 'espiao-suspense',
  'vintage-circus': 'circo-vintage',
  'ancient-egypt': 'egito-antigo',
  'art-gallery': 'galeria-arte',
  'bookstore': 'livraria',
  'butler': 'mordomo',
  'chef': 'chef',
  'detective-character': 'personagem-detetive',
  'cruise-ship': 'navio-cruzeiro',
  'haunted-hotel': 'hotel-assombrado',
  'breaking-character': 'quebrando-personagem',
  'fairy-tale': 'conto-fadas',
  'hollywood': 'hollywood',
  'medieval-castle': 'castelo-medieval',
  'prohibition-era': 'era-proibição',
  'steampunk': 'steampunk',
  'superhero': 'super-heroi',
  'zombie-apocalypse': 'apocalipse-zumbi',
  'jazz-club': 'clube-jazz',
  'journalist': 'jornalista',
  'lawyer': 'advogado',
  'medical-examiner': 'medico-legista',
  'birthday': 'aniversario',
  'corporate-events': 'eventos-corporativos',
  'date-night': 'noite-romantica',
  'game-night': 'noite-jogos',
  'graduation': 'formatura',
  'holiday-gatherings': 'reunioes-festivas',
  'office-teams': 'equipes-escritorio',
  'small-groups': 'grupos-pequenos',
  'teenagers': 'adolescentes',
  'socialite': 'socialite',
  'spa-resort': 'resort-spa',
  'archaeological-dig': 'escavacao-arqueologica',
  'circus': 'circo',
  'film-noir': 'filme-noir',
  'ice-hotel': 'hotel-gelo',
  'pirate': 'pirata',
  'school-reunion': 'reuniao-escola',
  'space-colony': 'colonia-espacial',
  'train-station': 'estacao-trem',
  'underwater': 'subaquatico',
  'villain': 'vilao',
  'wild-west': 'faroeste'
};

function translateSlug(englishSlug) {
  let portugueseSlug = englishSlug;

  // Apply common translations
  for (const [en, pt] of Object.entries(slugTranslations)) {
    portugueseSlug = portugueseSlug.replace(new RegExp(en, 'g'), pt);
  }

  // Additional common words
  portugueseSlug = portugueseSlug
    .replace(/that-will/g, 'que-vao')
    .replace(/make-your/g, 'tornar-sua')
    .replace(/your/g, 'sua')
    .replace(/for/g, 'para')
    .replace(/the/g, 'o')
    .replace(/with/g, 'com')
    .replace(/and/g, 'e')
    .replace(/to/g, 'para')
    .replace(/of/g, 'de')
    .replace(/in/g, 'em')
    .replace(/on/g, 'em')
    .replace(/at/g, 'em');

  return portugueseSlug;
}

async function translatePost(englishPost, index, total) {
  console.log(`\n[${index + 1}/${total}] 🔄 Translating: ${englishPost.slug}`);

  const translationPrompt = `You are a professional translator specializing in Brazilian Portuguese content for murder mystery party games.

Translate this ENTIRE blog post to Brazilian Portuguese following these CRITICAL requirements:

1. **Language Style**:
   - Brazilian Portuguese (not European Portuguese)
   - Formal "você" form
   - Use proper accents: ã, õ, ç, á, é, í, ó, ú
   - Natural, engaging, culturally appropriate

2. **E-E-A-T Signal Format** (MUST translate dates and keep format):
   - *Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*

3. **Research Signal Format**:
   - *Baseado na análise de mais de 10.000 festas de mistério de assassinato e pesquisa sobre [theme]*

4. **Statistics Table Headers**:
   - | Estatística | Valor | Fonte |

5. **Reading Time**:
   - "Tempo de leitura: X minutos"

6. **Content to Translate**:
   - Title
   - Meta description
   - ENTIRE article content (every word, every paragraph)
   - All headers and subheaders
   - All statistics, quotes, examples
   - All FAQs
   - All sources and references
   - All lists, tips, and recommendations

7. **Preserve**:
   - All markdown formatting
   - All links (keep URLs unchanged)
   - All structure and organization
   - All SEO/GEO elements

8. **Output Format**:
Return ONLY a valid JSON object with these fields:
{
  "title": "Translated title",
  "meta_description": "Translated meta description (150-160 characters)",
  "content": "Full translated article content with all markdown",
  "slug": "translated-slug-in-portuguese"
}

---

ENGLISH POST TO TRANSLATE:

**Slug**: ${englishPost.slug}
**Title**: ${englishPost.title}
**Meta Description**: ${englishPost.meta_description}

**Content**:
${englishPost.content}

---

Return ONLY the JSON object. No explanation, no markdown code blocks, just the raw JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: translationPrompt
      }]
    });

    const translatedText = response.content[0].text.trim();

    // Try to extract JSON if wrapped in code blocks
    let jsonText = translatedText;
    if (translatedText.startsWith('```')) {
      const match = translatedText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }

    const translated = JSON.parse(jsonText);

    // Create Portuguese post object
    const portuguesePost = {
      slug: translated.slug,
      title: translated.title,
      content: translated.content,
      meta_description: translated.meta_description,
      language: 'pt',
      reading_time: englishPost.reading_time,
      theme: englishPost.theme,
      status: 'published',
      author: 'AI Assistant',
      tags: englishPost.tags,
      created_at: englishPost.created_at,
      updated_at: new Date().toISOString(),
      post_date: englishPost.post_date,
      published_at: englishPost.published_at
    };

    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', portuguesePost.slug)
      .eq('language', 'pt')
      .single();

    if (existing) {
      console.log(`   ⊘ Already exists: ${portuguesePost.slug}`);
      return { success: true, skipped: true };
    }

    // Insert into database
    const { error: insertError } = await supabase
      .from('blog_posts')
      .insert(portuguesePost);

    if (insertError) {
      console.error(`   ❌ Error inserting ${portuguesePost.slug}:`, insertError);
      return { success: false, error: insertError };
    }

    console.log(`   ✅ Inserted: ${portuguesePost.slug}`);
    return { success: true, skipped: false };

  } catch (error) {
    console.error(`   ❌ Translation error:`, error.message);
    return { success: false, error };
  }
}

async function main() {
  console.log('🚀 Starting Portuguese translation process...\n');

  // Fetch all optimized English posts
  const { data: englishPosts, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20')
    .order('slug', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching English posts:', fetchError);
    process.exit(1);
  }

  console.log(`📚 Found ${englishPosts.length} English posts to translate\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Translate each post
  for (let i = 0; i < englishPosts.length; i++) {
    const result = await translatePost(englishPosts[i], i, englishPosts.length);

    if (result.success) {
      if (result.skipped) {
        skipCount++;
      } else {
        successCount++;
      }
    } else {
      errorCount++;
    }

    // Progress update every 5 posts
    if ((i + 1) % 5 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${englishPosts.length} | ✅ ${successCount} new | ⊘ ${skipCount} existing | ❌ ${errorCount} errors\n`);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TRANSLATION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully translated: ${successCount} posts`);
  console.log(`⊘ Already existed: ${skipCount} posts`);
  console.log(`❌ Errors: ${errorCount} posts`);
  console.log(`📊 Total Portuguese posts: ${successCount + skipCount}`);
  console.log('='.repeat(60));
}

main();
