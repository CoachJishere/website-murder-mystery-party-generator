import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EN_SLUG = 'how-to-fix-boring-murder-mystery-parties';
const KO_SLUG = 'how-to-fix-boring-murder-mystery-parties-ko';

async function translateAndInsert() {
  // Fetch English source
  console.log(`Fetching English post: ${EN_SLUG}...`);
  const fetchResponse = await fetch(
    `${SUPABASE_URL}?slug=eq.${EN_SLUG}&language=eq.en&status=eq.published&select=*`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const [sourcePost] = await fetchResponse.json();

  if (!sourcePost) {
    console.error('Source post not found!');
    return;
  }

  console.log('Source post found:', sourcePost.title);

  // Korean translation
  const koPost = {
    language: 'ko',
    slug: KO_SLUG,
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: sourcePost.tags,
    theme: sourcePost.theme,
    featured_image_url: sourcePost.featured_image_url,
    title: '지루한 살인 미스터리 파티를 고치는 방법',
    meta_description: '지루한 살인 미스터리 파티를 전환하는 방법을 배워보세요! 게스트를 몰입시키고, 모멘텀을 유지하며, 모두가 기억할 스릴 넘치는 이벤트를 만드세요.',
    content: `지루한 파티만큼 실망스러운 것은 없습니다. 당신은 모든 것을 계획했습니다—단서, 캐릭터, 살인—하지만 게스트들은 멍하니 앉아 있습니다. 에너지가 바닥나고, 대화는 끊기며, 살인 미스터리는... 흥미롭지 않습니다.

좋은 소식은? **지루함은 해결 가능합니다.**

이 가이드는 지루한 살인 미스터리 파티를 몰입감 있고 흥미진진한 경험으로 바꾸는 방법을 보여줍니다.

---

## 🎭 살인 미스터리 파티가 지루한 이유

### 1. **페이싱이 너무 느립니다**
게스트들은 대기하고 있습니다. 할 일이 없습니다. 에너지가 떨어집니다.

### 2. **역할 참여가 부족합니다**
일부 게스트는 신나지만, 다른 게스트는 배경에 서 있습니다.

### 3. **동기가 약합니다**
캐릭터에게 목표가 없다면, 게스트는 참여할 이유가 없습니다.

### 4. **모멘텀이 사라집니다**
게임이 중간에 멈추고, 게스트들은 관심을 잃습니다.

### 5. **단서가 너무 뚜렷하거나 너무 숨겨져 있습니다**
추측이 너무 쉬우면, 게임은 평평하게 느껴집니다. 너무 어려우면, 게스트들은 포기합니다.

---

## ✅ 살인 미스터리 파티를 흥미롭게 만드는 방법

### 🎯 **1. 소개부터 강하게 시작하세요**

**문제**: 게스트들은 게임에 천천히 진입합니다.
**해결책**: 즉시 페르소나에 몰입시키세요.

#### **시도해볼 것:**
✅ **도착과 동시에 캐릭터 시트를 제공하세요**—게스트들이 즉시 읽을 수 있습니다.
✅ **"맥락 설정" 비디오나 오디오 클립으로 시작하세요**—게스트들에게 상황을 전달합니다.
✅ **첫 15분 이내에 살인을 소개하세요**—지체하지 마세요!

🎭 **예시**:
> *"저녁 식사가 시작되기 전에, 당신은 Victoria Ashford가 방금 그녀의 연구실에서 죽은 채 발견되었다는 것을 알게 됩니다. 누가 그녀를 죽였을까요? 그리고 왜?"*

즉시 참여 → 즉시 음모.

---

### 🎯 **2. 게스트들이 적극적으로 참여하도록 유지하세요**

**문제**: 게스트들은 단서를 읽고... 그게 전부입니다.
**해결책**: 그들에게 **하고 탐색할 것**을 제공하세요.

#### **시도해볼 것:**
✅ **숨겨진 단서를 사용하세요**—메모, 편지, 소품을 집 주변에 배치하세요.
✅ **미니 챌린지를 추가하세요**—암호, 수수께끼, 신체 활동.
✅ **일대일 비밀 대화를 장려하세요**—게스트들이 서로를 조사하게 하세요.

🎭 **예시**:
> *"Victoria의 금고를 열려면, 세 가지 다른 캐릭터에게서 코드를 모아야 합니다."*

게스트들은 **앉아만 있지 않습니다**—그들은 단서를 찾고 질문하고 연결합니다.

---

### 🎯 **3. 강력한 캐릭터 동기를 만드세요**

**문제**: 게스트들은 목표가 없고, 그래서 관심을 잃습니다.
**해결책**: 모든 캐릭터에게 **달성할 무언가**를 제공하세요.

#### **시도해볼 것:**
✅ **비밀 목표**—캐릭터에게 숨겨진 의제를 부여하세요.
✅ **경쟁 목표**—캐릭터들이 같은 보상을 원하게 만드세요.
✅ **폭로를 막는 동기**—캐릭터들이 숨길 것이 있게 하세요.

🎭 **예시**:
> *당신의 목표: 그녀가 당신에 대한 정보를 공개하기 전에 Victoria의 비밀 일기를 회수하세요.*

게스트들은 이제 **단지 해결하는 것이 아니라**—그들은 **경쟁하고, 협상하고, 전략을 세웁니다.**

---

### 🎯 **4. 타이밍된 폭로로 모멘텀을 유지하세요**

**문제**: 게임이 중간에 멈춥니다.
**해결책**: **전략적으로 새로운 정보를 공개하세요**.

#### **시도해볼 것:**
✅ **라운드로 미스터리를 구조화하세요**—30분마다, 새로운 단서가 나타납니다.
✅ **놀라운 트위스트를 추가하세요**—아무도 예상하지 못한 폭로.
✅ **타이머를 사용하세요**—"다음 단서가 20분 후에 나타납니다!"

🎭 **예시**:
> *"라운드 2: 검시관의 보고서가 방금 도착했습니다. Victoria는 독살되지 않았습니다—그녀는 질식했습니다."*

갑자기, 게스트들은 **다시 생각해야 합니다**. 에너지가 돌아옵니다.

---

### 🎯 **5. 게임의 어려움을 균형 있게 조정하세요**

**문제**: 너무 쉬우면, 게스트들은 지루해합니다. 너무 어려우면, 그들은 포기합니다.
**해결책**: **점진적으로 복잡성을 높이세요**.

#### **시도해볼 것:**
✅ **명백한 단서로 시작하세요**—게스트들이 자신감을 얻게 합니다.
✅ **중간에 곡선구를 추가하세요**—예상치 못한 것을 도입합니다.
✅ **힌트 시스템을 사용하세요**—게스트들이 막히면, 약간의 넛지를 제공하세요.

🎭 **예시**:
> *"먼저, 게스트들은 피해자의 일정을 찾습니다(쉬움). 그런 다음, 그들은 암호화된 메시지를 해독해야 합니다(중간). 마지막으로, 그들은 모순된 진술을 연결합니다(어려움)."*

도전은 **점진적으로 증가합니다**—게스트들은 참여하지만 압도되지 않습니다.

---

### 🎯 **6. 재미있는 역할극을 장려하세요**

**문제**: 게스트들은 캐릭터에서 벗어납니다.
**해결책**: **게스트들이 연기하고 싶게 만드세요**.

#### **시도해볼 것:**
✅ **재미있는 악센트나 의상을 제공하세요**—게스트들이 페르소나에 몰입하게 합니다.
✅ **최고의 역할극에 보상하세요**—작은 상품이나 인정.
✅ **즉흥 순간을 만드세요**—캐릭터들이 즉석에서 반응할 기회.

🎭 **예시**:
> *"가장 드라마틱한 캐릭터 순간 상을 수여합니다!"*

게스트들이 연기에 신경 쓰면, 에너지는 **급증합니다**.

---

### 🎯 **7. 음악과 분위기를 사용하세요**

**문제**: 방은 너무 조용하고 생기가 없습니다.
**해결책**: **감각으로 장면을 설정하세요**.

#### **시도해볼 것:**
✅ **테마 음악을 재생하세요**—재즈, 클래식, 또는 긴장감 있는 사운드트랙.
✅ **조명을 조정하세요**—약간 어둡게 = 더 몰입감 있게.
✅ **소품과 장식을 추가하세요**—게스트들을 설정에 빠뜨립니다.

🎭 **예시**:
> *낮은 조명, 재즈 음악, 빈티지 소품이 있는 1920년대 살인 미스터리.*

분위기가 **경험을 향상시킵니다**—게스트들은 **느끼고** 참여합니다.

---

## 🚨 피해야 할 일: 지루한 미스터리의 실수

❌ **너무 많은 앉아서 읽기**—게스트들을 움직이게 하세요!
❌ **지나치게 복잡한 플롯**—단순하고 흥미롭게 유지하세요.
❌ **동일한 페이스**—에너지를 변화시키세요!
❌ **스크립팅된 상호작용만**—게스트들이 즉흥적으로 하게 하세요.
❌ **명확한 승리 조건 없음**—게스트들은 무엇을 위해 일하는지 알아야 합니다.

---

## 🎉 최종 생각: 살인 미스터리 파티를 잊을 수 없게 만드세요

지루한 살인 미스터리는 대개 **동일한 문제**에서 발생합니다:
❌ 느린 페이싱
❌ 약한 동기
❌ 제한된 상호작용

하지만 **올바른 조정**으로, 당신은 게스트들을 **처음부터 끝까지 참여시킬 수 있습니다**.

### ✅ 빠른 체크리스트:
✔ 강한 오프닝으로 시작하세요
✔ 게스트들이 적극적으로 참여하도록 유지하세요
✔ 명확한 동기를 부여하세요
✔ 타이밍된 폭로로 모멘텀을 유지하세요
✔ 어려움을 균형 있게 조정하세요
✔ 역할극과 분위기를 장려하세요

당신의 다음 살인 미스터리는 **전혀 지루하지 않을 것입니다.** 🎭🔍`
  };

  // Insert Korean post
  console.log('\nInserting Korean translation...');
  const insertResponse = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(koPost)
  });

  if (!insertResponse.ok) {
    const error = await insertResponse.text();
    console.error('Insert failed:', error);
    return;
  }

  const [insertedPost] = await insertResponse.json();
  console.log('✅ SUCCESS! Korean post created:');
  console.log(`   ID: ${insertedPost.id}`);
  console.log(`   Slug: ${insertedPost.slug}`);
  console.log(`   Title: ${insertedPost.title}`);
}

translateAndInsert().catch(console.error);
