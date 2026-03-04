import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w'
);

async function verifyCompletion() {
  console.log('=== Phase 3 Translation Verification ===\n');

  const languages = [
    { code: 'it', name: 'Italian', expected: 61 },
    { code: 'ja', name: 'Japanese', expected: 61 },
    { code: 'sv', name: 'Swedish', expected: 61 },
    { code: 'nl', name: 'Dutch', expected: 61 }
  ];

  let allComplete = true;

  for (const lang of languages) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title')
      .eq('language', lang.code);

    if (error) {
      console.error(`Error checking ${lang.name}:`, error);
      continue;
    }

    const count = data.length;
    const percentage = ((count / lang.expected) * 100).toFixed(1);
    const status = count === lang.expected ? '✓' : '✗';

    console.log(`${status} ${lang.name}: ${count}/${lang.expected} (${percentage}%)`);

    if (count !== lang.expected) {
      allComplete = false;
      console.log(`  Missing: ${lang.expected - count} posts`);
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allComplete) {
    console.log('🎉 PHASE 3 COMPLETE!');
    console.log('All 4 languages have 61/61 posts (100%)');
    console.log('\nPhase 3 Languages:');
    console.log('  ✓ Italian:  61/61 posts');
    console.log('  ✓ Japanese: 61/61 posts');
    console.log('  ✓ Swedish:  61/61 posts');
    console.log('  ✓ Dutch:    61/61 posts');
    console.log('\n🏆 Total: 244 posts across 4 languages');
  } else {
    console.log('⚠️  Phase 3 Incomplete');
    console.log('Some languages are missing posts.');
  }

  console.log('='.repeat(50) + '\n');

  // Show master English count for reference
  const { data: enData } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('language', 'en');

  console.log(`Master English posts: ${enData.length}`);
}

verifyCompletion().catch(console.error);
