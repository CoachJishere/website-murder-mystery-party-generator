import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🧹 UNPUBLISHING OLD POSTS (before Feb 15, 2026)\n');
console.log('=' .repeat(80));

const CUTOFF_DATE = '2026-02-15';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-cn', name: 'Chinese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'da', name: 'Danish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'fi', name: 'Finnish' }
];

let totalUnpublished = 0;

for (const lang of languages) {
  // First, count how many will be affected
  const { data: oldPosts, error: countError } = await supabase
    .from('blog_posts')
    .select('id, slug, published_at')
    .eq('language', lang.code)
    .eq('status', 'published')
    .lt('published_at', CUTOFF_DATE);

  if (countError) {
    console.error(`❌ Error counting ${lang.name} posts:`, countError);
    continue;
  }

  if (oldPosts.length === 0) {
    console.log(`${lang.name} (${lang.code}): ✅ No old posts to unpublish`);
    continue;
  }

  console.log(`\n${lang.name} (${lang.code}): Unpublishing ${oldPosts.length} old posts...`);

  // Show sample of posts being unpublished
  console.log(`  Sample posts:`);
  oldPosts.slice(0, 3).forEach(post => {
    const date = new Date(post.published_at).toISOString().split('T')[0];
    console.log(`    - [${date}] ${post.slug.substring(0, 60)}...`);
  });

  // Unpublish them
  const { data: updated, error: updateError } = await supabase
    .from('blog_posts')
    .update({ status: 'draft' })
    .eq('language', lang.code)
    .eq('status', 'published')
    .lt('published_at', CUTOFF_DATE)
    .select('id');

  if (updateError) {
    console.error(`  ❌ Error unpublishing:`, updateError);
    continue;
  }

  console.log(`  ✅ Unpublished ${updated.length} posts`);
  totalUnpublished += updated.length;
}

console.log('\n\n📊 SUMMARY\n');
console.log('=' .repeat(80));
console.log(`Total posts unpublished: ${totalUnpublished}`);
console.log(`Cutoff date: ${CUTOFF_DATE}`);
console.log('\nAll posts published before Feb 15, 2026 are now DRAFT status.');
console.log('Only the core 47 optimized posts (Feb 2026) remain published.\n');

// Verify the cleanup
console.log('\n🔍 Verification: Current published post counts\n');

for (const lang of languages) {
  const { data: published, error } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('language', lang.code)
    .eq('status', 'published');

  if (error) {
    console.error(`Error verifying ${lang.name}:`, error);
    continue;
  }

  const status = published.length === 47 ? '✅' :
                 published.length < 47 ? `🟡 (${47 - published.length} missing)` :
                 `🔴 (${published.length - 47} extra)`;

  console.log(`${lang.name.padEnd(12)}: ${String(published.length).padStart(2)} published ${status}`);
}

console.log('\n✅ Cleanup complete!');
