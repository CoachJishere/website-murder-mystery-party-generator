import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('\n🎯 Completing Batch 3 (3 remaining posts)\n');

// Note: Trimmed content would be created manually with intelligent editing
// This script shows the IDs and word counts for reference

const posts = [
  { name: 'Steampunk', id: readFileSync('steampunk-id.txt', 'utf-8'), current: 3609, target: 2300 },
  { name: 'Jazz', current: 3524, target: 2300 },
  { name: 'Archaeological', current: 3470, target: 2300 }
];

for (const post of posts) {
  const toRemove = post.current - post.target;
  console.log(`${post.name}: ${post.current}w → ${post.target}w (${toRemove}w to remove)`);
}

console.log('\n📊 After Batch 3 completion:');
console.log('Total posts complete: 14/35');
console.log('Remaining: Batches 4-7 (21 posts)');
