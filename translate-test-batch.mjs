import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

// Read API key from .env file
const envContent = readFileSync('.env', 'utf-8');
const apiKeyMatch = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';

const anthropic = new Anthropic({ apiKey });

const languages = [
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' }
];

const testBatch = JSON.parse(readFileSync('test-batch-posts.json', 'utf-8'));

console.log(`=== TRANSLATING ${testBatch.length} TEST POSTS TO 3 LANGUAGES ===\n`);
console.log(`API Key loaded: ${apiKey.substring(0, 20)}...`);

async function translatePost(englishPost, targetLang) {
  const prompt = `You are a professional translator specializing in technical and marketing content for the murder mystery party industry.

Translate this English blog post to ${targetLang.name} (language code: ${targetLang.code}).

**CRITICAL REQUIREMENTS:**

1. **Preserve ALL Markdown Formatting:**
   - Headers (##, ###, etc.)
   - Bold (**text**)
   - Italic (*text*)
   - Links ([text](url))
   - Tables (| column | format |)
   - Bullet points (- item)
   - Blockquotes (> quote)

2. **Maintain ALL E-E-A-T Elements Exactly:**
   - Metadata header: "*Published: [date] | Updated: [date] | Author: [name] | Next Review: [date]*"
   - Expertise claim: "*Based on analyzing 10,000+ murder mystery parties...*"
   - Statistics tables with citations (translate table content, keep sources in English)
   - Sources & References section (keep as is - do NOT translate source titles)

3. **Translation Quality Standards:**
   - Natural, fluent ${targetLang.name} (not word-for-word translation)
   - Appropriate for educated adult audience interested in murder mystery parties
   - Maintain professional but engaging tone
   - Cultural adaptation where necessary (e.g., currency, measurement units)
   - Keep technical terms consistent (murder mystery party = appropriate ${targetLang.name} equivalent)

4. **Do NOT Translate:**
   - Author name: "Mystery Maker Party Team"
   - Internal links: [Create your custom mystery](#)
   - Source titles in References section
   - Statistics source names (keep "Box Office Mojo", "Statista", etc. in English)

5. **Structure Preservation:**
   - Keep same heading hierarchy
   - Maintain FAQ question count and order
   - Preserve bullet point lists exactly
   - Keep table structures identical

**English Content to Translate:**

${englishPost.content}

**Return only the translated markdown content. No explanations or notes.**`;

  console.log(`\nTranslating: ${englishPost.title}`);
  console.log(`Target: ${targetLang.name} (${targetLang.code})`);
  
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4.5-20250929',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const translatedContent = message.content[0].text;
  const wordCount = translatedContent.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  console.log(`✅ Translated: ${wordCount} words, ${readingTime} min read`);

  return {
    originalId: englishPost.id,
    originalSlug: englishPost.slug,
    originalTitle: englishPost.title,
    content: translatedContent,
    language: targetLang.code,
    wordCount,
    readingTime
  };
}

// Translate all posts
const translations = [];
let postNum = 0;

for (const post of testBatch) {
  postNum++;
  console.log(`\n=== POST ${postNum}/${testBatch.length}: ${post.title.substring(0, 50)}... ===`);
  
  for (const lang of languages) {
    const translation = await translatePost(post, lang);
    translations.push(translation);
    
    // Save individual translation
    const filename = `test-post-${postNum}-${lang.code}.md`;
    writeFileSync(filename, translation.content);
  }
}

// Save summary
writeFileSync('test-batch-translations.json', JSON.stringify(translations, null, 2));

console.log(`\n\n=== TEST BATCH COMPLETE ===`);
console.log(`Total translations: ${translations.length}`);
console.log(`Files created: ${translations.length} markdown files + 1 summary JSON`);
console.log(`\nNext: Review translations for quality before proceeding to production.`);
