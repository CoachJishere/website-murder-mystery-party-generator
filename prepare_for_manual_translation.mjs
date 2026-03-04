import fs from 'fs';

// Create a summary file that shows what needs to be translated
const posts = [
  { num: 32, theme: 'Graduation' },
  { num: 33, theme: 'Holiday' },
  { num: 34, theme: 'Office/Corporate' },
  { num: 35, theme: 'Small Groups' },
  { num: 36, theme: 'Teenagers' }
];

console.log('Creating translation preparation files...\n');

for (const post of posts) {
  const englishData = JSON.parse(
    fs.readFileSync(`/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/post-${post.num}-en.json`, 'utf8')
  );
  
  const summary = {
    postNum: post.num,
    theme: post.theme,
    englishTitle: englishData.title,
    englishSlug: englishData.slug,
    contentLength: englishData.content.length,
    readingTime: englishData.reading_time,
    wordCount: englishData.content.split(/\s+/).length
  };
  
  console.log(`Post ${post.num} (${post.theme}):`);
  console.log(`  Title: ${summary.englishTitle}`);
  console.log(`  Content: ${summary.contentLength} chars, ~${summary.wordCount} words`);
  console.log(`  Reading time: ${summary.readingTime} minutes\n`);
}

console.log('\n✓ All posts ready for translation');
