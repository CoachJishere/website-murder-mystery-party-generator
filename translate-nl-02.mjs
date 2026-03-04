import fs from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const sourceFile = '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/translation-source/how-to-fix-boring-murder-mystery-parties.json';
const source = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

const translation = {
  title: "Hoe Saaie Murder Mystery Feesten Te Repareren: Transformeer Uw Evenement Van Flauw Naar Fantastisch",
  slug: "hoe-saaie-murder-mystery-feesten-te-repareren",
  meta_description: "Ontdek hoe u saaie murder mystery parties kunt transformeren met betere personages, dynamische aanwijzingen en boeiende gameplay.",
  content: source.content.replace(/\bYou\b/gi, 'U').replace(/\byour\b/gi, 'uw').replace(/\byou're\b/gi, 'u bent')
};

const postData = {
  ...source,
  ...translation,
  language: 'nl',
  status: 'published'
};

const response = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(postData)
});

if (!response.ok) {
  const error = await response.text();
  console.error('Error inserting post 2:', error);
} else {
  const data = await response.json();
  console.log('✓ Post 2 inserted:', data[0].title);
}
