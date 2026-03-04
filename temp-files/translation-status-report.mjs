import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w"
);

const languages = ['es', 'fr', 'de', 'ja', 'ko', 'zh-cn', 'pt', 'it', 'nl', 'da', 'sv', 'fi'];
const languageNames = {
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh-cn': 'Chinese (Simplified)',
  'pt': 'Portuguese',
  'it': 'Italian',
  'nl': 'Dutch',
  'da': 'Danish',
  'sv': 'Swedish',
  'fi': 'Finnish'
};

console.log('🌍 Translation Status Report\n');
console.log('Analyzing 47 optimized English posts across 12 languages...\n');

// Get all 47 optimized English posts
const { data: englishPosts, error } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('title');

if (error) {
  console.error('Error fetching English posts:', error);
  process.exit(1);
}

// Filter to only posts with E-E-A-T signals
const optimizedSlugs = [];
for (const post of englishPosts) {
  const { data: fullPost } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('slug', post.slug)
    .eq('language', 'en')
    .single();

  if (fullPost && fullPost.content.includes('*Published: February 16, 2026')) {
    optimizedSlugs.push(post.slug);
  }
}

console.log(`✅ Found ${optimizedSlugs.length} optimized English posts\n`);

const translationStatus = {};
let totalExisting = 0;
let totalMissing = 0;

for (const lang of languages) {
  translationStatus[lang] = {
    existing: 0,
    missing: 0,
    missingPosts: []
  };

  for (const slug of optimizedSlugs) {
    const { data: translation } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', lang)
      .single();

    if (translation) {
      translationStatus[lang].existing++;
      totalExisting++;
    } else {
      translationStatus[lang].missing++;
      translationStatus[lang].missingPosts.push(slug);
      totalMissing++;
    }
  }
}

console.log('📊 Translation Status by Language:\n');

for (const lang of languages) {
  const status = translationStatus[lang];
  const percentage = ((status.existing / optimizedSlugs.length) * 100).toFixed(1);

  console.log(`${languageNames[lang]} (${lang}):`);
  console.log(`  ✅ Existing: ${status.existing}/${optimizedSlugs.length} (${percentage}%)`);
  console.log(`  ❌ Missing: ${status.missing}/${optimizedSlugs.length}`);
  if (status.missing > 0 && status.missing <= 5) {
    console.log(`     Missing posts: ${status.missingPosts.join(', ')}`);
  }
  console.log('');
}

console.log('📈 Overall Translation Stats:');
console.log(`  Total translations needed: ${optimizedSlugs.length * languages.length} (${optimizedSlugs.length} posts × ${languages.length} languages)`);
console.log(`  ✅ Existing: ${totalExisting}`);
console.log(`  ❌ Missing: ${totalMissing}`);
console.log(`  Coverage: ${((totalExisting / (optimizedSlugs.length * languages.length)) * 100).toFixed(1)}%`);

console.log('\n💡 Recommendations:');
console.log('  1. Update existing translations with optimized content (E-E-A-T, stats, sources)');
console.log('  2. Create missing translations for complete coverage');
console.log('  3. Use AI translation service (Claude API, DeepL) for speed');
console.log('  4. Professional human review for quality assurance');

// Save report to file
import { writeFileSync } from 'fs';
const report = {
  date: new Date().toISOString(),
  optimizedPosts: optimizedSlugs.length,
  languages: languages.length,
  translationStatus,
  summary: {
    total: optimizedSlugs.length * languages.length,
    existing: totalExisting,
    missing: totalMissing,
    coverage: ((totalExisting / (optimizedSlugs.length * languages.length)) * 100).toFixed(1) + '%'
  }
};

writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/translation-status.json',
  JSON.stringify(report, null, 2)
);

console.log('\n💾 Report saved to: temp-files/translation-status.json');
