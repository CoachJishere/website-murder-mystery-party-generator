import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = JSON.parse(fs.readFileSync('nl-batch-all-posts.json', 'utf8'));

console.log(`Translating ${posts.length} posts to Dutch (Nederlands)...`);

const TRANSLATION_PROMPT = `Je bent een professionele vertaler die blogartikelen over moordmysterie-feestjes vertaalt van Engels naar Nederlands.

KRITIEKE VEREISTEN:
1. Gebruik de formele "u"-vorm (niet "jij/je")
2. Natuurlijk, vloeiend Nederlands voor Nederland/België (neutraal)
3. Behoud ALLE E-E-A-T elementen (expertise, autoriteit, betrouwbaarheid)
4. Houd brontitels in het Engels in de sectie Bronnen/Referenties
5. Behoud alle markdown-opmaak
6. Vertaal GEEN URLs

VERTAAL het volgende blogartikel naar het Nederlands:

TITEL: {title}

META BESCHRIJVING: {meta_description}

INHOUD:
{content}

Geef terug in JSON-formaat:
{
  "title": "vertaalde titel",
  "meta_description": "vertaalde meta beschrijving",
  "content": "volledige vertaalde inhoud"
}`;

async function translatePost(post, index) {
  console.log(`\n[${index + 1}/${posts.length}] Translating: ${post.title.substring(0, 60)}...`);

  const prompt = TRANSLATION_PROMPT
    .replace('{title}', post.title)
    .replace('{meta_description}', post.meta_description)
    .replace('{content}', post.content);

  try {
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
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const translated = JSON.parse(jsonMatch[0]);

    const result = {
      id: post.id,
      language: 'nl',
      slug: post.slug,
      title: translated.title,
      meta_description: translated.meta_description,
      content: translated.content,
      author: post.author,
      categories: post.categories
    };

    // Save individual translation
    fs.writeFileSync(
      `nl-translated-${index + 1}.json`,
      JSON.stringify(result, null, 2)
    );

    console.log(`✓ Translated: ${translated.title.substring(0, 60)}...`);
    console.log(`  Saved to: nl-translated-${index + 1}.json`);

    return result;

  } catch (error) {
    console.error(`✗ Error translating post ${index + 1}:`, error.message);
    return null;
  }
}

// Process all posts sequentially
const translations = [];
for (let i = 0; i < posts.length; i++) {
  const translation = await translatePost(posts[i], i);
  if (translation) {
    translations.push(translation);
  }

  // Add delay to avoid rate limits (2 seconds between requests)
  if (i < posts.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Save all translations
fs.writeFileSync(
  'nl-all-translations.json',
  JSON.stringify(translations, null, 2)
);

console.log(`\n✓ COMPLETE: Translated ${translations.length}/${posts.length} posts`);
console.log(`Saved all translations to: nl-all-translations.json`);
