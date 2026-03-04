import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = [
  {
    slug: 'medical-examiner-murder-mystery-themes-forensic-investigations',
    number: 27
  },
  {
    slug: 'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable',
    number: 28
  },
  {
    slug: 'murder-mystery-party-for-corporate-events',
    number: 29
  },
  {
    slug: 'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery',
    number: 30
  },
  {
    slug: 'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night',
    number: 31
  }
];

async function translatePost(postData, postNumber) {
  console.log(`\n=== Translating Post ${postNumber}: ${postData.slug} ===`);

  const translationPrompt = `Translate this complete English blog post to Brazilian Portuguese.

REQUIREMENTS:
- Use formal "você" form
- Use proper Brazilian Portuguese accents: ã, õ, ç, á, é, í, ó, ú
- Translate the E-E-A-T line to: "*Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*"
- Keep all markdown formatting, tables, lists, links intact
- Translate all content including headings, body text, lists, table content, quotes
- Keep URLs unchanged
- Maintain professional, engaging tone

ENGLISH CONTENT:
${postData.content}

Provide ONLY the complete Portuguese translation, no explanations.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: translationPrompt
    }]
  });

  const translatedContent = message.content[0].text;

  // Translate title
  const titlePrompt = `Translate this blog post title to Brazilian Portuguese. Keep it SEO-friendly and natural.

ENGLISH TITLE: ${postData.title}

Provide ONLY the Portuguese title, nothing else.`;

  const titleMessage = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: titlePrompt
    }]
  });

  const translatedTitle = titleMessage.content[0].text.trim();

  // Create Portuguese slug
  const slugPrompt = `Create a Portuguese slug for this title.

REQUIREMENTS:
- Use only lowercase letters
- Replace spaces with hyphens
- Use proper Portuguese words (not transliteration)
- Remove accents for the slug
- Keep it SEO-friendly and readable

PORTUGUESE TITLE: ${translatedTitle}

Provide ONLY the slug, nothing else (e.g., "festa-de-assassinato-misterioso").`;

  const slugMessage = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: slugPrompt
    }]
  });

  const portugueseSlug = slugMessage.content[0].text.trim();

  // Translate meta description
  const metaPrompt = `Translate this meta description to Brazilian Portuguese. Keep it under 160 characters and compelling for SEO.

ENGLISH META: ${postData.meta_description}

Provide ONLY the Portuguese meta description, nothing else.`;

  const metaMessage = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: metaPrompt
    }]
  });

  const translatedMeta = metaMessage.content[0].text.trim();

  return {
    title: translatedTitle,
    slug: portugueseSlug,
    content: translatedContent,
    meta_description: translatedMeta,
    original_slug: postData.slug
  };
}

async function insertPortuguesePost(translation, originalPost) {
  const portuguesePost = {
    title: translation.title,
    slug: translation.slug,
    content: translation.content,
    excerpt: originalPost.excerpt, // We'll translate this separately if needed
    meta_description: translation.meta_description,
    language: 'pt',
    status: 'published',
    published_at: originalPost.published_at,
    category: originalPost.category,
    tags: originalPost.tags,
    read_time: originalPost.read_time,
    image_url: originalPost.image_url,
    author_id: originalPost.author_id
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([portuguesePost])
    .select();

  if (error) {
    console.error(`ERROR inserting ${translation.slug}:`, error.message);
    return null;
  }

  console.log(`✓ Successfully inserted: ${translation.slug}`);
  return data[0];
}

async function main() {
  for (const post of posts) {
    try {
      // Fetch English post
      const { data: englishPost, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', post.slug)
        .eq('language', 'en')
        .single();

      if (fetchError) {
        console.error(`ERROR fetching ${post.slug}:`, fetchError.message);
        continue;
      }

      // Translate
      const translation = await translatePost(englishPost, post.number);

      // Save to file for review
      const fs = await import('fs');
      fs.writeFileSync(
        `./temp-files/post-${post.number}-pt.json`,
        JSON.stringify({ translation, originalPost: englishPost }, null, 2)
      );

      console.log(`\nPost ${post.number} Translation:`);
      console.log(`Title: ${translation.title}`);
      console.log(`Slug: ${translation.slug}`);
      console.log(`Meta: ${translation.meta_description}`);

      // Insert into database
      await insertPortuguesePost(translation, englishPost);

      console.log(`\n✓ COMPLETED Post ${post.number}: ${post.slug}\n`);

      // Wait a bit between posts to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`ERROR processing ${post.slug}:`, error.message);
    }
  }

  console.log('\n=== ALL TRANSLATIONS COMPLETE ===');
}

main();
