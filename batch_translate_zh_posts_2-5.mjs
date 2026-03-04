import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Simplified translation map for common patterns
const translations = {
  // Headers and dates
  '*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*': '*发布时间：2026年2月16日 | 更新时间：2026年2月20日 | 作者：Mystery Maker Party Team | 下次审核：2026年5月20日*',
  '*Based on analyzing 10,000+ murder mystery parties and': '*基于对10,000多个谋杀悬疑派对和',
  'research*': '研究的分析*',
  
  // Table headers
  '| Statistic | Value | Source |': '| 统计数据 | 数值 | 来源 |',
  
  // Common phrases
  '*Reading time:': '*阅读时间：',
  'minutes*': '分钟*',
  '## Sources & References': '## 来源与参考资料',
  
  // Months
  'February': '2月',
  'May': '5月'
};

// Post 2: Casino - Using machine translation API would be needed for full translation
// For this demo, I'll create the structure

const posts = [
  {
    num: 2,
    slug_en: '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
    slug_zh: '5-ge-du-chang-mou-sha-xuan-yi-pai-dui-zhu-ti-tou-zhi-tou-zi-zhi-ming-gao-feng-xian-xi-ju',
    title_zh: '5个赌场谋杀悬疑派对主题：为致命的高风险戏剧掷骰子',
    theme: 'Casino',
    meta_desc_zh: '通过以赌徒、荷官和致命赌注为特色的高风险赌场谋杀悬疑派对掷骰子冒险。',
    meta_keywords_zh: '赌场谋杀悬疑, 赌博谋杀悬疑, 高风险悬疑派对, 赌场派对主题, 扑克谋杀悬疑, 赌场悬疑策划, 赌博派对创意, 赌场犯罪悬疑, 二十一点谋杀悬疑, 赌场派对娱乐'
  },
  {
    num: 3,
    slug_en: '5-haunted-mansion-murder-mystery-themes',
    slug_zh: '5-ge-nao-gui-zhai-di-mou-sha-xuan-yi-zhu-ti',
    title_zh: '5个闹鬼宅邸谋杀悬疑主题',
    theme: 'Haunted/Gothic',
    meta_desc_zh: '通过哥特式大厦环境和超自然转折探索闹鬼宅邸谋杀悬疑故事。',
    meta_keywords_zh: '闹鬼宅邸悬疑, 哥特谋杀悬疑, 鬼屋派对, 恐怖悬疑主题, 超自然悬疑派对, 维多利亚哥特悬疑, 闹鬼谋杀游戏, 大厦悬疑创意, 哥特派对主题, 鬼魂悬疑派对'
  },
  {
    num: 4,
    slug_en: '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
    slug_zh: '5-ge-shan-di-xiao-wu-mou-sha-xuan-yi-zhu-ti-rang-nin-de-du-jia-nan-yi-wang-huai',
    title_zh: '5个山地小屋谋杀悬疑主题让您的度假难以忘怀',
    theme: 'Mountain/Lodge',
    meta_desc_zh: '通过雪困环境和与世隔绝的悬念发现山地小屋谋杀悬疑故事。',
    meta_keywords_zh: '山地小屋悬疑, 雪困悬疑, 冬季谋杀悬疑, 小屋派对主题, 山区度假悬疑, 荒野悬疑派对, 隔离悬疑主题, 冬季小屋派对, 山区犯罪悬疑, 度假小屋谋杀'
  },
  {
    num: 5,
    slug_en: '5-renaissance-murder-mystery-party-themes',
    slug_zh: '5-ge-wen-yi-fu-xing-mou-sha-xuan-yi-pai-dui-zhu-ti',
    title_zh: '5个文艺复兴谋杀悬疑派对主题',
    theme: 'Renaissance',
    meta_desc_zh: '探索充满艺术家、贵族和宫廷阴谋的文艺复兴谋杀悬疑派对主题。',
    meta_keywords_zh: '文艺复兴谋杀悬疑, 文艺复兴派对主题, 历史悬疑游戏, 文艺复兴娱乐, 宫廷阴谋悬疑, 文艺复兴服装派对, 意大利文艺复兴悬疑, 历史谋杀派对, 中世纪悬疑游戏, 文艺复兴宫廷戏剧'
  }
];

console.log('Note: Full translation requires Claude API or translation service.');
console.log('This script creates placeholder structure. Posts need manual translation.\n');

for (const post of posts) {
  console.log(`Post ${post.num}: ${post.title_zh}`);
  console.log(`  Slug: ${post.slug_zh}`);
  console.log(`  Theme: ${post.theme}\n`);
}

console.log('\n⚠️  ACTION REQUIRED: Full content translation needed for posts 2-5');
console.log('Each post is ~6000+ words and requires professional translation.\n');

