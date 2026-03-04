import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const POST_IDS = [
  '260f2fd7-0106-475a-8f02-8aa7a1037f47', // Butler Murder Mystery
  '2aaee48f-eb45-4183-8340-f92616812fe2', // Fairy Tale Murder Mystery
  '2acf78da-c601-4506-830b-ab46c180c414', // Film Noir Murder Mystery
  '2bc621a3-61d1-4ba6-8a7b-66e031e5d28c', // Archaeological Dig Murder Mystery
  '2d19c069-2354-45b5-be1f-ffe3d5338e7b', // Masquerade Ball Murder Mystery
];

async function translateToFrench(text, title) {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    temperature: 1,
    messages: [
      {
        role: 'user',
        content: `Translate this English murder mystery blog post to French. Maintain all markdown formatting, structure, tables, and quotes exactly. Use natural, engaging French suitable for entertainment content.

CRITICAL REQUIREMENTS:
1. Replace the E-E-A-T line with: *Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*
2. Keep all statistics, numbers, and data exactly as-is
3. Keep all source citations in English
4. Maintain markdown formatting (headers, bullets, tables, quotes)
5. Use natural French phrasing, not literal word-for-word translation
6. Keep the same engaging, professional tone

Title: ${title}

Content to translate:
${text}`,
      },
    ],
  });

  return message.content[0].text;
}

async function generateFrenchSlug(title) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 100,
    temperature: 1,
    messages: [
      {
        role: 'user',
        content: `Convert this French title to a URL slug (lowercase, hyphens, no accents, no special characters):

"${title}"

Return ONLY the slug, nothing else.`,
      },
    ],
  });

  return message.content[0].text.trim();
}

async function processPost(postId, index) {
  console.log(`\n[${ index}/5] Processing post ${postId}...`);

  // Fetch the English post
  const { data: post, error: fetchError } = await supabase
    .from('blog_posts')
    .select('title, slug, content, meta_description')
    .eq('id', postId)
    .single();

  if (fetchError) {
    console.error(`Error fetching post: ${fetchError.message}`);
    return null;
  }

  console.log(`  Original: ${post.title}`);

  // Translate title
  console.log('  Translating title...');
  const titleMessage = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 200,
    temperature: 1,
    messages: [
      {
        role: 'user',
        content: `Translate this English title to French. Keep it natural and engaging:

"${post.title}"

Return ONLY the French title, nothing else.`,
      },
    ],
  });
  const frenchTitle = titleMessage.content[0].text.trim();
  console.log(`  French: ${frenchTitle}`);

  // Translate meta description
  console.log('  Translating meta description...');
  const metaMessage = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 300,
    temperature: 1,
    messages: [
      {
        role: 'user',
        content: `Translate this English meta description to French. Keep it concise and engaging:

"${post.meta_description}"

Return ONLY the French meta description, nothing else.`,
      },
    ],
  });
  const frenchMeta = metaMessage.content[0].text.trim();

  // Generate French slug
  console.log('  Generating slug...');
  const frenchSlug = await generateFrenchSlug(frenchTitle);
  console.log(`  Slug: ${frenchSlug}`);

  // Translate content
  console.log('  Translating content (this may take a minute)...');
  const frenchContent = await translateToFrench(post.content, post.title);

  // Insert into database
  console.log('  Inserting into database...');
  const { data: inserted, error: insertError } = await supabase
    .from('blog_posts')
    .insert({
      title: frenchTitle,
      slug: frenchSlug,
      content: frenchContent,
      meta_description: frenchMeta,
      language: 'fr',
      published: true,
    })
    .select();

  if (insertError) {
    console.error(`  ❌ Error inserting: ${insertError.message}`);
    return null;
  }

  console.log(`  ✅ ${frenchTitle}`);
  return { title: frenchTitle, slug: frenchSlug };
}

async function main() {
  console.log('Starting French translation of posts 6-10...\n');

  const results = [];
  for (let i = 0; i < POST_IDS.length; i++) {
    const result = await processPost(POST_IDS[i], i + 1);
    if (result) {
      results.push(result);
    }
    // Small delay between posts
    if (i < POST_IDS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log('\n=== TRANSLATION COMPLETE ===');
  console.log(`Successfully translated ${results.length}/5 posts\n`);

  results.forEach((r, i) => {
    console.log(`✅ [${i + 1}] ${r.title}`);
  });
}

main().catch(console.error);
