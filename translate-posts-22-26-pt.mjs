import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  { num: 22, slug: 'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains', ptSlug: 'como-organizar-festa-de-misterio-de-assassinato-de-super-herois-poderes-identidades-secretas-e-super-viloes' },
  { num: 23, slug: 'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival', ptSlug: 'como-organizar-misterio-de-assassinato-apocalipse-zumbi-que-tera-seus-convidados-lutando-pela-sobrevivencia' },
  { num: 24, slug: 'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime', ptSlug: 'planejamento-festa-misterio-assassinato-clube-de-jazz-mergulhe-no-crime-da-era-da-proibicao' },
  { num: 25, slug: 'journalist-murder-mystery-themes-investigative-reporters-deadly-stories', ptSlug: 'temas-misterio-assassinato-jornalista-reporteres-investigativos-historias-mortais' },
  { num: 26, slug: 'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue', ptSlug: 'temas-misterio-assassinato-advogado-drama-tribunal-intriga-juridica' }
];

async function translatePost(postNum, englishData) {
  console.log(`\n=== Translating Post ${postNum}: ${englishData.title} ===`);

  const translationPrompt = `You are a professional translator specializing in Brazilian Portuguese (pt-BR). Translate the following blog post about murder mystery parties from English to Brazilian Portuguese.

CRITICAL REQUIREMENTS:
1. Use formal "você" form throughout
2. Use proper Brazilian Portuguese accents: ã, õ, ç, á, é, í, ó, ú
3. Maintain all markdown formatting exactly
4. Keep HTML tags unchanged
5. Translate naturally for Brazilian audience while preserving meaning
6. Keep brand names, proper nouns as-is
7. Update E-E-A-T line to: "*Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*"
8. Translate "Reading Time: X minutes" to "Tempo de Leitura: X minutos"

ENGLISH TITLE:
${englishData.title}

ENGLISH CONTENT:
${englishData.content}

Provide ONLY the translated content in your response, no explanations. Start directly with the translated text.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    temperature: 1,
    messages: [
      {
        role: 'user',
        content: translationPrompt
      }
    ]
  });

  const translatedContent = message.content[0].text;

  // Now translate the title
  const titlePrompt = `Translate this English title to Brazilian Portuguese (pt-BR). Use proper accents (ã, õ, ç, á, é, í, ó, ú). Provide ONLY the translated title, nothing else.

ENGLISH TITLE:
${englishData.title}`;

  const titleMessage = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 200,
    temperature: 1,
    messages: [
      {
        role: 'user',
        content: titlePrompt
      }
    ]
  });

  const translatedTitle = titleMessage.content[0].text.trim();

  // Translate meta description
  const metaPrompt = `Translate this meta description to Brazilian Portuguese (pt-BR). Use proper accents. Keep it concise. Provide ONLY the translated text.

ENGLISH:
${englishData.meta_description}`;

  const metaMessage = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 300,
    temperature: 1,
    messages: [
      {
        role: 'user',
        content: metaPrompt
      }
    ]
  });

  const translatedMeta = metaMessage.content[0].text.trim();

  return {
    title: translatedTitle,
    content: translatedContent,
    meta_description: translatedMeta
  };
}

async function insertPortuguesePost(postNum, ptSlug, englishData, translations) {
  console.log(`\n=== Inserting Portuguese Post ${postNum} ===`);

  const portuguesePost = {
    title: translations.title,
    slug: ptSlug,
    content: translations.content,
    excerpt: englishData.excerpt, // Keep same excerpt structure
    meta_description: translations.meta_description,
    language: 'pt',
    category_id: englishData.category_id,
    author_id: englishData.author_id,
    featured_image: englishData.featured_image,
    is_published: true,
    published_at: englishData.published_at,
    tags: englishData.tags,
    reading_time_minutes: englishData.reading_time_minutes,
    seo_title: translations.title,
    seo_keywords: englishData.seo_keywords,
    schema_markup: englishData.schema_markup
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([portuguesePost])
    .select();

  if (error) {
    console.error(`Error inserting post ${postNum}:`, error);
    throw error;
  }

  console.log(`✓ Successfully inserted post ${postNum}: ${ptSlug}`);
  return data[0];
}

async function main() {
  console.log('Starting translation of posts 22-26 to Portuguese...\n');

  const results = [];

  for (const post of posts) {
    try {
      // Read English post
      const englishData = JSON.parse(fs.readFileSync(`post-${post.num}-en.json`, 'utf8'));

      // Translate
      const translations = await translatePost(post.num, englishData);

      // Insert
      const insertedPost = await insertPortuguesePost(post.num, post.ptSlug, englishData, translations);

      results.push({
        postNum: post.num,
        slug: post.ptSlug,
        success: true,
        id: insertedPost.id
      });

      console.log(`\n✓ Post ${post.num} completed successfully`);

      // Wait a bit between posts to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`\n✗ Error processing post ${post.num}:`, error.message);
      results.push({
        postNum: post.num,
        slug: post.ptSlug,
        success: false,
        error: error.message
      });
    }
  }

  console.log('\n\n=== TRANSLATION SUMMARY ===');
  results.forEach(r => {
    console.log(`Post ${r.postNum}: ${r.success ? '✓ SUCCESS' : '✗ FAILED'} - ${r.slug}`);
    if (r.id) console.log(`  ID: ${r.id}`);
    if (r.error) console.log(`  Error: ${r.error}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n${successCount}/${results.length} posts translated and inserted successfully.`);
}

main();
