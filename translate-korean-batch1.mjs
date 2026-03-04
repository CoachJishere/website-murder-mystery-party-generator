import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  {
    id: 'be481778-58da-40d0-a79f-c4fa969b2240',
    slug: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
    newSlug: '5-해변-리조트-살인-미스터리-테마-잊지-못할-휴가-만들기'
  },
  {
    id: 'd4aabf6d-616f-4bde-82bb-8bb10954e12d',
    slug: '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
    newSlug: '5-카지노-살인-미스터리-파티-테마-치명적인-고위험-드라마'
  },
  {
    id: '27922634-1045-4b0e-9384-69806af8aed0',
    slug: '5-haunted-carnival-murder-mystery-themes-creepy-circus-adventures-for-unforgettable-parties',
    newSlug: '5-유령-카니발-살인-미스터리-테마-으스스한-서커스-모험'
  },
  {
    id: 'e1e641e1-6202-4936-b856-ba63adaaf26a',
    slug: '5-haunted-mansion-murder-mystery-themes',
    newSlug: '5-유령의-저택-살인-미스터리-테마'
  },
  {
    id: 'a0ab637f-a1a5-48af-a6af-add9e4753e35',
    slug: '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
    newSlug: '5-산장-살인-미스터리-테마-잊지-못할-휴양지-만들기'
  }
];

// Fetch first post to translate
const { data: post1, error: err1 } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('id', posts[0].id)
  .single();

if (err1) {
  console.error('Error fetching post 1:', err1);
  process.exit(1);
}

fs.writeFileSync('post1-english.txt', post1.content);
console.log('Saved post 1 English content to post1-english.txt');
console.log(`Length: ${post1.content.length} characters`);
console.log(`Title: ${post1.title}`);
