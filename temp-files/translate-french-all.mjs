import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRANSLATION_PROMPT = `You are a professional translator specializing in French localization for SEO-optimized content.

Translate this murder mystery blog post from English to French following these strict guidelines:

**CRITICAL REQUIREMENTS**:
1. Keep ALL statistics, numbers, percentages, dates, and source citations EXACTLY as they appear
2. Keep ALL URLs and links intact
3. Keep ALL markdown formatting (headers, tables, lists, bold, italic)
4. Use formal "vous" form throughout
5. Use proper French accents (é, è, ê, à, ç, etc.)
6. Follow French capitalization rules (fewer capitals than English - only capitalize first word of sentences and proper nouns)
7. Ensure proper gender agreement (masculine/feminine)
8. Use natural, idiomatic French expressions

**KEY TRANSLATIONS** (use these exactly):
- "*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*"
  → "*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*"

- "*Based on analyzing 10,000+ murder mystery parties and [theme] research*"
  → "*Basé sur l'analyse de plus de 10 000 soirées mystère et recherche sur [theme]*"

- "Market Trends & Popularity" → "Tendances du Marché et Popularité"
- "What 10,000+ Mystery Parties Have Taught Us" → "Ce que Plus de 10 000 Soirées Mystère Nous Ont Appris"
- "Sources & References" → "Sources et Références"
- "Frequently Asked Questions" → "Questions Fréquemment Posées"
- "Reading time: X minutes" → "Temps de lecture : X minutes"

**Table Headers**:
- "| Statistic | Value | Source |" → "| Statistique | Valeur | Source |"

**Common Bullet Points**:
- "Perfect Thematic Integration" → "Intégration Thématique Parfaite"
- "Character Authenticity" → "Authenticité des Personnages"
- "Investigation Clarity" → "Clarté de l'Enquête"
- "Atmospheric Balance" → "Équilibre Atmosphérique"
- "Customized Engagement" → "Engagement Personnalisé"

**For Expert Quotes**:
- Translate the quote content to French
- Keep the attribution in English (names, titles remain unchanged)

Return ONLY the translated content with no preamble or explanation.`;

async function translateText(text, isTitle = false) {
  const prompt = isTitle
    ? `Translate this blog post title to French. Use formal language and proper French capitalization (only capitalize first word and proper nouns). Return only the translation:\n\n${text}`
    : `${TRANSLATION_PROMPT}\n\n${text}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: isTitle ? 100 : 8000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text.trim();
}

async function translatePost(post, index, total) {
  console.log(`\n[${index + 1}/${total}] Processing: ${post.title}`);

  // Check if French version already exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', post.slug)
    .eq('language', 'fr')
    .maybeSingle();

  if (existing) {
    console.log(`⏭️  Skipped: French version already exists`);
    return { status: 'skipped', title: post.title };
  }

  try {
    // Translate title
    console.log(`   Translating title...`);
    const translatedTitle = await translateText(post.title, true);

    // Translate content
    console.log(`   Translating content...`);
    const translatedContent = await translateText(post.content, false);

    // Translate meta description
    console.log(`   Translating meta description...`);
    const translatedMetaDescription = await translateText(post.meta_description, true);

    // Insert French version
    const frenchPost = {
      slug: post.slug,
      title: translatedTitle,
      content: translatedContent,
      meta_description: translatedMetaDescription,
      language: 'fr',
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('blog_posts')
      .insert(frenchPost);

    if (error) {
      console.error(`❌ Error inserting: ${error.message}`);
      return { status: 'error', title: post.title, error: error.message };
    }

    console.log(`✅ Translated: ${translatedTitle}`);
    return { status: 'success', title: post.title, translatedTitle };

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { status: 'error', title: post.title, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting French Translation Process...\n');
  console.log('📊 Fetching optimized English posts...');

  // Fetch optimized English posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching posts:', error);
    process.exit(1);
  }

  // Filter for optimized posts
  const optimized = posts.filter(p =>
    p.content.includes('*Published: February 16, 2026')
  );

  console.log(`✅ Found ${optimized.length} optimized posts to translate\n`);

  if (optimized.length === 0) {
    console.log('⚠️  No posts found to translate. Exiting.');
    process.exit(0);
  }

  // Track results
  const results = {
    success: [],
    skipped: [],
    errors: []
  };

  // Translate each post
  for (let i = 0; i < optimized.length; i++) {
    const result = await translatePost(optimized[i], i, optimized.length);

    if (result.status === 'success') {
      results.success.push(result);
    } else if (result.status === 'skipped') {
      results.skipped.push(result);
    } else {
      results.errors.push(result);
    }

    // Small delay to avoid rate limits
    if (i < optimized.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('🎉 French Translation Complete!');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\n❌ Failed Posts:');
    results.errors.forEach(({ title, error }) => {
      console.log(`   - ${title}: ${error}`);
    });
  }

  // Verify count in database
  const { count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'fr')
    .gte('updated_at', '2026-02-21T00:00:00');

  console.log(`\n📊 French posts created today: ${count}`);
}

main().catch(console.error);
