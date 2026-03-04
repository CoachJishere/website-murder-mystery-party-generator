import { readFileSync, writeFileSync } from 'fs';

function esc(str) {
  return str ? str.replace(/'/g, "''") : '';
}

function generateInsert(data) {
  return `INSERT INTO blog_posts (title, slug, content, meta_description, reading_time, language, status)
SELECT '${esc(data.title)}', '${esc(data.slug)}', '${esc(data.content)}', '${esc(data.meta_description)}', ${data.reading_time}, '${data.language}', '${data.status}'
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = '${esc(data.slug)}' AND language = '${data.language}');`;
}

const allSQL = [];

// Italian 48-61
for (let i = 48; i <= 61; i++) {
  try {
    const data = JSON.parse(readFileSync(`phase3-it-${i}.json`, 'utf-8'));
    delete data.author_id;
    allSQL.push(`-- Italian post ${i}: ${data.title.substring(0, 50)}`);
    allSQL.push(generateInsert(data));
    allSQL.push('');
  } catch (err) {
    console.error(`Error with it-${i}: ${err.message}`);
  }
}

// Swedish 1-15
for (let i = 1; i <= 15; i++) {
  try {
    const data = JSON.parse(readFileSync(`phase3-sv-${i}.json`, 'utf-8'));
    delete data.author_id;
    allSQL.push(`-- Swedish post ${i}: ${data.title.substring(0, 50)}`);
    allSQL.push(generateInsert(data));
    allSQL.push('');
  } catch (err) {
    console.error(`Error with sv-${i}: ${err.message}`);
  }
}

// Dutch 1-15
for (let i = 1; i <= 15; i++) {
  try {
    const data = JSON.parse(readFileSync(`phase3-nl-${i}.json`, 'utf-8'));
    delete data.author_id;
    allSQL.push(`-- Dutch post ${i}: ${data.title.substring(0, 50)}`);
    allSQL.push(generateInsert(data));
    allSQL.push('');
  } catch (err) {
    console.error(`Error with nl-${i}: ${err.message}`);
  }
}

// Japanese 48-61
for (let i = 48; i <= 61; i++) {
  try {
    const content = readFileSync(`ja-complete-post-${i}.md`, 'utf-8');
    const titleMatch = content.match(/^##\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Post ${i}`;
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const metaMatch = content.match(/##\s+.+\n\n(.+?)\n/);
    const meta = metaMatch ? metaMatch[1].substring(0, 160) : '';
    
    const data = {
      title,
      slug,
      content,
      meta_description: meta,
      reading_time: Math.ceil(content.split(/\s+/).length / 200),
      language: 'ja',
      status: 'published'
    };
    
    allSQL.push(`-- Japanese post ${i}: ${title.substring(0, 50)}`);
    allSQL.push(generateInsert(data));
    allSQL.push('');
  } catch (err) {
    console.error(`Error with ja-${i}: ${err.message}`);
  }
}

writeFileSync('all-phase3-inserts.sql', allSQL.join('\n'));
console.log(`✅ Generated ${allSQL.filter(line => line.startsWith('INSERT')).length} INSERT statements in all-phase3-inserts.sql`);
