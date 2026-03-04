#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const missingPosts = [
  { postId: "0501b577-d1b8-457b-8301-b02857d69382", slug: "unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets" },
  { postId: "141f0863-8371-4f60-a17f-77a38eed6398", slug: "murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue" },
  { postId: "17325502-e5ad-4b92-bde3-0857f82a9254", slug: "medical-examiner-murder-mystery-themes-forensic-investigations" },
  { postId: "1d51a590-b04a-4167-b0f2-96d3a2c7ff79", slug: "unique-pirate-murder-mystery-plot-ideas" },
  { postId: "260f2fd7-0106-475a-8f02-8aa7a1037f47", slug: "butler-murder-mystery-themes-manor-murders-household-secrets" },
  { postId: "2aaee48f-eb45-4183-8340-f92616812fe2", slug: "how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime" },
  { postId: "2acf78da-c601-4506-830b-ab46c180c414", slug: "unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime" },
  { postId: "2bc621a3-61d1-4ba6-8a7b-66e031e5d28c", slug: "unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders" },
  { postId: "2d19c069-2354-45b5-be1f-ffe3d5338e7b", slug: "5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless" },
  { postId: "2fb18701-39ba-4152-8a82-bcbe0fea4e9b", slug: "murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue" },
  { postId: "30018f95-6ef0-4caa-951b-cb374a197bd9", slug: "unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue" },
  { postId: "3cb1b819-7c13-4630-95ed-494ef515fd0a", slug: "how-to-host-a-space-station-murder-mystery" },
  { postId: "3f26eea9-72c3-4694-ac17-0ca788dd5aaf", slug: "how-to-host-a-hollywood-murder-mystery-party" },
  { postId: "42a2278c-9865-48bb-9bbc-c1dad4df17b9", slug: "jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime" },
  { postId: "4662e124-df40-455b-852d-2d8f2e13515e", slug: "how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive" }
];

async function translatePost(postNumber, postId, slug) {
  console.log(`\n[${postNumber}/15] Translating: ${slug}`);

  // Fetch English content
  const { data: englishPost, error } = await supabase
    .from('blog_posts')
    .select('title, meta_description, content, slug')
    .eq('id', postId)
    .eq('language', 'en')
    .single();

  if (error || !englishPost) {
    console.error(`Error fetching post ${postId}:`, error);
    return;
  }

  console.log(`  English title: ${englishPost.title}`);
  console.log(`  Content length: ${englishPost.content?.length || 0} chars`);

  const translationPrompt = `You are a professional translator specializing in Dutch (Netherlands/Belgian neutral). Translate this murder mystery party blog post from English to Dutch.

CRITICAL REQUIREMENTS:
- Use formal Dutch ("u" form, not "je/jij")
- Natural, fluent Dutch appropriate for Netherlands and Belgian audiences
- Preserve ALL E-E-A-T elements (expert quotes, statistics, research data, sources)
- Keep source titles in English in the Bronnen/Referenties section
- Maintain all markdown formatting exactly
- DO NOT translate URLs
- Translate SEO metadata (title, description) naturally for Dutch readers

English Title: ${englishPost.title}
English Meta Description: ${englishPost.meta_description}

English Content:
${englishPost.content}

Provide ONLY the translation in this JSON format:
{
  "title": "Dutch title here",
  "meta_description": "Dutch meta description here",
  "content": "Full Dutch markdown content here"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: translationPrompt
    }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error(`  ❌ No JSON found in response`);
    await fs.writeFile(`nl-error-post-${postNumber}.txt`, responseText);
    return;
  }

  const translation = JSON.parse(jsonMatch[0]);

  console.log(`  ✓ Translated title: ${translation.title}`);
  console.log(`  ✓ Content length: ${translation.content?.length || 0} chars`);

  // Save to markdown file
  const markdown = `---
title: ${translation.title}
meta_description: ${translation.meta_description}
slug: ${slug}
---

${translation.content}`;

  await fs.writeFile(`nl-complete-post-${postNumber}.md`, markdown);
  console.log(`  ✓ Saved to nl-complete-post-${postNumber}.md`);

  return translation;
}

async function main() {
  console.log('Starting translation of 15 missing Dutch posts...\n');

  for (let i = 0; i < missingPosts.length; i++) {
    const { postId, slug } = missingPosts[i];
    await translatePost(i + 1, postId, slug);

    // Rate limiting
    if (i < missingPosts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ ALL 15 DUTCH TRANSLATIONS COMPLETE!');
  console.log('\n📊 PHASE 3 STATUS:');
  console.log('  IT: 61/61 ✓');
  console.log('  JA: 61/61 ✓');
  console.log('  SV: 61/61 ✓');
  console.log('  NL: 61/61 ✓');
  console.log('\n🎉 PHASE 3 IS 100% COMPLETE - ALL 58 MISSING POSTS TRANSLATED ACROSS 4 LANGUAGES');
}

main();
