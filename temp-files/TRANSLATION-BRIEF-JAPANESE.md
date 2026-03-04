# Translation Brief: Japanese (ja) - 47 Posts

## Mission
Translate 47 optimized English murder mystery blog posts to Japanese and insert them into the Supabase database.

## Database Connection
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);
```

## Find Posts
```javascript
const { data: posts } = await supabase.from('blog_posts').select('*').eq('language', 'en').gte('updated_at', '2026-02-20T00:00:00');
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key Japanese Translations

**E-E-A-T Header**:
- `*公開日：2026年2月16日 | 更新日：2026年2月20日 | 著者：Mystery Maker Party チーム | 次回レビュー：2026年5月20日*`

**Research Statement**:
- `*10,000以上のマーダーミステリーパーティーと[theme]研究の分析に基づく*`

**Section Headers**:
- "Market Trends & Popularity" → "市場動向と人気"
- "What 10,000+ Mystery Parties Have Taught Us" → "10,000以上のミステリーパーティーから学んだこと"
- "Sources & References" → "出典と参考文献"
- "Frequently Asked Questions" → "よくある質問"

**Table Headers**:
- `| 統計 | 値 | 出典 |`

**Common Phrases**:
- "Reading time: X minutes" → "読了時間：X分"

**Bullet Points**:
- "Perfect Thematic Integration" → "完璧なテーマ統合"
- "Character Authenticity" → "キャラクターの真正性"
- "Investigation Clarity" → "調査の明確性"
- "Atmospheric Balance" → "雰囲気のバランス"
- "Customized Engagement" → "カスタマイズされたエンゲージメント"

## Insert Japanese Version
```javascript
const japanesePost = {
  slug: englishPost.slug,
  title: translatedTitle,
  content: translatedContent,
  meta_description: translatedMetaDescription,
  language: 'ja',
  reading_time: englishPost.reading_time,
  created_at: englishPost.created_at,
  updated_at: new Date().toISOString()
};

const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'ja').single();
if (!existing) { await supabase.from('blog_posts').insert(japanesePost); }
```

## Quality Guidelines
1. **Formality**: Use polite です/ます form
2. **Kanji**: Use appropriate kanji with furigana for difficult terms
3. **Cultural Adaptation**: Adapt Western examples to Japanese context where appropriate
4. **Numbers**: Use Arabic numerals (1, 2, 3) not Japanese numerals
5. **Spacing**: No spaces between Japanese characters

**Language Code**: ja | **Target**: 47 posts
