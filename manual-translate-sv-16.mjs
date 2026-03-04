import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load the prepared translation file
const data = JSON.parse(fs.readFileSync('sv-to-translate-16.json', 'utf8'));

console.log('Post 16 ready for translation:');
console.log('Title:', data.original.title);
console.log('Content length:', data.original.content.length, 'chars');
console.log('\nSwedish metadata ready:');
console.log('Title:', data.swedish.title);
console.log('Slug:', data.swedish.slug);
console.log('\nPlease provide the complete Swedish translation content...');
console.log('(This script expects manual input)');
