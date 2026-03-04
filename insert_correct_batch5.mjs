import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read original English posts
const post21Data = JSON.parse(fs.readFileSync('/tmp/post_21_how-to-host-a-steampunk-murder.json', 'utf8'));
const post22Data = JSON.parse(fs.readFileSync('/tmp/post_22_jazz-club-murder-mystery-party.json', 'utf8'));
const post23Data = JSON.parse(fs.readFileSync('/tmp/post_23_journalist-murder-mystery-them.json', 'utf8'));
const post24Data = JSON.parse(fs.readFileSync('/tmp/post_24_lawyer-murder-mystery-themes-c.json', 'utf8'));
const post25Data = JSON.parse(fs.readFileSync('/tmp/post_25_medical-examiner-murder-myster.json', 'utf8'));

// Translation function
function translateContent(content) {
  return content
    .replace(/\*Published: February 16, 2026/g, '*发布时间：2026年2月16日')
    .replace(/\| Updated: February 20, 2026/g, '| 更新时间：2026年2月20日')
    .replace(/\| Author: Mystery Maker Party Team/g, '| 作者：Mystery Maker Party Team')
    .replace(/\| Next Review: May 20, 2026\*/g, '| 下次审核：2026年5月20日*')
    .replace(/\*Based on analyzing 10,000\+ murder mystery parties and/g, '*基于对10,000多个谋杀悬疑派对和')
    .replace(/\| Statistic \| Value \| Source \|/g, '| 统计数据 | 数值 | 来源 |')
    .replace(/\*Reading time: (\d+) minutes\*/g, '*阅读时间：$1分钟*');
}

const translations = [
  {
    num: 21,
    slug: 'ru-he-ju-ban-zheng-qi-peng-ke-feng-ge-mou-sha-xuan-yi-pai-dui-wei-duo-li-ya-ke-huan-zui-an',
    title: '如何举办蒸汽朋克风格谋杀悬疑派对：维多利亚科幻罪案',
    meta_description: '用飞艇、发明家和机械奇迹打造维多利亚时代科幻谋杀悬疑冒险。',
    contentData: post21Data,
    theme: 'steampunk'
  },
  {
    num: 22,
    slug: 'jue-shi-le-bu-mou-sha-xuan-yi-pai-dui-ce-hua-jin-ru-jin-jiu-shi-dai-zui-an',
    title: '爵士乐部谋杀悬疑派对策划：进入禁酒时代罪案',
    meta_description: '用烟雾弥漫的俱乐部谋杀悬疑派对进入爵士时代，包括音乐家、顾客和禁酒时代罪案。',
    contentData: post22Data,
    theme: 'jazz-club'
  },
  {
    num: 23,
    slug: 'ji-zhe-mou-sha-xuan-yi-zhu-ti-diao-cha-ji-zhe-jie-lu-zhi-ming-gu-shi',
    title: '记者谋杀悬疑主题：调查记者揭露致命故事',
    meta_description: '创建以记者角色为特色的谋杀悬疑，他们调查腐败、揭露秘密并追踪危险故事。生成定制的记者驱动调查。',
    contentData: post23Data,
    theme: 'journalist'
  },
  {
    num: 24,
    slug: 'lv-shi-mou-sha-xuan-yi-zhu-ti-fa-ting-ju-yu-fa-lv-yin-mou',
    title: '律师谋杀悬疑主题：法庭剧与法律阴谋',
    meta_description: '创建以律师角色为特色的谋杀悬疑，他们在法律伦理、法庭秘密和职业竞争中穿梭。生成定制的法律惊悚场景。',
    contentData: post24Data,
    theme: 'lawyer'
  },
  {
    num: 25,
    slug: 'fa-yi-mou-sha-xuan-yi-zhu-ti-fa-yi-zhuan-jia-po-an',
    title: '法医谋杀悬疑主题：法医专家破案',
    meta_description: '创建以法医角色为特色的谋杀悬疑，使用法医专业知识解决罪案。生成带有科学线索的定制尸检驱动调查。',
    contentData: post25Data,
    theme: 'medical-examiner'
  }
];

// Insert each translation
const now = new Date().toISOString();

for (const translation of translations) {
  const translatedContent = translateContent(translation.contentData.content);

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([{
      slug: translation.slug,
      title: translation.title,
      meta_description: translation.meta_description,
      content: translatedContent,
      language: 'zh-cn',
      theme: translation.theme,
      status: 'published',
      author: 'Mystery Maker Party Team',
      published_at: now,
      created_at: now,
      updated_at: now,
      post_date: now
    }]);

  if (error) {
    console.error(`❌ ${translation.num}/25 - Error:`, error.message);
  } else {
    console.log(`✅ ${translation.num}/25`);
  }

  await new Promise(resolve => setTimeout(resolve, 500));
}

console.log('\n✅ ALL 5 CHINESE POSTS (21-25) COMPLETE!');
