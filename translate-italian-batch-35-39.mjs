import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(fs.readFileSync('article_to_translate.json', 'utf8'));

function transliterateToItalian(slug) {
  const map = {
    'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue': 'temi-misteri-omicidio-socialite-scandali-alta-societa-intrighi-elite',
    'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury': 'guida-festa-mistero-omicidio-spa-resort-relax-pericolo-lusso',
    'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders': 'mistero-omicidio-scavo-archeologico-unico-scoprire-segreti-antichi-omicidi-moderni',
    'unique-circus-murder-mystery-plot-ideas': 'idee-trame-mistero-omicidio-circo-uniche',
    'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime': 'trame-mistero-omicidio-film-noir-uniche-ombre-crimine-urbano'
  };
  return map[slug] || slug;
}

async function translatePost(post, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Translating post ${index}/5: ${post.title}`);
  console.log(`${'='.repeat(80)}\n`);

  const prompt = `Translate this English murder mystery blog post to Italian.

CRITICAL REQUIREMENTS:
1. Use formal "Lei" form throughout
2. Translate "*Published: February 16, 2026...*" to "*Pubblicato: 16 febbraio 2026...*"
3. Keep ALL markdown formatting, links, tables exactly as-is
4. Maintain E-E-A-T credibility - use proper Italian accents (à, è, é, ì, ò, ù)
5. Keep URLs, HTML, and technical elements unchanged
6. Translate naturally for Italian readers while keeping the professional tone
7. Do NOT translate: company names, product names, proper nouns, statistical sources
8. Keep quote attributions in original language but translate the context around them

TITLE:
${post.title}

DESCRIPTION:
${post.description}

CONTENT:
${post.content}

Return ONLY a JSON object with this structure:
{
  "title": "translated title",
  "description": "translated description",
  "content": "translated content"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const translation = JSON.parse(jsonMatch[0]);
  const italianSlug = transliterateToItalian(post.slug);

  console.log(`✓ Translation completed`);
  console.log(`  Original slug: ${post.slug}`);
  console.log(`  Italian slug: ${italianSlug}`);

  // Insert into database
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: translation.title,
      slug: italianSlug,
      description: translation.description,
      content: translation.content,
      language: 'it',
      published: true
    })
    .select();

  if (error) {
    console.error(`✗ Database error:`, error);
    throw error;
  }

  console.log(`✓ Inserted into database with ID: ${data[0].id}`);
  return { ...translation, slug: italianSlug, id: data[0].id };
}

async function main() {
  console.log('Starting Italian translation of posts 35-39 (5 posts)');
  console.log('Using formal "Lei" form with proper Italian accents\n');

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    try {
      const result = await translatePost(posts[i], i + 1);
      results.push(result);
      console.log(`✓ Post ${i + 1}/5 complete\n`);

      // Brief pause between translations
      if (i < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`✗ Error on post ${i + 1}:`, error.message);
      throw error;
    }
  }

  // Save results
  fs.writeFileSync('translation_it_35-39.json', JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('ALL 5 POSTS TRANSLATED SUCCESSFULLY');
  console.log('='.repeat(80));
  console.log('\nResults saved to: translation_it_35-39.json\n');

  results.forEach((r, i) => {
    console.log(`${i + 35}. ${r.title}`);
    console.log(`   Slug: ${r.slug}`);
    console.log(`   ID: ${r.id}`);
    console.log();
  });
}

main().catch(console.error);
