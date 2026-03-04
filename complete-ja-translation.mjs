import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Translation mappings for Japanese
const translations = {
  // Post 6
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover': {
    title: 'ゲストを潜入捜査員にするスパイスリラーマーダーミステリーテーマ5選',
    meta_description: 'シークレットエージェント、二重スパイ、国際的陰謀を特徴とするスパイマーダーミステリーパーティーで潜入捜査に出かけましょう。',
    meta_keywords: 'スパイスリラーマーダーミステリー,スパイマーダーミステリー,シークレットエージェントパーティー,スパイミステリーテーマ,国際陰謀ミステリー,秘密作戦パーティー,諜報員ミステリー,二重スパイマーダーミステリー,外交マーダーミステリー,冷戦ミステリーパーティー'
  },
  // Post 7
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue': {
    title: '陰謀のビッグトップに踏み込むヴィンテージサーカスマーダーミステリーテーマ5選',
    meta_description: 'カーニバルの魅力、サーカスのパフォーマー、ビッグトップの陰謀を特徴とするヴィンテージサーカスマーダーミステリーパーティーに参加しましょう。',
    meta_keywords: 'ヴィンテージサーカスマーダーミステリー,サーカスマーダーミステリー,カーニバルミステリーパーティー,ビッグトップマーダーミステリー,サーカスパフォーマーミステリー,巡回サーカスパーティー,サーカステントミステリー,カーニバルマーダーミステリー,ヴィンテージサーカステーマ,サーカス犯罪ミステリー'
  },
  // Post 8
  'ancient-egypt-murder-mystery-party-guide': {
    title: '古代エジプトマーダーミステリーパーティーガイド',
    meta_description: 'ファラオ、ピラミッド、古代の陰謀を特徴とする古代エジプトマーダーミステリーパーティーをホストしましょう。',
    meta_keywords: '古代エジプトマーダーミステリー,エジプトミステリーパーティー,ファラオマーダーミステリー,ピラミッドミステリーパーティー,エジプト考古学ミステリー,古代エジプトテーマパーティー,エジプト神話ミステリー,ナイル川マーダーミステリー,エジプト王朝ミステリー,古代エジプト犯罪'
  },
  // Post 9
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes': {
    title: 'アートギャラリーマーダーミステリーパーティープランニング:洗練された創造的犯罪を作成する',
    meta_description: 'アーティスト、コレクター、創造的陰謀を特徴とするアートギャラリーマーダーミステリーパーティーをプランニングしましょう。',
    meta_keywords: 'アートギャラリーマーダーミステリー,美術館ミステリーパーティー,アートコレクターマーダーミステリー,アーティストミステリーパーティー,ギャラリーオープニングマーダーミステリー,アートオークションミステリー,アートワールドマーダーミステリー,創造的犯罪ミステリー,洗練されたマーダーミステリー,文化的ミステリーパーティー'
  },
  // Post 10
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder': {
    title: '書店マーダーミステリーパーティープランニング:文学的殺人のページをめくる',
    meta_description: '著者、書店員、文学的陰謀を特徴とする書店マーダーミステリーパーティーをプランニングしましょう。',
    meta_keywords: '書店マーダーミステリー,文学ミステリーパーティー,書店ミステリーパーティー,著者マーダーミステリー,ブッククラブミステリー,文学犯罪ミステリー,図書館マーダーミステリー,書籍愛好家ミステリー,書店殺人ミステリー,文学テーマパーティー'
  }
};

// This script will be called multiple times with different post indices
const postIndex = parseInt(process.argv[2] || '6');
const files = fs.readdirSync('.').filter(f => f.startsWith('to-translate-'));

const file = files.find(f => f.startsWith(`to-translate-${postIndex}-`));
if (!file) {
  console.error(`No file found for post ${postIndex}`);
  process.exit(1);
}

const post = JSON.parse(fs.readFileSync(file, 'utf-8'));
const translation = translations[post.slug];

if (!translation) {
  console.error(`No translation found for ${post.slug}`);
  process.exit(1);
}

// Save translation for verification
const output = {
  slug: post.slug,
  title: translation.title,
  meta_description: translation.meta_description,
  meta_keywords: translation.meta_keywords
};

fs.writeFileSync(`translated-${postIndex}.json`, JSON.stringify(output, null, 2));
console.log(`✅ Translated post ${postIndex}: ${post.slug}`);
