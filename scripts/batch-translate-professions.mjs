import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Profession posts to translate
const professionPosts = [
  'journalist-murder-mystery-themes-investigative-reporters-deadly-stories',
  'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue',
  'medical-examiner-murder-mystery-themes-forensic-investigations',
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue',
  'villain-murder-mystery-themes-masterminds-killers-antagonists'
];

console.log('Fetching profession-themed posts for translation...\n');

for (const slug of professionPosts) {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, theme, reading_time')
    .eq('language', 'en')
    .eq('slug', slug)
    .single();
  
  if (post) {
    console.log(`- ${slug}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Theme: ${post.theme}`);
    console.log(`  Reading time: ${post.reading_time} min\n`);
  }
}

console.log(`Total: ${professionPosts.length} profession posts queued`);
