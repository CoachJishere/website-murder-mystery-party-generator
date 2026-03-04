import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(fs.readFileSync('temp-files/batch6-clean.json', 'utf8'));

// POST 26: Birthday Celebrations
const post26Content = fs.readFileSync('temp-files/post26-zh-cn.md', 'utf8');

const { data: data26, error: error26 } = await supabase
  .from('blog_posts')
  .insert({
    title: '生日庆典谋杀悬疑派对：让他们的特殊日子难以忘怀',
    slug: '生日庆典谋杀悬疑派对-让他们的特殊日子难以忘怀',
    content: post26Content,
    excerpt: '使用个性化的谋杀悬疑体验将里程碑式生日转变为难忘的庆典。从主题选择到完美执行的专家指南。',
    featured_image: posts[0].featured_image,
    category: posts[0].category,
    tags: posts[0].tags,
    language: 'zh-cn',
    published: true,
    meta_description: '为任何年龄段规划完美的生日谋杀悬疑派对。包括主题创意、定制技巧、预算策略以及为寿星创造难忘庆典的专家建议。',
    reading_time: '14 min read'
  })
  .select();

if (error26) {
  console.error('❌ Error inserting post 26:', error26);
} else {
  console.log('✅ 26/30 - 生日庆典谋杀悬疑派对');
}

// POST 27: Corporate Events - will add after this test
