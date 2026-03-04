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
    'prohibition-era': 'era-proibizionismo',
    'bootleg-your-way': 'contrabbanda-tuo-modo',
    'excitement': 'emozione',
    'steampunk': 'steampunk',
    'gear-up': 'preparati',
    'victorian': 'vittoriana',
    'sci-fi': 'fantascienza',
    'crime': 'crimine',
    'jazz-club': 'jazz-club',
    'swing-into': 'immergiti',
    'journalist': 'giornalista',
    'investigative': 'investigativo',
    'reporters': 'reporter',
    'uncover': 'scoprire',
    'deadly': 'mortali',
    'stories': 'storie',
    'lawyer': 'avvocato',
    'courtroom': 'tribunale',
    'drama': 'dramma',
    'legal': 'legale',
    'intrigue': 'intrigo',
    'murder-mystery': 'mistero-omicidio',
    'party': 'festa',
    'planning': 'pianificazione',
    'themes': 'temi',
    'theme': 'tema',
    'how-to-host': 'come-ospitare',
    'host': 'ospitare',
    'a': 'un',
    'and': 'e',
    'the': 'il',
    'for': 'per',
    'to': 'a',
    'into': 'in'
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

   - Any "*Based on analyzing 10,000+ murder mystery parties and...*" phrases
     → "*Basato sull'analisi di oltre 10.000 feste misteriose e ricerca approfondita su [topic]*"

5. Table headers must be translated as:
   | Statistic | Value | Source |
   → | Statistica | Valore | Fonte |

6. Reading time format:
   *Reading time: X minutes* → *Tempo di lettura: X minuti*

7. Use proper Italian accents (à, è, é, ì, ò, ù)
8. Keep all URLs, links, and image paths unchanged
9. Translate SEO content naturally for Italian readers
10. Maintain professional, engaging tone
11. Keep the same structure and paragraph breaks

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
  console.log('Fetching posts 20-24 for Italian translation...\n');

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
  const batch = posts.slice(19, 24); // Posts 20-24 (0-indexed)

  console.log(`Found ${batch.length} posts to translate:`);
  batch.forEach((post, idx) => {
    console.log(`  ${idx + 1}. ${post.title}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('Starting Italian translation...\n');

  for (let i = 0; i < batch.length; i++) {
    const post = batch[i];
    const postNum = i + 1;

    console.log(`[${postNum}/5] Translating: ${post.title}`);

    try {
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
        console.log(`  ⚠️  Already exists, skipping...`);
        console.log(`  ✅ ${postNum}/5\n`);
        continue;
      }

      // Translate using Claude
      console.log(`  Translating with Claude API...`);
      const translated = await translateToItalian(
        post.content,
        post.title,
        post.meta_description
      );

      // Insert Italian post
      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          slug: italianSlug,
          title: translated.title,
          meta_description: translated.meta_description,
          meta_keywords: post.meta_keywords,
          content: translated.content,
          language: 'it',
          theme: post.theme,
          status: post.status,
          reading_time: post.reading_time,
          author: post.author,
          tags: post.tags,
          published_at: post.published_at,
          post_date: post.post_date
        });

      if (insertError) {
        console.log(`  ❌ Error inserting: ${insertError.message}`);
      } else {
        console.log(`  ✅ ${postNum}/5 Inserted successfully\n`);
      }

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}\n`);
    }

    // Brief pause between translations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('='.repeat(80));
  console.log('Italian translation complete!');
  console.log('\nALL 5 POSTS COMPLETED ✅');
}

main();
