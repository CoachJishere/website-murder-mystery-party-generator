import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = 'mhfikaomkmqcndqfohbp';

// Portuguese slug mapping
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

// Korean slug mapping
const KO_SLUGS = {
  1: '1920s-speakeasy-murder-mystery-party-guide',
  2: 'how-to-host-a-vintage-circus-murder-mystery-party-ko',
  3: 'ancient-egypt-murder-mystery-party-guide-ko',
  4: 'art-gallery-murder-mystery-party-guide-ko',
  5: 'bookstore-murder-mystery-party-guide-ko',
  6: 'how-to-host-a-1940s-film-noir-detective-murder-mystery-party-ko',
  7: 'how-to-host-a-wild-west-saloon-murder-mystery-party-ko',
  8: 'how-to-host-a-colonial-mansion-butler-murder-mystery-party-ko',
  9: 'how-to-host-a-cruise-ship-murder-mystery-party-ko'
};

// Chinese slug mapping
const ZH_SLUGS = {
  1: 'victorian-mansion-murder-mystery-party-guide-zh-cn',
  2: 'how-to-host-a-haunted-mansion-murder-mystery-party-zh-cn',
  3: 'how-to-host-a-mountain-lodge-murder-mystery-party-zh-cn',
  4: 'how-to-host-a-renaissance-fair-murder-mystery-party-zh-cn',
  5: 'spy-thriller-murder-mystery-party-guide-zh-cn',
  6: 'fairy-tale-murder-mystery-party-guide-zh-cn',
  7: 'hollywood-murder-mystery-party-guide-zh-cn',
  8: 'medieval-castle-murder-mystery-party-guide-zh-cn',
  9: 'prohibition-era-murder-mystery-party-guide-zh-cn',
  10: 'steampunk-murder-mystery-party-guide-zh-cn',
  11: 'jazz-age-murder-mystery-party-guide-zh-cn',
  12: 'investigative-journalist-murder-mystery-party-guide-zh-cn'
};

function extractTitle(content) {
  // For YAML frontmatter (Korean)
  const yamlTitleMatch = content.match(/^---\s*\ntitle:\s*"([^"]+)"/m);
  if (yamlTitleMatch) return yamlTitleMatch[1];

  // For markdown headers (Portuguese, Chinese)
  const mdTitleMatch = content.match(/^#\s+(.+)$/m);
  if (mdTitleMatch) return mdTitleMatch[1].trim();

  return null;
}

function extractMetaDescription(content) {
  // For YAML frontmatter
  const yamlMetaMatch = content.match(/meta_description:\s*"([^"]+)"/);
  if (yamlMetaMatch) return yamlMetaMatch[1];

  // For markdown - get first substantial paragraph
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('*') &&
        !trimmed.startsWith('-') && !trimmed.startsWith('|') && !trimmed.startsWith('>') &&
        !trimmed.startsWith('---') && trimmed.length > 50) {
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
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

async function insertPost(fileNum, language, slugMap) {
  const filePath = path.join(__dirname, `${language}-complete-post-${fileNum}.md`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${language}-complete-post-${fileNum}.md`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const title = extractTitle(content);

  if (!title) {
    console.log(`❌ No title found in ${language}-complete-post-${fileNum}.md`);
    return false;
  }

  const slug = slugMap[fileNum];
  const meta_description = extractMetaDescription(content);
  const reading_time = calculateReadingTime(content);

  // Escape content for SQL
  const escapedTitle = escapeSQL(title);
  const escapedContent = escapeSQL(content);
  const escapedMeta = escapeSQL(meta_description);

  const query = `
INSERT INTO blog_posts (title, content, slug, meta_description, language, status, reading_time, published_at, created_at, updated_at)
VALUES (
  '${escapedTitle}',
  '${escapedContent}',
  '${slug}',
  '${escapedMeta}',
  '${language}',
  'published',
  ${reading_time},
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (slug, language) DO NOTHING;
  `.trim();

  // Write query to temp file
  const tempFile = path.join(__dirname, `temp-insert-${language}-${fileNum}.sql`);
  fs.writeFileSync(tempFile, query);

  console.log(`✅ Inserted: ${slug} (${language}) - ${reading_time} min read`);

  return { tempFile, slug, language };
}

async function main() {
  console.log('🚀 Starting Phase 2 Translation Insertions via MCP\n');

  const allQueries = [];

  // Process Portuguese
  console.log('📝 Processing Portuguese translations...');
  for (let i = 1; i <= 11; i++) {
    const result = await insertPost(i, 'pt', PT_SLUGS);
    if (result) allQueries.push(result);
  }

  // Process Korean
  console.log('\n📝 Processing Korean translations...');
  for (let i = 1; i <= 9; i++) {
    const result = await insertPost(i, 'ko', KO_SLUGS);
    if (result) allQueries.push(result);
  }

  // Process Chinese
  console.log('\n📝 Processing Chinese Simplified translations...');
  for (let i = 1; i <= 12; i++) {
    const result = await insertPost(i, 'zh-cn', ZH_SLUGS);
    if (result) allQueries.push(result);
  }

  console.log(`\n✅ Generated ${allQueries.length} SQL files for insertion`);
  console.log('\nTo execute, use Supabase MCP execute_sql for each query file.');
}

main().catch(console.error);
