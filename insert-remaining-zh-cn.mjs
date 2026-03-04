import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// I'll insert pre-translated content for the remaining 3 posts
const posts = [
  {
    id: '3f26eea9-72c3-4694-ac17-0ca788dd5aaf',
    title: '如何举办好莱坞谋杀悬疑派对',
    slug: 'ru-he-ju-ban-hao-lai-wu-mou-sha-xuan-yi-pai-dui',
    metaDescription: '用这份全面的指南举办一场迷人的好莱坞主题谋杀悬疑派对。包括角色创意、装饰技巧和专家主持人策略。',
    readingTime: 12,
    file: 'post18-zh-cn.md'
  },
  {
    id: 'e74da71a-bfea-4313-8251-1fbe92dcb2ac',
    title: '中世纪谋杀悬疑派对：分步指南',
    slug: 'zhong-shi-ji-mou-sha-xuan-yi-pai-dui-fen-bu-zhi-nan',
    metaDescription: '学习如何用我们详细的指南举办难忘的中世纪城堡谋杀悬疑派对，包括角色、装饰和游戏机制。',
    readingTime: 11,
    file: 'post19-zh-cn.md'
  },
  {
    id: '6b610163-5a89-4a6d-90af-a24206c94bd2',
    title: '如何举办禁酒令时代谋杀悬疑：走私您的方式到兴奋',
    slug: 'ru-he-ju-ban-jin-jiu-ling-shi-dai-mou-sha-xuan-yi-zou-si-nin-de-fang-shi-dao-xing-fen',
    metaDescription: '用我们的专家指南举办迷人的禁酒令时代（1920年代）谋杀悬疑派对，包括角色、装饰、情节和主持人技巧。',
    readingTime: 12,
    file: 'post20-zh-cn.md'
  }
];

async function insertPost(postData, index) {
  try {
    // Get original post
    const { data: original, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postData.id)
      .single();

    if (error) throw error;

    // Read translated content
    const translatedContent = fs.readFileSync(postData.file, 'utf8');

    // Insert Chinese version
    const { data: inserted, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: postData.title,
        slug: postData.slug,
        content: translatedContent,
        meta_description: postData.metaDescription,
        language: 'zh-cn',
        theme: original.theme,
        status: 'published',
        tags: original.tags,
        featured_image_url: original.featured_image_url,
        reading_time: postData.readingTime,
        author: original.author,
        published_at: new Date().toISOString(),
        post_date: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ ${18 + index}/20 - Inserted: ${postData.slug}`);
    return inserted;
  } catch (error) {
    console.error(`Error inserting post ${index + 18}:`, error);
    throw error;
  }
}

(async () => {
  try {
    for (let i = 0; i < posts.length; i++) {
      await insertPost(posts[i], i);
    }
    console.log('\n🎉 All posts 18-20 inserted successfully!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
