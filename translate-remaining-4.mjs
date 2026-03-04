import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Use environment variable for API key
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

const targetLanguages = ['de', 'es', 'fr', 'it', 'pt', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'hu', 'ro', 'el', 'ru', 'ja', 'ko', 'zh'];

const posts = [
  {
    id: '141f0863-8371-4f60-a17f-77a38eed6398',
    slug: 'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue',
    name: 'Holiday Gatherings'
  },
  {
    id: 'fc1396b1-617a-43b2-81eb-8b9f0325c6a7',
    slug: 'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
    name: 'Office Teams'
  },
  {
    id: 'da666de8-8af2-420e-90af-490597d4360b',
    slug: 'murder-mystery-party-for-small-groups-ideas',
    name: 'Small Groups'
  },
  {
    id: 'bee3a521-2203-4f03-99a6-1ddc4d97ff62',
    slug: 'murder-mystery-party-for-teenagers-guide',
    name: 'Teenagers'
  }
];

async function translatePost(postId, postName, postSlug) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${postName}`);
  console.log(`${'='.repeat(60)}\n`);

  // Get English version
  const { data: enPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .eq('language', 'en')
    .single();

  if (fetchError || !enPost) {
    console.error(`❌ Failed to fetch English post: ${postName}`);
    return;
  }

  console.log(`✓ Fetched English content (${enPost.content.length} chars)`);

  let completed = 0;
  let failed = 0;

  for (const lang of targetLanguages) {
    try {
      // Check if translation already exists
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('id', postId)
        .eq('language', lang)
        .single();

      if (existing) {
        console.log(`  ⊙ ${lang.toUpperCase()}: Already exists, skipping`);
        completed++;
        continue;
      }

      // Translate content
      const contentMessage = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: `Translate this blog post content to ${lang}. Return ONLY the translated text, no explanations:\n\n${enPost.content}`
        }]
      });
      const translatedContent = contentMessage.content[0].text;

      // Translate title
      const titleMessage = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Translate this title to ${lang}. Return ONLY the translated title:\n\n${enPost.title}`
        }]
      });
      const translatedTitle = titleMessage.content[0].text;

      // Translate description
      const descMessage = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Translate this description to ${lang}. Return ONLY the translated description:\n\n${enPost.description}`
        }]
      });
      const translatedDescription = descMessage.content[0].text;

      // Insert translation
      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          id: enPost.id,
          slug: enPost.slug,
          title: translatedTitle,
          description: translatedDescription,
          content: translatedContent,
          author: enPost.author,
          category: enPost.category,
          published_at: enPost.published_at,
          updated_at: enPost.updated_at,
          featured_image: enPost.featured_image,
          tags: enPost.tags,
          language: lang,
          seo_title: translatedTitle,
          seo_description: translatedDescription
        });

      if (insertError) {
        console.log(`  ✗ ${lang.toUpperCase()}: Insert failed - ${insertError.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${lang.toUpperCase()}: Translated and inserted`);
        completed++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`  ✗ ${lang.toUpperCase()}: Error - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${postName} Summary: ${completed} completed, ${failed} failed`);
  return { completed, failed };
}

async function main() {
  console.log('Starting translation of 4 remaining posts...\n');
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    await translatePost(post.id, post.name, post.slug);
    console.log(`\n✅ ${i + 1}/4 done\n`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ALL 4 POSTS COMPLETED!');
  console.log('='.repeat(60));
}

main();
