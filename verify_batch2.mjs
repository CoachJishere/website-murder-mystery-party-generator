import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const expectedSlugs = [
  '5-ge-jian-die-jing-song-mou-sha-xuan-yi-zhu-ti-rang-nin-de-ke-ren-jin-xing-mi-mi-xing-dong',
  '5-ge-fu-gu-ma-xi-tuan-mou-sha-xuan-yi-zhu-ti-zou-jin-da-peng-che-xia-de-yin-mou',
  'gu-ai-ji-mou-sha-xuan-yi-pai-dui-zhi-nan',
  'yi-shu-hua-lang-mou-sha-xuan-yi-pai-dui-ce-hua-chuang-zao-jing-zhi-chuang-yi-fan-zui',
  'shu-dian-mou-sha-xuan-yi-pai-dui-ce-hua-fan-kai-wen-xue-mou-sha-de-shu-ye'
];

console.log('Verifying Batch 2 Chinese posts (posts 6-10)...\n');

for (let i = 0; i < expectedSlugs.length; i++) {
  const slug = expectedSlugs[i];
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, language, reading_time')
    .eq('slug', slug)
    .eq('language', 'zh-cn')
    .single();
  
  if (error) {
    console.log(`❌ Post ${i + 6}/10: NOT FOUND - ${slug}`);
  } else {
    console.log(`✅ Post ${i + 6}/10: ${data.title.substring(0, 50)}...`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Reading time: ${data.reading_time} min\n`);
  }
}

console.log('Verification complete!');
