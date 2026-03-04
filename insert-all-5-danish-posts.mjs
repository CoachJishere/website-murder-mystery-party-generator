import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(fs.readFileSync('batch4-da-posts.json', 'utf-8'));

// Danish translations for all 5 posts
const danishPosts = [
  {
    // Post 16
    original: posts[0],
    title: 'Sådan løser du gæster der bryder karakteren: Hold din mordmysteriefest fordybende',
    slug: 'saadan-loeser-du-gaester-der-bryder-karakteren-hold-din-mordmysteriefest-fordybende',
    meta_description: 'Lær at holde gæsterne fordybede i deres karakterer med ekspertstrategier til karakterdesign, miljøoptimering og elegant håndtering af karakterbrud.',
    reading_time: 12,
    content_file: 'da-post-16-content.txt'
  },
  {
    // Post 17
    original: posts[1],
    title: 'Sådan holder du en eventyr-mordmysteriefest: Der var engang en forbrydelse',
    slug: 'saadan-holder-du-en-eventyr-mordmysteriefest-der-var-engang-en-forbrydelse',
    meta_description: 'Skab en magisk eventyr-mordmysteriefest med tilpassede karakterer, forheksede miljøer og klassiske historievendinger der begejstrer alle aldre.',
    reading_time: 13,
    content_file: 'da-post-17-content.txt'
  },
  {
    // Post 18
    original: posts[2],
    title: 'Sådan holder du en Hollywood-mordmysteriefest',
    slug: 'saadan-holder-du-en-hollywood-mordmysteriefest',
    meta_description: 'Planlæg den ultimative Hollywood-mordmysteriefest med glamourøse karakterer, den gyldne tidsalders stil og filmstudioets intriger.',
    reading_time: 10,
    content_file: 'da-post-18-content.txt'
  },
  {
    // Post 19
    original: posts[3],
    title: 'Middelalderlig mordmysteriefest: Trin-for-trin guide',
    slug: 'middelalderlig-mordmysteriefest-trin-for-trin-guide',
    meta_description: 'Mestre kunsten at afholde en middelalderlig slotsmordmysteriefest med kongelige intriger, riddere, adelsmænd og middelalderlig atmosfære.',
    reading_time: 9,
    content_file: 'da-post-19-content.txt'
  },
  {
    // Post 20
    original: posts[4],
    title: 'Sådan holder du en forbudstids-mordmysteriefest: Smugle dig til spænding',
    slug: 'saadan-holder-du-en-forbudstids-mordmysteriefest-smugle-dig-til-spaending',
    meta_description: 'Planlæg en autentisk 1920\'erne forbudstids-mordmysteriefest komplet med speakeasies, gangstere, jazz og smuglerens charme.',
    reading_time: 10,
    content_file: 'da-post-20-content.txt'
  }
];

console.log('Danish post mappings ready for all 5 posts (16-20)');
console.log('\nNOTE: Due to the large size of each post (16K-27K chars),');
console.log('the full Danish content for each post needs to be created in separate content files.');
console.log('\nReady to insert when content files are created.');

// Export for use
export { danishPosts };
