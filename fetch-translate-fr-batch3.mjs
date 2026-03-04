import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

// Supabase connection
const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const supabase = createClient(supabaseUrl, supabaseKey);

// Anthropic API - hardcoded from .env file
const anthropic = new Anthropic({
  apiKey: 'sk-ant-api03-2_NmBwqKMi4hqI_HL-LXTnAhZFzS-9bA64Ysb17QRh2MsOA5oH0hAjNQcyE9YwKxNq-CY_2jk0pSdHWOIGGO_g-5HiYSQAA'
});

// Read missing posts
const missingPosts = JSON.parse(
  fs.readFileSync('./fr-missing-posts.json', 'utf-8')
);

// Get posts 11-15 (indices 10-14)
const batch3Posts = missingPosts.missing_posts.slice(10, 15);

console.log('Batch 3 Posts to translate:');
batch3Posts.forEach((post, idx) => {
  console.log(`${idx + 11}. ${post.title}`);
});

async function fetchPost(postId) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .eq('language', 'en')
    .single();

  if (error) {
    console.error(`Error fetching post ${postId}:`, error);
    return null;
  }

  return data;
}

async function translateToFrench(post, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Translating ${index}/5: ${post.title}`);
  console.log(`${'='.repeat(80)}\n`);

  const prompt = `You are a professional translator specializing in murder mystery party content for a French audience.

**Task:** Translate this English blog post to French with the highest quality.

**Translation Standards:**
- Use formal "vous" form throughout
- Maintain natural, engaging French that feels native (not translated)
- Preserve all E-E-A-T signals (expertise, authority, trustworthiness)
- Keep markdown formatting intact
- Keep source citations in English
- Preserve all links and URLs
- Maintain SEO value with natural keyword usage

**English Post:**

Title: ${post.title}
Slug: ${post.slug}
Meta Description: ${post.meta_description}

Content:
${post.content}

**Instructions:**
Provide the French translation in this exact format:

TITLE:
[French title]

SLUG:
[French slug - keep hyphens, lowercase]

META_DESCRIPTION:
[French meta description - compelling, under 160 chars]

CONTENT:
[Full French content with all markdown preserved]

Begin translation now.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const translated = message.content[0].text;

  // Parse the translation
  const titleMatch = translated.match(/TITLE:\s*\n(.+?)(?=\n\nSLUG:)/s);
  const slugMatch = translated.match(/SLUG:\s*\n(.+?)(?=\n\nMETA_DESCRIPTION:)/s);
  const metaMatch = translated.match(/META_DESCRIPTION:\s*\n(.+?)(?=\n\nCONTENT:)/s);
  const contentMatch = translated.match(/CONTENT:\s*\n([\s\S]+)$/);

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    slug: slugMatch ? slugMatch[1].trim() : '',
    meta_description: metaMatch ? metaMatch[1].trim() : '',
    content: contentMatch ? contentMatch[1].trim() : ''
  };
}

async function main() {
  console.log(`\nFetching and translating French Batch 3 (posts 11-15)...\n`);

  for (let i = 0; i < batch3Posts.length; i++) {
    const postInfo = batch3Posts[i];
    const postNumber = i + 11;

    try {
      // Fetch English post
      console.log(`\nFetching post ${postNumber}: ${postInfo.title}`);
      const englishPost = await fetchPost(postInfo.id);

      if (!englishPost) {
        console.error(`❌ Failed to fetch post ${postNumber}`);
        continue;
      }

      console.log(`✓ Fetched: ${englishPost.title}`);

      // Translate
      const translation = await translateToFrench(englishPost, i + 1);

      // Save to file
      const filename = `./fr-complete-post-${postNumber}.md`;
      const output = `---
original_id: ${postInfo.id}
original_title: ${englishPost.title}
original_slug: ${englishPost.slug}
batch: 3
post_number: ${postNumber}
translation_date: ${new Date().toISOString()}
---

# FRENCH TRANSLATION

## Title
${translation.title}

## Slug
${translation.slug}

## Meta Description
${translation.meta_description}

## Content

${translation.content}

---

# ORIGINAL ENGLISH

## Title
${englishPost.title}

## Slug
${englishPost.slug}

## Meta Description
${englishPost.meta_description}

## Content

${englishPost.content}
`;

      fs.writeFileSync(filename, output, 'utf-8');
      console.log(`✓ Saved: ${filename}`);

      // Rate limiting
      if (i < batch3Posts.length - 1) {
        console.log('Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Error processing post ${postNumber}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✓ BATCH 3 COMPLETE');
  console.log('='.repeat(80));
  console.log('\nFiles created:');
  console.log('- fr-complete-post-11.md (Haunted Hotel)');
  console.log('- fr-complete-post-12.md (Fix Boring Parties)');
  console.log('- fr-complete-post-13.md (Fix Confusing Clues)');
  console.log('- fr-complete-post-14.md (Fix Won\'t Participate)');
  console.log('- fr-complete-post-15.md (Fix Overly Complex)');
}

main().catch(console.error);
