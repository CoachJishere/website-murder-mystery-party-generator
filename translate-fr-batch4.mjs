import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import 'dotenv/config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = JSON.parse(fs.readFileSync('fr-batch4-posts.json', 'utf8'));

const TRANSLATION_PROMPT = `You are an expert translator specializing in murder mystery party content from English to French.

**Translation Guidelines:**
- Use formal "vous" form throughout
- Maintain natural, fluent French that reads like native content
- Preserve all E-E-A-T signals (expertise, experience, authoritativeness, trustworthiness)
- Keep all markdown formatting exactly as in the original
- Keep all source URLs in English
- Translate all headings, body text, meta descriptions, and titles
- Maintain the engaging, helpful tone of the original
- Use proper French typography (« guillemets », proper spacing)

Translate the following blog post to French:

---
TITLE: {TITLE}
META DESCRIPTION: {META}
SLUG: {SLUG}

CONTENT:
{CONTENT}
---

Return ONLY a JSON object with this structure:
{
  "title": "Translated title",
  "meta_description": "Translated meta description",
  "slug": "translated-slug-in-lowercase",
  "content": "Full translated markdown content"
}`;

async function translatePost(post, index) {
  console.log(`\n[${index}/5] Translating: ${post.title}`);
  console.log(`Content length: ${post.content.length} chars`);

  const prompt = TRANSLATION_PROMPT
    .replace('{TITLE}', post.title)
    .replace('{META}', post.meta_description || '')
    .replace('{SLUG}', post.slug)
    .replace('{CONTENT}', post.content);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 1,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response
    let translation;
    if (responseText.includes('```json')) {
      const jsonMatch = responseText.match(/```json\n([\s\S]+?)\n```/);
      translation = JSON.parse(jsonMatch[1]);
    } else if (responseText.trim().startsWith('{')) {
      translation = JSON.parse(responseText);
    } else {
      throw new Error('Could not parse translation response');
    }

    // Save individual translation
    const filename = `fr-complete-post-${post.index}.md`;
    const markdown = `---
TITLE: ${translation.title}
META DESCRIPTION: ${translation.meta_description}
SLUG: ${translation.slug}
ORIGINAL POST ID: ${post.id}
---

${translation.content}`;

    fs.writeFileSync(filename, markdown);
    console.log(`✓ Saved to ${filename}`);

    return {
      ...post,
      index: post.index,
      fr_title: translation.title,
      fr_meta_description: translation.meta_description,
      fr_slug: translation.slug,
      fr_content: translation.content
    };

  } catch (error) {
    console.error(`✗ Error translating post ${post.index}:`, error.message);
    return null;
  }
}

async function translateAll() {
  console.log('Starting French Batch 4 Translation (Posts 16-20)');
  console.log('='.repeat(60));

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const result = await translatePost(posts[i], i + 1);
    if (result) {
      results.push(result);
    }

    // Rate limiting - wait 1 second between posts
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Save summary
  fs.writeFileSync(
    'fr-batch4-translations.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log(`✓ Completed ${results.length}/5 translations`);
  console.log('✓ Saved summary to fr-batch4-translations.json');
  console.log('✓ Individual files: fr-complete-post-16.md through fr-complete-post-20.md');
}

translateAll();
