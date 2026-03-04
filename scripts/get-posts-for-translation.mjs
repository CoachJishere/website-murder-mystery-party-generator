import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// List of posts we'll need to translate (excluding the first one already done)
const postsToTranslate = [
  'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
  'journalist-murder-mystery-themes-investigative-reporters-deadly-stories',
  'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue',
  'medical-examiner-murder-mystery-themes-forensic-investigations',
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue'
];

for (const slug of postsToTranslate) {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, slug, meta_description, reading_time, theme')
    .eq('language', 'en')
    .eq('slug', slug)
    .single();
  
  if (post) {
    console.log(`${post.slug} - ${post.title}`);
  }
}

console.log(`\nTotal posts queued: ${postsToTranslate.length}`);
