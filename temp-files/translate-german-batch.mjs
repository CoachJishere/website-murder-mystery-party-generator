import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

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
  console.log(`\n[$${index + 1}/${total}] Translating: ${post.slug}`);
  console.log(`   Title: ${post.title.substring(0, 60)}...`);

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
      model: 'claude-opus-4-6',
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
      reading_time: post.reading_time,
      created_at: post.created_at
    };

  } catch (error) {
    console.error(`   ❌ Translation error: ${error.message}`);
    throw error;
  }
}

async function insertGermanPost(translation) {
  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', translation.slug)
      .eq('language', 'de')
      .single();

    if (existing) {
      console.log(`   ⏭️  Already in database (skipping)`);
      return { status: 'skipped' };
    }

    // Insert German post
    const germanPost = {
      slug: translation.slug,
      title: translation.title,
      content: translation.content,
      meta_description: translation.meta_description,
      language: 'de',
      reading_time: translation.reading_time,
      created_at: translation.created_at,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('blog_posts')
      .insert(germanPost);

    if (error) throw error;

    console.log(`   💾 Inserted into database`);
    return { status: 'success' };

  } catch (error) {
    console.error(`   ❌ Database error: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

async function processBatch(startIndex, endIndex) {
  console.log('🇩🇪 GERMAN TRANSLATION BATCH PROCESSOR');
  console.log('='.repeat(60));

  const posts = JSON.parse(readFileSync('./posts-to-translate-de.json', 'utf8'));
  const batch = posts.slice(startIndex, endIndex);

  console.log(`\n📊 Processing posts ${startIndex + 1} to ${endIndex} (${batch.length} posts)`);
  console.log(`📝 Total available: ${posts.length} posts\n`);

  const results = {
    translated: [],
    inserted: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < batch.length; i++) {
    const post = batch[i];
    const globalIndex = startIndex + i;

    try {
      // Translate
      const translation = await translatePost(post, globalIndex, posts.length);
      results.translated.push(translation);

      // Insert into database
      const insertResult = await insertGermanPost(translation);

      if (insertResult.status === 'success') {
        results.inserted++;
      } else if (insertResult.status === 'skipped') {
        results.skipped++;
      } else {
        results.errors.push({
          slug: post.slug,
          error: insertResult.error
        });
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`\n❌ Failed to process ${post.slug}: ${error.message}`);
      results.errors.push({
        slug: post.slug,
        error: error.message
      });
    }
  }

  // Save translations to file
  const outputFile = `./translations-de-batch-${startIndex}-${endIndex}.json`;
  writeFileSync(outputFile, JSON.stringify(results.translated, null, 2));
  console.log(`\n📁 Translations saved to: ${outputFile}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BATCH SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully inserted: ${results.inserted}`);
  console.log(`⏭️  Already existed: ${results.skipped}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => {
      console.log(`  - ${e.slug}: ${e.error}`);
    });
  }

  console.log('='.repeat(60));

  return results;
}

// Parse command line arguments
const startIndex = parseInt(process.argv[2]) || 0;
const endIndex = parseInt(process.argv[3]) || 10;

processBatch(startIndex, endIndex).catch(console.error);
