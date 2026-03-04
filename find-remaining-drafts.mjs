import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

const missingTopics = [
  'confusing-clues',
  'space-station',
  'innocent-bystander',
  'date-night',
  'school-reunion',
  'unsatisfying-endings',
  'archaeological',
  'non-participating',
  'dinner-party',
  'spa-resort'
];

async function main() {
  console.log('=== Searching for remaining French drafts ===\n');
  
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title,status&language=eq.fr&status=eq.draft&order=created_at.desc`;
  const response = await fetch(url, { headers });
  const drafts = await response.json();
  
  console.log(`Found ${drafts.length} remaining French drafts\n`);
  
  console.log('Looking for matches with missing topics:\n');
  
  for (const topic of missingTopics) {
    console.log(`\n${topic.toUpperCase()}:`);
    const matches = drafts.filter(d => {
      const slug = d.slug.toLowerCase();
      const title = d.title.toLowerCase();
      
      if (topic === 'confusing-clues') {
        return slug.includes('indices') || slug.includes('clue') || slug.includes('confus');
      }
      if (topic === 'space-station') {
        return (slug.includes('spatial') || slug.includes('espace') || slug.includes('station')) 
          && !slug.includes('gare'); // not train station
      }
      if (topic === 'innocent-bystander') {
        return slug.includes('innocent') || slug.includes('temoin') || slug.includes('bystander');
      }
      if (topic === 'date-night') {
        return slug.includes('couple') || slug.includes('date') || slug.includes('romantique');
      }
      if (topic === 'school-reunion') {
        return slug.includes('reunion') || slug.includes('ecole') || slug.includes('school');
      }
      if (topic === 'unsatisfying-endings') {
        return slug.includes('fin') || slug.includes('ending') || slug.includes('insatisfaisant');
      }
      if (topic === 'archaeological') {
        return slug.includes('archeolog') || slug.includes('fouille') || slug.includes('dig');
      }
      if (topic === 'non-participating') {
        return slug.includes('participent') || slug.includes('particip') || title.includes('ne participent');
      }
      if (topic === 'dinner-party') {
        return slug.includes('diner') || (slug.includes('dinner') && !slug.includes('game'));
      }
      if (topic === 'spa-resort') {
        return slug.includes('spa') || slug.includes('thermes');
      }
      
      return false;
    });
    
    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`  ✓ ${m.slug}`);
        console.log(`    ${m.title}`);
        console.log(`    ID: ${m.id}`);
      });
    } else {
      console.log(`  ✗ No match found`);
    }
  }
}

main().catch(console.error);
