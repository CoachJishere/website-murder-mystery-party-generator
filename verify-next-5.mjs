import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugsToCheck = [
  'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
  'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
  'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
  'how-to-host-a-hollywood-murder-mystery-party'
];

for (const slug of slugsToCheck) {
  // Check if Portuguese version exists (by looking for Portuguese slug patterns)
  const { data: ptCheck } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('language', 'pt')
    .like('slug', `%${slug.split('-').slice(0, 3).join('%')}%`);
  
  if (ptCheck && ptCheck.length > 0) {
    console.log(`✓ ${slug} → ${ptCheck[0].slug}`);
  } else {
    console.log(`✗ ${slug} → NEEDS TRANSLATION`);
  }
}
