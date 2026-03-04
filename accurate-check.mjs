import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function check() {
  console.log('=== ACCURATE BATCH 36-40 CHECK ===\n');
  
  const searches = [
    { num: 36, term: 'spa-resort-moordmysterie', name: 'Spa Resort' },
    { num: 37, term: 'archeologische-opgraving-moordmysterie', name: 'Archaeological Dig' },
    { num: 38, term: 'circus-moordmysterie-plot', name: 'Circus' },
    { num: 39, term: 'film-noir-moordmysterie-plots', name: 'Film Noir' },
    { num: 40, term: 'middeleeuwse-moordmysterie-plot', name: 'Medieval' }
  ];
  
  for (const search of searches) {
    const { data } = await supabase
      .from('blog_posts')
      .select('title, slug, created_at')
      .eq('language', 'nl')
      .ilike('slug', `%${search.term}%`)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(`✅ ${search.num}/40 - ${search.name}`);
      console.log(`   ${data[0].title}`);
      console.log(`   ${data[0].slug}`);
      console.log(`   Created: ${data[0].created_at.split('T')[0]}\n`);
    } else {
      console.log(`❌ ${search.num}/40 - ${search.name} NOT FOUND\n`);
    }
  }
}

check();
