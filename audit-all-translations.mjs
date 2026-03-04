import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch all English published posts
const { data: enPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('id, title, slug')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('id', { ascending: true });

if (enError) {
  console.error('Error fetching English posts:', enError);
  process.exit(1);
}

console.log(`\n${'='.repeat(70)}`);
console.log(`TRANSLATION AUDIT REPORT - ${new Date().toISOString().split('T')[0]}`);
console.log(`${'='.repeat(70)}`);
console.log(`\nMASTER: English (en) - ${enPosts.length} published posts`);
console.log(`${'='.repeat(70)}\n`);

// Languages to audit
const languages = ['de', 'fr', 'es', 'it', 'pt', 'nl', 'da', 'sv', 'fi', 'zh', 'zh-cn', 'ja', 'ko'];

const auditResults = {
  auditDate: new Date().toISOString(),
  master: { 
    language: 'en', 
    total: enPosts.length, 
    posts: enPosts.map(p => ({ id: p.id, slug: p.slug, title: p.title }))
  },
  languages: {}
};

// Detailed results for each language
for (const lang of languages) {
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug')
    .eq('language', lang)
    .eq('status', 'published')
    .order('id', { ascending: true });

  const total = posts?.length || 0;
  const gap = enPosts.length - total;
  const coverage = enPosts.length > 0 ? (total / enPosts.length * 100).toFixed(1) : '0.0';

  const status = parseFloat(coverage) === 100 ? '✅' : parseFloat(coverage) >= 75 ? '⚠️ ' : '❌';
  
  console.log(`${status} ${lang.toUpperCase().padEnd(6)} │ ${String(total).padStart(2)}/${enPosts.length} posts │ ${coverage.padStart(5)}% │ Gap: ${gap >= 0 ? '+' : ''}${gap}`);

  auditResults.languages[lang] = {
    total,
    coverage: parseFloat(coverage),
    gap,
    posts: posts?.map(p => ({ id: p.id, slug: p.slug, title: p.title })) || []
  };
}

// Save detailed JSON
fs.writeFileSync('translation-audit-full.json', JSON.stringify(auditResults, null, 2));

// Summary section
console.log(`\n${'='.repeat(70)}`);
console.log(`SUMMARY`);
console.log(`${'='.repeat(70)}\n`);

const sorted = Object.entries(auditResults.languages)
  .sort((a, b) => b[1].coverage - a[1].coverage);

console.log(`Languages at 100% coverage: ${sorted.filter(([_, d]) => d.coverage === 100).length}`);
console.log(`Languages at 75%+ coverage: ${sorted.filter(([_, d]) => d.coverage >= 75).length}`);
console.log(`Languages below 75% coverage: ${sorted.filter(([_, d]) => d.coverage < 75).length}`);

console.log(`\nTop performers:`);
sorted.slice(0, 3).forEach(([lang, data], i) => {
  console.log(`  ${i + 1}. ${lang.toUpperCase()}: ${data.total}/${enPosts.length} (${data.coverage}%)`);
});

console.log(`\nNeed attention (largest gaps):`);
const byGap = sorted.sort((a, b) => b[1].gap - a[1].gap);
byGap.slice(0, 3).forEach(([lang, data], i) => {
  console.log(`  ${i + 1}. ${lang.toUpperCase()}: missing ${data.gap} posts (${data.coverage}% complete)`);
});

console.log(`\n${'='.repeat(70)}`);
console.log(`Full audit data saved to: translation-audit-full.json`);
console.log(`${'='.repeat(70)}\n`);
