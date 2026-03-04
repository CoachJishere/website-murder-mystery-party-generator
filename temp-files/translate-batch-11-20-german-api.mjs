import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const TRANSLATION_GUIDELINES = `You are translating murder mystery blog posts from English to German.

CRITICAL GERMAN TRANSLATIONS (use these EXACTLY):

E-E-A-T Header:
*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*

Research Statement:
*Basierend auf der Analyse von über 10.000 Krimi-Partys und [theme]-Forschung*

Section Headers:
- "Market Trends & Popularity" → "Markttrends und Popularität"
- "What 10,000+ Mystery Parties Have Taught Us" → "Was uns über 10.000 Krimi-Partys gelehrt haben"
- "Sources & References" → "Quellen und Referenzen"
- "Frequently Asked Questions" → "Häufig gestellte Fragen"

Table Headers:
| Statistik | Wert | Quelle |

Common Phrases:
- "Reading time: X minutes" → "Lesezeit: X Minuten"
- "Perfect Thematic Integration" → "Perfekte Thematische Integration"
- "Character Authenticity" → "Charakterauthentizität"
- "Investigation Clarity" → "Ermittlungsklarheit"
- "Atmospheric Balance" → "Atmosphärisches Gleichgewicht"
- "Customized Engagement" → "Individuelles Engagement"

QUALITY RULES:
1. Capitalize ALL nouns (German rule)
2. Use formal "Sie" form throughout
3. Create proper compound nouns: Krimidinner, Mordmysterium, Krimi-Party
4. Use proper umlauts: ä, ö, ü, ß
5. Maintain verb-second position in main clauses
6. Keep ALL markdown formatting exactly as in English
7. Preserve all links, formatting, tables, lists
8. Keep English names, brands, movie titles in original form
9. Translate naturally - sound like native German business writing

Return ONLY a JSON object with this structure:
{
  "title": "translated title",
  "content": "full translated content with all markdown",
  "meta_description": "translated meta description"
}`;

async function translatePost(post, index, total) {
  console.log(`\n[${index + 1}/${total}] Translating: ${post.slug}`);
  console.log(`   Title: ${post.title.substring(0, 60)}...`);
  console.log(`   Length: ${post.content.length} chars`);

  const prompt = `Translate this murder mystery blog post to German following all guidelines.

ENGLISH TITLE:
${post.title}

ENGLISH META DESCRIPTION:
${post.meta_description}

ENGLISH CONTENT:
${post.content}

Return ONLY the JSON object with title, content, and meta_description translated to German.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.3,
      system: TRANSLATION_GUIDELINES,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response (might have markdown code blocks)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonText = responseText.split('```')[1].split('```')[0].trim();
    }

    const translation = JSON.parse(jsonText);

    console.log(`   ✅ Translation complete`);
    console.log(`   Title (DE): ${translation.title.substring(0, 60)}...`);

    return {
      slug: post.slug,
      title: translation.title,
      content: translation.content,
      meta_description: translation.meta_description,
      language: 'de',
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error(`   ❌ Translation error: ${error.message}`);
    throw error;
  }
}

async function processBatch() {
  console.log('🇩🇪 GERMAN TRANSLATION: Posts 11-20');
  console.log('='.repeat(70));

  const posts = JSON.parse(readFileSync('./temp-files/batch-de-11-to-20.json', 'utf8'));

  console.log(`\n📊 Batch Summary:`);
  console.log(`   Posts to translate: ${posts.length}`);
  console.log(`   Total characters: ${posts.reduce((sum, p) => sum + p.content.length, 0).toLocaleString()}`);

  const translated = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    try {
      const translation = await translatePost(posts[i], i, posts.length);
      translated.push(translation);
      successCount++;

      // Delay to respect rate limits
      if (i < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`\n❌ Failed to translate ${posts[i].slug}: ${error.message}`);
      errorCount++;
    }
  }

  // Save translations to file
  const outputFile = './temp-files/german-translated-batch-11-20.json';
  writeFileSync(outputFile, JSON.stringify(translated, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Successfully translated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Saved to: ${outputFile}`);
  console.log('='.repeat(70));

  if (successCount > 0) {
    console.log('\n🎯 Next step:');
    console.log(`   node temp-files/batch-translate-german.mjs ${outputFile}`);
  }

  return translated;
}

processBatch().catch(console.error);
