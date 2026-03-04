#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Title mappings for posts 48-61 (these are known from previous translations)
const titleMappings = {
  48: {
    de: "Vintage-Zirkus-Krimis: So Veranstalten Sie Krimidinner-Partys Unter der Großen Kuppel",
    es: "Misterios de Asesinato de Circo Vintage: Cómo Organizar Fiestas de Misterio Bajo la Gran Carpa",
    fr: "5 Thèmes de Soirée Enquête Cirque Vintage : Entrez Sous le Grand Chapiteau de l'Intrigue"
  },
  49: {
    de: "Renaissance-Krimis: 5 Themen für Krimidinner-Partys",
    es: "Misterios de Asesinato del Renacimiento: 5 Temas para Fiestas de Misterio",
    fr: "5 Thèmes de Soirée Enquête Renaissance"
  },
  50: {
    de: "Wie Man Eine Spionage-Krimidinner-Party Veranstaltet: 5 Spannende Geheimdienst-Themen",
    es: "Cómo Organizar una Fiesta de Misterio de Espionaje: 5 Emocionantes Temas de Inteligencia",
    fr: "5 Thèmes de Soirée Enquête Policière Style Espionnage Qui Transformeront Vos Invités en Agents Secrets"
  },
  51: {
    de: "Wie Man Eine Berghütten-Krimidinner-Party Veranstaltet: 5 Winterthemen",
    es: "Cómo Organizar una Fiesta de Misterio en un Chalet de Montaña: 5 Temas de Invierno",
    fr: "5 Thèmes de Soirée Enquête en Chalet de Montagne Qui Rendront Votre Retraite Inoubliable"
  },
  52: {
    de: "Wie Man Eine Altägyptische Krimidinner-Party Veranstaltet: Pyramiden-Mord",
    es: "Cómo Organizar una Fiesta de Misterio del Antiguo Egipto: Asesinato en la Pirámide",
    fr: "Guide de Soirée Enquête Égypte Antique"
  },
  53: {
    de: "Wie Man Eine Mittelalterliche Schloss-Krimidinner-Party Veranstaltet: Königliche Intrige",
    es: "Cómo Organizar una Fiesta de Misterio de Asesinato en un Castillo Medieval: Gobierne su Reino con Intriga Real",
    fr: "Guide de Soirée Enquête Château Médiéval"
  },
  54: {
    de: "Buchhandlungs-Krimi-Partyplanung: Die Seite Zum Literarischen Mord Umblättern",
    es: "Planificación de Fiestas de Misterio de Asesinato en una Librería: Pase la Página al Asesinato Literario",
    fr: "Guide de Soirée Enquête Librairie"
  },
  55: {
    de: "Wie Man Nicht Teilnehmende Gäste Bei Ihrer Krimidinner-Party Behebt",
    es: "Cómo Solucionar el Problema de Invitados que No Participan en su Fiesta de Misterio de Asesinato",
    fr: "Comment Résoudre le Problème des Invités Non Participatifs"
  },
  56: {
    de: "Wie Man Langweilige Krimidinner-Partys Behebt",
    es: "Cómo Solucionar Fiestas de Misterio de Asesinato Aburridas",
    fr: "Comment Résoudre les Soirées Enquête Ennuyeuses"
  },
  57: {
    de: "Wie Man Unrealistische Krimi-Handlungen Behebt: Glaubwürdige Geschichten Erstellen",
    es: "Cómo Solucionar Tramas Irrealistas de Misterios de Asesinato: Cree Historias Creíbles que Cautiven",
    fr: "Comment Résoudre les Intrigues de Mystère Irréalistes"
  },
  58: {
    de: "Wie Man Zu Einfache Krimidinner-Partys Behebt",
    es: "Cómo Solucionar Fiestas de Misterio de Asesinato Demasiado Fáciles",
    fr: "Comment Résoudre les Soirées Enquête Trop Faciles"
  },
  59: {
    de: "Wie Man Zu Schwierige Krimidinner-Partys Behebt",
    es: "Cómo Solucionar Fiestas de Misterio de Asesinato Demasiado Difíciles",
    fr: "Comment Résoudre les Soirées Enquête Trop Difficiles"
  },
  60: {
    de: "Wie Man Verwirrende Krimidinner-Partys Behebt",
    es: "Cómo Solucionar Fiestas de Misterio de Asesinato Confusas",
    fr: "Comment Résoudre les Soirées Enquête Confuses"
  },
  61: {
    de: "Wie Man Schlechte Hinweise Bei Krimidinner-Partys Behebt",
    es: "Cómo Solucionar Pistas Deficientes en Fiestas de Misterio de Asesinato",
    fr: "Comment Résoudre les Mauvais Indices dans les Soirées Enquête"
  }
};

