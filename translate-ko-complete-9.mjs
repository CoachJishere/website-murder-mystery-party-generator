import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import 'dotenv/config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Read the fetched posts
const batchData = JSON.parse(fs.readFileSync('ko-batch-all-posts.json', 'utf8'));

console.log(`=== KOREAN TRANSLATION - COMPLETE 9 POSTS ===\n`);
console.log(`Total posts to translate: ${batchData.total_posts}\n`);

const TRANSLATION_PROMPT = `You are an expert translator specializing in Korean (한국어) translations for SEO-optimized blog content about murder mystery party games and entertainment.

CRITICAL TRANSLATION REQUIREMENTS:

1. **Korean Honorific Form (존댓말 - jondaetmal)**
   - Use respectful/formal language throughout (존댓말)
   - Use ~ㅂ니다/습니다, ~세요, ~ㅂ니까/습니까 endings
   - Maintain professional but warm and engaging tone
   - Example: "Make sure to..." → "반드시 ~하세요" not "반드시 ~해"

2. **E-E-A-T Preservation (CRITICAL)**
   - Keep ALL metadata headers in English (## Metadata, ## E-E-A-T Compliance)
   - Keep "Author Expertise:" statements in English
   - Keep "Published:" dates exactly as-is
   - Keep "Last Updated:" dates exactly as-is
   - Keep ALL table structures intact (statistics, comparisons, etc.)
   - Translate table content but preserve markdown table formatting
   - Keep ALL source/reference titles in English within 출처/참고문헌 sections
   - Only translate the descriptive labels (like "Sources:" → "출처:")

3. **Markdown & Formatting**
   - Preserve ALL markdown syntax (#, ##, ###, -, *, etc.)
   - Keep ALL HTML tags intact (<span>, <div>, etc.)
   - Preserve ALL links and URLs unchanged
   - Keep internal link paths in English (e.g., /blog/original-english-slug)
   - Maintain line breaks and paragraph structure

4. **Content Translation Guidelines**
   - Translate naturally and fluently for Korean readers
   - Adapt idioms and cultural references appropriately
   - Keep technical terms where appropriate (e.g., "murder mystery party" can be "살인 미스터리 파티")
   - Preserve SEO keywords in translated form
   - Maintain the same content structure and flow

5. **DO NOT TRANSLATE**
   - URLs and link paths
   - Code snippets
   - Metadata section headers (## Metadata, ## E-E-A-T Compliance, etc.)
   - Author expertise statements
   - Publication dates
   - Source/reference titles in bibliographies
   - Internal anchor links

6. **Title & Meta**
   - Translate title naturally while preserving key SEO terms
   - Translate meta_description to be compelling and natural
   - Keep meta_keywords in Korean-adapted form

Please translate the following blog post content to Korean following ALL the above requirements.`;

async function translatePost(post, index, total) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[${index}/${total}] Translating: ${post.title}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `${TRANSLATION_PROMPT}

**ENGLISH POST TO TRANSLATE:**

Title: ${post.title}
Slug: ${post.slug}
Meta Description: ${post.meta_description}
Theme: ${post.theme}

Content:
${post.content}

**PROVIDE THE COMPLETE KOREAN TRANSLATION:**

Respond with ONLY the translated content in this exact JSON format:
{
  "title": "Korean translated title",
  "content": "Full Korean translated markdown content",
  "meta_description": "Korean meta description",
  "slug": "suggested-korean-slug-in-hangul"
}`
        }
      ]
    });

    const responseText = message.content[0].text;
    console.log('Response received, parsing...');

    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonText = responseText.split('```')[1].split('```')[0].trim();
    }

    const translation = JSON.parse(jsonText);

    // Save individual translation
    const filename = `ko-complete-post-${index}.md`;
    const fullContent = `# ${translation.title}

**Slug:** ${translation.slug}
**Meta Description:** ${translation.meta_description}
**Original English Slug:** ${post.slug}

---

${translation.content}
`;

    fs.writeFileSync(filename, fullContent, 'utf8');

    console.log(`✓ Saved to ${filename}`);
    console.log(`  Title: ${translation.title}`);
    console.log(`  Content length: ${translation.content.length} chars\n`);

    return {
      original_id: post.id,
      original_slug: post.slug,
      original_title: post.title,
      translated_title: translation.title,
      translated_slug: translation.slug,
      translated_content: translation.content,
      translated_meta_description: translation.meta_description,
      meta_keywords: post.meta_keywords,
      theme: post.theme
    };

  } catch (error) {
    console.error(`✗ ERROR translating post:`, error.message);
    if (error.message.includes('JSON')) {
      console.error('Response was not valid JSON. Check the raw response.');
    }
    return null;
  }
}

async function translateAllPosts() {
  const results = [];

  for (let i = 0; i < batchData.posts.length; i++) {
    const post = batchData.posts[i];
    const result = await translatePost(post, i + 1, batchData.total_posts);

    if (result) {
      results.push(result);
    }

    // Add delay between requests to respect rate limits
    if (i < batchData.posts.length - 1) {
      console.log('Waiting 3 seconds before next translation...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Save summary
  fs.writeFileSync('ko-translation-results.json', JSON.stringify({
    completed: results.length,
    total: batchData.total_posts,
    timestamp: new Date().toISOString(),
    translations: results
  }, null, 2));

  console.log(`\n${'='.repeat(70)}`);
  console.log(`TRANSLATION COMPLETE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`✓ Completed: ${results.length}/${batchData.total_posts} posts`);
  console.log(`✓ Saved summary to: ko-translation-results.json`);
  console.log(`✓ Individual files: ko-complete-post-1.md through ko-complete-post-${results.length}.md\n`);

  return results;
}

// Run translation
translateAllPosts().catch(console.error);
