import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PT_SLUGS = {
  1: 'como-corrigir-convidados-quebrando-o-personagem',
  2: 'como-corrigir-problemas-de-ritmo-de-misterio',
  3: 'como-corrigir-misterios-de-assassinato-excessivamente-complexos',
  4: 'como-corrigir-finais-de-misterio-insatisfatorios',
  5: 'como-corrigir-baixa-participacao-do-convidado',
  6: 'como-corrigir-convidados-resolvendo-muito-cedo',
  7: 'como-corrigir-problemas-de-atribuicao-de-personagem',
  8: 'como-corrigir-revelacoes-anticlimacticas',
  9: 'como-corrigir-desenvolvimento-fraco-de-personagem',
  10: 'como-corrigir-problemas-de-fluxo-de-pistas',
  11: 'como-corrigir-problemas-de-equilibrio-de-dificuldade'
};

const KO_SLUGS = {
  1: '1920s-speakeasy-murder-mystery-party-guide-ko',
  2: 'vintage-circus-murder-mystery-party-guide-ko',
  3: 'ancient-egypt-murder-mystery-party-guide-ko',
  4: 'art-gallery-murder-mystery-party-guide-ko',
  5: 'bookstore-murder-mystery-party-guide-ko',
  6: '1940s-film-noir-detective-murder-mystery-party-ko',
  7: 'wild-west-saloon-murder-mystery-party-ko',
  8: 'colonial-mansion-butler-murder-mystery-party-ko',
  9: 'cruise-ship-murder-mystery-party-ko'
};

const ZH_SLUGS = {
  1: 'victorian-mansion-murder-mystery-party-guide-zh-cn',
  2: 'haunted-mansion-murder-mystery-party-zh-cn',
  3: 'mountain-lodge-murder-mystery-party-zh-cn',
  4: 'renaissance-fair-murder-mystery-party-zh-cn',
  5: 'spy-thriller-murder-mystery-party-zh-cn',
  6: 'fairy-tale-murder-mystery-party-zh-cn',
  7: 'hollywood-murder-mystery-party-zh-cn',
  8: 'medieval-castle-murder-mystery-party-zh-cn',
  9: 'prohibition-era-murder-mystery-party-zh-cn',
  10: 'steampunk-murder-mystery-party-zh-cn',
  11: 'jazz-age-murder-mystery-party-zh-cn',
  12: 'investigative-journalist-murder-mystery-party-zh-cn'
};

function extractTitle(content) {
  const yamlTitleMatch = content.match(/^---\s*\ntitle:\s*"([^"]+)"/m);
  if (yamlTitleMatch) return yamlTitleMatch[1];

  const mdTitleMatch = content.match(/^#\s+(.+)$/m);
  if (mdTitleMatch) return mdTitleMatch[1].trim();

  return null;
}

function extractMetaDescription(content) {
  const yamlMetaMatch = content.match(/meta_description:\s*"([^"]+)"/);
  if (yamlMetaMatch) return yamlMetaMatch[1];

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('*') &&
        !trimmed.startsWith('-') && !trimmed.startsWith('|') && !trimmed.startsWith('>') &&
        !trimmed.startsWith('---') && !trimmed.startsWith('**') && trimmed.length > 50) {
      return trimmed.substring(0, 160);
    }
  }
  return '';
}

function calculateReadingTime(content) {
  const words = content.split(/\s+/).length;
  return Math.ceil(words / 200);
}

function escapeSQL(str) {
  if (!str) return  '';
  return str.replace(/'/g, "''");
}

function generateInsertSQL(fileNum, language, slugMap) {
  const filePath = path.join(__dirname, `${language}-complete-post-${fileNum}.md`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${language}-complete-post-${fileNum}.md`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const title = extractTitle(content);

  if (!title) {
    console.log(`❌ No title found in ${language}-complete-post-${fileNum}.md`);
    return null;
  }

  const slug = slugMap[fileNum];
  const meta_description = extractMetaDescription(content);
  const reading_time = calculateReadingTime(content);

  console.log(`✓ Processing: ${slug} (${language})`);

  return `INSERT INTO blog_posts (title, content, slug, meta_description, language, status, reading_time, published_at, created_at, updated_at)
SELECT
  '${escapeSQL(title)}',
  '${escapeSQL(content)}',
  '${slug}',
  '${escapeSQL(meta_description)}',
  '${language}',
  'published',
  ${reading_time},
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM blog_posts WHERE slug = '${slug}' AND language = '${language}'
);`;
}

console.log('🚀 Generating Phase 2 Translation Migration\n');

const insertStatements = [];

// Portuguese
console.log('📝 Portuguese (PT):');
for (let i = 1; i <= 11; i++) {
  const sql = generateInsertSQL(i, 'pt', PT_SLUGS);
  if (sql) insertStatements.push(sql);
}

// Korean
console.log('\n📝 Korean (KO):');
for (let i = 1; i <= 9; i++) {
  const sql = generateInsertSQL(i, 'ko', KO_SLUGS);
  if (sql) insertStatements.push(sql);
}

// Chinese
console.log('\n📝 Chinese Simplified (ZH-CN):');
for (let i = 1; i <= 12; i++) {
  const sql = generateInsertSQL(i, 'zh-cn', ZH_SLUGS);
  if (sql) insertStatements.push(sql);
}

const migrationSQL = insertStatements.join('\n\n');
const outputPath = path.join(__dirname, 'phase2-translations-migration.sql');

fs.writeFileSync(outputPath, migrationSQL);

console.log(`\n✅ Generated migration with ${insertStatements.length} INSERT statements`);
console.log(`📄 Saved to: phase2-translations-migration.sql`);
console.log(`\n💡 File size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
