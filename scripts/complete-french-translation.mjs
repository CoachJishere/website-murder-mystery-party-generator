import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Fetch first 5 posts alphabetically
console.log('Fetching posts...\n');
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .order('slug', { ascending: true })
  .limit(5);

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log('Posts to translate:');
posts.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
});
console.log('\n');

const translationPrompt = `You are an expert translator specializing in French marketing and SEO content. Translate this English blog post to natural, fluent French.

CRITICAL REQUIREMENTS:
1. Use formal "vous" form throughout
2. Translate ALL content naturally - don't just copy English
3. Maintain markdown formatting exactly
4. Keep all URLs unchanged
5. Translate section headings naturally

STANDARD FRENCH TRANSLATIONS:
- "Market Trends & Popularity" → "Tendances du Marché et Popularité"
- "What 10,000+ Mystery Parties Have Taught Us" → "Ce que Plus de 10 000 Soirées Mystère Nous Ont Appris"
- "Sources & References" → "Sources et Références"
- "FAQ" → "Questions Fréquemment Posées"
- "Reading time: X minutes" → "Temps de lecture : X minutes"
- Table header: "| Statistique | Valeur | Source |"

E-E-A-T BYLINE (use this exact format):
*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*

METADATA TO TRANSLATE:
- title
- meta_title
- meta_description
- content (full blog post body)

Return ONLY valid JSON with this structure:
{
  "title": "translated title",
  "meta_title": "translated meta title",
  "meta_description": "translated meta description",
  "content": "full translated content with markdown"
}`;

async function translatePost(post, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Translating ${index + 1}/5: ${post.title}`);
  console.log(`${'='.repeat(80)}\n`);

  const postData = {
    title: post.title,
    meta_title: post.meta_title,
    meta_description: post.meta_description,
    content: post.content
  };

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: `${translationPrompt}\n\nPost to translate:\n${JSON.stringify(postData, null, 2)}`
    }]
  });

  const translatedText = message.content[0].text;

  // Extract JSON from response (handles markdown code blocks)
  let translatedData;
  try {
    const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      translatedData = JSON.parse(jsonMatch[0]);
    } else {
      translatedData = JSON.parse(translatedText);
    }
  } catch (e) {
    console.error('Failed to parse translation JSON:', e);
    console.log('Raw response:', translatedText.substring(0, 500));
    throw e;
  }

  // Create French version
  const frenchPost = {
    title: translatedData.title,
    slug: post.slug, // Keep same slug
    content: translatedData.content,
    excerpt: post.excerpt, // Will be translated in content
    featured_image: post.featured_image,
    author: post.author,
    published_at: post.published_at,
    updated_at: post.updated_at,
    meta_title: translatedData.meta_title,
    meta_description: translatedData.meta_description,
    tags: post.tags,
    category: post.category,
    reading_time: post.reading_time,
    language: 'fr',
    original_post_id: post.id
  };

  // Insert into database
  const { data: insertedPost, error: insertError } = await supabase
    .from('blog_posts')
    .insert([frenchPost])
    .select()
    .single();

  if (insertError) {
    console.error(`Error inserting French post:`, insertError);
    throw insertError;
  }

  console.log(`✅ ${translatedData.title}`);
  console.log(`   Inserted with ID: ${insertedPost.id}\n`);

  return insertedPost;
}

// Translate all 5 posts
const results = [];
for (let i = 0; i < posts.length; i++) {
  try {
    const result = await translatePost(posts[i], i);
    results.push(result);
  } catch (error) {
    console.error(`Failed to translate post ${i + 1}:`, error);
    process.exit(1);
  }
}

console.log('\n' + '='.repeat(80));
console.log('TRANSLATION COMPLETE');
console.log('='.repeat(80));
console.log('\nAll 5 posts translated to French:\n');
results.forEach((post, i) => {
  console.log(`✅ ${post.title}`);
});
console.log('\nAll French posts inserted into database with language=\'fr\'');
