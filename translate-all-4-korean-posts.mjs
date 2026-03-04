import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Define the 4 posts to translate
const POSTS_TO_TRANSLATE = [
  {
    enSlug: '1920s-speakeasy-murder-mystery-party-guide',
    koSlug: '1920s-speakeasy-murder-mystery-party-guide-ko',
    name: '1920s Speakeasy'
  },
  {
    enSlug: '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless',
    koSlug: '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless-ko',
    name: 'Masquerade Ball'
  },
  {
    enSlug: 'ancient-egypt-murder-mystery-party-guide',
    koSlug: 'ancient-egypt-murder-mystery-party-guide-ko',
    name: 'Ancient Egypt'
  },
  {
    enSlug: 'detective-murder-mystery-themes-professional-investigators-sleuth-dynamics',
    koSlug: 'detective-murder-mystery-themes-professional-investigators-sleuth-dynamics-ko',
    name: 'Detective Themes'
  }
];

async function fetchEnglishPost(slug) {
  const response = await fetch(
    `${SUPABASE_URL}?slug=eq.${slug}&language=eq.en&status=eq.published&select=*`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await response.json();
  if (data.length === 0) {
    throw new Error(`English post not found: ${slug}`);
  }

  return data[0];
}

async function translateWithClaude(title, content, metaDescription) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `You are a professional translator specializing in murder mystery party content. Translate the following English blog post into natural, fluent Korean.

IMPORTANT INSTRUCTIONS:
- Translate ALL content into natural Korean
- Maintain all markdown formatting (headings, lists, bold, italics, links)
- Keep the tone engaging and fun
- Use appropriate Korean terminology for murder mystery party concepts
- Do not translate proper nouns for places/people in examples unless they have standard Korean translations
- Keep HTML tags if present

English Post Title: ${title}

English Post Content:
${content}

English Meta Description: ${metaDescription}

Please provide the translation in the following JSON format:
{
  "title": "Korean translated title",
  "content": "Korean translated content with all markdown formatting preserved",
  "meta_description": "Korean translated meta description"
}`
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const result = await response.json();
  const responseText = result.content[0].text;

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from translation response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function insertKoreanPost(englishPost, translation, koSlug) {
  const koreanPost = {
    title: translation.title,
    slug: koSlug,
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
  return inserted[0];
}

async function translateAndInsertPost(postConfig, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`POST ${index + 1}/4: ${postConfig.name}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Fetch English post
    console.log(`[1/3] Fetching English post: ${postConfig.enSlug}...`);
    const englishPost = await fetchEnglishPost(postConfig.enSlug);
    console.log(`✓ Found: "${englishPost.title}"`);
    console.log(`  Content length: ${englishPost.content.length} characters\n`);

    // Step 2: Translate to Korean
    console.log(`[2/3] Translating to Korean using Claude...`);
    const translation = await translateWithClaude(
      englishPost.title,
      englishPost.content,
      englishPost.meta_description
    );
    console.log(`✓ Translation completed`);
    console.log(`  Korean title: ${translation.title}`);
    console.log(`  Korean content length: ${translation.content.length} characters\n`);

    // Step 3: Insert into database
    console.log(`[3/3] Inserting Korean post with slug: ${postConfig.koSlug}...`);
    const result = await insertKoreanPost(englishPost, translation, postConfig.koSlug);
    console.log(`✓ Successfully inserted!`);
    console.log(`  ID: ${result.id}`);
    console.log(`  Slug: ${result.slug}`);
    console.log(`  Status: ${result.status}`);

    console.log(`\n✅ POST ${index + 1} COMPLETE: ${postConfig.name}\n`);

    return { success: true, post: postConfig.name };
  } catch (error) {
    console.error(`\n❌ ERROR translating ${postConfig.name}:`);
    console.error(`   ${error.message}\n`);
    return { success: false, post: postConfig.name, error: error.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('KOREAN TRANSLATION PROJECT - 4 POSTS');
  console.log('='.repeat(60));

  if (!ANTHROPIC_API_KEY) {
    console.error('\n❌ ERROR: ANTHROPIC_API_KEY environment variable not set');
    console.error('Please set it with: export ANTHROPIC_API_KEY=your-key-here\n');
    process.exit(1);
  }

  const results = [];

  for (let i = 0; i < POSTS_TO_TRANSLATE.length; i++) {
    const result = await translateAndInsertPost(POSTS_TO_TRANSLATE[i], i);
    results.push(result);

    // Wait 2 seconds between posts to avoid rate limits
    if (i < POSTS_TO_TRANSLATE.length - 1) {
      console.log('Waiting 2 seconds before next post...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TRANSLATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/4`);
  successful.forEach(r => console.log(`   - ${r.post}`));

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/4`);
    failed.forEach(r => console.log(`   - ${r.post}: ${r.error}`));
  }

  console.log('\n' + '='.repeat(60) + '\n');

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
