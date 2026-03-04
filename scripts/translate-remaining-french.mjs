import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FRENCH_EEAT = `*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*`;

async function translateToFrench(englishContent, title) {
  const prompt = `You are a professional translator specializing in French localization for entertainment and party planning content.

Translate the following English blog post to French. Requirements:

1. **Natural, engaging French** - Not literal translation, but culturally appropriate French
2. **Maintain all markdown formatting** exactly (headers, lists, links, etc.)
3. **Keep all URLs unchanged**
4. **Preserve the HTML structure** of any embedded elements
5. **Use French party/mystery vocabulary** - translate terms appropriately for a French audience
6. **Keep brand name "Mystery Maker"** unchanged
7. **Maintain the fun, engaging tone** suitable for party planning

English Title: ${title}

English Content:
${englishContent}

Return ONLY the translated French content, maintaining exact markdown structure.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

async function main() {
  console.log('🇫🇷 Starting French translation of remaining 37 posts...\n');

  // Fetch optimized English posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20')
    .ilike('content', '%*Published: February 16, 2026%')
    .order('slug', { ascending: true });

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`📊 Found ${posts.length} optimized English posts`);

  // Skip first 10 (already done), process remaining 37
  const remainingPosts = posts.slice(10);
  console.log(`📝 Processing ${remainingPosts.length} remaining posts (indices 10-46)\n`);

  let completed = 0;
  const totalPosts = remainingPosts.length;

  for (let i = 0; i < remainingPosts.length; i++) {
    const post = remainingPosts[i];
    const postNumber = i + 11; // Posts 11-47

    console.log(`\n[${postNumber}/${totalPosts + 10}] Translating: ${post.title}`);
    console.log(`   Slug: ${post.slug}`);

    try {
      // Translate content
      const translatedContent = await translateToFrench(post.content, post.title);

      // Translate title
      const titlePrompt = `Translate this English blog post title to French. Return ONLY the French title, nothing else.

English title: ${post.title}

French title:`;

      const titleMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        messages: [{ role: 'user', content: titlePrompt }],
      });

      const translatedTitle = titleMessage.content[0].text.trim();

      // Translate meta description
      const metaPrompt = `Translate this English meta description to French. Keep it under 160 characters. Return ONLY the French description.

English: ${post.meta_description}

French:`;

      const metaMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        messages: [{ role: 'user', content: metaPrompt }],
      });

      const translatedMeta = metaMessage.content[0].text.trim();

      // Create French post
      const frenchPost = {
        slug: post.slug,
        language: 'fr',
        title: translatedTitle,
        meta_description: translatedMeta,
        content: translatedContent,
        category: post.category,
        published_at: post.published_at,
        updated_at: '2026-02-20T00:00:00Z',
        author: 'Équipe Mystery Maker Party',
        featured_image: post.featured_image,
      };

      // Insert French post
      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert(frenchPost);

      if (insertError) {
        console.error(`   ❌ Error inserting: ${insertError.message}`);
      } else {
        completed++;
        console.log(`   ✅ Completed (${completed}/${totalPosts})`);

        // Progress report every 5 posts
        if (completed % 5 === 0) {
          const startPost = completed - 4 + 10;
          const endPost = completed + 10;
          console.log(`\n✅ Posts ${startPost}-${endPost} done (${completed}/${totalPosts} total)\n`);
        }
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Translation error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 FINAL REPORT: Total completed: ${completed}/${totalPosts}`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
