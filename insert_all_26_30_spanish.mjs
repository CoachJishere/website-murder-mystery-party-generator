import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  {
    number: 26,
    title: "Cómo Arreglar Finales de Misterio Insatisfactorios: Crea Revelaciones que Realmente Satisfagan",
    slug: "how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy",
    excerpt: "Diseña conclusiones de misterio que ofrezcan auténticos momentos 'ajá', donde cada pista se conecte lógicamente y los invitados sientan que su trabajo detectivesco ha sido recompensado con soluciones brillantes que tienen perfecto sentido en retrospectiva.",
    meta_description: "Crea conclusiones satisfactorias con revelaciones bien planificadas que atan todas las pistas en tu misterio de asesinato personalizado.",
    theme: "Problem-Solving",
    tags: ["Problem-Solving"],
    published_at: "2025-11-23T05:00:19.617+00:00"
  }
];

async function fetchAndInsertAll() {
  const slugs = [
    'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy',
    'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
    'how-to-host-a-hollywood-murder-mystery-party',
    'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement'
  ];

  for (const slug of slugs) {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('language', 'en')
      .single();

    if (error || !post) {
      console.error(`Error fetching ${slug}:`, error);
      continue;
    }

    console.log(`\nFetched: ${post.title}`);
    console.log(`Content length: ${post.content.length} characters`);
  }
}

fetchAndInsertAll();
