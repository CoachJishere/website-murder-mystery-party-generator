// Identify which of the 40 deletions were WRONG (should not have been deleted)
// Correct deletions: FR "french-translation", FR "a-propos-de-ce-guide" = 2 correct 
// All topic duplicate deletions were WRONG because different topics were incorrectly merged

// The deleted posts from the script output:
const deletedPosts = [
  // FR - 2 correct junk deletions
  { lang: 'fr', id: '1b9ac600-d641-4e2e-91dd-d6948550cdb9', slug: 'french-translation', correct: true, reason: 'junk placeholder' },
  { lang: 'fr', id: '083c1977-20ca-481a-a4a5-10c3b5f52089', slug: 'a-propos-de-ce-guide', correct: true, reason: 'junk about page' },
  
  // FR - topic "duplicates" that need analysis
  { lang: 'fr', id: '97877e06-42fd-4efa-bb40-c6e1e5d7b307', slug: '1920s-speakeasy-murder-mystery-party-guide-fr', topic: '1920s Speakeasy', 
    note: 'speakeasy and jazz are DIFFERENT English posts. Both slug -fr posts are older translations. Check if a newer speakeasy post exists' },
  { lang: 'fr', id: '67381ffc-a288-4efa-9c79-609e368a53e5', slug: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable-fr', topic: 'Beach Resort',
    note: 'beach-resort and spa-resort are DIFFERENT. This was beach-resort, not spa' },
  { lang: 'fr', id: 'b7c70669-3f30-4ba0-993b-7ec4ef3f71b4', slug: '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless-fr', topic: 'Masquerade Ball',
    note: 'masquerade post was kept (native FR slug). This -fr slug one is an older duplicate.' },
  { lang: 'fr', id: '5d68c3db-bf65-4d2d-9592-3da21778177e', slug: 'comment-organiser-une-soiree-de-mystere-de-meurtre-de-conte-de-fees-il-etait-une-fois-un-crime', topic: 'Fairy Tale',
    note: 'fairy-tale was KEPT (slug how-to-host-a-fairy-tale...-fr). This native FR slug one is older. But the KEPT one still exists?' },
  { lang: 'fr', id: '8b899794-ebf2-4eff-9dc4-7d6b0a87f943', slug: 'intrigues-uniques-de-mystere-de-meurtre-film-noir-entrez-dans-les-ombres-du-crime-urbain', topic: 'Film Noir',
    note: 'film-noir was KEPT (slug unique-film-noir...-fr). This native FR slug is older. But KEPT one exists.' },
  { lang: 'fr', id: '71895160-0aca-42f2-a358-b729c175ac23', slug: 'mystere-de-meurtre-de-fouilles-archeologiques-unique-deterrez-les-secrets-anciens-et-les-meurtres-modernes', topic: 'Archaeological',
    note: 'archaeological KEPT (slug unique-archaeological-dig...-fr). This native FR slug older. KEPT exists.' },
  { lang: 'fr', id: 'cc9a35e6-3534-4fec-bfcc-9eb217ca5639', slug: 'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive-fr', topic: 'Breaking Character',
    note: 'breaking-character KEPT was "pourquoi-les-personnages-de-temoins-innocents". BUT that is actually INNOCENT BYSTANDER not breaking character! WRONG - both posts are different topics.' },
  { lang: 'fr', id: '183e4a60-2e17-47f4-90b1-6c4aacd40cbd', slug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue-fr', topic: 'Medieval Castle',
    note: 'medieval-castle KEPT was unique-medieval-murder-mystery-plot-ideas-fr. BUT medieval castle and medieval plot are DIFFERENT posts! WRONG deletion.' },
  { lang: 'fr', id: 'ec839773-8d3c-4551-8f12-e561370ab58d', slug: 'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains-fr', topic: 'Superhero',
    note: 'superhero KEPT was "murder-mysteries-de-mechants". BUT villain and superhero are DIFFERENT posts! WRONG deletion.' },
  { lang: 'fr', id: 'fdc161e6-6a42-403d-83d0-9c5b9576480e', slug: 'unique-circus-murder-mystery-plot-ideas-fr', topic: 'Circus Plot',
    note: 'circus-plot KEPT was vintage-circus themed. BUT vintage circus and circus plot are DIFFERENT posts! WRONG deletion.' },
  { lang: 'fr', id: 'a43910ed-259e-44e0-8b23-35b28c333833', slug: 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime-fr', topic: 'Space Colony',
    note: 'space-colony KEPT was "station-spatiale" which is Space STATION, not Space Colony! WRONG deletion.' },

  // IT deletions
  { lang: 'it', id: '66470aa9-fbc7-4302-824d-e8c4243ad1cb', slug: '5-temi-murder-mystery-villa-stregata', topic: 'Haunted Mansion',
    note: 'Older version, newer "5-temi-di-giallo-villa-stregata" kept. Correct - true duplicate.' },
  { lang: 'it', id: 'b305ca82-d6c5-4ffb-89f9-4efcfde1e6bc', slug: '5-temi-festa-murder-mystery-rinascimentale', topic: 'Renaissance',
    note: 'Older version, newer kept. Correct - true duplicate.' },
  { lang: 'it', id: '2ca4d64e-785b-4255-bb47-c7647c4195cf', slug: '5-temi-festa-murder-mystery-casino-scommetti-sul-dramma-mortale-ad-alto-rischio', topic: 'Casino',
    note: 'Older version, newer kept. Correct - true duplicate.' },
  { lang: 'it', id: 'fe38b391-bafa-4f54-bf49-1573bbf1f5f5', slug: '5-temi-murder-mystery-resort-balneare-che-renderanno-la-vostra-vacanza-indimenticabile', topic: 'Beach Resort',
    note: 'beach-resort and spa-resort are DIFFERENT. This was beach-resort. WRONG.' },
  { lang: 'it', id: 'b97d2dc4-8f1a-481d-9d25-3dbd8c596b28', slug: '5-temi-beach-resort-murder-mystery-che-renderanno-indimenticabile-la-sua-vacanza', topic: 'Beach Resort',
    note: 'Another beach-resort. Both deleted, spa-resort kept. WRONG - need at least one beach resort.' },
  { lang: 'it', id: '897ba9a1-5b3f-4718-a5de-b1898ce64f79', slug: '5-temi-vintage-circus-murder-mystery-entri-nel-big-top-dellintrig', topic: 'Vintage Circus',
    note: 'vintage-circus and circus-plot are DIFFERENT. But there were 4 circus posts. Need to check if vintage circus was preserved.' },
  { lang: 'it', id: 'a73494a0-657f-49a4-bdbe-21253b4e8776', slug: 'idee-trame-mistero-omicidio-circo-uniche', topic: 'Circus Plot',
    note: 'circus-plot. Was deleted. Need this.' },
  { lang: 'it', id: '0e49c25a-4223-4e63-9bb6-88feccf7e25f', slug: '5-temi-di-giallo-circo-vintage-si-entri-nel-grande-tendone-dell-intrigo', topic: 'Vintage Circus',
    note: 'Near-duplicate of the KEPT one (0b01f87d). Correct deletion - true duplicate slug variant.' },
  { lang: 'it', id: '885ee88b-a5bb-484e-98e1-268010800bdc', slug: 'pianificazione-festa-misteriosa-libreria-voltare-pagina-omicidio-letterario', topic: 'Bookstore',
    note: 'Older bookstore, newer kept. Correct - true duplicate.' },
  { lang: 'it', id: '3b74c73d-8411-4665-a574-df3ec77b7709', slug: 'guida-murder-mystery-hotel-infestato-check-in-terrore-suspense', topic: 'Haunted Hotel',
    note: 'Older haunted-hotel, newer kept. Correct - true duplicate.' },
  { lang: 'it', id: 'f3ae806b-8f0e-4982-ba10-f19c47fb19bf', slug: 'murder-mystery-party-medievale-guida-passo-passo', topic: 'Medieval Castle',
    note: 'medieval-castle and medieval-plot are DIFFERENT. This was castle. WRONG.' },
  { lang: 'it', id: 'f5743129-5757-4772-9148-9edb2ba3fbc7', slug: 'idee-uniche-trame-misteri-medievali', topic: 'Medieval Plot',
    note: 'This is medieval PLOT. Deleted as dup of castle. WRONG - different posts.' },
  { lang: 'it', id: '7f17eaff-2944-46dd-9cdb-68e3159289fe', slug: 'come-ospitare-mistero-omicidio-era-proibizionismo-strada-emozione', topic: 'Prohibition Era',
    note: 'speakeasy/prohibition and jazz are DIFFERENT. This prohibition, jazz kept. WRONG - need prohibition post.' },
  { lang: 'it', id: '7644651b-e644-4671-97e1-dccf559cc749', slug: 'come-ospitare-festa-mistero-omicidio-steampunk-prepararsi-crimine-fantascienza-vittoriana', topic: 'Steampunk',
    note: 'steampunk and victorian are DIFFERENT. This was steampunk. WRONG.' },
  { lang: 'it', id: '2b21f603-4294-4c95-b9bd-d7850d618426', slug: 'temi-mistero-omicidio-avvocato-dramma-aula-intrigo-legale', topic: 'Lawyer',
    note: 'lawyer and medical-examiner are DIFFERENT. This was lawyer. WRONG.' },
  { lang: 'it', id: '6281e389-37c2-488a-a568-079f88010fca', slug: 'pianificazione-festa-mistero-omicida-selvaggio-west', topic: 'Wild West',
    note: 'wild-west. Older, newer kept. Correct - true duplicate.' },

  // PT deletions
  { lang: 'pt', id: '9bffdfe7-8aa1-40a9-846c-35efa3ce0eea', slug: 'guia-festa-misterio-assassinato-egito-antigo', topic: 'Ancient Egypt',
    note: 'ancient-egypt and archaeological are DIFFERENT. This was egypt. WRONG.' },
  { lang: 'pt', id: '24649246-5a27-4de8-8df9-7f074944a6b6', slug: '5-temas-misterio-assassinato-resort-praia-que-tornarao-suas-ferias-inesqueciveis', topic: 'Beach Resort',
    note: 'beach-resort. Deleted, spa-resort kept. WRONG.' },
  { lang: 'pt', id: '5667d09a-9fef-4462-87aa-ddb8481d758b', slug: '5-temas-misterio-assassinato-resort-praia-que-tornarao-ferias-inesqueciveis', topic: 'Beach Resort',
    note: 'Near-duplicate of above beach-resort. This IS a true duplicate of the one above (same created_at, near-identical slug).' },
  { lang: 'pt', id: '4477626f-5eec-4e9d-a82c-3f78cc4e5a57', slug: 'como-hospedar-festa-misterio-assassinato-castelo-medieval-governe-reino-intriga-real', topic: 'Medieval Castle',
    note: 'medieval-castle and medieval-plot are DIFFERENT. This was castle. WRONG.' },
  { lang: 'pt', id: 'd02cdefa-903a-40f7-a78f-19aad9c5a6bc', slug: 'como-organizar-festa-de-misterio-de-assassinato-de-super-herois-poderes-identidades-secretas-e-super-viloes', topic: 'Superhero',
    note: 'superhero and villain are DIFFERENT. This was superhero. WRONG.' },
  { lang: 'pt', id: 'b89a9d87-0541-45c8-9eb7-f2462bf30845', slug: 'como-organizar-misterio-de-assassinato-apocalipse-zumbi-que-tera-seus-convidados-lutando-pela-sobrevivencia', topic: 'Zombie',
    note: 'zombie grouped with teenagers?! Completely wrong. WRONG.' },
  { lang: 'pt', id: '1e6ca11a-9d67-4790-9bab-d57e379c903f', slug: 'festa-de-assassinato-misterioso-para-adolescentes-guia', topic: 'Teenagers',
    note: 'teenagers grouped together with zombie etc. But there might be a true duplicate teenager post. Need to check.' },
  { lang: 'pt', id: '8f771fec-5994-4e2b-9a52-caaec0fda8a2', slug: 'enredos-de-assassinato-misterioso-em-reuniao-escolar-descubra-segredos-enterrados', topic: 'School Reunion',
    note: 'school-reunion grouped with teenagers. WRONG.' },
  { lang: 'pt', id: '08d174da-8142-474c-ac30-bdf09c17194a', slug: 'como-corrigir-convidados-quebrando-o-personagem-mantenha-sua-festa-de-misterio-de-assassinato-imersiva', topic: 'Breaking Character',
    note: 'breaking-character grouped with teenagers. WRONG.' },
  { lang: 'pt', id: '2ba81c0e-b924-4575-a827-c6241780110d', slug: 'festa-de-assassinato-misterioso-para-formaturas-misterios-de-conquistas-academicas-com-excelencia-educacional', topic: 'Graduation',
    note: 'graduation. Older, newer kept. Correct - true duplicate.' },
  { lang: 'pt', id: 'fcb48cdf-0fae-4658-832d-07733ecaada4', slug: 'temas-misterio-assassinato-jornalistas-reporteres-investigativos-historias-mortais', topic: 'Journalist',
    note: 'journalist. Older, newer kept. But check if both existed.' },
];

