import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('translate_post2_casino.txt', 'utf-8');

const post = {
  title: "5个赌场谋杀悬疑派对主题：为致命的高风险戏剧掷骰子",
  content: content,
  slug: "5-ge-du-chang-mou-sha-xuan-yi-pai-dui-zhu-ti-tou-zhi-tou-zi-zhi-ming-gao-feng-xian-xi-ju",
  meta_description: "通过以赌徒、荷官和致命赌注为特色的高风险赌场谋杀悬疑派对掷骰子冒险。",
  meta_keywords: "赌场谋杀悬疑, 赌博谋杀悬疑, 高风险悬疑派对, 赌场派对主题, 扑克谋杀悬疑, 赌场悬疑策划, 赌博派对创意, 赌场犯罪悬疑, 二十一点谋杀悬疑, 赌场派对娱乐",
  language: "zh-cn",
  theme: "Casino",
  status: "published",
  reading_time: 14,
  author: "Mystery Maker Party Team",
  tags: ["Casino"],
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

console.log('✅ 2/5 - Casino post inserted successfully');
console.log('Post ID:', data[0].id);
