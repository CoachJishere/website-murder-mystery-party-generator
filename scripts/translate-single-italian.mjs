import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get post index from command line
const postIndex = parseInt(process.argv[2]) || 0;

async function main() {
  // Load remaining posts
  const posts = JSON.parse(
    readFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/remaining-posts-to-translate.json', 'utf-8')
  );

  if (postIndex >= posts.length) {
    console.log('Invalid post index');
    process.exit(1);
  }

  const post = posts[postIndex];

  console.log(`\nPost ${postIndex + 6}/47: ${post.title}`);
  console.log(`Slug: ${post.slug}\n`);

  // Save article to file for translation
  writeFileSync(
    '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/article_to_translate.json',
    JSON.stringify(post, null, 2)
  );

  console.log('Article saved to article_to_translate.json');
  console.log('\n✅ Ready for translation. Provide the Italian content back to insert.');
}

main();
