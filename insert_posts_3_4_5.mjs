import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Post 3: Haunted Mansion
const content3 = readFileSync('post3_haunted_zh.txt', 'utf-8');

const post3 = {
  title: "5个闹鬼宅邸谋杀悬疑主题",
  content: content3,
  slug: "5-ge-nao-gui-zhai-di-mou-sha-xuan-yi-zhu-ti",
  meta_description: "通过哥特式大厦环境和超自然转折探索闹鬼宅邸谋杀悬疑故事。",
  meta_keywords: "闹鬼宅邸悬疑, 哥特谋杀悬疑, 鬼屋派对, 恐怖悬疑主题, 超自然悬疑派对, 维多利亚哥特悬疑, 闹鬼谋杀游戏, 大厦悬疑创意, 哥特派对主题, 鬼魂悬疑派对",
  language: "zh-cn",
  theme: "Haunted/Gothic",
  status: "published",
  reading_time: 14,
  author: "Mystery Maker Party Team",
  tags: ["Haunted/Gothic"],
  published_at: new Date().toISOString(),
  post_date: new Date().toISOString().split('T')[0]
};

const { data: data3, error: error3 } = await supabase
  .from('blog_posts')
  .insert([post3])
  .select();

if (error3) {
  console.error('Error inserting post 3:', error3);
} else {
  console.log('✅ 3/5 - Haunted Mansion post inserted');
  console.log('Post ID:', data3[0].id);
}

console.log('\nPlease create post4_mountain_zh.txt and post5_renaissance_zh.txt files before continuing.');