// Summary of WRONG deletions that need restoration
const wrongDeletions = deletedPosts.filter(d => {
  // Correct deletions: true junk posts, or truly the same topic with a newer version kept
  if (d.correct) return false;
  // The masquerade FR deletion was correct (kept native FR slug version)
  if (d.id === 'b7c70669-3f30-4ba0-993b-7ec4ef3f71b4') return false; // masquerade dupe
  if (d.id === '5d68c3db-bf65-4d2d-9592-3da21778177e') return false; // fairy-tale dupe
  if (d.id === '8b899794-ebf2-4eff-9dc4-7d6b0a87f943') return false; // film-noir dupe
  if (d.id === '71895160-0aca-42f2-a358-b729c175ac23') return false; // archaeological dupe
  
  // IT correct: haunted mansion, renaissance, casino, bookstore, haunted hotel, wild west, one circus dupe
  if (d.id === '66470aa9-fbc7-4302-824d-e8c4243ad1cb') return false; // IT haunted mansion dupe
  if (d.id === 'b305ca82-d6c5-4ffb-89f9-4efcfde1e6bc') return false; // IT renaissance dupe
  if (d.id === '2ca4d64e-785b-4255-bb47-c7647c4195cf') return false; // IT casino dupe
  if (d.id === '0e49c25a-4223-4e63-9bb6-88feccf7e25f') return false; // IT circus near-exact dupe
  if (d.id === '885ee88b-a5bb-484e-98e1-268010800bdc') return false; // IT bookstore dupe
  if (d.id === '3b74c73d-8411-4665-a574-df3ec77b7709') return false; // IT haunted hotel dupe
  if (d.id === '6281e389-37c2-488a-a568-079f88010fca') return false; // IT wild west dupe
  
  // PT correct: one beach resort near-dupe, graduation dupe
  if (d.id === '5667d09a-9fef-4462-87aa-ddb8481d758b') return false; // PT beach resort near-exact dupe
  if (d.id === '2ba81c0e-b924-4575-a827-c6241780110d') return false; // PT graduation dupe
  
  return true; // All others are WRONG deletions
});

console.log(`\n=== WRONG DELETIONS (${wrongDeletions.length} posts need restoration) ===\n`);
for (const d of wrongDeletions) {
  console.log(`[${d.lang.toUpperCase()}] ${d.topic || 'junk'}: "${d.slug}"`);
  if (d.note) console.log(`   Note: ${d.note}`);
}

// Count correct deletions
const correctDeletions = deletedPosts.length - wrongDeletions.length;
console.log(`\n=== SUMMARY ===`);
console.log(`Total deleted: 40`);
console.log(`Correct deletions: ${correctDeletions}`);
console.log(`Wrong deletions: ${wrongDeletions.length}`);
console.log(`\nPosts needing restoration by language:`);
for (const lang of ['fr', 'it', 'pt']) {
  const langWrong = wrongDeletions.filter(d => d.lang === lang);
  console.log(`  ${lang.toUpperCase()}: ${langWrong.length} posts`);
}
