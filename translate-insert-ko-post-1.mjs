import fetch from 'node-fetch';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const EN_SLUG = '1920s-speakeasy-murder-mystery-party-guide';
const KO_SLUG = '1920s-speakeasy-murder-mystery-party-guide-ko';

async function fetchEnglishPost() {
  console.log(`Fetching English post: ${EN_SLUG}...`);

  const response = await fetch(
    `${SUPABASE_URL}?slug=eq.${EN_SLUG}&language=eq.en&status=eq.published&select=*`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await response.json();
  if (data.length === 0) {
    throw new Error(`English post not found: ${EN_SLUG}`);
  }

  console.log(`✓ Found English post: "${data[0].title}"\n`);
  return data[0];
}

async function translateToKorean(englishPost) {
  console.log('Translating to Korean using Claude...\n');

  const prompt = `You are a professional translator specializing in murder mystery party content. Translate the following English blog post into natural, fluent Korean.

IMPORTANT INSTRUCTIONS:
- Translate ALL content into natural Korean
- Maintain all markdown formatting (headings, lists, bold, italics, links)
- Keep the tone engaging and fun
- Use appropriate Korean terminology for murder mystery party concepts
- Do not translate proper nouns for places/people in examples unless they have standard Korean translations
- Keep HTML tags if present

English Post Title: ${englishPost.title}

English Post Content:
${englishPost.content}

English Meta Description: ${englishPost.meta_description}

Please provide the translation in the following JSON format:
{
  "title": "Korean translated title",
  "content": "Korean translated content with all markdown formatting preserved",
  "meta_description": "Korean translated meta description"
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
    throw new Error('Could not extract JSON from translation response');
  }

  const translation = JSON.parse(jsonMatch[0]);
  console.log('✓ Translation completed\n');

  return translation;
}

async function insertKoreanPost(englishPost, translation) {
  console.log(`Inserting Korean post with slug: ${KO_SLUG}...`);

  const koreanPost = {
    title: translation.title,
    slug: KO_SLUG,
    content: translation.content,
    excerpt: translation.meta_description.slice(0, 200),
    meta_description: translation.meta_description,
    language: 'ko',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: englishPost.tags,
    theme: englishPost.theme,
    featured_image_url: englishPost.featured_image_url,
    published_at: new Date().toISOString()
  };

  const response = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(koreanPost)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to insert: ${error}`);
  }

  const inserted = await response.json();
  console.log('✓ Korean post inserted successfully!');
  console.log(`  ID: ${inserted[0].id}`);
  console.log(`  Title: ${inserted[0].title}`);
  console.log(`  Slug: ${inserted[0].slug}\n`);

  return inserted[0];
}

async function main() {
  try {
    const englishPost = await fetchEnglishPost();
    const translation = await translateToKorean(englishPost);
    const result = await insertKoreanPost(englishPost, translation);

    console.log('✅ POST 1 COMPLETE: 1920s Speakeasy');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
