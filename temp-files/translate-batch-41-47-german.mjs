import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRANSLATION_BRIEF = `
# German Translation Brief

**Target Language**: German (de)
**Formality**: Formal "Sie" form
**Capitalization**: ALL nouns must be capitalized
**Special Characters**: Proper umlauts (ä, ö, ü, ß)

## Key Translations

**E-E-A-T Header**:
*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*

**Research Statement**:
*Basierend auf der Analyse von über 10.000 Krimi-Partys und [theme]-Forschung*

**Section Headers**:
- "Market Trends & Popularity" → "Markttrends und Popularität"
- "What 10,000+ Mystery Parties Have Taught Us" → "Was uns über 10.000 Krimi-Partys gelehrt haben"
- "Sources & References" → "Quellen und Referenzen"
- "Frequently Asked Questions" → "Häufig gestellte Fragen"

**Table Headers**:
| Statistik | Wert | Quelle |

**Common Phrases**:
- "Reading time: X minutes" → "Lesezeit: X Minuten"

**Bullet Points**:
- "Perfect Thematic Integration" → "Perfekte Thematische Integration"
- "Character Authenticity" → "Charakterauthentizität"
- "Investigation Clarity" → "Ermittlungsklarheit"
- "Atmospheric Balance" → "Atmosphärisches Gleichgewicht"
- "Customized Engagement" → "Individuelles Engagement"

## Quality Guidelines
1. Use proper German compound nouns (Krimidinner, Mordmysterium)
2. Maintain formal "Sie" form throughout
3. Capitalize ALL nouns
4. Use proper umlauts (ä, ö, ü, ß)
5. Maintain verb-second position in main clauses
6. Preserve all markdown formatting
7. Keep all URLs, links, and technical terms in English
8. Preserve table structure exactly
`;

async function translateText(text, type = 'content') {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: `${TRANSLATION_BRIEF}

Translate the following ${type} from English to German. Follow ALL the translation rules above, especially:
- Capitalize ALL nouns
- Use formal "Sie" form
- Proper umlauts (ä, ö, ü, ß)
- Maintain ALL markdown formatting
- Use the exact translations provided in the brief

${type === 'title' ? 'Translate this title:' : type === 'meta_description' ? 'Translate this meta description:' : 'Translate this blog post content:'}

${text}

Return ONLY the translated text, no explanations.`
      }
    ]
  });

  return message.content[0].text;
}

async function translatePost(post, index, total) {
  console.log(`\n[${index + 1}/${total}] Translating: ${post.slug}`);
  console.log(`   Title: ${post.title.substring(0, 60)}...`);

  try {
    // Translate title
    console.log('   → Translating title...');
    const translatedTitle = await translateText(post.title, 'title');

    // Translate meta description
    console.log('   → Translating meta description...');
    const translatedMetaDescription = await translateText(post.meta_description, 'meta_description');

    // Translate content
    console.log('   → Translating content...');
    const translatedContent = await translateText(post.content, 'content');

    console.log('   ✅ Translation complete');

    return {
      id: post.id,
      slug: post.slug,
      title: translatedTitle.trim(),
      content: translatedContent.trim(),
      meta_description: translatedMetaDescription.trim(),
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: post.updated_at
    };
  } catch (error) {
    console.error(`   ❌ Error translating post: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🇩🇪 German Translation: Posts 41-47');
  console.log('=' .repeat(50));

  // Read source posts
  const sourcePath = './temp-files/batch-de-41-to-47.json';
  const posts = JSON.parse(readFileSync(sourcePath, 'utf8'));

  console.log(`\n📝 Found ${posts.length} posts to translate\n`);

  // Translate all posts
  const translations = [];
  for (let i = 0; i < posts.length; i++) {
    const translated = await translatePost(posts[i], i, posts.length);
    translations.push(translated);

    // Small delay between posts to avoid rate limits
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Save translations
  const outputPath = './temp-files/german-translated-batch-41-47.json';
  writeFileSync(outputPath, JSON.stringify(translations, null, 2));

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Translation complete!`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📊 Total posts translated: ${translations.length}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
