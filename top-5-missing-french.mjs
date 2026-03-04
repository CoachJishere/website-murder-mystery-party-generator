import fs from 'fs';

const data = JSON.parse(fs.readFileSync('missing-french-posts.json', 'utf8'));

console.log('=== TOP 5 MISSING FRENCH TRANSLATIONS ===\n');
console.log(`Total English posts: ${data.summary.totalEnglish}`);
console.log(`Total French posts: ${data.summary.totalFrench}`);
console.log(`Missing translations (by slug match): ${data.summary.missingCount}`);
console.log(`\nNote: Actual difference is ${data.summary.totalEnglish - data.summary.totalFrench}, suggesting ${data.summary.missingCount - (data.summary.totalEnglish - data.summary.totalFrench)} French posts use fully translated slugs.\n`);

console.log('TOP 5 PRIORITY POSTS TO TRANSLATE:\n');
const top5 = data.missingPosts.slice(0, 5);
top5.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   ID: ${post.id}\n`);
});

const output = {
  summary: data.summary,
  note: `${data.summary.missingCount - (data.summary.totalEnglish - data.summary.totalFrench)} French posts likely use fully translated slugs`,
  top5Priority: top5
};

fs.writeFileSync('top-5-missing-french.json', JSON.stringify(output, null, 2));
console.log('✓ Saved to top-5-missing-french.json');
