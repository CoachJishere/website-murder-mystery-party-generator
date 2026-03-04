import fs from 'fs';

const auditData = JSON.parse(
  fs.readFileSync('./translation-audit-full.json', 'utf-8')
);

const masterPosts = auditData.master.posts;
const ptPosts = auditData.languages.pt.posts;

console.log(`Master: ${masterPosts.length}, PT: ${ptPosts.length}, Gap: ${auditData.languages.pt.gap}`);

// Let's analyze the PT posts to understand what we have
// Extract key patterns from Portuguese titles

console.log('\n--- All Portuguese Post Titles ---\n');
ptPosts.forEach((p, idx) => {
  console.log(`${idx + 1}. ${p.title}`);
});

// Now let's create a comprehensive match by analyzing common Portuguese translation patterns
// and checking each master post carefully

const ptTitleLower = ptPosts.map(p => p.title.toLowerCase());
const ptSlugLower = ptPosts.map(p => p.slug.toLowerCase());

// Create a mapping of English keywords to what appears in PT posts
const enToPtKeywords = {
  'beach resort': ['praia', 'resort'],
  'casino': ['cassino'],
  'haunted mansion': ['assombrada', 'mansao'],
  'mountain lodge': ['montanha', 'lodge'],
  'renaissance': ['renascenca'],
  'space station': ['estacao espacial', 'espacial'],
  'train station': ['estacao de trem', 'estacao-de-trem'],
  'circus': ['circo'],
  'butler': ['mordomo'],
  'detective': ['detetive'],
  'chef': ['chef', 'cozinheiro'],
  'journalist': ['jornalista'],
  'medical examiner': ['perito medico', 'peritos medicos', 'perito-medico'],
  'lawyer': ['advogado'],
  'innocent bystander': ['espectador inocente'],
  'socialite': ['socialite'],
  'villain': ['vilao'],
  'fairy tale': ['conto de fadas', 'conto-de-fadas'],
  'film noir': ['cinema noir', 'film noir'],
  'archaeological': ['arqueologico', 'arqueologia'],
  'masquerade': ['mascarada', 'baile de mascaras'],
  'hollywood': ['hollywood'],
  'prohibition': ['proibicao', 'lei seca'],
  'medieval': ['medieval', 'castelo medieval'],
  'steampunk': ['steampunk'],
  'jazz': ['jazz'],
  'speakeasy': ['speakeasy', 'bar clandestino'],
  'wild west': ['velho oeste', 'faroeste'],
  'victorian': ['vitoriano', 'era vitoriana'],
  'zombie': ['zombie', 'zumbi'],
  'superhero': ['super-heroi', 'superheroi'],
  'ancient egypt': ['egito antigo', 'antigo egito'],
  'art gallery': ['galeria de arte'],
  'bookstore': ['livraria'],
  'spa resort': ['spa', 'resort spa'],
  'cruise ship': ['navio de cruzeiro', 'navio-de-cruzeiro', 'cruzeiro'],
  'underwater': ['subaquatico', 'submarino'],
  'ice hotel': ['hotel de gelo'],
  'space colony': ['colonia espacial'],
  'pirate': ['pirata'],
  'spy': ['espiao', 'espionagem'],
  'school reunion': ['reuniao escolar', 'reuniao de escola'],
  'teenagers': ['adolescente'],
  'birthday': ['aniversario'],
  'holiday': ['festivas', 'feriados', 'natal'],
  'graduation': ['formatura'],
  'dinner part': ['jantar'],
  'date night': ['encontro romantico', 'encontros romanticos'],
  'office team': ['escritorio', 'equipes de escritorio'],
  'game night': ['noite de jogo'],
  'small group': ['grupos pequenos', 'grupo pequeno'],
  'corporate': ['corporativo', 'empresarial'],
  'breaking character': ['quebrar personagem', 'saindo do personagem'],
  'pacing': ['ritmo', 'timing'],
  'confusing clues': ['pistas confusas'],
  'overly complex': ['complexo demais'],
  'unsatisfying ending': ['final insatisfatorio'],
  'unrealistic plot': ['enredo irrealista'],
  'boring': ['chato', 'entediante'],
  'won\'t participate': ['nao participam', 'recusam participar'],
};

// Check each master post
const missingPosts = [];
const foundPosts = [];

for (const master of masterPosts) {
  const titleLower = master.title.toLowerCase();
  const slugLower = master.slug.toLowerCase();

  // Try to find a match in PT posts
  let found = false;

  // Strategy 1: Look for keyword matches
  for (const [enKey, ptKeys] of Object.entries(enToPtKeywords)) {
    if (titleLower.includes(enKey) || slugLower.includes(enKey)) {
      // Check if any PT post contains the Portuguese equivalent
      for (const ptKey of ptKeys) {
        const hasMatch = ptTitleLower.some(t => t.includes(ptKey)) ||
                        ptSlugLower.some(s => s.includes(ptKey));
        if (hasMatch) {
          // Further validate: check if the PT post is actually this post
          // by checking if multiple keywords match
          found = true;
          foundPosts.push({ en: master.title, ptKey });
          break;
        }
      }
      if (found) break;
    }
  }

  if (!found) {
    missingPosts.push(master);
  }
}

console.log(`\n\nFound matches: ${foundPosts.length}`);
console.log(`Missing: ${missingPosts.length}`);

if (missingPosts.length > 11) {
  console.log(`\nWARNING: Found ${missingPosts.length} missing, expected 11. Match detection needs refinement.`);
}

console.log('\n--- Missing Posts ---\n');
missingPosts.forEach((p, idx) => {
  console.log(`${idx + 1}. ${p.title}`);
});
