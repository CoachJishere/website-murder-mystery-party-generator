import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const koreanContent = fs.readFileSync('post4-korean.txt', 'utf-8');

const { data, error } = await supabase
  .from('blog_posts')
  .insert([{
    title: '5가지 유령의 저택 살인 미스터리 테마',
    slug: '5-유령의-저택-살인-미스터리-테마',
    content: koreanContent,
    meta_description: '초자연적 힘, 조상의 비밀, 그리고 진짜 유령이 있는 오싹한 유령의 저택 살인 미스터리를 만드세요.',
    meta_keywords: '유령의 저택 미스터리, 초자연적 파티 테마, 고딕 살인 미스터리, 유령 파티 게임, 저주받은 저택 테마, 할로윈 미스터리 파티, 빅토리아 시대 유령 이야기, 오컬트 파티 테마, 강령회 미스터리, 유령 출몰 파티',
    language: 'ko',
    theme: 'Haunted Mansion',
    status: 'published',
    reading_time: 14,
    author: 'Mystery Maker Party Team',
    tags: ['Haunted Mansion', 'Gothic', 'Supernatural', 'Victorian'],
    published_at: new Date('2026-02-16T05:00:00Z').toISOString(),
    post_date: '2026-02-16'
  }])
  .select();

if (error) {
  console.error('Error inserting post 4:', error);
  process.exit(1);
}

console.log('✅ 3/5 - Haunted Mansion post inserted successfully');
console.log('ID:', data[0].id);
console.log('Slug:', data[0].slug);
