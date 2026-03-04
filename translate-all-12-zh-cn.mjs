#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = [
  { id: "f9e5ae63-d483-42e0-845e-6c5ce69c3624", fileName: "zh-cn-complete-post-1.md", title: "Victorian" },
  { id: "da666de8-8af2-420e-90af-490597d4360b", fileName: "zh-cn-complete-post-2.md", title: "Small Groups" },
  { id: "9a37fa33-5397-4c58-a85a-d81ebaa676a8", fileName: "zh-cn-complete-post-3.md", title: "Medieval" },
  { id: "f3990bda-af8a-4cca-af57-e49990134f29", fileName: "zh-cn-complete-post-4.md", title: "Fix Boring" },
  { id: "3f26eea9-72c3-4694-ac17-0ca788dd5aaf", fileName: "zh-cn-complete-post-5.md", title: "Hollywood" },
  { id: "fb39f18e-8b9f-4332-9502-dc88fa9345e9", fileName: "zh-cn-complete-post-6.md", title: "Wild West" },
  { id: "1d51a590-b04a-4167-b0f2-96d3a2c7ff79", fileName: "zh-cn-complete-post-7.md", title: "Pirate" },
  { id: "bdb64008-689e-4db6-87be-c170a6bde642", fileName: "zh-cn-complete-post-8.md", title: "Fix Confusing Clues" },
  { id: "3cb1b819-7c13-4630-95ed-494ef515fd0a", fileName: "zh-cn-complete-post-9.md", title: "Space Station" },
  { id: "7f38f1ae-fff5-4119-b6a1-1ea5a8fbbd02", fileName: "zh-cn-complete-post-10.md", title: "Innocent Bystander" },
  { id: "7adb6cd9-e978-456e-a72b-852b905bbb78", fileName: "zh-cn-complete-post-11.md", title: "Fix Overly Complex" },
  { id: "2d19c069-2354-45b5-be1f-ffe3d5338e7b", fileName: "zh-cn-complete-post-12.md", title: "Masquerade Ball" }
];

async function fetchPost(id) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .eq('language', 'en')
    .single();

  if (error) throw error;
  return data;
}

async function translateToChineseSimplified(content, title, slug) {
  console.log(`\n🤖 Translating: ${title}...`);

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    temperature: 1,
    messages: [{
      role: 'user',
      content: `You are a professional translator specializing in Simplified Chinese (简体中文) for murder mystery party content.

Translate this ENTIRE blog post to Simplified Chinese with these requirements:

CRITICAL REQUIREMENTS:
- Simplified Chinese (简体中文) ONLY - NO traditional characters
- Formal, educated register for adult readers
- Natural, fluent Chinese for native speakers
- Preserve ALL E-E-A-T elements (expertise, experience, authoritativeness)
- Keep source titles in English in 来源 section
- Maintain ALL markdown formatting
- Use proper Chinese punctuation (。、！？《》「」)
- DO NOT translate URLs
- DO NOT translate proper nouns (e.g., "Murder Mystery Party Generator")
- Translate "Murder Mystery Party Generator" as "谋杀之谜派对生成器"

SLUG: ${slug}

TITLE: ${title}

CONTENT:
${content}

Return ONLY the translated markdown content. No explanations or meta-commentary.`
    }]
  });

  return message.content[0].text;
}

async function main() {
  console.log('🚀 Starting ZH-CN translation for 12 posts...\n');

  for (const post of posts) {
    try {
      console.log(`\n📖 Fetching post ${post.title}...`);
      const englishPost = await fetchPost(post.id);

      const translatedContent = await translateToChineseSimplified(
        englishPost.content,
        englishPost.title,
        englishPost.slug
      );

      const filePath = resolve(__dirname, post.fileName);
      await fs.writeFile(filePath, translatedContent, 'utf-8');

      console.log(`✅ Saved: ${post.fileName}`);

      // Rate limiting - wait 2 seconds between requests
      if (posts.indexOf(post) < posts.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error with ${post.title}:`, error.message);
      throw error;
    }
  }

  console.log('\n\n✅ PHASE 2 TRANSLATION COMPLETE!');
  console.log('📊 Summary:');
  console.log('  - Portuguese (PT): 11 posts');
  console.log('  - Korean (KO): 9 posts');
  console.log('  - Simplified Chinese (ZH-CN): 12 posts');
  console.log('  - TOTAL: 32 posts translated');
}

main().catch(console.error);
