#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const post = {
  title: "Kuinka korjata hämmentävät murhamysteerin vihjeet",
  slug: "kuinka-korjata-hammentavat-murhamysteerin-vihjeet",
  content: `Haluatko korjata hämmentävät murhamysteerin vihjeet, jotka jättävät vieraat turhautuneiksi sen sijaan, että he sitoutuisivat? Suunnitellaanpa selkeät, loogis

et vihjejärjestelmät, jotka ohjaavat pelaajia tyydyttäviin lopputuloksiin ilman ylivoimaista hämmennystä. Luodaksemme tehokkaita murhamysteerin vihjeitä, luomme loogisia todistusketjuja, joissa jokainen löytö johtaa luonnollisesti seuraavaan, suunnittelemme useita vaikeustasoja, jotka sopivat erilaisiin ongelmanratkaisutyyleihin, kehitämme vihjeitä, jotka vaativat yhteistyötä olematta mahdottomia tulkita, ja luomme paljastusaikataulun, joka ylläpitää jännitystä ja varmistaa tasaisen etenemisen kohti ratkaisua. Keskeinen ero hämmentävien mysteerien ja mukaansatempaavien mysteerien välillä? **Strateginen vihjesuunnittelu, joka saa vieraat tuntemaan olevansa nerokkaita ratkaistessaan pulmia** sen sijaan, että he turhautuisivat epäselvään todistusaineistoon, joka vaikuttaa suunnitellulta hämmentämään pikemminkin kuin haastamaan ja sitouttamaan tutkivaa ajattelua.

Oletko valmis muuttamaan hämmentävät murhamysteerin vihjeet selkeiksi, loogisiksi todisteiksi, jotka ohjaavat vieraat tyydyttäviin lopputuloksiin? **Aika korvata hämmentävät todisteet vihjeillä, jotka tekevät mysteeristäsi tyydyttävimmän tutkimuskokemuksen**, jonka ystäväsi ovat koskaan kohdanneet.`,
  meta_description: "Ratkaise pulma luoda selkeitä, loogisia vihjeitä, jotka ohjaavat vieraat tyydyttäviin päätelmiin räätälöidyssä mysteerissäsi.",
  reading_time: null,
  language: 'fi',
  status: 'published'
};

async function insertPost() {
  try {
    console.log('Inserting Finnish post 1:', post.title);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(post)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    console.log('✅ Successfully inserted post 1');
    console.log('Post ID:', data[0]?.id);
    return data;
  } catch (error) {
    console.error('❌ Error inserting post 1:', error.message);
    throw error;
  }
}

insertPost();
