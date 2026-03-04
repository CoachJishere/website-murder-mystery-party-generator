import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔄 REPUBLISHING POSTS BY UPDATE DATE (Feb 2026)\n');
console.log('=' .repeat(80));

// The issue: Translations have old publish_at dates (2025) but were updated in Feb 2026
// Solution: Republish posts updated in Feb 2026, regardless of original publish_at

const OPTIMIZATION_START = '2026-02-15';
const OPTIMIZATION_END = '2026-02-26';

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

let totalRepublished = 0;

for (const lang of languages) {
  // Find posts updated in Feb 2026 that are currently draft
  const { data: draftPosts, error: findError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, updated_at')
    .eq('language', lang.code)
    .eq('status', 'draft')
    .gte('updated_at', OPTIMIZATION_START)
    .lte('updated_at', OPTIMIZATION_END);

  if (findError) {
    console.error(`❌ Error finding ${lang.name} posts:`, findError);
    continue;
  }

  if (draftPosts.length === 0) {
    console.log(`${lang.name.padEnd(12)}: ✅ No drafts to republish`);
    continue;
  }

  console.log(`\n${lang.name.padEnd(12)}: Republishing ${draftPosts.length} posts updated in Feb 2026...`);
  console.log(`  Sample posts:`);
  draftPosts.slice(0, 3).forEach(p => {
    const updateDate = new Date(p.updated_at).toISOString().split('T')[0];
    console.log(`    - [${updateDate}] ${p.slug.substring(0, 50)}...`);
  });

  // Republish them
  const postIds = draftPosts.map(p => p.id);

  const { data: updated, error: updateError } = await supabase
    .from('blog_posts')
    .update({ status: 'published' })
    .in('id', postIds)
    .select('id');

  if (updateError) {
    console.error(`  ❌ Error republishing:`, updateError);
    continue;
  }

  console.log(`  ✅ Republished ${updated.length} posts`);
  totalRepublished += updated.length;
}

console.log('\n\n📊 SUMMARY\n');
console.log('=' .repeat(80));
console.log(`Total posts republished: ${totalRepublished}`);
console.log(`Criteria: updated_at between ${OPTIMIZATION_START} and ${OPTIMIZATION_END}`);

// Verify current status
console.log('\n\n🔍 VERIFICATION: Current Published Counts\n');

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

  const count = published.length;
  const status = count === 47 ? '✅' :
                 count === 46 ? '🟡' :
                 count >= 40 ? '🟡' :
                 count < 20 ? '🔴' :
                 '🟢';

  const diff = count > 47 ? `(+${count - 47})` :
               count < 47 ? `(-${47 - count})` :
               '';

  console.log(`${lang.name.padEnd(12)}: ${String(count).padStart(2)} published ${status} ${diff}`);
}

console.log('\n✅ Republishing complete!');
