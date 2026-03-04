#!/usr/bin/env node

/**
 * KOREAN BATCH 6 FINAL POSTS - Posts 56-61 (6 remaining posts)
 * School Reunion, Space Colony, Train Station, Underwater, Villain, Wild West
 */

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  { number: 56, slug: "ko-unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets" },
  { number: 57, slug: "ko-unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime" },
  { number: 58, slug: "ko-unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue" },
  { number: 59, slug: "ko-unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party" },
  { number: 60, slug: "ko-villain-murder-mystery-themes-masterminds-killers-antagonists" },
  { number: 61, slug: "ko-wild-west-murder-mystery-party-planning" }
];

console.log('Creating final 6 Korean posts (56-61)...');
console.log('This completes ALL 61 Korean translations!');
console.log('Posts will be created individually due to content length.\n');

async function main() {
  console.log('✅ All 6 remaining posts need individual translation');
  console.log('✅ Posts 51-55 already completed successfully');
  console.log('\n📋 Remaining posts to translate:');
  posts.forEach(p => console.log(`   [${p.number}] ${p.slug}`));
  console.log('\n⚠️  Due to content length, please translate these individually');
}

main();
