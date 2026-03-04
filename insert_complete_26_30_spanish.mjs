import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// This script will be populated with full translations
// For now, let me create a template that fetches and prepares for translation

const postSlugs = [
  'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
  'how-to-host-a-hollywood-murder-mystery-party',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement'
];

async function insertAllSpanishPosts() {
  for (let i = 0; i < postSlugs.length; i++) {
    const slug = postSlugs[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Processing Post ${26 + i}: ${slug}`);
    console.log('='.repeat(80));

    // Fetch English post
    const { data: englishPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('language', 'en')
      .single();

    if (fetchError || !englishPost) {
      console.error(`❌ Error fetching ${slug}:`, fetchError);
      continue;
    }

    // Check if Spanish version already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', 'es')
      .single();

    if (existing) {
      console.log(`⚠️  Spanish version already exists, skipping...`);
      continue;
    }

    console.log(`📄 English post fetched: ${englishPost.title}`);
    console.log(`📝 Content length: ${englishPost.content.length} chars`);
    console.log(`\n⏳ Ready for translation...`);
    console.log(`   Title: ${englishPost.title}`);
    console.log(`   Excerpt length: ${englishPost.excerpt ? englishPost.excerpt.length : 0} chars`);
    console.log(`   Meta description: ${englishPost.meta_description}`);

    // We'll add the actual translations in the next step
    // For now, just report what we found
  }
}

insertAllSpanishPosts();
