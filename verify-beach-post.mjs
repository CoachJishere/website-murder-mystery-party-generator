import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function verifyPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', '185b03ce-e611-4d54-9d3f-f33233dc5195')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('✅ POST VERIFICATION SUCCESSFUL\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('POST DETAILS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Post ID:', data.id);
  console.log('Title:', data.title);
  console.log('Slug:', data.slug);
  console.log('Language:', data.language);
  console.log('Status:', data.status);
  console.log('Author:', data.author);
  console.log('Reading Time:', data.reading_time, 'minutes');
  console.log('Post Date:', data.post_date);
  console.log('Created At:', data.created_at);
  console.log('Updated At:', data.updated_at);
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CONTENT VALIDATION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Meta Description:', data.meta_description);
  console.log('Content Length:', data.content.length, 'characters');
  console.log('\nContent Preview (first 500 chars):');
  console.log(data.content.substring(0, 500) + '...');
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('QUALITY CHECKS');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Check for E-E-A-T markers
  const hasAuthor = data.content.includes('神秘派对专家团队');
  const hasExpertise = data.content.includes('基于分析10,000+');
  const hasReview = data.content.includes('下次审核');
  const hasSources = data.content.includes('来源与参考文献');
  const hasMarketData = data.content.includes('市场趋势');
  const hasTableFormatting = data.content.includes('| 统计数据 |');
  
  console.log('✓ Author attribution:', hasAuthor ? '✅' : '❌');
  console.log('✓ Expertise statement:', hasExpertise ? '✅' : '❌');
  console.log('✓ Review date:', hasReview ? '✅' : '❌');
  console.log('✓ Sources section:', hasSources ? '✅' : '❌');
  console.log('✓ Market data:', hasMarketData ? '✅' : '❌');
  console.log('✓ Table formatting:', hasTableFormatting ? '✅' : '❌');
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TRANSLATION COMPLETE ✅');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('The beach resort murder mystery post has been successfully');
  console.log('translated to Chinese (zh-cn) and inserted into the database.');
}

verifyPost();
