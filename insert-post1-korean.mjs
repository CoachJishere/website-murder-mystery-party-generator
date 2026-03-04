import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const koreanContent = fs.readFileSync('post1-korean.txt', 'utf-8');

const { data, error } = await supabase
  .from('blog_posts')
  .insert([{
    title: '휴가를 잊지 못할 추억으로 만들어줄 5가지 해변 리조트 살인 미스터리 테마',
    slug: '5-해변-리조트-살인-미스터리-테마-잊지-못할-휴가-만들기',
    content: koreanContent,
    meta_description: '독점 섬 리조트, 예술적 경쟁, 고귀한 배신이 있는 우아한 궁정 음모로 르네상스 시대로 여행하세요.',
    meta_keywords: '해변 리조트 살인 미스터리, 열대 파티 테마, 섬 미스터리 파티, 해변 살인 미스터리, 리조트 엔터테인먼트, 휴가 파티 게임, 열대 미스터리 테마, 해변 파티 계획, 리조트 미스터리 게임, 해안 파티 아이디어',
    language: 'ko',
    theme: 'Beach Resort',
    status: 'published',
    reading_time: 14,
    author: 'Mystery Maker Party Team',
    tags: ['Beach Resort', 'Tropical', 'Island', 'Vacation'],
    published_at: new Date('2026-02-16T05:00:00Z').toISOString(),
    post_date: '2026-02-16'
  }])
  .select();

if (error) {
  console.error('Error inserting post 1:', error);
  process.exit(1);
}

console.log('✅ 1/5 - Beach Resort post inserted successfully');
console.log('ID:', data[0].id);
console.log('Slug:', data[0].slug);
