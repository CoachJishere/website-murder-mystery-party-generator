import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const translations = [
  {
    num: 21,
    slug: 'ru-he-ju-ban-zheng-qi-peng-ke-feng-ge-mou-sha-xuan-yi-pai-dui-wei-duo-li-ya-ke-huan-zui-an',
    title: '如何举办蒸汽朋克风格谋杀悬疑派对：维多利亚科幻罪案',
    meta_description: '用飞艇、发明家和机械奇迹打造维多利亚时代科幻谋杀悬疑冒险。',
    keywords: ['蒸汽朋克谋杀悬疑', '维多利亚科幻派对', '机械奇迹主题', '蒸汽朋克派对策划', '交互式蒸汽朋克体验']
  },
  {
    num: 22,
    slug: 'jue-shi-le-bu-mou-sha-xuan-yi-pai-dui-ce-hua-jin-ru-jin-jiu-shi-dai-zui-an',
    title: '爵士乐部谋杀悬疑派对策划：进入禁酒时代罪案',
    meta_description: '用烟雾弥漫的俱乐部谋杀悬疑派对进入爵士时代，包括音乐家、顾客和禁酒时代罪案。',
    keywords: ['爵士乐部谋杀悬疑', '禁酒时代派对', '1920年代主题', '地下酒吧悬疑', '爵士时代娱乐']
  },
  {
    num: 23,
    slug: 'ji-zhe-mou-sha-xuan-yi-zhu-ti-diao-cha-ji-zhe-jie-lu-zhi-ming-gu-shi',
    title: '记者谋杀悬疑主题：调查记者揭露致命故事',
    meta_description: '创建以记者角色为特色的谋杀悬疑，他们调查腐败、揭露秘密并追踪危险故事。生成定制的记者驱动调查。',
    keywords: ['记者谋杀悬疑', '调查记者主题', '新闻室悬疑派对', '记者角色', '媒体主题悬疑']
  },
  {
    num: 24,
    slug: 'lv-shi-mou-sha-xuan-yi-zhu-ti-fa-ting-ju-yu-fa-lv-yin-mou',
    title: '律师谋杀悬疑主题：法庭剧与法律阴谋',
    meta_description: '创建以律师角色为特色的谋杀悬疑，他们在法律伦理、法庭秘密和职业竞争中穿梭。生成定制的法律惊悚场景。',
    keywords: ['律师谋杀悬疑', '法庭剧派对', '法律惊悚主题', '律师角色', '法律主题悬疑']
  },
  {
    num: 25,
    slug: 'fa-yi-mou-sha-xuan-yi-zhu-ti-fa-yi-zhuan-jia-po-an',
    title: '法医谋杀悬疑主题：法医专家破案',
    meta_description: '创建以法医角色为特色的谋杀悬疑，使用法医专业知识解决罪案。生成带有科学线索的定制尸检驱动调查。',
    keywords: ['法医谋杀悬疑', '法医科学主题', 'CSI风格派对', '尸检主题', '法医调查']
  }
];

// Check existing to avoid duplicates
for (const translation of translations) {
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('slug', translation.slug)
    .eq('language', 'zh-cn')
    .single();
  
  if (existing) {
    console.log(`⏭️  ${translation.num}/25 - Already exists: ${translation.slug}`);
    continue;
  }
  
  console.log(`Processing ${translation.num}/25...`);
}

console.log('\n✅ Batch 5 check complete!');
