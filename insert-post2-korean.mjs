import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const koreanContent = fs.readFileSync('post2-korean.txt', 'utf-8');

const { data, error } = await supabase
  .from('blog_posts')
  .insert([{
    title: '5가지 카지노 살인 미스터리 파티 테마: 치명적인 하이 스테이크 드라마에 주사위를 던지세요',
    slug: '5-카지노-살인-미스터리-파티-테마-치명적인-고위험-드라마',
    content: koreanContent,
    meta_description: '하이 스테이크 도박의 화려함과 위험이 스릴 넘치는 수사와 만나는 카지노 살인 미스터리를 만드세요.',
    meta_keywords: '카지노 살인 미스터리, 도박 파티 테마, 라스베이거스 미스터리, 카지노 파티 게임, 하이 롤러 미스터리, 포커 파티 테마, 카지노 나이트 살인, 도박 미스터리 파티, 카지노 엔터테인먼트, 베가스 테마 파티',
    language: 'ko',
    theme: 'Casino',
    status: 'published',
    reading_time: 14,
    author: 'Mystery Maker Party Team',
    tags: ['Casino', 'Las Vegas', 'Gambling', 'High Stakes'],
    published_at: new Date('2026-02-16T05:00:00Z').toISOString(),
    post_date: '2026-02-16'
  }])
  .select();

if (error) {
  console.error('Error inserting post 2:', error);
  process.exit(1);
}

console.log('✅ 2/5 - Casino post inserted successfully');
console.log('ID:', data[0].id);
console.log('Slug:', data[0].slug);
