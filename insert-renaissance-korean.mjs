import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const koreanContent = fs.readFileSync('renaissance-korean.txt', 'utf-8');

const { data, error } = await supabase
  .from('blog_posts')
  .insert([{
    title: '5가지 르네상스 살인 미스터리 파티 테마',
    slug: '5-르네상스-살인-미스터리-파티-테마',
    content: koreanContent,
    meta_description: '우아한 궁정 음모, 예술적 경쟁, 고귀한 배신이 있는 맞춤형 미스터리 배경으로 르네상스 시대로 여행하세요.',
    meta_keywords: '르네상스 살인 미스터리 테마, 르네상스 파티 계획, 궁정 음모 미스터리, 예술적 경쟁 파티, 귀족 가문 미스터리, 교황청 음모 테마, 상인 미스터리 파티, 르네상스 엔터테인먼트, 시대 미스터리 게임, 문화 살인 미스터리',
    language: 'ko',
    theme: 'Renaissance',
    status: 'published',
    reading_time: 14,
    author: 'Mystery Maker Party Team',
    tags: ['Renaissance', 'Historical', 'Cultural', 'Court Intrigue'],
    published_at: new Date('2026-02-16T05:00:00Z').toISOString(),
    post_date: '2026-02-16'
  }])
  .select();

if (error) {
  console.error('Error inserting Renaissance post:', error);
  process.exit(1);
}

console.log('✅ 5/5 - Renaissance post inserted successfully');
console.log('ID:', data[0].id);
console.log('Slug:', data[0].slug);
