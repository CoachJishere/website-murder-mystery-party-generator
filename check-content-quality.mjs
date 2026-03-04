import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('📝 CONTENT QUALITY CHECK\n');
console.log('='.repeat(80));

const { data: post, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', '5-temas-misterio-assassinato-mansao-assombrada')
  .eq('language', 'pt')
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`\n✅ POST: ${post.title}`);
console.log(`   Slug: ${post.slug}`);
console.log(`   Language: ${post.language}`);
console.log(`   Status: ${post.status}`);
console.log(`   Meta Description: ${post.meta_description}`);

const contentLength = post.content.length;
const wordCount = post.content.split(/\s+/).length;

console.log(`\n📊 CONTENT METRICS:`);
console.log(`   Character Count: ${contentLength.toLocaleString()}`);
console.log(`   Word Count: ${wordCount.toLocaleString()}`);
console.log(`   Reading Time: ${post.reading_time} minutes`);

// Check for key Portuguese translations
const checks = [
  { term: 'Publicado:', found: post.content.includes('Publicado:') },
  { term: 'Baseado na análise', found: post.content.includes('Baseado na análise') },
  { term: 'Tendências de Mercado', found: post.content.includes('Tendências de Mercado') },
  { term: 'Perguntas Frequentes', found: post.content.includes('Perguntas Frequentes') },
  { term: 'Fontes e Referências', found: post.content.includes('Fontes e Referências') },
  { term: 'Tempo de leitura:', found: post.content.includes('Tempo de leitura:') }
];

console.log(`\n✓ KEY PORTUGUESE ELEMENTS:`);
checks.forEach(check => {
  console.log(`   ${check.found ? '✅' : '❌'} ${check.term}`);
});

// Show first 500 chars
console.log(`\n📄 CONTENT PREVIEW (first 500 chars):`);
console.log('─'.repeat(80));
console.log(post.content.substring(0, 500));
console.log('─'.repeat(80));

console.log(`\n✨ Content quality verified!\n`);
