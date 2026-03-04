import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRANSLATION_BRIEF = `# German Translation Guidelines

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

**Quality Guidelines**:
1. Capitalize ALL nouns
2. Use formal "Sie" form
3. Proper umlauts (ä, ö, ü, ß)
4. Maintain markdown formatting
5. Keep all markdown symbols (##, **, -, etc.)
6. Preserve source citations exactly
7. Use German compound nouns (Krimidinner, Mordmysterium)`;

async function translatePost(post, index, total) {
  console.log(`\n[${ index + 1}/${total}] Translating: ${post.title}`);

  const prompt = `Translate this murder mystery blog post from English to German following these guidelines:

${TRANSLATION_BRIEF}

CRITICAL REQUIREMENTS:
1. Capitalize ALL nouns (German rule)
2. Use formal "Sie" form throughout
3. Maintain ALL markdown formatting exactly
4. Keep source citations in English (author names, publication names)
5. Translate table content but keep markdown table structure
6. Use proper German compound nouns

Translate these three fields:

TITLE:
${post.title}

META_DESCRIPTION:
${post.meta_description}

CONTENT:
${post.content}

Respond in this exact JSON format:
{
  "title": "German title here",
  "meta_description": "German meta description here",
  "content": "German content here with all markdown preserved"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response (handle code blocks)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.match(/```json\n([\s\S]*?)\n```/)[1];
    } else if (responseText.includes('```')) {
      jsonText = responseText.match(/```\n([\s\S]*?)\n```/)[1];
    }

    const translation = JSON.parse(jsonText);

    console.log(`   ✅ Translated successfully`);

    return {
      slug: post.slug,
      title: translation.title,
      content: translation.content,
      meta_description: translation.meta_description,
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error(`   ❌ Error translating: ${error.message}`);
    throw error;
  }
}

async function processGermanBatch() {
  console.log('🇩🇪 Starting German Translation: Posts 31-40\n');

  // Read source file
  const sourceFile = './batch-de-31-to-40.json';
  const posts = JSON.parse(readFileSync(sourceFile, 'utf8'));

  console.log(`📝 Found ${posts.length} posts to translate\n`);

  const translations = [];

  // Process each post
  for (let i = 0; i < posts.length; i++) {
    try {
      const translation = await translatePost(posts[i], i, posts.length);
      translations.push(translation);

      // Rate limiting pause
      if (i < posts.length - 1) {
        console.log('   ⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to translate post ${i + 1}: ${error.message}`);
      // Continue with other posts
    }
  }

  // Save translations
  const outputFile = './german-translated-batch-31-40.json';
  writeFileSync(outputFile, JSON.stringify(translations, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Translation Complete!`);
  console.log(`📁 Saved to: ${outputFile}`);
  console.log(`📊 Translated: ${translations.length}/${posts.length} posts`);
  console.log('='.repeat(60));
  console.log('\n🚀 Next step: Run insertion script');
  console.log(`   node batch-translate-german.mjs ${outputFile}\n`);
}

processGermanBatch().catch(console.error);
