import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRANSLATION_GUIDE = `
# German Translation Guidelines

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
1. Use proper German compound nouns (Krimidinner, Mordmysterium)
2. Use formal "Sie" form
3. Capitalize ALL nouns
4. Proper ä, ö, ü, ß usage
5. Verb-second position in main clauses
`;

async function translateToGerman(title, content, metaDescription) {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are a professional German translator specializing in murder mystery content.

${TRANSLATION_GUIDE}

Translate the following blog post to German. Maintain all markdown formatting, structure, and preserve any dates, statistics, and proper nouns appropriately.

TITLE:
${title}

META DESCRIPTION:
${metaDescription}

CONTENT:
${content}

Return your translation in this JSON format:
{
  "title": "translated title",
  "metaDescription": "translated meta description",
  "content": "translated content"
}`
    }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse translation response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  console.log('🇩🇪 Starting German Translation Process...\n');

  // Fetch optimized English posts
  console.log('📥 Fetching optimized English posts...');
  const { data: posts, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00');

  if (fetchError) {
    console.error('❌ Error fetching posts:', fetchError);
    return;
  }

  const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
  console.log(`✅ Found ${optimized.length} optimized posts\n`);

  // Check for existing German translations
  const { data: existingGerman } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('language', 'de');

  const existingSlugs = new Set(existingGerman?.map(p => p.slug) || []);
  const toTranslate = optimized.filter(p => !existingSlugs.has(p.slug));

  console.log(`📊 Status:`);
  console.log(`   Total optimized: ${optimized.length}`);
  console.log(`   Already translated: ${existingSlugs.size}`);
  console.log(`   Need translation: ${toTranslate.length}\n`);

  if (toTranslate.length === 0) {
    console.log('✅ All posts already translated!');
    return;
  }

  // Translate posts
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < toTranslate.length; i++) {
    const post = toTranslate[i];
    console.log(`\n[${i + 1}/${toTranslate.length}] Translating: ${post.slug}`);

    try {
      // Translate
      const translated = await translateToGerman(
        post.title,
        post.content,
        post.meta_description
      );

      // Prepare German post
      const germanPost = {
        slug: post.slug,
        title: translated.title,
        content: translated.content,
        meta_description: translated.metaDescription,
        language: 'de',
        reading_time: post.reading_time,
        created_at: post.created_at,
        updated_at: new Date().toISOString()
      };

      // Insert into database
      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert(germanPost);

      if (insertError) {
        console.error(`   ❌ Database error: ${insertError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Successfully translated and inserted`);
        successCount++;
      }

      // Rate limiting pause (Opus tier)
      if (i < toTranslate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`   ❌ Translation error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Final Results:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${successCount + errorCount}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
