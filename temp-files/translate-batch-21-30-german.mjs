import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRANSLATION_RULES = `
**German Translation Rules:**
1. Capitalize ALL nouns (proper German grammar)
2. Use formal "Sie" form
3. Proper umlauts (ä, ö, ü, ß)
4. Maintain all markdown formatting
5. Keep all URLs unchanged

**Key Translations:**
- E-E-A-T Header: "*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*"
- Research: "*Basierend auf der Analyse von über 10.000 Krimi-Partys und [theme]-Forschung*"
- "Market Trends & Popularity" → "Markttrends und Popularität"
- "What 10,000+ Mystery Parties Have Taught Us" → "Was uns über 10.000 Krimi-Partys gelehrt haben"
- "Sources & References" → "Quellen und Referenzen"
- "Frequently Asked Questions" → "Häufig gestellte Fragen"
- "Reading time: X minutes" → "Lesezeit: X Minuten"
- Table header: "| Statistik | Wert | Quelle |"

**Common Phrases:**
- "Perfect Thematic Integration" → "Perfekte Thematische Integration"
- "Character Authenticity" → "Charakterauthentizität"
- "Investigation Clarity" → "Ermittlungsklarheit"
- "Atmospheric Balance" → "Atmosphärisches Gleichgewicht"
- "Customized Engagement" → "Individuelles Engagement"
`;

async function translatePost(post, index, total) {
  console.log(`\n[${ index + 1}/${total}] Translating: ${post.title}`);

  const prompt = `${TRANSLATION_RULES}

Translate this blog post to German. Return ONLY a JSON object with this exact structure:
{
  "title": "translated title",
  "content": "translated content",
  "meta_description": "translated meta description"
}

**Original Post:**
Title: ${post.title}

Meta Description: ${post.meta_description}

Content:
${post.content}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const translated = JSON.parse(jsonMatch[0]);

    console.log(`   ✅ Translated (${message.usage.input_tokens} in, ${message.usage.output_tokens} out)`);

    return {
      slug: post.slug,
      title: translated.title,
      content: translated.content,
      meta_description: translated.meta_description,
      language: 'de',
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error(`   ❌ Translation failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  const sourcePath = '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/batch-de-21-to-30.json';
  const outputPath = '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/german-translated-batch-21-30.json';

  console.log('🇩🇪 German Translation - Posts 21-30');
  console.log('=' .repeat(50));

  const posts = JSON.parse(readFileSync(sourcePath, 'utf8'));
  console.log(`📝 Found ${posts.length} posts to translate\n`);

  const translated = [];

  for (let i = 0; i < posts.length; i++) {
    const translatedPost = await translatePost(posts[i], i, posts.length);
    translated.push(translatedPost);

    // Save progress after each translation
    writeFileSync(outputPath, JSON.stringify(translated, null, 2));

    // Small delay to avoid rate limiting
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Translation complete! Saved ${translated.length} posts to:`);
  console.log(`   ${outputPath}`);
  console.log('=' .repeat(50));
  console.log('\n📤 Next step: Run batch insert script');
  console.log('   node temp-files/batch-translate-german.mjs temp-files/german-translated-batch-21-30.json');
}

main().catch(console.error);
