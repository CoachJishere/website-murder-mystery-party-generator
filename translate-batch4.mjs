import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = [
  {
    id: '2aaee48f-eb45-4183-8340-f92616812fe2',
    titleZh: '如何举办童话谋杀悬疑派对：从此犯罪',
    slugZh: 'ru-he-ju-ban-tong-hua-mou-sha-xuan-yi-pai-dui-cong-ci-fan-zui',
    metaZh: '发现如何将经典童话变成迷人的谋杀悬疑体验。完整的角色、情节创意和装饰技巧，打造神奇而险恶的夜晚。'
  },
  {
    id: '3f26eea9-72c3-4694-ac17-0ca788dd5aaf',
    titleZh: '如何举办好莱坞谋杀悬疑派对',
    slugZh: 'ru-he-ju-ban-hao-lai-wu-mou-sha-xuan-yi-pai-dui',
    metaZh: '用这份全面的指南举办一场迷人的好莱坞主题谋杀悬疑派对。包括角色创意、装饰技巧和专家主持人策略。'
  },
  {
    id: 'e74da71a-bfea-4313-8251-1fbe92dcb2ac',
    titleZh: '中世纪谋杀悬疑派对：分步指南',
    slugZh: 'zhong-shi-ji-mou-sha-xuan-yi-pai-dui-fen-bu-zhi-nan',
    metaZh: '学习如何用我们详细的指南举办难忘的中世纪城堡谋杀悬疑派对，包括角色、装饰和游戏机制。'
  },
  {
    id: '6b610163-5a89-4a6d-90af-a24206c94bd2',
    titleZh: '如何举办禁酒令时代谋杀悬疑：走私您的方式到兴奋',
    slugZh: 'ru-he-ju-ban-jin-jiu-ling-shi-dai-mou-sha-xuan-yi-zou-si-nin-de-fang-shi-dao-xing-fen',
    metaZh: '用我们的专家指南举办迷人的禁酒令时代（1920年代）谋杀悬疑派对，包括角色、装饰、情节和主持人技巧。'
  }
];

async function translatePost(postData) {
  const { data: original, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postData.id)
    .single();

  if (error) throw error;

  console.log(`\nTranslating: ${original.title}`);

  const prompt = `Translate this murder mystery party blog post to Simplified Chinese (简体中文).

CRITICAL REQUIREMENTS:
1. Use SIMPLIFIED characters (简体字) NOT Traditional
2. Professional, formal written tone
3. Natural Chinese phrasing (not literal translation)
4. Proper measure words (量词)

FORMAT REQUIREMENTS:
- E-E-A-T line: *发布时间：2026年2月16日 | 更新时间：2026年2月20日 | 作者：Mystery Maker Party Team | 下次审核：2026年5月20日*
- Research line: *基于对10,000多个谋杀悬疑派对和[theme]研究的分析*
- Table headers: | 统计数据 | 数值 | 来源 |
- Reading time: 阅读时间：X分钟

Translate ALL content including:
- All sections and subsections
- All tables with Chinese headers
- All FAQs
- All examples and code blocks (translate comments/labels)
- All bullet points and lists

ORIGINAL CONTENT:
${original.content}

Return ONLY the translated content, nothing else.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const translatedContent = message.content[0].text;

  // Insert into database
  const { data: inserted, error: insertError } = await supabase
    .from('blog_posts')
    .insert({
      title: postData.titleZh,
      slug: postData.slugZh,
      content: translatedContent,
      meta_description: postData.metaZh,
      language: 'zh-cn',
      theme: original.theme,
      status: 'published',
      tags: original.tags,
      featured_image_url: original.featured_image_url,
      reading_time: original.reading_time || 12,
      author: original.author,
      published_at: new Date().toISOString(),
      post_date: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) throw insertError;

  console.log(`✅ Inserted: ${postData.slugZh}`);
  return inserted;
}

(async () => {
  try {
    for (let i = 0; i < posts.length; i++) {
      const result = await translatePost(posts[i]);
      console.log(`✅ ${17 + i}/20 - Complete`);

      // Small delay to avoid rate limits
      if (i < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log('\n🎉 All 5 posts translated!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
