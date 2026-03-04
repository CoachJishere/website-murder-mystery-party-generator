import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EN_SLUG = 'how-to-fix-confusing-murder-mystery-clues';
const KO_SLUG = 'how-to-fix-confusing-murder-mystery-clues-ko';

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
    title: '혼란스러운 살인 미스터리 단서를 고치는 방법',
    meta_description: '혼란스러운 단서를 명확하고 해결 가능하게 만드는 방법을 배워보세요. 게스트들이 포기하지 않고 계속 추리할 수 있도록 하세요!',
    content: `훌륭한 살인 미스터리는 게스트들이 생각하게 만듭니다—하지만 **혼란스럽게 만들지는 않습니다.**

당신의 게스트들이 단서를 읽고, 서로를 바라보며, 완전히 길을 잃었다고 말하는 것을 본 적이 있나요? 이는 혼란스러운 단서의 전형적인 신호입니다.

문제는? **게스트들이 이해하지 못하면, 그들은 포기합니다.**

좋은 소식은 혼란스러운 단서를 수정하는 것이 불가능하지 않다는 것입니다. 이 가이드는 명확하고, 흥미롭고, **실제로 해결 가능한** 단서를 작성하는 방법을 보여줍니다.

---

## 🎭 살인 미스터리 단서가 혼란스러운 이유

### 1. **너무 많은 정보가 한 번에**
게스트들은 세부 사항에 압도되어 무엇이 중요한지 알 수 없습니다.

### 2. **모호한 언어**
단서가 너무 추상적이거나 열린 해석을 가지고 있습니다.

### 3. **연결점 없음**
단서들이 서로 연결되지 않아, 게스트들은 점을 연결할 수 없습니다.

### 4. **관련 없는 정보**
너무 많은 방해 요소가 게스트들을 진실에서 멀어지게 합니다.

### 5. **모순된 세부 사항**
단서들이 서로 충돌하여, 게스트들은 무엇을 믿어야 할지 모릅니다.

---

## ✅ 명확하고 해결 가능한 단서를 작성하는 방법

### 🎯 **1. 각 단서를 한 가지 아이디어에 집중하세요**

**문제**: 단서가 너무 많은 것을 한 번에 시도합니다.
**해결책**: **하나의 단서 = 하나의 통찰**.

#### **시도해볼 것:**
✅ **각 단서를 하나의 핵심 정보로 제한하세요.**
✅ **여러 통찰을 여러 단서로 나누세요.**
✅ **불필요한 세부 사항을 제거하세요.**

🔴 **혼란스러운 예시**:
> *"Victoria의 일기에는 다음과 같이 적혀 있습니다: '나는 늦게까지 실험실에 있었다. Henry가 나타났고, 우리는 프로젝트에 대해 논쟁했다. Evelyn이 와서 나를 협박했다. 나는 Charles와의 거래를 끝내야 한다. Marcus가 나에게 도움을 요청했다.'"*

너무 많은 일이 일어나고 있습니다. 게스트들은 무엇에 집중해야 할지 모릅니다.

✅ **명확한 예시**:
> *"Victoria의 일기에는 다음과 같이 적혀 있습니다: '오후 9시 - Evelyn이 내 사무실에 나타나 날 협박했다. 그녀는 내가 복종하지 않으면 비밀을 폭로하겠다고 말했다.'"*

**하나의 통찰** = Evelyn은 동기가 있었고, 오후 9시에 Victoria와 있었습니다.

---

### 🎯 **2. 구체적이고 실행 가능한 언어를 사용하세요**

**문제**: 모호한 단서는 너무 많은 해석을 허용합니다.
**해결책**: **정확하고 구체적으로 작성하세요**.

#### **시도해볼 것:**
✅ **정확한 시간, 장소, 행동을 사용하세요.**
✅ **"아마도", "가능성 있는", "추측건대"와 같은 단어를 피하세요.**
✅ **측정 가능한 세부 사항을 포함하세요.**

🔴 **혼란스러운 예시**:
> *"누군가가 밤 늦게 서재 근처에 있었습니다."*

누가? 얼마나 늦게? 근처는 얼마나 가까이?

✅ **명확한 예시**:
> *"집사 James는 오후 11시 30분에 서재 밖에 서 있는 Marcus를 목격했습니다."*

**정확한 세부 사항** = 확인 가능한 단서.

---

### 🎯 **3. 단서가 논리적으로 연결되도록 하세요**

**문제**: 단서들이 고립되어 있어, 게스트들은 점을 연결할 수 없습니다.
**해결책**: **단서 체인을 만드세요**—각 단서는 다음 단서로 이어집니다.

#### **시도해볼 것:**
✅ **단서 1은 단서 2로 이어져야 합니다.**
✅ **최종 결론을 향해 역방향으로 작업하세요.**
✅ **게스트들이 패턴을 발견할 수 있는지 테스트하세요.**

🎭 **예시 체인**:
1. **단서 1**: Victoria는 오후 10시에 독살되었습니다.
2. **단서 2**: 주방 직원은 오후 9시 45분에 Marcus가 음료를 준비하는 것을 목격했습니다.
3. **단서 3**: Marcus의 방에서 빈 독 병이 발견되었습니다.

**명확한 경로**: Marcus는 음료를 준비했다 → 독을 접근할 수 있었다 → 살인을 저질렀을 수 있다.

게스트들은 이제 **논리를 따를 수 있습니다**.

---

### 🎯 **4. 방해 요소를 전략적으로 사용하세요**

**문제**: 너무 많은 관련 없는 단서가 게스트들을 압도합니다.
**해결**: **방해 요소를 의도적으로 만드세요**—제거할 수 있어야 합니다.

#### **시도해볼 것:**
✅ **핵심 단서 3개마다 방해 요소 1개를 포함하세요.**
✅ **방해 요소가 너무 설득력 있게 만들지 마세요.**
✅ **게스트들이 틀린 단서를 배제할 수 있는지 확인하세요.**

🔴 **혼란스러운 방해 요소**:
> *"Evelyn의 지갑에 수수께끼의 열쇠가 있었습니다. 아무도 그것이 무엇을 여는지 모릅니다."*

이것은 아무데도 가지 않습니다—게스트들은 좌절합니다.

✅ **좋은 방해 요소**:
> *"Evelyn의 지갑에 열쇠가 있었지만, 그것은 그녀의 호텔 방과 일치합니다—그녀는 머물고 있었습니다."*

**배제 가능함** = 게스트들은 계속 진행할 수 있습니다.

---

### 🎯 **5. 모순된 증거를 신중하게 다루세요**

**문제**: 모순이 게스트들을 혼란스럽게 합니다.
**해결책**: **의도적인 모순만 사용하세요**—그리고 그것들이 해결 가능한지 확인하세요.

#### **시도해볼 것:**
✅ **모순이 플롯 포인트인 경우(거짓말, 은폐), 게스트들이 그것을 발견할 수 있게 하세요.**
✅ **우발적인 모순을 피하세요—타임라인과 사실을 다시 확인하세요.**
✅ **게스트들이 모순을 조사하도록 격려하세요.**

🎭 **예시**:
> *증인 A: "Marcus는 저녁 내내 응접실에 있었습니다."*
> *증인 B: "저는 오후 10시에 Marcus가 서재에서 나오는 것을 봤습니다."*

**의도적인 모순** → 누군가가 거짓말을 하고 있습니다. 게스트들은 **누가 그리고 왜인지** 찾아야 합니다.

---

### 🎯 **6. 단서를 논리적으로 구조화하세요**

**문제**: 단서가 무작위로 나타나, 게스트들은 순서를 알 수 없습니다.
**해결책**: **단서를 라운드로 구성하세요**.

#### **시도해볼 것:**
✅ **라운드 1: 기본 사실**(피해자, 시간, 방법)
✅ **라운드 2: 동기와 의심**(누가 이익을 얻는가?)
✅ **라운드 3: 확증 증거**(누가 그것을 했는가?)

🎭 **예시 구조**:
1. **라운드 1**: 게스트들은 살인이 독살이었다는 것을 배웁니다.
2. **라운드 2**: 게스트들은 누가 독에 접근할 수 있었는지 발견합니다.
3. **라운드 3**: 게스트들은 범인을 증거와 연결하는 최종 단서를 찾습니다.

**점진적인 폭로** = 게스트들은 압도되지 않습니다.

---

### 🎯 **7. 단서를 큰 소리로 테스트하세요**

**문제**: 당신에게 명확해 보이는 것이 다른 사람에게는 혼란스러울 수 있습니다.
**해결책**: **누군가에게 단서를 읽게 하세요**.

#### **시도해볼 것:**
✅ **친구에게 단서를 보여주고 그들이 무엇을 이해하는지 물어보세요.**
✅ **게스트가 처음 들을 때 단서를 큰 소리로 읽으세요.**
✅ **혼란스러운 부분을 다시 작성하세요.**

🎭 **테스트 질문**:
- 이 단서가 무엇을 말하고 있나요?
- 이것이 당신에게 무엇을 말해주나요?
- 다음에 무엇을 할 건가요?

만약 테스터가 **막히면**, 단서를 **명확히 하세요**.

---

## 🚨 피해야 할 일: 혼란스러운 단서 실수

❌ **단서 과부하**—너무 많은 정보를 한 번에 제공하지 마세요.
❌ **모호한 힌트**—추측 게임이 아닙니다.
❌ **임의의 세부 사항**—모든 단서는 중요해야 합니다.
❌ **설명되지 않은 모순**—우발적인 오류를 피하세요.
❌ **테스트하지 않은 단서**—항상 파일럿 테스트를 하세요.

---

## 🎉 최종 생각: 명확한 단서 = 더 나은 미스터리

혼란스러운 단서는 **훌륭한 미스터리를 망칩니다**. 하지만 명확하고, 연결되고, 해결 가능한 단서로, 당신의 게스트들은 **참여하고, 추리하고, 해결할 것입니다.**

### ✅ 빠른 체크리스트:
✔ 각 단서를 한 가지 아이디어에 집중하세요
✔ 구체적이고 실행 가능한 언어를 사용하세요
✔ 단서를 논리적으로 연결하세요
✔ 방해 요소를 전략적으로 사용하세요
✔ 모순을 신중하게 다루세요
✔ 단서를 라운드로 구조화하세요
✔ 항상 큰 소리로 테스트하세요

명확한 단서로, 당신의 미스터리는 **게스트들을 혼란스럽게 하지 않고 도전할 것입니다.** 🎭🔍`
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
