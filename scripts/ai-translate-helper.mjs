/**
 * AI Translation Helper for Italian Blog Posts
 * 
 * This script provides translation patterns and helpers for converting
 * English murder mystery party blog posts to Italian.
 *
 * Key requirements:
 * - Formal "Lei" throughout (not informal "tu")
 * - Proper Italian accents (à, è, é, ì, ò, ù)  
 * - E-E-A-T compliance with Italian dates
 * - Preserve all markdown formatting
 */

import { readFileSync, writeFileSync } from 'fs';

// Common translation patterns
const patterns = {
  // E-E-A-T headers
  'eeat_header': {
    en: '*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*',
    it: '*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*'
  },
  
  // Research note
  'research_note': {
    en: '*Based on analysis of 10,000+ murder mystery parties',
    it: '*Basato sull\'analisi di oltre 10.000 feste misteriose'
  },
  
  // Reading time
  'reading_time': {
    en: 'Reading time:',
    it: 'Tempo di lettura:'
  },
  
  // FAQ marker
  'faq_q': {
    en: '**Q:',
    it: '**D:'  // Domanda
  },
  
  'faq_a': {
    en: 'A:',
    it: 'R:'  // Risposta
  }
};

// Common terms dictionary
const dictionary = {
  // Core concepts
  'murder mystery': 'mistero omicidio',
  'party': 'festa',
  'parties': 'feste',
  'planning': 'pianificazione',
  'guide': 'guida',
  'themes': 'temi',
  'theme': 'tema',
  
  // Characters
  'guests': 'ospiti',
  'characters': 'personaggi',
  'suspects': 'sospetti',
  'detective': 'detective',
  'host': 'ospitante',
  'author': 'autore',
  
  // Mystery elements
  'clues': 'indizi',
  'investigation': 'indagine',
  'mystery': 'mistero',
  'crime': 'crimine',
  'murder': 'omicidio',
  'evidence': 'prove',
  'alibi': 'alibi',
  'motive': 'movente',
  'weapon': 'arma',
  
  // Event planning
  'atmosphere': 'atmosfera',
  'decorations': 'decorazioni',
  'costumes': 'costumi',
  'setup': 'preparazione',
  'props': 'oggetti di scena',
  
  // Descriptors
  'best': 'migliori',
  'perfect': 'perfetta',
  'ultimate': 'definitiva',
  'complete': 'completa',
  'professional': 'professionale'
};

console.log('AI Translation Helper loaded');
console.log('');
console.log('Translation patterns available:');
Object.keys(patterns).forEach(key => {
  console.log(`  - ${key}`);
});
console.log('');
console.log(`Dictionary terms: ${Object.keys(dictionary).length}`);
console.log('');
console.log('NOTE: For full translations, use Claude directly with these patterns.');

