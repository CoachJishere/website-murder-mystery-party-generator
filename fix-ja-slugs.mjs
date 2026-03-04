import { readFileSync, writeFileSync } from 'fs';

// Mapping of Japanese post titles to their correct slugs
const slugMap = [
  { title: 'ヴィンテージサーカス殺人ミステリー：市場動向と人気', slug: '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue-ja' },
  { title: 'ルネサンスフェアミステリー：市場動向と人気', slug: '5-renaissance-murder-mystery-party-themes-ja' },
  { title: 'ホーンテッドマンション殺人ミステリー：市場動向と人気', slug: '5-haunted-mansion-murder-mystery-themes-ja' },
  { title: '古代エジプト殺人ミステリー：市場動向と人気', slug: 'ancient-egypt-murder-mystery-party-guide-ja' },
  { title: 'アートギャラリー殺人ミステリー：市場動向と人気', slug: 'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes-ja' },
  { title: 'クイック中世ミステリーセットアップチェックリスト', slug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue-ja' },
  { title: '書店殺人ミステリー：市場動向と人気', slug: 'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder-ja' },
  { title: '参加を促すためのクイックスタートチェックリスト', slug: 'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party-ja' },
  { title: '退屈なマーダーミステリーパーティーを修正するためのクイックフィックスチェックリスト', slug: 'how-to-fix-boring-murder-mystery-parties-ja' },
  { title: 'プロットリアリズム問題のためのクイック評価ガイド', slug: 'how-to-fix-unrealistic-murder-mystery-plots-create-believable-storylines-that-captivate-ja' },
  { title: 'このガイドについて', slug: 'how-to-host-a-victorian-murder-mystery-party-ja' },
  { title: 'ホーンテッドホテル殺人ミステリー：市場動向と人気', slug: 'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense-ja' },
  { title: 'ワイルドウェスト殺人ミステリー：市場動向と人気', slug: 'wild-west-murder-mystery-party-planning-ja' },
  { title: 'オフィスチーム殺人ミステリー：市場動向と人気', slug: 'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation-ja' },
];

const filePath = 'all-phase3-inserts.sql';
let content = readFileSync(filePath, 'utf-8');
let fixes = 0;

for (const { title, slug } of slugMap) {
  // Fix the SELECT line: replace empty slug after the title
  const selectPattern = `SELECT '${title}', ''`;
  const selectReplacement = `SELECT '${title}', '${slug}'`;

  if (content.includes(selectPattern)) {
    content = content.replace(selectPattern, selectReplacement);
    fixes++;
    console.log(`✅ Fixed SELECT slug for: ${title.substring(0, 30)}... → ${slug}`);
  } else {
    console.log(`❌ NOT FOUND SELECT for: ${title.substring(0, 30)}...`);
  }

  // Fix the WHERE clause: find the WHERE line that follows this post's content
  // We need to replace the slug='' in the WHERE that belongs to this specific post
  // Strategy: replace the WHERE line that comes after the slug we just set
  const whereOld = `WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = '' AND language = 'ja')`;
  const whereNew = `WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = '${slug}' AND language = 'ja')`;

  // Only replace the FIRST remaining occurrence (they appear in order)
  if (content.includes(whereOld)) {
    content = content.replace(whereOld, whereNew);
    fixes++;
  }
}

writeFileSync(filePath, content, 'utf-8');
console.log(`\nTotal fixes applied: ${fixes}`);
console.log('File saved: ' + filePath);
