import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('post1_zh.txt', 'utf-8');

const post = {
  title: "5个海滨度假村谋杀悬疑主题让您的假期难以忘怀",
  content: content,
  slug: "5-ge-hai-bin-du-jia-cun-mou-sha-xuan-yi-zhu-ti-rang-nin-de-jia-qi-nan-yi-wang-huai",
  meta_description: "通过以度假村员工和度假恶棍为特色的热带海滨谋杀悬疑派对享受阳光和悬念。",
  meta_keywords: "海滨度假村谋杀悬疑, 热带谋杀悬疑派对, 海边谋杀悬疑, 度假村谋杀悬疑主题, 海滩派对谋杀悬疑, 海岸客栈悬疑故事, 冲浪旅舍悬疑故事, 海岛度假村悬疑故事, 度假谋杀悬疑, 热带派对游戏",
  language: "zh-cn",
  theme: "Beach/Tropical",
  status: "published",
  reading_time: 14,
  author: "Mystery Maker Party Team",
  tags: ["Beach/Tropical"],
  published_at: new Date().toISOString(),
  post_date: new Date().toISOString().split('T')[0]
};

const { data, error } = await supabase
  .from('blog_posts')
  .insert([post])
  .select();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ 1/5 - Beach Resort post inserted successfully');
console.log('Post ID:', data[0].id);
