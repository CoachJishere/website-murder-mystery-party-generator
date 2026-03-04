import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Load posts
const content = fs.readFileSync('batch4-sv-posts.json', 'utf8');
const jsonStart = content.indexOf('[');
const jsonContent = content.substring(jsonStart);
const posts = JSON.parse(jsonContent);

console.log(`Loaded ${posts.length} posts for Swedish translation\n`);

const TRANSLATION_PROMPT = `You are a professional translator specializing in Swedish content for murder mystery party planning.

Translate this English blog post to Swedish with these requirements:

1. COMPLETE TRANSLATION of all content including:
   - All sections and subsections
   - All tables (translate headers and content)
   - All FAQ sections
   - All quotes
   - All lists and checklists

2. SWEDISH FORMAT:
   - E-E-A-T line: "*Publicerad: 16 februari 2026 | Uppdaterad: 20 februari 2026 | Författare: Mystery Maker Party Team | Nästa granskning: 20 maj 2026*"
   - Research line: "*Baserat på analys av över 10 000 mordmysteriefester och forskning om [relevant topic]*"
   - Table headers: "| Statistik | Värde | Källa |"
   - Reading time: "Lästid: X minuter"

3. QUALITY STANDARDS:
   - Formal, professional tone throughout
   - Natural Swedish phrasing (not literal translation)
   - Proper Swedish grammar and word order
   - Use Swedish characters: å, ä, ö
   - Swedish-specific terminology for murder mystery parties
   - Maintain all markdown formatting
   - Keep all source citations and statistics in original language

4. SLUG: Create a Swedish slug based on the English slug:
   - Translate to Swedish
   - Use hyphens between words
   - Keep it concise (under 60 characters)
   - Make it SEO-friendly

Return a JSON object with:
{
  "title": "Swedish title",
  "slug": "swedish-slug-here",
  "content": "Full Swedish content with all sections...",
  "meta_description": "Swedish meta description (150-160 chars)",
  "meta_keywords": "Swedish keywords, comma separated"
}`;

async function translatePost(post, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Translating post ${index}/20: ${post.slug}`);
  console.log(`${'='.repeat(60)}`);

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    temperature: 1,
    messages: [{
      role: 'user',
      content: `${TRANSLATION_PROMPT}

ENGLISH POST:
Title: ${post.title}
Slug: ${post.slug}
Meta Description: ${post.meta_description}
Meta Keywords: ${post.meta_keywords}

CONTENT:
${post.content}`
    }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('No JSON found in translation response');
  }

  const translation = JSON.parse(jsonMatch[0]);
  
  console.log(`✓ Translated to Swedish`);
  console.log(`  Title: ${translation.title}`);
  console.log(`  Slug: ${translation.slug}`);
  console.log(`  Content length: ${translation.content.length} chars`);

  return translation;
}

async function insertSwedishPost(post, translation, index) {
  console.log(`\nInserting Swedish post ${index}/20...`);

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: translation.title,
      slug: translation.slug,
      content: translation.content,
      meta_description: translation.meta_description,
      meta_keywords: translation.meta_keywords,
      language: 'sv',
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
    console.error(`✗ Error inserting post:`, error);
    throw error;
  }

  console.log(`✓ ${index}/20 - Swedish post inserted successfully`);
  return data;
}

async function processAllPosts() {
  console.log('Starting Swedish translation batch 4 (posts 16-20)...\n');

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const postNumber = i + 16;

    try {
      // Translate
      const translation = await translatePost(post, postNumber);

      // Insert
      await insertSwedishPost(post, translation, postNumber);

      console.log(`✅ ${postNumber}/20 COMPLETE\n`);

      // Save checkpoint
      fs.writeFileSync(
        `sv-post-${postNumber}.json`,
        JSON.stringify({ original: post, translation }, null, 2)
      );

      // Rate limiting delay
      if (i < posts.length - 1) {
        console.log('Waiting 3 seconds before next translation...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`\n❌ ERROR on post ${postNumber}:`, error.message);
      console.error('Stopping batch process.');
      process.exit(1);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('BATCH 4 COMPLETE - All 5 Swedish posts translated and inserted');
  console.log('='.repeat(60));
}

processAllPosts();
