import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Post 4: Mountain Lodge
const content4 = readFileSync('post4_mountain_zh.txt', 'utf-8');

const post4 = {
  title: "5个山地小屋谋杀悬疑主题让您的度假难以忘怀",
  content: content4,
  slug: "5-ge-shan-di-xiao-wu-mou-sha-xuan-yi-zhu-ti-rang-nin-de-du-jia-nan-yi-wang-huai",
  meta_description: "通过雪困环境和与世隔绝的悬念发现山地小屋谋杀悬疑故事。",
  meta_keywords: "山地小屋悬疑, 雪困悬疑, 冬季谋杀悬疑, 小屋派对主题, 山区度假悬疑, 荒野悬疑派对, 隔离悬疑主题, 冬季小屋派对, 山区犯罪悬疑, 度假小屋谋杀",
  language: "zh-cn",
  theme: "Mountain/Lodge",
  status: "published",
  reading_time: 14,
  author: "Mystery Maker Party Team",
  tags: ["Mountain/Lodge"],
  published_at: new Date().toISOString(),
  post_date: new Date().toISOString().split('T')[0]
};

const { data: data4, error: error4 } = await supabase
  .from('blog_posts')
  .insert([post4])
  .select();

if (error4) {
  console.error('Error inserting post 4:', error4);
  process.exit(1);
}

console.log('✅ 4/5 - Mountain Lodge post inserted');
console.log('Post ID:', data4[0].id);

// Post 5: Renaissance
const content5 = readFileSync('post5_renaissance_zh.txt', 'utf-8');

const post5 = {
  title: "5个文艺复兴谋杀悬疑派对主题",
  content: content5,
  slug: "5-ge-wen-yi-fu-xing-mou-sha-xuan-yi-pai-dui-zhu-ti",
  meta_description: "探索充满艺术家、贵族和宫廷阴谋的文艺复兴谋杀悬疑派对主题。",
  meta_keywords: "文艺复兴谋杀悬疑, 文艺复兴派对主题, 历史悬疑游戏, 文艺复兴娱乐, 宫廷阴谋悬疑, 文艺复兴服装派对, 意大利文艺复兴悬疑, 历史谋杀派对, 中世纪悬疑游戏, 文艺复兴宫廷戏剧",
  language: "zh-cn",
  theme: "Renaissance",
  status: "published",
  reading_time: 14,
  author: "Mystery Maker Party Team",
  tags: ["Renaissance"],
  published_at: new Date().toISOString(),
  post_date: new Date().toISOString().split('T')[0]
};

const { data: data5, error: error5 } = await supabase
  .from('blog_posts')
  .insert([post5])
  .select();

if (error5) {
  console.error('Error inserting post 5:', error5);
  process.exit(1);
}

console.log('✅ 5/5 - Renaissance post inserted');
console.log('Post ID:', data5[0].id);

console.log('\n🎉 ALL 5 POSTS COMPLETED! 🎉');
console.log('\nSummary:');
console.log('1. ✅ Beach Resort (海滨度假村)');
console.log('2. ✅ Casino (赌场)');
console.log('3. ✅ Haunted Mansion (闹鬼宅邸)');
console.log('4. ✅ Mountain Lodge (山地小屋)');
console.log('5. ✅ Renaissance (文艺复兴)');
