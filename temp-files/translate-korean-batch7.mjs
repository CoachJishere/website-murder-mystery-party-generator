import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY not found in environment');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = JSON.parse(fs.readFileSync('temp-files/korean-batch7.json', 'utf8'));

const koreanSlugMap = {
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue': '휴일-모임을-위한-살인-미스터리-파티-가족과-함께하는-축제-분위기-추리-게임',
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation': '사무실-팀을-위한-살인-미스터리-파티-협력-수사로-유대감-강화',
  'murder-mystery-party-for-small-groups-ideas': '소규모-그룹을-위한-살인-미스터리-파티-아이디어',
  'murder-mystery-party-for-teenagers-guide': '십대를-위한-살인-미스터리-파티-가이드',
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue': '사교계-살인-미스터리-테마-상류-사회-스캔들과-엘리트-음모'
};

async function translatePost(post, index) {
  console.log(`\n=== Translating post ${index + 31}: ${post.slug} ===`);

  const translationPrompt = `Translate this English murder mystery blog post to Korean following these strict formatting rules:

KOREAN FORMAT REQUIREMENTS:
1. **E-E-A-T metadata**: *게시일: 2026년 2월 16일 | 업데이트: 2026년 2월 20일 | 저자: Mystery Maker Party Team | 다음 검토: 2026년 5월 20일*
2. **Research line**: *10,000개 이상의 살인 미스터리 파티와 [theme] 연구 분석 기반*
3. **Table Headers**: | 통계 | 값 | 출처 |
4. **Reading Time**: "읽기 시간: X분"
5. **Quality Standards**:
   - Use formal 존댓말 (polite form) throughout
   - Use Hangul for Korean words, keep Arabic numerals for numbers
   - Natural Korean phrasing (not literal word-for-word translation)
   - Proper Korean particles (은/는, 이/가, 을/를)
   - Keep English proper nouns (author names, organizations) in English

TRANSLATE COMPLETELY:
- All headers (##, ###)
- All body text
- All tables (translate headers and content)
- All lists and bullet points
- All FAQ sections
- All quotes (translate quote but keep author name in English)
- All calls-to-action

KEEP IN ENGLISH:
- URLs
- Author names in citations
- Organization names in citations
- Technical terms in parentheses after Korean translation if needed

TITLE: ${post.title}

META DESCRIPTION: ${post.meta_description}

CONTENT:
${post.content}

Return a JSON object with:
{
  "translatedTitle": "Korean title here",
  "translatedMetaDescription": "Korean meta description here",
  "translatedContent": "Full Korean content here",
  "readingTimeMinutes": calculated reading time in minutes (Korean text)
}`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    temperature: 1,
    messages: [{
      role: 'user',
      content: translationPrompt
    }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const translation = JSON.parse(jsonMatch[0]);

  const koreanSlug = koreanSlugMap[post.slug];

  // Insert into database
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      slug: koreanSlug,
      language: 'ko',
      title: translation.translatedTitle,
      meta_description: translation.translatedMetaDescription,
      content: translation.translatedContent,
      reading_time_minutes: translation.readingTimeMinutes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(`Error inserting post ${index + 31}:`, error);
    throw error;
  }

  console.log(`✅ ${index + 31}/35 - Successfully translated and inserted: ${koreanSlug}`);

  // Save translation to file for backup
  fs.writeFileSync(
    `temp-files/korean-post-${index + 31}.json`,
    JSON.stringify(translation, null, 2)
  );
}

async function main() {
  for (let i = 0; i < posts.length; i++) {
    await translatePost(posts[i], i);
    // Wait 2 seconds between requests to avoid rate limiting
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ All 5 posts translated successfully!');
}

main().catch(console.error);
