// Simple script to save a translation to the batch file
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node save-translation.mjs <translation-json-file>');
  process.exit(1);
}

const translationFile = args[0];
const newTranslation = JSON.parse(readFileSync(translationFile, 'utf-8'));

const outputFile = join(__dirname, 'german-translated-batch-2-10.json');

let existingTranslations = [];
try {
  existingTranslations = JSON.parse(readFileSync(outputFile, 'utf-8'));
} catch {
  // File doesn't exist yet
}

// Add or update the translation
const existingIndex = existingTranslations.findIndex(t => t.slug === newTranslation.slug);
if (existingIndex >= 0) {
  existingTranslations[existingIndex] = newTranslation;
  console.log(`Updated translation for: ${newTranslation.slug}`);
} else {
  existingTranslations.push(newTranslation);
  console.log(`Added translation for: ${newTranslation.slug}`);
}

writeFileSync(outputFile, JSON.stringify(existingTranslations, null, 2));
console.log(`Total translations: ${existingTranslations.length}/9`);
