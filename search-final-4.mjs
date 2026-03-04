import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

async function main() {
  console.log('=== Searching for final 4 missing topics ===\n');
  
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title&language=eq.fr&status=eq.draft&order=created_at.desc`;
  const response = await fetch(url, { headers });
  const drafts = await response.json();
  
  console.log(`Searching ${drafts.length} drafts...\n`);
  
  // DATE-NIGHT
  console.log('DATE-NIGHT (romantique, couple, amoureux):');
  const dateNight = drafts.filter(d => {
    const slug = d.slug.toLowerCase();
    const title = d.title.toLowerCase();
    return (slug.includes('couple') || slug.includes('romantique') || slug.includes('amoureux') ||
            title.includes('couple') || title.includes('romantique') || title.includes('amoureux') ||
            slug.includes('date') || title.includes('date'));
  });
  dateNight.slice(0, 5).forEach(d => console.log(`  ${d.slug}\n    ${d.title}\n    ID: ${d.id}\n`));
  
  // DINNER-PARTY
  console.log('\nDINNER-PARTY (dîner, repas, gastronomique):');
  const dinnerParty = drafts.filter(d => {
    const slug = d.slug.toLowerCase();
    const title = d.title.toLowerCase();
    return ((slug.includes('diner') || slug.includes('repas') || slug.includes('gastronomique') ||
             title.includes('dîner') || title.includes('repas') || title.includes('gastronomique')) &&
            !slug.includes('chef') && !slug.includes('cuisinier'));
  });
  dinnerParty.slice(0, 5).forEach(d => console.log(`  ${d.slug}\n    ${d.title}\n    ID: ${d.id}\n`));
  
  // ARCHAEOLOGICAL
  console.log('\nARCHAEOLOGICAL (archéologique, fouilles, site):');
  const archaeological = drafts.filter(d => {
    const slug = d.slug.toLowerCase();
    const title = d.title.toLowerCase();
    return (slug.includes('archeolog') || slug.includes('fouille') || slug.includes('excavation') ||
            title.includes('archéolog') || title.includes('fouille') || title.includes('excavation'));
  });
  archaeological.slice(0, 5).forEach(d => console.log(`  ${d.slug}\n    ${d.title}\n    ID: ${d.id}\n`));
  
  // SPA-RESORT
  console.log('\nSPA-RESORT (spa, thermes, bien-être, détente):');
  const spaResort = drafts.filter(d => {
    const slug = d.slug.toLowerCase();
    const title = d.title.toLowerCase();
    return (slug.includes('spa') || slug.includes('thermes') || slug.includes('bien-etre') ||
            title.includes('spa') || title.includes('thermes') || title.includes('bien-être') ||
            slug.includes('detente') || title.includes('détente'));
  });
  spaResort.slice(0, 5).forEach(d => console.log(`  ${d.slug}\n    ${d.title}\n    ID: ${d.id}\n`));
  
  console.log('\n=== BROAD SEARCH ===\n');
  
  // Look for any posts with "soirée" that might be dinner party related
  console.log('Posts with "soirée" but not already matched:');
  const soiree = drafts.filter(d => {
    const slug = d.slug.toLowerCase();
    const title = d.title.toLowerCase();
    return (slug.includes('soiree') || title.includes('soirée')) && 
           !slug.includes('mystere') &&
           (slug.includes('elegant') || slug.includes('gastronom') || title.includes('élégant'));
  });
  soiree.slice(0, 5).forEach(d => console.log(`  ${d.slug}\n    ${d.title}\n    ID: ${d.id}\n`));
}

main().catch(console.error);
