import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load source posts
const sourcePosts = JSON.parse(
  readFileSync(join(__dirname, 'batch-de-1-to-10.json'), 'utf-8')
);

// Posts 2-10 (indices 1-9)
const postsToTranslate = sourcePosts.slice(1, 10);

console.log(`Translating ${postsToTranslate.length} posts (2-10) to German...`);

const translatedPosts = [];

for (let i = 0; i < postsToTranslate.length; i++) {
  const post = postsToTranslate[i];
  const postNumber = i + 2;

  console.log(`\n[${postNumber}/10] Translating: ${post.slug.substring(0, 50)}...`);

  const prompt = `You are a professional German translator specializing in murder mystery party content.

CRITICAL REQUIREMENTS:
1. Capitalize ALL nouns (German grammar rule)
2. Use formal "Sie" form throughout
3. Use proper umlauts: ä, ö, ü, ß
4. Create natural German compound nouns: Krimidinner, Mordmysterium, Krimi-Party
5. Maintain verb-second position in main clauses

EXACT TRANSLATIONS (use these exactly):
- E-E-A-T Header: "*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*"
- Research Statement: "*Basierend auf der Analyse von über 10.000 Krimi-Partys und [theme]-Forschung*" (replace [theme] with appropriate German term)
- "Market Trends & Popularity" → "Markttrends und Popularität"
- "What 10,000+ Mystery Parties Have Taught Us" → "Was uns über 10.000 Krimi-Partys gelehrt haben"
- "Sources & References" → "Quellen und Referenzen"
- "Frequently Asked Questions" → "Häufig gestellte Fragen"
- "Reading time: X minutes" → "Lesezeit: X Minuten"
- Table headers: "| Statistik | Wert | Quelle |"

SECTION TRANSLATIONS:
- "Perfect Thematic Integration" → "Perfekte Thematische Integration"
- "Character Authenticity" → "Charakterauthentizität"
- "Investigation Clarity" → "Ermittlungsklarheit"
- "Atmospheric Balance" → "Atmosphärisches Gleichgewicht"
- "Customized Engagement" → "Individuelles Engagement"

Translate the following blog post to German. Maintain ALL markdown formatting, structure, and styling.

TITLE: ${post.title}

META DESCRIPTION: ${post.meta_description}

CONTENT:
${post.content}

Return ONLY a JSON object with this structure:
{
  "title": "translated title",
  "meta_description": "translated meta description",
  "content": "translated content"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response
    let translation;
    try {
      // Try to parse directly
      translation = JSON.parse(responseText);
    } catch {
      // Extract JSON from markdown code block if present
      const jsonMatch = responseText.match(/```json\n([\s\S]+?)\n```/) ||
                       responseText.match(/```\n([\s\S]+?)\n```/);
      if (jsonMatch) {
        translation = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not extract JSON from response');
      }
    }

    const translatedPost = {
      slug: post.slug,
      title: translation.title,
      meta_description: translation.meta_description,
      reading_time: post.reading_time,
      created_at: post.created_at,
      content: translation.content
    };

    translatedPosts.push(translatedPost);
    console.log(`✓ Post ${postNumber} translated successfully`);

    // Save progress after each translation
    writeFileSync(
      join(__dirname, 'german-translated-batch-2-10.json'),
      JSON.stringify(translatedPosts, null, 2)
    );

  } catch (error) {
    console.error(`✗ Error translating post ${postNumber}:`, error.message);
    process.exit(1);
  }

  // Rate limiting delay (1 second between requests)
  if (i < postsToTranslate.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

console.log(`\n✓ All ${translatedPosts.length} posts translated successfully!`);
console.log(`Output saved to: german-translated-batch-2-10.json`);
