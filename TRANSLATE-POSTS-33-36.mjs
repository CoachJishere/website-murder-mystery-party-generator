/**
 * COMPLETE TRANSLATION OF POSTS 33-36
 *
 * This script translates and inserts the remaining 4 posts into all 19 languages.
 *
 * USAGE:
 * Set your ANTHROPIC_API_KEY environment variable, then run:
 * ANTHROPIC_API_KEY="your-key-here" node TRANSLATE-POSTS-33-36.mjs
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ERROR: ANTHROPIC_API_KEY environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  ANTHROPIC_API_KEY="your-key-here" node TRANSLATE-POSTS-33-36.mjs');
  console.error('');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const targetLanguages = ['de', 'es', 'fr', 'it', 'pt', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'hu', 'ro', 'el', 'ru', 'ja', 'ko', 'zh'];

const posts = [
  {
    id: '141f0863-8371-4f60-a17f-77a38eed6398',
    slug: 'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue',
    name: 'Holiday Gatherings',
    number: 33
  },
  {
    id: 'fc1396b1-617a-43b2-81eb-8b9f0325c6a7',
    slug: 'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
    name: 'Office Teams',
    number: 34
  },
  {
    id: 'da666de8-8af2-420e-90af-490597d4360b',
    slug: 'murder-mystery-party-for-small-groups-ideas',
    name: 'Small Groups',
    number: 35
  },
  {
    id: 'bee3a521-2203-4f03-99a6-1ddc4d97ff62',
    slug: 'murder-mystery-party-for-teenagers-guide',
    name: 'Teenagers',
    number: 36
  }
];

const languageNames = {
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  pl: 'Polish',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  el: 'Greek',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese'
};

async function translateText(text, language, field) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: field === 'content' ? 16000 : field === 'description' ? 1000 : 500,
    messages: [{
      role: 'user',
      content: `Translate the following ${field} to ${languageNames[language]}. Return ONLY the translated text with no explanations or additional text:\n\n${text}`
    }]
  });
  return message.content[0].text;
}

async function translatePost(post) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`POST ${post.number}/4: ${post.name}`);
  console.log(`${'='.repeat(70)}\n`);

  // Fetch English version
  const { data: enPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', post.id)
    .eq('language', 'en')
    .single();

  if (fetchError || !enPost) {
    console.error(`❌ Failed to fetch English post`);
    console.error(fetchError);
    return { completed: 0, failed: 19 };
  }

  console.log(`✓ Fetched English content (${enPost.content.length} chars)`);
  console.log(`✓ Title: ${enPost.title}`);
  console.log('');

  let completed = 0;
  let failed = 0;
  const results = [];

  for (const lang of targetLanguages) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('id', post.id)
        .eq('language', lang)
        .single();

      if (existing) {
        console.log(`  ${lang.toUpperCase().padEnd(5)} | Already exists - skipping`);
        completed++;
        results.push({ lang, status: 'exists' });
        continue;
      }

      // Translate all fields
      process.stdout.write(`  ${lang.toUpperCase().padEnd(5)} | Translating...`);

      const [translatedTitle, translatedDescription, translatedContent] = await Promise.all([
        translateText(enPost.title, lang, 'title'),
        translateText(enPost.meta_description || enPost.title, lang, 'description'),
        translateText(enPost.content, lang, 'content')
      ]);

      // Insert translation
      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          id: enPost.id,
          slug: enPost.slug,
          title: translatedTitle,
          meta_description: translatedDescription,
          meta_keywords: enPost.meta_keywords,
          content: translatedContent,
          author: enPost.author,
          tags: enPost.tags,
          language: lang,
          theme: enPost.theme,
          status: enPost.status,
          reading_time: enPost.reading_time,
          published_at: enPost.published_at,
          post_date: enPost.post_date
        });

      if (insertError) {
        process.stdout.write(` FAILED - ${insertError.message}\n`);
        failed++;
        results.push({ lang, status: 'failed', error: insertError.message });
      } else {
        process.stdout.write(` SUCCESS\n`);
        completed++;
        results.push({ lang, status: 'success' });
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      process.stdout.write(` ERROR - ${error.message}\n`);
      failed++;
      results.push({ lang, status: 'error', error: error.message });
    }
  }

  console.log('');
  console.log(`Summary: ${completed}/${targetLanguages.length} successful`);

  if (failed > 0) {
    console.log(`\nFailed languages:`);
    results.filter(r => r.status !== 'success' && r.status !== 'exists').forEach(r => {
      console.log(`  - ${r.lang.toUpperCase()}: ${r.error}`);
    });
  }

  return { completed, failed, results };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         TRANSLATING POSTS 33-36 TO ALL 19 LANGUAGES               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Target languages:', targetLanguages.join(', '));
  console.log('');

  const allResults = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const result = await translatePost(post);
    allResults.push({ post: post.name, ...result });

    console.log('');
    console.log(`${'━'.repeat(70)}`);
    console.log(`✅ ${i + 1}/4 DONE: ${post.name}`);
    console.log(`${'━'.repeat(70)}`);
    console.log('');

    // Longer delay between posts
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                       FINAL SUMMARY                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  let totalCompleted = 0;
  let totalFailed = 0;

  allResults.forEach((result, i) => {
    totalCompleted += result.completed;
    totalFailed += result.failed;
    console.log(`Post ${i + 1} (${result.post}):`);
    console.log(`  ✓ Successful: ${result.completed}`);
    console.log(`  ✗ Failed: ${result.failed}`);
    console.log('');
  });

  console.log(`${'='.repeat(70)}`);
  console.log(`TOTAL: ${totalCompleted} translations inserted, ${totalFailed} failed`);
  console.log(`${'='.repeat(70)}`);
  console.log('');
  console.log('✅ ALL 4 POSTS COMPLETED!');
  console.log('');
}

main().catch(error => {
  console.error('');
  console.error('❌ FATAL ERROR:', error.message);
  console.error('');
  process.exit(1);
});
