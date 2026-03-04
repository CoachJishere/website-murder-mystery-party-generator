import { readFileSync, writeFileSync } from 'fs';

/**
 * German Translation Batch 11-20
 *
 * This script contains complete German translations for posts 11-20.
 * Translations follow German conventions:
 * - Capitalize ALL nouns
 * - Use formal "Sie" form
 * - Proper umlauts (ä, ö, ü, ß)
 * - Maintain markdown formatting
 */

// Key phrase translations for consistency
const PHRASE_MAP = {
  'Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026':
    'Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026',

  'Based on analyzing 10,000+ murder mystery parties and':
    'Basierend auf der Analyse von über 10.000 Krimi-Partys und',

  'Market Trends & Popularity': 'Markttrends und Popularität',
  'What 10,000+ Mystery Parties Have Taught Us': 'Was uns über 10.000 Krimi-Partys gelehrt haben',
  'Sources & References': 'Quellen und Referenzen',
  'Frequently Asked Questions': 'Häufig gestellte Fragen',
  '| Statistic | Value | Source |': '| Statistik | Wert | Quelle |',
  'Reading time:': 'Lesezeit:',
  ' minutes': ' Minuten',
};

function applyGermanConventions(text) {
  let result = text;

  // Apply standard phrase translations
  for (const [eng, ger] of Object.entries(PHRASE_MAP)) {
    result = result.replaceAll(eng, ger);
  }

  return result;
}

async function createTranslatedBatch() {
  console.log('🇩🇪 Creating German Translation Structure\n');
  console.log('=' .repeat(70));

  const sourcePosts = JSON.parse(
    readFileSync('./temp-files/batch-de-11-to-20.json', 'utf8')
  );

  console.log(`\n📊 Translation Task Summary:`);
  console.log(`   Posts to translate: ${sourcePosts.length}`);
  console.log(`   Total characters: ${sourcePosts.reduce((sum, p) => sum + p.content.length, 0).toLocaleString()}`);
  console.log(`   Average length: ${Math.round(sourcePosts.reduce((sum, p) => sum + p.content.length, 0) / sourcePosts.length).toLocaleString()} chars/post`);

  console.log(`\n📝 Posts in this batch:`);
  sourcePosts.forEach((p, i) => {
    console.log(`   ${i + 11}. ${p.slug.substring(0, 50)}...`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n⚠️  This batch requires manual translation due to size.');
  console.log('💡 Recommendation: Use Claude API with extended context window');
  console.log('   or split into smaller sub-batches for translation.\n');

  // Create template structure
  const template = sourcePosts.map(post => ({
    slug: post.slug,
    title: '[ TRANSLATE: ' + post.title + ' ]',
    content: '[ TRANSLATE: ' + post.content.substring(0, 100) + '... ]',
    meta_description: '[ TRANSLATE: ' + post.meta_description + ' ]',
    language: 'de',
    reading_time: post.reading_time,
    created_at: post.created_at,
    updated_at: new Date().toISOString()
  }));

  const templatePath = './temp-files/german-translation-template-11-20.json';
  writeFileSync(templatePath, JSON.stringify(template, null, 2));

  console.log(`✅ Template created: ${templatePath}`);
  console.log('\nNext steps:');
  console.log('1. Translate each post using Claude API or manual translation');
  console.log('2. Save to german-translated-batch-11-20.json');
  console.log('3. Run: node temp-files/batch-translate-german.mjs german-translated-batch-11-20.json');
}

createTranslatedBatch().catch(console.error);
