import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const anthropic = new Anthropic({ apiKey: 'sk-ant-api03-2_NmBwqKMi4hqI_HL-LXTnAhZFzS-9bA64Ysb17QRh2MsOA5oH0hAjNQcyE9YwKxNq-CY_2jk0pSdHWOIGGO_g-5HiYSQAA' });
const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  {
    "id": "6c030a19-7884-42fa-aecb-d97ef2b0bdac",
    "title": "Unique Underwater Murder Mystery Plots That Will Make a Splash at Your Party",
    "slug": "unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party"
  },
  {
    "id": "b88413c5-7f5b-4dad-955f-aab433943b19",
    "title": "Villain Murder Mystery Themes: Masterminds, Desperate Killers, and Unexpected Antagonists",
    "slug": "villain-murder-mystery-themes-masterminds-killers-antagonists"
  },
  {
    "id": "fb39f18e-8b9f-4332-9502-dc88fa9345e9",
    "title": "Wild West Murder Mystery Party Planning",
    "slug": "wild-west-murder-mystery-party-planning"
  }
];

async function translatePost(post, index) {
  console.log(`\n=== TRANSLATING POST ${index + 45 + 1}/47: ${post.title} ===\n`);

  // Fetch the full English post
  const { data: englishPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', post.id)
    .single();

  if (fetchError) {
    console.error(`Error fetching post ${post.id}:`, fetchError);
    return;
  }

  console.log('Translating to Italian...');

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    temperature: 1,
    messages: [{
      role: 'user',
      content: `Translate this murder mystery blog post to Italian.

ITALIAN STYLE REQUIREMENTS:
- Use formal "Lei" form throughout
- Use proper Italian accents (à, è, é, ì, ò, ù)
- Translate the E-E-A-T marker as: "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Mystery Maker Party Team | Prossima revisione: 20 maggio 2026*"
- Keep all URLs, links, and markdown formatting identical
- Maintain all statistics, numbers, and table structures exactly
- Keep English proper nouns (like "Mystery Maker Party", brand names, people names)
- Translate all content naturally while preserving the professional, engaging tone

ENGLISH POST:
Title: ${englishPost.title}

Content:
${englishPost.content}

Meta Description: ${englishPost.meta_description}

Meta Keywords: ${englishPost.meta_keywords}

RESPOND WITH ONLY A JSON OBJECT IN THIS EXACT FORMAT:
{
  "title": "Italian translation of title",
  "content": "Full Italian translation of content with proper formatting",
  "meta_description": "Italian meta description",
  "meta_keywords": "Italian meta keywords"
}`
    }]
  });

  const translatedText = message.content[0].text;
  console.log('Translation received, parsing JSON...');

  // Parse the JSON response
  let translated;
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    translated = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('Failed to parse translation JSON:', parseError);
    console.log('Raw response:', translatedText.substring(0, 500));
    return;
  }

  // Create Italian slug
  const italianSlug = post.slug.replace(/^/, 'it-');

  console.log(`Italian slug: ${italianSlug}`);

  // Insert into database
  const { data: inserted, error: insertError } = await supabase
    .from('blog_posts')
    .insert({
      title: translated.title,
      content: translated.content,
      slug: italianSlug,
      meta_description: translated.meta_description,
      meta_keywords: translated.meta_keywords,
      language: 'it',
      theme: englishPost.theme,
      status: 'published',
      reading_time: englishPost.reading_time,
      author: englishPost.author,
      tags: englishPost.tags,
      published_at: new Date().toISOString(),
      post_date: new Date().toISOString().split('T')[0]
    })
    .select();

  if (insertError) {
    console.error(`Error inserting Italian post:`, insertError);
    return;
  }

  console.log(`✅ Successfully inserted Italian post: ${italianSlug}`);

  // Save to file for verification
  await fs.writeFile(
    `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/italian-post-${index + 45}.json`,
    JSON.stringify({ original: englishPost, translated, slug: italianSlug }, null, 2)
  );

  return inserted;
}

async function main() {
  console.log('STARTING ITALIAN TRANSLATION OF POSTS 45-47\n');

  for (let i = 0; i < posts.length; i++) {
    await translatePost(posts[i], i);
    // Add delay between translations to avoid rate limits
    if (i < posts.length - 1) {
      console.log('\nWaiting 5 seconds before next translation...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('\n=== TRANSLATION COMPLETE ===');
  console.log('All 3 Italian posts have been translated and inserted into the database.');
}

main().catch(console.error);
