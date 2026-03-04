import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const koreanContent = fs.readFileSync('post5-korean.txt', 'utf-8');

const { data, error } = await supabase
  .from('blog_posts')
  .insert([{
    title: '휴양지를 잊지 못할 추억으로 만들어줄 5가지 산장 살인 미스터리 테마',
    slug: '5-산장-살인-미스터리-테마-잊지-못할-휴양지-만들기',
    content: koreanContent,
    meta_description: '아늑한 고립감, 눈에 갇힌 시나리오, 산악 모험이 스릴 넘치는 수사와 만나는 산장 살인 미스터리를 만드세요.',
    meta_keywords: '산장 살인 미스터리, 스키 롯지 파티 테마, 눈에 갇힌 미스터리, 산악 휴양 게임, 겨울 미스터리 파티, 황야 생존 테마, 기업 휴양 미스터리, 산악 모험 파티, 롯지 엔터테인먼트, 알파인 미스터리',
    language: 'ko',
    theme: 'Mountain Lodge',
    status: 'published',
    reading_time: 14,
    author: 'Mystery Maker Party Team',
    tags: ['Mountain Lodge', 'Ski Resort', 'Winter', 'Wilderness'],
    published_at: new Date('2026-02-16T05:00:00Z').toISOString(),
    post_date: '2026-02-16'
  }])
  .select();

if (error) {
  console.error('Error inserting post 5:', error);
  process.exit(1);
}

console.log('✅ 4/5 - Mountain Lodge post inserted successfully');
console.log('ID:', data[0].id);
console.log('Slug:', data[0].slug);
