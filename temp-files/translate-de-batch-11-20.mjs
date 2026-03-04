import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRANSLATION_BRIEF = `You are translating murder mystery blog posts from English to German.

**Critical German Rules:**
1. Capitalize ALL nouns (Krimi, Party, Charaktere, Ermittlung, etc.)
2. Use formal "Sie" form throughout
3. Proper umlauts: ä, ö, ü, ß
4. Compound nouns: Krimidinner, Mordmysterium, Krimi-Party
5. Verb-second position in main clauses

**Key Translations:**
- E-E-A-T Header: "*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*"
- Research: "*Basierend auf der Analyse von über 10.000 Krimi-Partys und [theme]-Forschung*"
- "Market Trends & Popularity" → "Markttrends und Popularität"
- "What 10,000+ Mystery Parties Have Taught Us" → "Was uns über 10.000 Krimi-Partys gelehrt haben"
- "Sources & References" → "Quellen und Referenzen"
- "Frequently Asked Questions" → "Häufig gestellte Fragen"
- "Reading time: X minutes" → "Lesezeit: X Minuten"
- Table headers: "| Statistik | Wert | Quelle |"

**Character Elements:**
- "Perfect Thematic Integration" → "Perfekte Thematische Integration"
- "Character Authenticity" → "Charakterauthentizität"
- "Investigation Clarity" → "Ermittlungsklarheit"
- "Atmospheric Balance" → "Atmosphärisches Gleichgewicht"
- "Customized Engagement" → "Individuelles Engagement"

**Important:**
- Keep all markdown formatting intact
- Preserve all links, formatting, tables
- Maintain professional, authoritative tone
- Keep proper names in English (Mystery Maker, etc.)
- URLs and technical terms stay in English`;

async function translatePost(post, index, total) {
  console.log(`\n[${ index + 1}/${total}] Translating: ${post.title}`);
  console.log(`   Slug: ${post.slug}`);

  try {
    // Translate title
    const titleResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `${TRANSLATION_BRIEF}\n\nTranslate this title to German. Return ONLY the translated title, nothing else:\n\n${post.title}`
      }]
    });

    const translatedTitle = titleResponse.content[0].text.trim();
    console.log(`   Title: ${translatedTitle}`);

    // Translate meta description
    const metaResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `${TRANSLATION_BRIEF}\n\nTranslate this meta description to German. Return ONLY the translated description, nothing else:\n\n${post.meta_description}`
      }]
    });

    const translatedMeta = metaResponse.content[0].text.trim();

    // Translate content in chunks (Claude can handle long content)
    console.log(`   Translating content (${post.content.length} chars)...`);

    const contentResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `${TRANSLATION_BRIEF}\n\nTranslate this complete blog post content to German. Maintain all markdown formatting, tables, links, and structure. Return ONLY the translated content:\n\n${post.content}`
      }]
    });

    const translatedContent = contentResponse.content[0].text.trim();
    console.log(`   ✅ Content translated (${translatedContent.length} chars)`);

    return {
      slug: post.slug,
      title: translatedTitle,
      content: translatedContent,
      meta_description: translatedMeta,
      language: 'de',
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function translateBatch() {
  console.log('🇩🇪 German Translation: Posts 11-20\n');
  console.log('='.repeat(60));

  // Read source posts
  const sourcePosts = JSON.parse(
    readFileSync('./temp-files/batch-de-11-to-20.json', 'utf8')
  );

  console.log(`📝 Found ${sourcePosts.length} posts to translate\n`);

  const translatedPosts = [];

  for (let i = 0; i < sourcePosts.length; i++) {
    const translated = await translatePost(sourcePosts[i], i, sourcePosts.length);
    translatedPosts.push(translated);

    // Small delay to respect rate limits
    if (i < sourcePosts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Save translations
  const outputPath = './temp-files/german-translated-batch-11-20.json';
  writeFileSync(outputPath, JSON.stringify(translatedPosts, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Translation complete!`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📊 Total posts: ${translatedPosts.length}`);
  console.log('='.repeat(60));
}

translateBatch().catch(console.error);
