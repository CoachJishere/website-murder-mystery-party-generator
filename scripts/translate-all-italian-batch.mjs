import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Italian translation rules
const ITALIAN_RULES = `
ITALIAN TRANSLATION REQUIREMENTS:

1. E-E-A-T Section:
   *Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*

2. Research Section:
   *Basato sull'analisi di oltre 10.000 feste misteriose e ricerca su [theme]*

3. Table Format:
   | Statistica | Valore | Fonte |

4. Reading Time:
   Tempo di lettura: X minuti

5. Formal "Lei" form throughout
6. Proper Italian accents: à, è, é, ì, ò, ù
7. Maintain all markdown formatting exactly
8. Keep all statistics and numbers unchanged
9. Translate ALL content including headings, lists, quotes, FAQs
10. Keep URLs and links unchanged
`;

async function translateToItalian(englishText, title) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    temperature: 1,
    messages: [{
      role: 'user',
      content: `${ITALIAN_RULES}

Translate this complete blog post to Italian following ALL rules above.

Title: ${title}

Content:
${englishText}

Return ONLY the translated Italian text, maintaining exact markdown formatting.`
    }]
  });

  return response.content[0].text;
}

function createItalianSlug(englishSlug) {
  const translations = {
    'spy-thriller': 'spy-thriller',
    'murder-mystery': 'giallo-mistero',
    'themes': 'temi',
    'that-will-have': 'che-faranno',
    'your-guests': 'i-tuoi-ospiti',
    'going-undercover': 'andare-sotto-copertura',
    'vintage-circus': 'circo-vintage',
    'step-into': 'entra-nel',
    'the-big-top': 'grande-tendone',
    'of-intrigue': 'di-intrigo',
    'ancient-egypt': 'antico-egitto',
    'party-guide': 'guida-festa',
    'party-planning': 'pianificazione-festa',
    'art-gallery': 'galleria-arte',
    'create-sophisticated': 'crea-sofisticati',
    'creative-crimes': 'crimini-creativi',
    'bookstore': 'libreria',
    'turn-the-page': 'gira-pagina',
    'literary-murder': 'omicidio-letterario'
  };

  let italianSlug = englishSlug;
  for (const [eng, ita] of Object.entries(translations)) {
    italianSlug = italianSlug.replace(new RegExp(eng, 'g'), ita);
  }

  return italianSlug + '-it';
}

async function translatePost(post, index, total) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ${index}/${total}: ${post.title}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Translate content
    console.log('Translating content...');
    const italianContent = await translateToItalian(post.content, post.title);

    // Translate title
    console.log('Translating title...');
    const titleResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 200,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `Translate this title to Italian (formal Lei form): ${post.title}`
      }]
    });
    const italianTitle = titleResponse.content[0].text.trim();

    // Translate meta description
    console.log('Translating meta description...');
    const metaResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 200,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `Translate this meta description to Italian (formal Lei form): ${post.meta_description}`
      }]
    });
    const italianMeta = metaResponse.content[0].text.trim();

    // Create Italian slug
    const italianSlug = createItalianSlug(post.slug);

    // Insert Italian post
    console.log('Inserting into database...');
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: italianTitle,
        content: italianContent,
        slug: italianSlug,
        meta_description: italianMeta,
        meta_keywords: post.meta_keywords,
        language: 'it',
        theme: post.theme,
        status: 'published',
        reading_time: post.reading_time,
        author: post.author,
        tags: post.tags,
        published_at: post.published_at,
        post_date: post.post_date
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting post ${index}:`, error);
      return { success: false, error };
    }

    console.log(`✅ Successfully translated and inserted: ${italianSlug}`);
    return { success: true, slug: italianSlug };

  } catch (error) {
    console.error(`❌ Error translating post ${index}:`, error);
    return { success: false, error };
  }
}

async function main() {
  console.log('Starting Italian translation of remaining 42 posts...\n');

  // Load remaining posts
  const posts = JSON.parse(
    readFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/remaining-posts-to-translate.json', 'utf-8')
  );

  console.log(`Total posts to translate: ${posts.length}`);

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const result = await translatePost(posts[i], i + 6, 47);
    results.push(result);

    // Brief pause between translations
    if (i < posts.length - 1) {
      console.log('\nWaiting 2 seconds before next translation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('TRANSLATION SUMMARY');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successful}/${posts.length}`);
  console.log(`❌ Failed: ${failed}/${posts.length}`);
  console.log(`🎯 Total Italian posts: ${successful + 5}/47`);
  console.log('='.repeat(60));
}

main();