// French posts 1-25 titles
const frenchTitles1to25 = {
  1: "5 Thèmes de Soirée Enquête Policière Style Espionnage Qui Transformeront Vos Invités en Agents Secrets",
  2: "5 Thèmes de Soirée Enquête en Chalet de Montagne Qui Rendront Votre Retraite Inoubliable",
  3: "5 Thèmes de Soirée Enquête Cirque Vintage : Entrez Sous le Grand Chapiteau de l'Intrigue",
  4: "5 Thèmes de Soirée Enquête Renaissance",
  5: "Guide de Soirée Enquête Égypte Antique",
  6: "Personnages Détectives dans les Soirées Enquête",
  7: "Enquêtes Maritimes et Sous-Marines",
  8: "Soirées Enquête avec Thème Professionnels",
  9: "Enquêtes en Galerie d'Art",
  10: "Soirées Enquête de Film Noir",
  11: "Enquêtes Steampunk",
  12: "Enquêtes de l'Ère du Jazz",
  13: "Enquêtes de l'Ère de la Prohibition",
  14: "Enquêtes Hollywoodiennes",
  15: "Enquêtes Médiévales",
  16: "Enquêtes de Conte de Fées",
  17: "Enquêtes de Plage et Station Balnéaire",
  18: "Enquêtes de Manoir Hanté",
  19: "Enquêtes de Pavillon de Montagne",
  20: "Enquêtes de Bal Masqué Renaissance",
  21: "Enquêtes en Croisière de Luxe",
  22: "Enquêtes d'Hôtel de Luxe",
  23: "Enquêtes pour Petits Groupes",
  24: "Enquêtes pour Adolescents",
  25: "Enquêtes pour Équipes de Bureau"
};

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to extract meta description (first substantive paragraph)
function extractMetaDescription(content) {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip metadata lines, headers, and empty lines
    if (trimmed &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('|') &&
        !trimmed.startsWith('>') &&
        trimmed.length > 50) {
      // Limit to 160 characters
      if (trimmed.length > 160) {
        return trimmed.substring(0, 157) + '...';
      }
      return trimmed;
    }
  }

  return 'Murder mystery party planning guide';
}

// Helper function to calculate reading time
function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

// Helper function to clean content
function cleanContent(content) {
  const lines = content.split('\n');
  let cleanLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip first two metadata lines
    if (i <= 1 && line.startsWith('*')) {
      continue;
    }

    // Skip reading time at the end
    if (line.includes('*Tiempo de lectura:') ||
        line.includes('*Temps de lecture:') ||
        line.includes('*Lesezeit:')) {
      continue;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}

// Process file and prepare data for manual insertion
function processFile(filePath, language, postNumber, title) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const slug = generateSlug(title);
    const metaDescription = extractMetaDescription(content);
    const readingTime = calculateReadingTime(content);
    const cleanedContent = cleanContent(content);

    return {
      title,
      slug,
      content: cleanedContent,
      meta_description: metaDescription,
      reading_time: readingTime,
      language,
      status: 'published'
    };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

// Main execution
function main() {
  console.log('Preparing Phase 1 translations for MCP insertion...\n');

  const allPosts = [];

  // Process German posts 48-61
  console.log('Processing German posts 48-61...');
  for (let i = 48; i <= 61; i++) {
    const filePath = join(projectRoot, `de-complete-post-${i}.md`);
    const title = titleMappings[i]?.de;
    if (title) {
      const data = processFile(filePath, 'de', i, title);
      if (data) {
        allPosts.push({ ...data, postNum: i });
        console.log(`✓ DE-${i}: ${title.substring(0, 50)}...`);
      }
    }
  }

  // Process French posts 1-25
  console.log('\nProcessing French posts 1-25...');
  for (let i = 1; i <= 25; i++) {
    const filePath = join(projectRoot, `fr-complete-post-${i}.md`);
    const title = frenchTitles1to25[i];
    if (title) {
      const data = processFile(filePath, 'fr', i, title);
      if (data) {
        allPosts.push({ ...data, postNum: i });
        console.log(`✓ FR-${i}: ${title.substring(0, 50)}...`);
      }
    }
  }

  // Process Spanish posts 48-61
  console.log('\nProcessing Spanish posts 48-61...');
  for (let i = 48; i <= 61; i++) {
    const filePath = join(projectRoot, `es-complete-post-${i}.md`);
    const title = titleMappings[i]?.es;
    if (title) {
      const data = processFile(filePath, 'es', i, title);
      if (data) {
        allPosts.push({ ...data, postNum: i });
        console.log(`✓ ES-${i}: ${title.substring(0, 50)}...`);
      }
    }
  }

  // Output SQL for manual execution
  console.log(`\n\nTotal posts prepared: ${allPosts.length}`);
  console.log('\nNow use the Supabase MCP execute_sql tool to insert these posts.\n');

  return allPosts;
}

const posts = main();

// Export for use by other scripts
export { posts };
