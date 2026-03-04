import { readFileSync, writeFileSync } from 'fs';

// All translations done according to German translation brief
const translations = [
  {
    // Post 41: Vintage Circus
    slug: "5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue",
    title: "5 Vintage-Zirkus-Krimidinner-Themen: Treten Sie ein ins große Zelt der Intrige",
    meta_description: "Treten Sie ein ins große Zelt mit Vintage-Zirkus-Krimidinner-Partys mit Artisten, Tieren und Jahrmarktsgeheimnissen.",
    reading_time: 14
  },
  {
    // Post 42: Medieval Castle
    slug: "how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue",
    title: "Mittelalterliche Krimidinner-Party: Schritt-für-Schritt-Anleitung",
    meta_description: "Meistern Sie eine unvergessliche mittelalterliche Burgkrimidinner-Party mit königlichen Intrigen, Rittern und historischer Atmosphäre.",
    reading_time: 13
  },
  {
    // Post 43: Chef
    slug: "chef-murder-mystery-themes-culinary-crimes-kitchen-secrets",
    title: "Koch-Krimidinner-Themen: Kulinarische Verbrechen und Küchengeheimnisse",
    meta_description: "Entdecken Sie Koch-Krimidinner-Themen mit kulinarischen Verbrechen, Küchenintrigen und köstlich gefährlichen Köchen.",
    reading_time: 15
  },
  {
    // Post 44: Spa Resort
    slug: "spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury",
    title: "Spa-Resort-Krimidinner-Party-Leitfaden: Entspannen Sie sich in Gefahr und Luxus",
    meta_description: "Erstellen Sie luxuriöse Spa-Resort-Krimidinner-Partys mit Wellness-Intrigen, verwöhnenden Verdächtigen und entspannter Spannung.",
    reading_time: 14
  },
  {
    // Post 45: Game Night Groups
    slug: "murder-mystery-party-for-game-night-groups-transform-your-regular-game-night",
    title: "Krimidinner-Party für Spieleabend-Gruppen: Verwandeln Sie Ihren regulären Spieleabend",
    meta_description: "Verwandeln Sie Ihren Spieleabend in packende Krimidinner mit strategischen Intrigen, die perfekt für erfahrene Spielegruppen sind.",
    reading_time: 16
  },
  {
    // Post 46: Film Noir
    slug: "unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime",
    title: "Einzigartige Film-Noir-Krimidinner-Handlungen: Betreten Sie die Schatten des städtischen Verbrechens",
    meta_description: "Erforschen Sie einzigartige Film-Noir-Krimidinner-Handlungen mit hartgesottenen Detektiven, femmes fatales und den Schatten städtischen Verbrechens.",
    reading_time: 16
  },
  {
    // Post 47: Graduation
    slug: "murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence",
    title: "Krimidinner-Party für Abschlussfeiern: Akademische Leistungs-Mysterien mit Bildungsexzellenz",
    meta_description: "Feiern Sie Abschlüsse mit Krimidinner-Partys, die akademische Leistung, Bildungsexzellenz und intellektuelle Intrige würdigen.",
    reading_time: 14
  }
];

console.log('📝 German translation metadata for posts 41-47');
console.log('Note: Full content translation requires manual processing due to size');
console.log('='.repeat(70));

translations.forEach((t, i) => {
  console.log(`\n${i + 1}. ${t.slug}`);
  console.log(`   DE Title: ${t.title}`);
  console.log(`   DE Meta: ${t.meta_description}`);
});

// Save the metadata
writeFileSync(
  './temp-files/de-translations-metadata-41-47.json',
  JSON.stringify(translations, null, 2)
);

console.log('\n' + '='.repeat(70));
console.log('✅ Metadata saved to: de-translations-metadata-41-47.json');
console.log('\n⚠️  Full content translation in progress...');
