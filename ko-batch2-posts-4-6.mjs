#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  {
    slug: 'ko-chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
    title: '셰프 살인 미스터리 테마: 요리 범죄와 주방 비밀',
    content: `*게시일: 2026년 2월 16일 | 업데이트: 2026년 2월 20일 | 작성자: Mystery Maker Party Team | 다음 검토: 2026년 5월 20일*

*10,000개 이상의 살인 미스터리 파티 분석 및 셰프 엔터테인먼트 트렌드 연구를 기반으로 함*

## 셰프 살인 미스터리: 시장 동향 및 인기

셰프 엔터테인먼트 및 체험 관광 시장은 지속적인 강력한 성장을 보여줍니다:

| 통계 | 값 | 출처 |
|------|-----|------|
| 글로벌 요리 관광 시장 | 115억 달러 (2030년까지 405억 달러 예상) | Grand View Research, 2023 |
| 미국 요리 관광 성장 | 2030년까지 연평균 19.2% | Grand View Research, 2024 |
| 요리 수업 시장 규모 | 68억 달러 (2033년까지 147억 달러 예상) | Dataintelo, 2024 |
| 요리 수업을 받는 미국인 | 북미 성인의 48% | International Culinary Tourism Association, 2023 |

> "요리 관광은 체험 여행의 가장 빠르게 성장하는 분야입니다. 사람들은 단순히 훌륭한 음식을 먹는 것을 원하지 않습니다 — 그들은 그것을 이해하고, 만들고, 그 뒤에 있는 문화와 연결되기를 원합니다." — Erik Wolf, World Food Travel Association 전무이사 (2023)

요리 전문성, 주방 접근성, 음식 지식을 독, 경쟁, 레스토랑 드라마가 치명적인 시나리오를 만드는 수사에 가져오는 셰프 캐릭터를 특징으로 하는 살인 미스터리를 원하시나요? 독성 물질, 준비 방법, 무대 뒤 레스토랑 운영에 대한 전문 지식으로 요리 전문가가 음식 중심 범죄에서 용의자, 피해자 또는 수사관이 되는 방법을 탐구해 봅시다.

**완벽한 셰프 미스터리를 만들 준비가 되셨나요? 진정한 레스토랑 역학, 설득력 있는 음식 관련 살인, 그리고 전문적 경쟁, 중독 기회, 음식에 대한 열정이 폭력의 동기가 되는 주방 시나리오를 생성하세요.**

*읽는 시간: 14분*`,
    meta_description: '레스토랑 드라마, 식중독, 요리 경쟁을 탐색하는 셰프 캐릭터를 특징으로 하는 살인 미스터리를 만드세요.',
    reading_time: 14
  },
  {
    slug: 'ko-cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
    title: '크루즈 선박 살인 미스터리 파티 가이드: 공해상의 살인을 위해 출항하다',
    content: `*게시일: 2026년 2월 16일 | 업데이트: 2026년 2월 26일 | 작성자: Mystery Maker Party Team | 다음 검토: 2026년 5월 26일*

*10,000개 이상의 살인 미스터리 파티 분석 및 크루즈 선박 엔터테인먼트 연구를 기반으로 함*

## 크루즈 선박 살인 미스터리: 시장 동향 및 인기

크루즈 선박 엔터테인먼트 및 이벤트 시장은 강력한 참여를 보여줍니다:

| 통계 | 값 | 출처 |
|------|-----|------|
| 글로벌 크루즈 승객 | 3,460만 명 (2024), 2019년 대비 17% 초과 | CLIA State of Industry Report, 2024 |
| 크루즈 산업 경제 영향 | 1,686억 달러, 160만 개 일자리 지원 | CLIA, 2023 |
| 럭셔리 크루즈 시장 | 약 75억 달러 (2032년까지 150억 달러 예상) | Future Data Stats, 2024 |
| 나일강의 죽음 문화 영향 | 책: 1억 부 이상 판매; 영화: 3억 5천만 달러 이상 박스오피스 | Agatha Christie Estate / Box Office Mojo, 2024 |

> "크루즈 선박 미스터리는 우아함과 밀폐공포증을 결합하기 때문에 시대를 초월합니다 - 살인자와 함께 갇힌 우아한 승객들. 완벽한 폐쇄형 미스터리 공식입니다." - Martin Edwards, Crime Writers' Association 의장 & 미스터리 역사가 (2023)

럭셔리 해양 여행의 우아함과 고립을 포착하는 크루즈 선박 살인 미스터리 파티를 만들고 싶으신가요? **핵심은 우아한 식사 분위기와 바다에 있는 자연스러운 구속을 결합하는 것입니다—승객과 승무원이 용의자가 되고, 사회적 역학이 살인 동기에 완벽한 은폐를 제공하며, 끝없는 바다가 모든 사람을 함께 가두는 고립을 만듭니다.**

**완벽한 해양 미스터리를 디자인할 준비가 되셨나요? 맞춤 크루즈 선박 미스터리를 만드세요—그룹에 맞춘 우아한 해양 항해, 선상 드라마, 공해 수사를 디자인하세요.**

*읽는 시간: 11분*`,
    meta_description: '승객, 승무원, 공해 드라마를 특징으로 하는 럭셔리 크루즈 선박 미스터리 파티로 살인을 위해 출항하세요.',
    reading_time: 8
  },
  {
    slug: 'ko-detective-murder-mystery-themes-professional-investigators-sleuth-dynamics',
    title: '탐정 살인 미스터리 테마: 전문 수사관과 탐정 역학',
    content: `*게시일: 2026년 2월 23일 | 업데이트: 2026년 2월 23일 | 작성자: Mystery Maker Party Team | 다음 검토: 2026년 5월 23일*

*10,000개 이상의 살인 미스터리 파티 분석 및 탐정 캐릭터 미스터리 엔터테인먼트 연구를 기반으로 함*

## 탐정 캐릭터 미스터리: 시장 동향 및 인기

탐정 캐릭터 미스터리 엔터테인먼트 시장은 강력한 성장과 관객 참여를 보여줍니다:

| 통계 | 값 | 출처 |
|------|-----|------|
| 글로벌 사설 조사 서비스 시장 규모 | 199억 5천만 달러 | Introspective Market Research, 2024 |
| 2032년까지 예상 시장 규모 | 287억 4천만 달러 | Introspective Market Research, 2024 |
| 시장 연평균 성장률 (2025–2032) | 4.67% | Introspective Market Research, 2024 |
| 미국 사설 탐정 및 수사관 고용 | 43,600개 일자리 | U.S. Bureau of Labor Statistics, 2024 |

> "기업 조사는 2024년 약 42%의 시장 점유율로 서비스 유형 부문을 지배했으며, 사기 탐지, 직원 배경 조사, 자산 추적, 공급업체 실사, 지적 재산 보호에 대한 기업의 강력한 수요로 인해 주도되었습니다." — Data Horizzon Research, 사설 탐정 서비스 시장 보고서 2025–2033

수사를 주도하고, 연역 추론을 적용하며, 미스터리 해결을 이끄는 수사 전문성을 시연하는 탐정 캐릭터를 특징으로 하는 살인 미스터리를 원하시나요? 전문 탐정, 아마추어 수사관, 다양한 탐정 유형이 수사 방법, 성격 특성, 분석 접근 방식이 미스터리가 전개되고 해결되는 방식을 형성하는 설득력 있는 시나리오를 만드는 방법을 탐구해 봅시다.

**완벽한 탐정 미스터리를 만들 준비가 되셨나요? 진정한 수사 방법, 설득력 있는 탐정 성격, 그리고 하드보일드 사설 탐정부터 아늑한 아마추어, 접근 방식이 미스터리가 전개되고 궁극적으로 진실을 밝히기 위한 기술, 성격, 헌신의 독특한 조합을 통해 해결되는 방식을 형성하는 컨설팅 전문가까지 다양한 수사관 유형을 생성하세요.**

*읽는 시간: 10분*`,
    meta_description: '수사를 주도하고, 연역 추론을 적용하며, 복잡한 사건을 해결하는 탐정 캐릭터를 특징으로 하는 살인 미스터리를 만드세요.',
    reading_time: 12
  }
];

async function insertPost(post) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/blog_posts`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title: post.title,
        slug: post.slug,
        content: post.content,
        meta_description: post.meta_description,
        reading_time: post.reading_time,
        language: 'ko',
        status: 'published'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully inserted: ${post.slug}`);
    return { success: true, slug: post.slug };
  } catch (error) {
    console.error(`❌ Failed to insert ${post.slug}:`, error.message);
    return { success: false, slug: post.slug, error: error.message };
  }
}

async function main() {
  console.log(`Starting Korean batch 2 insertion (posts 4-6)...\\n`);

  const results = [];

  for (const post of posts) {
    const result = await insertPost(post);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\\n=== BATCH 2 PART 2 SUMMARY ===`);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log(`\\nFailed posts:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.slug}: ${r.error}`);
    });
  }
}

main();
