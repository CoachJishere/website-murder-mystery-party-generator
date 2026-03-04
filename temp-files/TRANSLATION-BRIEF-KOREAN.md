# Translation Brief: Korean (ko) - 47 Posts

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

## Key Korean Translations

**E-E-A-T**: `*게시일: 2026년 2월 16일 | 업데이트: 2026년 2월 20일 | 저자: Mystery Maker Party 팀 | 다음 검토: 2026년 5월 20일*`

**Research**: `*10,000개 이상의 살인 미스터리 파티와 [theme] 연구 분석 기반*`

**Headers**:
- "Market Trends & Popularity" → "시장 동향 및 인기"
- "What 10,000+ Mystery Parties Have Taught Us" → "10,000개 이상의 미스터리 파티가 우리에게 가르쳐준 것"
- "Sources & References" → "출처 및 참고문헌"
- "FAQ" → "자주 묻는 질문"

**Table**: `| 통계 | 값 | 출처 |`

**Reading time**: "읽는 시간: X분"

**Bullets**: "완벽한 주제 통합", "캐릭터 진정성", "조사 명확성", "분위기 균형", "맞춤형 참여"

## Insert
```javascript
const koreanPost = { slug: englishPost.slug, title: translatedTitle, content: translatedContent, meta_description: translatedMetaDescription, language: 'ko', reading_time: englishPost.reading_time, created_at: englishPost.created_at, updated_at: new Date().toISOString() };
const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'ko').single();
if (!existing) { await supabase.from('blog_posts').insert(koreanPost); }
```

**Quality**: Use 존댓말 (polite form), Hangul primary with Hanja for clarity, adapt Western examples

**Language Code**: ko | **Target**: 47 posts
