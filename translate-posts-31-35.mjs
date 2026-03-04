import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const posts = [
  '3cb1b819-7c13-4630-95ed-494ef515fd0a', // Space Station
  '9c6bc262-da91-4eb9-aeda-71f5dc3ce0d8', // Steampunk
  'dd208ded-7aef-43b1-8176-98a9e5f28c09', // Superhero
  'f9e5ae63-d483-42e0-845e-6c5ce69c3624', // Victorian
  'bd829048-623b-467a-94e2-c7676bdf8ef2', // Zombie
];

async function translatePost(postId) {
  // Fetch the English post
  const { data: post, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError) {
    console.error(`Error fetching post ${postId}:`, fetchError);
    return;
  }

  console.log(`\n🌐 Translating: ${post.title}`);

  // Prepare translation prompt
  const translationPrompt = `Translate this complete blog post to Spanish. Maintain all formatting, structure, and markdown.

IMPORTANT INSTRUCTIONS:
1. Translate ALL content including title, body text, headings, bullet points, and FAQs
2. Keep all markdown formatting (##, **, -, etc.)
3. Maintain professional, engaging tone
4. Use proper Spanish grammar and natural phrasing
5. Keep technical terms accurate (e.g., "murder mystery party" = "fiesta de misterio de asesinato")
6. Do NOT translate product/brand names
7. Return ONLY the translated content, no explanations

TITLE:
${post.title}

META DESCRIPTION:
${post.meta_description}

META KEYWORDS:
${post.meta_keywords}

CONTENT:
${post.content}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: translationPrompt,
        },
      ],
    });

    const translatedText = response.content[0].text;

    // Parse the translation to extract components
    const titleMatch = translatedText.match(/^(.+?)(?=\n\n)/);
    const title = titleMatch ? titleMatch[1].trim() : post.title;

    // Extract meta description (look for first paragraph after title)
    const contentStart = translatedText.indexOf('\n\n') + 2;
    const metaDescMatch = translatedText
      .substring(contentStart)
      .match(/^(.+?)(?=\n\n)/);
    const metaDescription = metaDescMatch
      ? metaDescMatch[1].trim().substring(0, 160)
      : post.meta_description;

    // The main content starts after title
    const content = translatedText.substring(contentStart).trim();

    // Create Spanish slug
    const slug = post.slug + '-es';

    // Insert Spanish version
    const spanishPost = {
      title: title,
      content: content,
      slug: slug,
      meta_description: metaDescription,
      meta_keywords: post.meta_keywords, // Keep English keywords for now
      language: 'es',
      theme: post.theme,
      status: 'published',
      author: 'Equipo de Mystery Maker Party',
      tags: post.tags,
      published_at: '2026-02-16T00:00:00.000Z',
      post_date: '2026-02-16',
      reading_time: post.reading_time,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('blog_posts')
      .insert(spanishPost)
      .select();

    if (insertError) {
      console.error(`❌ Error inserting Spanish post:`, insertError);
      return;
    }

    console.log(`✅ ${title}`);
    return inserted[0];
  } catch (error) {
    console.error(`❌ Translation error for ${post.title}:`, error);
  }
}

async function translateAll() {
  console.log('Starting translation of posts 31-35...\n');

  for (const postId of posts) {
    await translatePost(postId);
    // Small delay between translations
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n✨ All translations complete!');
}

translateAll();
