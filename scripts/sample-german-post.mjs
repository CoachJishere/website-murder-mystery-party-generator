import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get a sample German post
const { data } = await supabase
  .from('blog_posts')
  .select('slug, title, meta_description, content')
  .eq('slug', '5-spionage-thriller-krimi-dinner-themen-die-ihre-gaeste-in-die-undercover-arbeit-versetzen-werden')
  .single();

console.log('\n=== SAMPLE GERMAN POST (Post #6) ===\n');
console.log(`Slug: ${data.slug}\n`);
console.log(`Title: ${data.title}\n`);
console.log(`Meta: ${data.meta_description}\n`);
console.log(`Content preview (first 500 chars):\n${data.content.substring(0, 500)}...\n`);
console.log(`Total content length: ${data.content.length} characters\n`);

// Check for German E-E-A-T header
if (data.content.includes('*Veröffentlicht: 16. Februar 2026')) {
  console.log('✅ German E-E-A-T header confirmed');
}
if (data.content.includes('Mystery Maker Party Team')) {
  console.log('✅ Author attribution present');
}
if (data.content.includes('Nächste Überprüfung: 20. Mai 2026')) {
  console.log('✅ Review date in German');
}
