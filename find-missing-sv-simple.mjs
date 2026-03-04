import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(supabaseUrl, supabaseKey);

// Use the audit data instead
const auditData = JSON.parse(fs.readFileSync('translation-audit-full.json', 'utf8'));

// Get master posts (English originals)
const masterPosts = auditData.master.posts;

// Get Swedish translations
const svPosts = auditData.languages.sv.posts;

console.log('Master posts:', masterPosts.length);
console.log('Swedish translations:', svPosts.length);
console.log('Gap:', masterPosts.length - svPosts.length);

// Now fetch the full English post data for the 15 missing
// First identify which are missing - the audit should tell us via gap
// Let me look at the audit structure more carefully

// Get all post IDs/slugs from audit
const svTitles = new Set(svPosts.map(p => p.title.toLowerCase()));

// Find master posts without Swedish translation
const missing = masterPosts.filter(masterPost => {
  // Check if any Swedish post title is a translation of this master title
  // This is hard without knowing the translation...
  // Let's use the database approach instead
  return true; // temporary
});

// Better approach: Query database with explicit theme/slug matching
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('id, slug, title')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('slug');

const { data: svPostsDB } = await supabase
  .from('blog_posts')
  .select('id, slug, title')
  .eq('language', 'sv')
  .eq('status', 'published');

// Create a manual mapping based on known patterns
// Check specific posts manually
const knownSwedish = {};

svPostsDB.forEach(sv => {
  // Extract key theme words from Swedish title
  const title = sv.title.toLowerCase();
  
  if (title.includes('vilda västern')) knownSwedish['wild-west'] = sv;
  if (title.includes('skurk')) knownSwedish['villain'] = sv;
  if (title.includes('undervattens')) knownSwedish['underwater'] = sv;
  if (title.includes('tågstation')) knownSwedish['train-station'] = sv;
  if (title.includes('rymdkoloni')) knownSwedish['space-colony'] = sv;
  if (title.includes('skolåterträff')) knownSwedish['school-reunion'] = sv;
  if (title.includes('pirat')) knownSwedish['pirate'] = sv;
  if (title.includes('medeltida') && title.includes('unika')) knownSwedish['medieval-plot'] = sv;
  if (title.includes('film noir')) knownSwedish['film-noir'] = sv;
  if (title.includes('cirkus') && title.includes('unika')) knownSwedish['circus-plot'] = sv;
});

// Now find what's missing
const missingList = [];

enPosts.forEach(en => {
  const slug = en.slug;
  
  // Check known mappings
  if (slug.includes('wild-west') && !knownSwedish['wild-west']) missingList.push(en);
  else if (slug.includes('villain') && !knownSwedish['villain']) missingList.push(en);
  // etc...
});

console.log('\nKnown Swedish posts by theme:', Object.keys(knownSwedish).length);
console.log('Missing estimate:', 61 - 46, '= 15');

// Save for manual review
fs.writeFileSync('en-posts-list.json', JSON.stringify(enPosts, null, 2));
fs.writeFileSync('sv-posts-list.json', JSON.stringify(svPostsDB, null, 2));

console.log('\n✓ Saved en-posts-list.json and sv-posts-list.json for manual review');
console.log('Now checking audit file for definitive answer...');

// Check if audit has a "missing" or "gap" field
if (auditData.languages.sv.missing) {
  console.log('\nMissing posts from audit:', auditData.languages.sv.missing);
}

