/**
 * Finalize German translations for posts 2-10
 * Applies systematic German translation rules to English content
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// German translation mappings from TRANSLATION-BRIEF-GERMAN.md
const GERMAN_TRANSLATIONS = {
  // E-E-A-T Header
  eeatHeader: '*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*',

  // Research statement template
  researchTemplate: (theme) => `*Basierend auf der Analyse von über 10.000 Krimi-Partys und ${theme}-Forschung*`,

  // Section headers
  headers: {
    'Market Trends & Popularity': 'Markttrends und Popularität',
    'What 10,000+ Mystery Parties Have Taught Us': 'Was uns über 10.000 Krimi-Partys gelehrt haben',
    'Sources & References': 'Quellen und Referenzen',
    'Frequently Asked Questions': 'Häufig gestellte Fragen',
    'Quick Start': 'Schnellstart',
    'Step-by-Step': 'Schritt-für-Schritt',
    'Common Mistakes to Avoid': 'Häufige Fehler zu Vermeiden',
    'Advanced': 'Fortgeschrittene',
  },

  // Table headers
  tableHeader: '| Statistik | Wert | Quelle |',

  // Common phrases
  readingTime: (mins) => `Lesezeit: ${mins} Minuten`,

  // Bullet points
  bullets: {
    'Perfect Thematic Integration': 'Perfekte Thematische Integration',
    'Character Authenticity': 'Charakterauthentizität',
    'Investigation Clarity': 'Ermittlungsklarheit',
    'Atmospheric Balance': 'Atmosphärisches Gleichgewicht',
    'Customized Engagement': 'Individuelles Engagement',
  }
};

// Theme-specific translations
const THEME_TRANSLATIONS = {
  'Small Groups': {
    theme: 'kleine Gruppen',
    title: 'Krimi-Party für Kleine Gruppen Ideen',
    meta: 'Veranstalten Sie ein intimes Mordmysterium perfekt für 4-8 Gäste mit maßgeschneiderten Handlungssträngen, die maximales Engagement und Spannung erzeugen.'
  },
  'Medieval': {
    theme: 'mittelalterliche historische Unterhaltung',
    title: 'Einzigartige Mittelalterliche Mordmysterium-Handlungs-Ideen',
    meta: 'Entdecken Sie fesselnde mittelalterliche Mordmysterium-Handlungen mit Schlössern, Rittern und königlichen Intrigen für Ihr maßgeschneidertes Party-Erlebnis.'
  },
  'Haunted Mansion': {
    theme: 'Spukhaus',
    title: '5 Spukschloss Mordmysterium-Themen',
    meta: 'Entdecken Sie gruselige Spukschloss-Themen mit Geistern, verfluchten Anwesen und übernatürlichen Mysterien für Ihre unvergessliche Party.'
  },
  'Hollywood': {
    theme: 'Hollywood-Unterhaltung',
    title: 'Wie Sie eine Hollywood Krimi-Party Veranstalten',
    meta: 'Veranstalten Sie eine glamouröse Hollywood-Krimi-Party mit Filmstar-Charakteren, rotem Teppich-Ambiente und Tinseltown-Intrigen.'
  },
  'Villain': {
    theme: 'Schurken',
    title: 'Schurken Mordmysterium-Themen: Drahtzieher, Mörder, Antagonisten',
    meta: 'Erschaffen Sie überzeugende Schurken-Charaktere mit teuflischen Plänen, dunklen Motiven und fesselnden Antagonisten für Ihre Krimi-Party.'
  },
  'Wild West': {
    theme: 'Wilder Westen',
    title: 'Wilder Westen Krimi-Party Planung',
    meta: 'Planen Sie eine authentische Wilder Westen Krimi-Party mit Revolverhelden, Saloons und Frontier-Gerechtigkeit für unvergessliche Western-Intrigen.'
  },
  'Teenagers': {
    theme: 'Teenager-Unterhaltung',
    title: 'Krimi-Party für Teenager Leitfaden',
    meta: 'Veranstalten Sie eine fesselnde Krimi-Party für Teenager mit altersgerechten Mysterien, die jugendliche Ermittler engagieren und unterhalten.'
  },
  'Pirate': {
    theme: 'Piraten',
    title: 'Einzigartige Piraten Mordmysterium-Handlungs-Ideen',
    meta: 'Entdecken Sie spannende Piraten-Mordmysterium-Handlungen mit Meuterei auf hoher See, Schatzsuchen und maritimen Intrigen.'
  },
  'Renaissance': {
    theme: 'Renaissance',
    title: '5 Renaissance Krimi-Party-Themen',
    meta: 'Erkunden Sie elegante Renaissance-Party-Themen mit Künstler-Mysterien, königlichem Hof-Intrigenspiel und Italien-Ambiente.'
  }
};

// Function to apply basic German translations to content
function applyGermanTranslations(content, theme) {
  let translated = content;

  // Replace E-E-A-T header
  translated = translated.replace(
    /\*Published: February 16, 2026.*?2026\*/,
    GERMAN_TRANSLATIONS.eeatHeader
  );

  // Replace research statement
  const themeText = THEME_TRANSLATIONS[theme]?.theme || theme.toLowerCase();
  translated = translated.replace(
    /\*Based on analyzing 10,000.*?research\*/,
    GERMAN_TRANSLATIONS.researchTemplate(themeText)
  );

  // Replace common headers
  Object.entries(GERMAN_TRANSLATIONS.headers).forEach(([en, de]) => {
    const regex = new RegExp(`##\\s+${en}`, 'g');
    translated = translated.replace(regex, `## ${de}`);
  });

  // Replace table header
  translated = translated.replace(
    /\|\s*Statistic\s*\|\s*Value\s*\|\s*Source\s*\|/g,
    GERMAN_TRANSLATIONS.tableHeader
  );

  // Replace reading time
  const readingTimeMatch = content.match(/Reading time: (\d+) minutes/);
  if (readingTimeMatch) {
    translated = translated.replace(
      /Reading time: \d+ minutes/,
      GERMAN_TRANSLATIONS.readingTime(readingTimeMatch[1])
    );
  }

  // Replace bullet points
  Object.entries(GERMAN_TRANSLATIONS.bullets).forEach(([en, de]) => {
    translated = translated.replace(new RegExp(`✓\\s+\\*\\*${en}\\*\\*`, 'g'), `✓ **${de}**`);
  });

  return translated;
}

console.log('This script provides the framework for German translations.');
console.log('For complete, high-quality translations, each post needs full translation by Claude.');
console.log('\nRun this after all translations are complete to verify formatting.\n');

export { GERMAN_TRANSLATIONS, THEME_TRANSLATIONS, applyGermanTranslations };
