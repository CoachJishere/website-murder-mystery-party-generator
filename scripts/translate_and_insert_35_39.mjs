import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const EEAT_ES = '*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*';

async function translatePost(post) {
  console.log(`\nTranslating: ${post.title}`);
  
  const prompt = `Translate this murder mystery party blog post from English to Spanish. This is for a Spanish-speaking audience interested in murder mystery party planning.

CRITICAL REQUIREMENTS:
1. Replace the E-E-A-T metadata line with exactly: ${EEAT_ES}
2. Translate all content naturally and professionally
3. Keep all markdown formatting intact
4. Keep all tables, lists, and structure exactly as formatted
5. Translate character names naturally to Spanish equivalents where appropriate
6. Keep "Mystery Maker Party" as is (brand name)
7. Maintain all quotes, statistics, and sources (translate descriptions but keep source citations)
8. Keep URLs and links unchanged

POST TITLE: ${post.title}

POST CONTENT:
${post.content}

Return ONLY the translated content, no explanations.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text;
}

async function translateTitle(title) {
  const prompt = `Translate this blog post title from English to Spanish. Keep it natural and SEO-friendly for Spanish speakers.

TITLE: ${title}

Return ONLY the translated title, nothing else.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text.trim();
}

async function translateSlug(slug) {
  const prompt = `Convert this URL slug from English to Spanish. Use hyphens, lowercase, no special characters. Keep it SEO-friendly.

SLUG: ${slug}

Return ONLY the Spanish slug, nothing else.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text.trim();
}

async function translateMetaDescription(metaDescription) {
  const prompt = `Translate this meta description from English to Spanish. Keep it under 160 characters, compelling and SEO-friendly.

META DESCRIPTION: ${metaDescription}

Return ONLY the translated meta description, nothing else.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text.trim();
}

async function main() {
  // Fetch posts 35-39
  const { data: posts, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .order('id', { ascending: true })
    .range(35, 39);

  if (fetchError) {
    console.error('Error fetching posts:', fetchError);
    return;
  }

  console.log(`Fetched ${posts.length} posts to translate`);

  for (const post of posts) {
    try {
      // Translate all fields
      const translatedTitle = await translateTitle(post.title);
      const translatedContent = await translatePost(post);
      const translatedSlug = await translateSlug(post.slug);
      const translatedMetaDescription = await translateMetaDescription(post.meta_description);

      // Insert Spanish version
      const { data: inserted, error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          title: translatedTitle,
          slug: translatedSlug,
          content: translatedContent,
          meta_description: translatedMetaDescription,
          language: 'es',
          published: post.published,
          featured_image: post.featured_image,
          author: post.author,
          excerpt: translatedMetaDescription, // Use meta description as excerpt
          tags: post.tags
        })
        .select();

      if (insertError) {
        console.error(`Error inserting Spanish version of "${post.title}":`, insertError);
      } else {
        console.log(`✅ ${translatedTitle}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Error processing "${post.title}":`, error.message);
    }
  }

  console.log('\n✅ All translations completed!');
}

main();
