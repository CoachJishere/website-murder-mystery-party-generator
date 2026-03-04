# Translation Brief: Chinese Simplified (zh-cn) - 47 Posts

## Database Connection
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mhfikaomkmqcndqfohbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8');
```

## Find Posts
```javascript
const { data: posts } = await supabase.from('blog_posts').select('*').eq('language', 'en').gte('updated_at', '2026-02-20T00:00:00');
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key Chinese Simplified Translations

**E-E-A-T**: `*发布日期：2026年2月16日 | 更新日期：2026年2月20日 | 作者：Mystery Maker Party 团队 | 下次审核：2026年5月20日*`

**Research**: `*基于对10,000多场谋杀之谜派对和[theme]研究的分析*`

**Headers**:
- "Market Trends & Popularity" → "市场趋势与受欢迎程度"
- "What 10,000+ Mystery Parties Have Taught Us" → "10,000多场谋杀之谜派对教给我们的"
- "Sources & References" → "来源与参考文献"
- "FAQ" → "常见问题"

**Table**: `| 统计数据 | 数值 | 来源 |`

**Reading time**: "阅读时间：X分钟"

**Bullets**: "完美的主题整合", "角色真实性", "调查清晰度", "氛围平衡", "定制参与"

## Insert
```javascript
const chinesePost = { slug: englishPost.slug, title: translatedTitle, content: translatedContent, meta_description: translatedMetaDescription, language: 'zh-cn', reading_time: englishPost.reading_time, created_at: englishPost.created_at, updated_at: new Date().toISOString() };
const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'zh-cn').single();
if (!existing) { await supabase.from('blog_posts').insert(chinesePost); }
```

**Quality**: Simplified characters only, formal tone, culturally adapt Western examples

**Language Code**: zh-cn | **Target**: 47 posts
