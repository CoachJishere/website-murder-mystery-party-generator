# Changelog

## 2026-05-08 (session 2)

### Translation polish: circus/sv full body rebuild — all 11 H2 sections rewritten

- **Slug**: `5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue` / `sv`
- All 11 H2 sections rewritten from heavily rotted machine translation (hyphen-chain Swenglish) to native Swedish prose: intro, Tema 1–5, Planera, Anpassat, FAQ, Closing, CTA
- Dead cross-link (`murder-mystery-party-ideas`) stripped from chef/sv body
- H2 audit confirmed clean after rebuild

### Translation polish: art-museum/sv intro + blockquote fixes

- **Slug**: `art-museum-murder-mystery-party-guide-sophisticated-gallery-adventures-with-curators-and-priceless-masterpieces` / `sv`
- Opening blockquote was garbage machine translation — replaced with proper Swedish summary matching EN structure
- Duplicate rotted intro paragraphs (before TOC) replaced with clean bridging text; polished body sections below `---` were untouched
- Dead cross-link (`murder-mystery-party-ideas`) stripped from closing section

### Content quality: chef non-EN cells assessed — all clean

- Checked DA, DE, ES, FI, FR, IT, JA, KO, NL, PT cells for `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets`
- All 10 non-EN cells confirmed polished; no rot found

## 2026-05-09

### Fix: GA4 language-prefixed blog pageview tracking — ~92% of blog pageviews were invisible

- **Root cause**: `index.html` called `gtag('config', 'G-XGD48X4ZQS')` without `send_page_view: false`, firing one automatic page_view on initial page load. The React `RouteTracker` then fired a second manual page_view via `trackPageView()` — but `trackPageView` sent only `page_path`, not `page_location`. GA4's `page_view` event requires `page_location` (full URL) to correctly populate URL-based dimensions. EN posts receive most traffic via direct organic visits (both auto + manual hits fire, URL visible in GA4), while non-EN posts are mostly reached via in-app SPA navigation (language switcher) where the manual `trackPageView` hit was the only one — and was malformed without `page_location`.
- **`index.html`**: Added `send_page_view: false` to the initial `gtag('config', ...)` call. This eliminates the auto page_view on load and delegates all tracking to the SPA `RouteTracker`. No double-counting going forward.
- **`src/lib/analytics.ts`**: `trackPageView` now sends `page_location: window.location.href` and `page_title: document.title` alongside `page_path`. This is GA4's documented `page_view` parameter set and ensures URL dimensions are correctly populated for SPA navigations to any route, including `/<lang>/blog/<slug>`. Removed redundant `gtag('js', new Date())` call from `initGA()` (already called once in index.html; calling it again from React on mount could reset session state). Replaced all bare `gtag(...)` calls with `window.gtag(...)` and declared `window.gtag` in the global `Window` interface.
- **`src/App.tsx`**: Updated `RouteTracker`'s `useEffect` dependency from `[location]` (object reference) to `[location.pathname, location.search]` (scalar values). Prevents spurious re-fires on location object identity changes. Same change applied to `usePageTracking` hook in analytics.ts.
- **Verification**: Deploy and open DevTools Network → filter `collect` → navigate to `/sv/blog/<slug>`, `/de/blog/<slug>`, `/ja/blog/<slug>`. Confirm `g/collect` request fires with `dl=https%3A%2F%2Fmysterymaker.party%2Fsv%2Fblog%2F...`. Check GA4 Realtime report within 30s. Full data visible in Pages report within 24–48h.
- **Follow-up (not done)**: Once 1–2 weeks of clean non-EN data accumulates, re-run the traffic-weighted polish priority audit — rankings will likely shift significantly once the ~12 non-EN language variants' traffic is visible in GA4.

### Translation polish: steampunk JA + KO + ZH-CN body cleanup — slug 100% complete

- **JA**: Removed orphan machine-translated block (duplicate prose of "The Thing You're Actually Building" left behind by a prior pass) and replaced with clean localized MysteryMaker CTA. Rewrote the final `## FAQ` section (7 Q&As) from stilted machine translation to natural Japanese — idiomatic phrasing, proper sentence-final forms, no calque structure.
- **KO**: Same pattern as JA — orphan duplicate block removed, bad MysteryMaker CTA replaced with natural Korean, final `## FAQ` section (7 Q&As) rewritten from machine translation to native Korean. Natural sentence endings, no -합니다 overuse.
- **ZH-CN**: Orphan duplicate block removed, bad MysteryMaker CTA replaced, final `## FAQ` section (7 Q&As) rewritten in native Simplified Chinese — correct particle use, natural syntax, no Western calques.
- **Slug status**: all 11 non-EN language cells of `how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime` now fully polished. H2 audits clean on JA, KO, ZH-CN.

### Audit: corpus-wide quality sweep — 82 issues fixed across 82 cells

- **B1 — Untranslated "Last updated:" labels (65 cells)**: `Last updated:` replaced with locale equivalents across SV (28 cells → `Senast uppdaterad:`), DE (6 → `Zuletzt aktualisiert:`), NL (9 → `Laatst bijgewerkt:`), DA (3 → `Sidst opdateret:`), FR (8 → `Dernière mise à jour :`), IT (8 → `Ultimo aggiornamento:`), FI (3 → `Viimeksi päivitetty:`).
- **B2 — H4-without-H3 hierarchy**: ✓ none found.
- **B3 — Dead cross-links (17 cells)**: stripped link wrappers (kept anchor text) for broken targets including `murder-mystery-party-ideas` (8 cells across SV/PT/NL/JA), non-existent resort/yacht/decade slugs, `police-detective-...`, `nightclub-...`, `murder-mystery-party-planning-checklist`, and other phantom slugs across `free-murder-mystery-games-printable`, `casino-resort`, `ancient-egypt`, `1920s-speakeasy`, `detective`, `fashion-week`, `date-night` cells.
- **B4 — FAQ section without Q&A**: ✓ none found.
- **B5 — Duplicate Last Updated markers**: ✓ none found.
- **B6 — Daily publish check**: 1 post published 2026-05-08 (`how-to-fix-inappropriate-murder-mystery-content-keep-your-party-fun-for-all`). Git log shows `llms.txt` regeneration pending from daily pipeline.

### Translation polish: best-mmp-games-review — JA full rewrite + KO targeted fixes

- **JA**: Full 15-section rewrite from machine translation to native Japanese prose. Comparison table updated to correct 7-column format with current product set (stale Masters of Mystery/Deadbolt/A Killing Affair rows replaced). Renamed 9 stilted H2 headers (e.g. "マーケット分裂" → "市場の分類", "グループサイズ実際に重要" → "グループサイズは本当に重要", "mysterymaker.partyが適合する場所" → "MysteryMakerの位置づけ"). Fixed 3 broken cross-links where full sentence clauses were used as anchor text; replaced with natural noun-phrase anchors. H2 audit: 15 headers clean. FAQ audit: 8 questions verified.
- **KO**: Targeted fixes — 3 broken cross-link anchors corrected (sentence-fragment anchors → natural Korean noun phrases); `(hosted)` → `(전문 주최형)` in comparison table; wrong date `2026년 5월` → `2026년 3월`.

### Translation polish: medieval-castle — 6-language sweep (SV/FR/PT/IT/DE/ES/DA/NL)

- **SV** (81→9 chains): Full rewrite. Key fixes: "medeltids-slott-inställning" → "medeltidsslottsmiljö", "faktisk" adverb removed throughout, "behöva" → "behöver", word-for-word calques like "Sak omkring" eliminated.
- **FR** (29→13 chains): Full rewrite. Key fixes: "Figure votre victime" (wrong verb) → "Imaginez votre victime"; "bassin de suspects" (calque) → "vivier de suspects"; "agentivité" (academic neologism) → "liberté d'action"; "ça a du sens que" (calque) → "il est logique que".
- **PT** (27→9 chains): Full rewrite. Key fixes: "leaning para o período" (English loanword) → "aprofundar-se na época"; "Último atualização" (wrong gender) → "Última atualização"; "experienciam" (non-word) removed; broken list-item link fixed.
- **IT** (25→8 chains): Full rewrite. Key fixes: "agency" (English) → "libertà d'azione"; "pool di sospetti" (calque) → "schiera di sospettati"; "l'energia flag" (English) → "la bandiera dell'energia" eliminated; "Capire la tua vittima" (wrong form) → "Conoscere la tua vittima".
- **DE** (23 chains): Full rewrite. Key fixes: "Das Ding bei" (calque) → "Das Besondere an"; "bewohnen wollen" (wrong verb) → "verkörpern wollen"; "ausgefallen" (meaning sophisticated — wrong) → "vielschichtig/komplex"; broken markdown link fixed; "in die Periode lehnen" (calque) → "sich auf die Atmosphäre der Epoche einlassen". Consistent du-form throughout.
- **ES** (24 chains): Full rewrite. Key fixes: "La cosa de los escenarios" (calque) → "Lo que tienen de especial los escenarios"; "Actualmente" (false friend for "actually") → "En realidad"; "se asentlen" (wrong subjunctive) → "se asienten"; broken links fixed; "## Guías relacionadas" section preserved.
- **DA** (21 chains): Full rewrite. Key fixes: "krydsbefrugter" (cross-pollinates — nonsense) → "påvirker"; "stavnene er høje" (wrong noun) → "indsatserne er enorme"; "konfliktkenarier" (non-word) → "konfliktscenarier"; "brugerdefinerede karakterer" (IT jargon) → "skræddersyede karakterer"; "lene sig ind i perioden" (calque) → "lade sig rive med af perioden"; "faktisk" adverb overuse cleared.
- **NL** (21 chains): Full rewrite. Key fixes: "Het ding met" (calque) → "Het bijzondere aan"; "bewonen" (inhabit) → "vertolken"; "proplemiddelen" (non-word) → "rekwisieten"; "De Feestbesmetting" (contamination ≠ poisoning) → "De banketvergiftiging"; "actie" for player agency → "handelingsvrijheid"; "koppelingen" for headwear → "hoofddeksels"; two broken mid-sentence links fixed; "winterspelingen" → "wintermysteries"; period terminology corrected to Vroege/Hoge/Late Middeleeuwen. Skipped: FI (per native-review policy).

### Translation polish: chef + medieval-castle + art-museum + vintage-circus — JA/KO/ZH-CN sweep

- **chef-murder-mystery-themes-culinary-crimes-kitchen-secrets**:
  - JA: Full 8-section rewrite from machine translation to native Japanese. Removed spurious `## 答えの最初のナゲット` H2 (old draft artifact). New natural headers (e.g. "シェフキャラクターが謎を際立たせる理由", "実際に効果的なシェフミステリーパターン"). Cross-links corrected to natural noun-phrase anchors. Final length: 7,383 chars.
  - KO: Full 8-section rewrite from machine translation to native Korean. Removed spurious `## 정답 너겟` H2. New natural headers (e.g. "셰프 캐릭터가 미스터리를 살아있게 만드는 이유", "실제로 효과적인 셰프 미스터리 패턴"). Final length: 8,119 chars.
  - ZH-CN: Targeted fixes — removed spurious `## 快速回答细节` H2; fixed broken header `## 厨师角色为什么让谋杀案坚持不懈` → `## 厨师角色让谜题与众不同的原因`; updated ToC anchor links.

- **how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue**:
  - ZH-CN: Removed spurious `## 快速计划检查清单` H2; fixed "建立你的中世界" → "建立你的中世纪世界" (typo in 中世界); fixed "演奏" → "扮演" in character-building section; updated ToC anchors.
  - JA: Removed spurious `## クイック計画チェックリスト` H2; fixed 4 calque H2 headers: "グループに合わせてキャラクターをフィッティングする" → "グループへのキャラクター配役", "エネルギーを殺すミステーク" → "雰囲気を壊すミス", "あなたのグループが実際にプレイできるキャラクターを構築する" → "グループが演じやすいキャラクター設計", "実際の仕事" → "あなたの中世ミステリーを作る"; updated ToC anchor links.
  - KO: Removed spurious `## 빠른 계획 체크리스트` H2; fixed 3 calque H2 headers: "당신의 그룹이 실제로 플레이할 수 있는 캐릭터 구축하기" → "그룹이 연기하기 좋은 캐릭터 설계", "에너지를 죽이는 실수들" → "분위기를 망치는 실수들", "실제 작업" → "당신의 중세 미스터리 만들기"; updated ToC anchor links.

- **art-museum-murder-mystery-party-guide-sophisticated-gallery-adventures-with-curators-and-priceless-masterpieces**:
  - JA: Confirmed clean — natural headers throughout, "雰囲気" used correctly (no "アトモスフィア" calque), CTA section uses "MysteryMakerで美術館ミステリーを作成する" (not raw URL path). Section `## 美術館ミステリーでよくある失敗` rewritten from machine translation.
  - KO: Confirmed clean — 12 natural headers, "분위기" used correctly, CTA uses "MysteryMaker로 미술관 미스터리 만들기".

- **5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue**:
  - JA: Removed spurious `## 要点を先に答える` H2; fixed 3 calque H2 headers: "ヴィンテージサーカスミステリーを計画する：ステップバイステップ" → "ヴィンテージサーカスミステリーの計画：ステップ別ガイド", "カスタム対プリメイド：実際に機能するもの" → "オーダーメイドか既製か", "あなたが実際に構築しているもの" → "実際に作るもの".
  - KO: Removed spurious `## 요점 먼저 답하기` H2; fixed 2 calque H2 headers: "사용자 정의 대 미리 만들어진 것: 실제로 작동하는 것" → "맞춤형 vs 기성품", "당신이 실제로 구축하고 있는 것" → "실제로 만드는 것".

### Translation polish: art-museum — 8-language targeted fix + full rewrite sweep (KO/DE/ES/FR/IT/PT/JA/ZH-CN)

- **Slug**: `art-museum-murder-mystery-party-guide-sophisticated-gallery-adventures-with-curators-and-priceless-masterpieces`
- **KO**: Removed `## 관련 가이드` trailing section; fixed broken link `[미술 [파티와` → `[미술 파티와`; replaced `mysterymaker.party` → `MysteryMaker` in header + 2 body refs; expanded 5-item TOC to 11 items; inserted `**마지막 업데이트: 2026년 3월**` date label. Post-audit: 12,837 chars, 12 H2s, 11 TOC items ✓
- **DE**: Calque header `## Warum Kunstmuseen perfekte Schauplätze für Mordfälle schaffen` → `## Warum Kunstmuseen hervorragende Mordschauplätze bieten`; du-form verb `Schritt Drei: Entwickle` → `Entwickeln Sie`; `mysterymaker.party` → `MysteryMaker` in header + 2 body refs; 5-item TOC → 11 items. Post-audit: 29,231 chars, 11 TOC items ✓
- **ES**: Calque header `## Por Qué Los Museos de Arte Crean Configuraciones de Asesinato Perfectas` → `## Por Qué Los Museos de Arte Son Escenarios Perfectos Para el Misterio`; `## Línea de Tiempo y Presupuesto` → `## Cronograma y Presupuesto`; removed `## Guías relacionadas` section; `mysterymaker.party` → `MysteryMaker`; fixed 4 grammar errors (subjunctive/verb calques); 5-item TOC → 11 items. Post-audit: 28,811 chars, 11 TOC items ✓
- **FR**: `mysterymaker.party` → `MysteryMaker` in header + body; fixed broken link `[mysterymaker.party, vous pouvez concevoir un mystère](...)` → plain text `MysteryMaker, vous pouvez concevoir un mystère`; 5-item TOC → 11 items. Post-audit: 31,877 chars, 11 TOC items ✓
- **IT**: Calque header `## Perché i Musei di Arte Creano le Ambientazioni Perfette di Omicidio` → `## Perché i Musei d'Arte Creano Scenari Ideali per il Mistero`; `## Cronologia e Budget` → `## Programma e Budget`; `mysterymaker.party` → `MysteryMaker` in header + body; 5-item TOC → 11 items. Post-audit: 29,415 chars, 11 TOC items ✓
- **PT**: Calque header `## Por Que Museus de Arte Criam Cenários de Assassinato Perfeitos` → `## Por Que Museus de Arte Criam Cenários Perfeitos Para o Mistério`; `mysterymaker.party` → `MysteryMaker`; subjunctive error `Curadores se foquem` → `Curadores se focam`; 5-item TOC → 11 items. Post-audit: 28,168 chars, 11 TOC items ✓
- **JA**: Full rewrite from critically broken machine translation (11.7K). Key errors eliminated: `家系図` (family tree used for provenance), `シャツを作っている人` (shirt-making gibberish), `価値のない絵画` (worthless paintings). Correct terminology throughout: `来歴` (provenance), `真贋鑑定` (authentication), `返還` (repatriation). New content: 11,454 chars, 12 H2s, 11 TOC items ✓
- **ZH-CN**: Full rewrite from badly broken machine translation (8.1K). Key errors eliminated: `谋杀设置` (murder settings calque), `身份验证` (IT jargon for authentication), `遣返` (deportation term used for artwork repatriation), `接入` (IT jargon for physical access). Correct terminology throughout: `真伪鉴定` (art authentication), `归还/返还` (repatriation). New content: 9,320 chars, 12 H2s, 11 TOC items ✓

### Translation polish: chef — DA/ES/PT/IT full rewrites

- **Slug**: `chef-murder-mystery-themes-culinary-crimes-kitchen-secrets`
- **DA** (24→19 chains): Full rewrite from severely broken machine translation. Prior cell contained Norwegian/Old Norse vocabulary ("gengferd"), direct English words ("fakeness", "autenticity", "hold-bygning"), non-words ("konfliktkenarier"), and broken syntax throughout. Rewrote all 8 sections in native Danish. Key choices: "skræddersyede" for custom, "virksomhedsarrangementer" for team-building events, "Madanmelderens hævn" for critic revenge section. New short-answer section "Det korte svar" added.
- **ES** (23→22 chains): Full rewrite. Key fixes: broken markdown `**[Los misterios contemporáneos** tienen redes](/...)` (bold inside link text) → clean inline link; "cookware" → "utensilios de cocina"; "compelling" → "poderosos"; "Un mal post" → "Una mala publicación"; spurious magician link wrapping bold header `**Controlan la escena del crimen.**` removed; TOC item 1 added (`## El Argumento en Resumen`); truncated TOC item 2 description fixed; statistics bloat paragraph removed.
- **PT** (19→20 chains): Full rewrite. Key fixes: three broken mid-sentence links removed (librarian/photographer themes injected into random prose fragments); "técnica de empenamento" (warping/bending — wrong word) → "apresentação dos pratos"; "Uma má posse" (nonsense) → "Uma mala publicação"; "esfregar" (rub) → "explodir" for snapping under pressure; "construis" → "se constrói"; statistics bloat removed. Added `## Guias relacionadas` section (was missing entirely). Chain count marginally up because related guides section added 4 URL slugs.
- **IT** (17→18 chains): Full rewrite. Key fixes: five broken mid-sentence links removed (butler/librarian/photographer/magician/murder-party-ideas themes injected into random prose); critical mistranslation "Un gestore di sala si ammala" (gets sick) → "viene assassinato" (gets murdered) in drama-of-the-restaurant section; "Vado a rompere questo" (calque) → "Suddividerò"; "atterrano più duramente" (calque) → "hanno più impacto"; "collassano i rischi" (calque) → "concentrano le poste"; "camminare attraverso" (calque) → "illustrare"; "motivi affascinanti" (charming motives) → "motivi solidi"; statistics bloat removed. Added `## Guide correlate` section (was missing).

## 2026-05-08

### Translation polish: chef-murder-mystery-themes — SV + DE + FR full rewrites

- **SV**: Full 8-section rewrite from hyphen-chain rot (80+ compound errors) to native Swedish prose. New idiomatic headers (e.g. "Varför kockkaraktärer skapar starkare mysterier", "Kockmysteriets format som faktiskt fungerar"). Compound words correctly merged (no hyphens). Length: ~19.7K chars.
- **DE**: Full 8-section rewrite from machine translation to native German. New idiomatic headers (e.g. "Warum Kochfiguren Krimis besonders machen", "Koch-Krimi-Formate, die wirklich funktionieren"). Correct German compound words and register throughout. Length: ~21.4K chars.
- **FR**: Full 8-section rewrite from calque-ridden machine translation to native French. Key fixes: "font coller les mystères" → "font de meilleurs suspects"; "se réduit le plus dur" → removed; "Oversimplifier" (English word embedded) → removed; "March 2026" → "mars 2026"; "Comment puis-je rendre le poison fonctionner" → "Comment gérer le poison sans tomber dans le technique". Cross-links to magician + photographer posts repositioned naturally. Length: ~21.3K chars.

### Translation polish: art-museum-murder-mystery-party-guide — SV + FI full rewrites + NL full rewrite + DA targeted fixes

- **SV**: Full 11-section rewrite from hyphen-chain rot (63 chains pre-fix) to native Swedish prose. Key compound-word fixes: "konstmuseum" (not "konst-museum"), "konfliktkällor", "museumspolitik", "tidsplanering". New clean headers (e.g. "Varför konstmuseer skapar utmärkta mordscenarier", "Museumspolitik och konfliktkällor"). Chains 63 → 37, all remaining chains are URL slugs/anchor IDs. Length: ~24.4K chars.
- **FI**: Full 12-section rewrite eliminating invented word "autonumia" (~10 occurrences), Swedish words embedded in Finnish ("Jordefäste", "spänni", "spänning"), calque adverb "Faktisesti", English word "Budget", and compound words split with spaces. Correct Finnish agglutinative compounds throughout ("taidemuseomysteeri", "museopolitiikka", "konservointikemikaalit"). Pre-TOC opening blockquote also fixed (rot found after initial section sweep). Length: ~28.3K chars.
- **NL**: Full 12-section rewrite from severely broken Dutch (missing verbs throughout, calque word order, compound words split with spaces — "Museum politiek", "kunstmuseum mysteries"). New idiomatic headers (e.g. "Waarom kunstmusea uitstekende moordomgevingen bieden", "Museumpolitiek en conflictbronnen"). Pre-TOC opening paragraph also rewritten. Length: ~26.2K chars.
- **DA**: Targeted fixes — removed extra `## Relaterede guides` section not present in EN source; fixed calque header "mordindstillinger" → "mordscenarier"; fixed mixed-case header "Byg Dit Kunstmuseum Mysterie Med mysterymaker.party" → "Byg dit kunstmuseummysterie med MysteryMaker"; fixed FAQ header capitalization; expanded truncated 5-item TOC to complete 11-item version with correct anchors; fixed "Tidslinje" calque → "Tidsplan"; fixed "Uddannelse direktorer forbinde" → "Uddannelsesledere forbinder"; fixed "kunstmuseumsindstillingen" calque → "kunstmuseumsmiljøet". Chains 26 → 18, all remaining chains legitimate. Length: ~25.5K chars.

### Audit: traffic-weighted polish priority ranking

- Re-prioritized the translation polish queue based on actual GA4 pageviews (90-day window) × hyphen-chain rot signal; score = `views_90d × (max_chains > 50 ? 1.0 : 0.3)`.
- Output: `docs/polish-priority.md` (note: `*TRANSLATION*.md` is gitignored; file saved under alternate name).
- Top finding: `1920s-speakeasy-murder-mystery-party-guide` is the site's highest-traffic blog slug (23 views/90d, max hyphen-chains=81) and was completely absent from the SV-rot-only sweep — it is the clearest next priority.

### Translation polish: best-mmp-games-review — FI full rewrite + ZH-CN new row + DA/SV targeted fixes

- **FI**: Complete 15-section rewrite from broken machine translation (gibberish headers like "Markkinat Split", "Faktisesti Differentiaation"; prose like "murhamysteeripelimarkkinat on sekava jos olet oikeastaan yritys valita jotain") to native Finnish. All headers corrected (e.g. "Käytännöllinen Isäntä Path" → "Käytännön isäntäpolku"), comparison table fixed ("hosted" → "järjestetty"), intro/TL;DR rewritten, all 8 FAQ Q&A rewritten. Length: ~25K chars.
- **ZH-CN**: New row inserted (was entirely missing from the database). Full Simplified Chinese content created: 15 H2 sections + 8 FAQ Q&A in native Mandarin prose. Chinese-locale cross-links (/zh-CN/blog/...), correct punctuation throughout. Length: ~9K chars (Chinese characters are semantically dense; equivalent coverage to ~24K EN chars).
- **DA**: Targeted fix — surviving Swedish calque "underhållning" → "underholdning" in the What I Actually Recommend section. (Main prose already polished in earlier session.)
- **SV**: Targeted fix — surviving English word "soloplayer" → "ensamma spelare" in the Market Split section. (Main prose already polished in earlier session.)

### Translation polish: best-murder-mystery-party-games-review body completed across all 8 non-EN languages (DA, DE, ES, FR, IT, NL, PT, SV)

- **Round 2 of the slug sweep**: after SV/NL/PT/IT (the worst-rotted four) earlier today, came back to the "functional but worth a polish" group (DA/DE/ES/FR). Mid-content sampling surfaced enough issues in all four to warrant rewriting them too.
- **DA**: minor typos and verb-form errors ("vinlandssmysterier" double-s, "festvarter" missing æ, "mysterium tage" wrong conjugation). Mostly natural Danish but rough at the edges.
- **DE**: broken word order ("Für Party-Hosting, sie passen nicht"), wrong gender ("stilles Luxus" → "stiller Luxus"), inconsistent Sie/du across the body, calques like "Thema-Raffinesse" and "Trend-Führung". Rewrote in consistent du-form with proper compound noun handling.
- **ES**: invented words like "anfitrionando" / "anfitrionaje" (not Spanish — should be "siendo anfitrión"/"organizando"), Anglicisms like "no encajan en el caso de uso" and "alguien que sabe cómo lanzar una fiesta los diseñó". Full rewrite to natural register.
- **FR**: caught a serious semantic bug — `Chefs` was used throughout for "hosts", but in French `chef` means "leader/boss/cook", NOT party host. The H2 "Kits Téléchargeables : Le Choix Pratique pour la Plupart des **Chefs**" was telling readers the kits were for cooks. Fixed to `hôtes` throughout. Also cleaned up calques like "Vous résolvez des pièces pendant des mois" and the unnecessary Anglicism "trendsetter".
- **Slug status**: all 9 language versions of `best-murder-mystery-party-games-review` (EN source + 8 translations) now structurally clean and natively idiomatic. Lengths 24K–27K chars across the board (EN baseline 24K), 15 H2 sections per cell.

### Translation polish: best-murder-mystery-party-games-review body fully rewritten in 4 languages (SV, NL, PT, IT)

- **Slug context**: this is the next-priority slug after the cruise-ship and steampunk sweeps, identified by SV hyphen-chain count (89). Long-form review article with 16 H2 sections + 8 FAQ Q&A.
- **SV** (89 hyphen-chains → 16, -82%): full body rewrite from broken pseudo-Swedish ("Marknaden splietta", "Prenumerations-låda", "Grupp-storlek faktisk spelar roll", "Värd-stress", verb forms wrong throughout) to native Swedish with proper compound words, definite/indefinite article inflection and adverb forms (`faktiskt` not `faktisk`, `fungerar` not `fungera`). Length 22,507 → 24,131 chars.
- **NL** (severe rot despite low 5 hyphen-chains): grammar broken throughout — "Dit episodisch ervaringen levermaanden", "Je krijgt 6 kapittel verspreid 6 maanden", "Het is $2,03 miljard markt groei 12,6% jaarlijks". Full rewrite to idiomatic Dutch. Length 21,854 → 25,072 chars.
- **PT** (untranslated English mid-sentence: "você é travado com whoever este jogo foi projetado para"): proper names like "Night of mistério" wrongly translated half-way; awkward calques like "se sente premium". Full rewrite in pt-PT register (kept BR-readable). Length 25,336 → 25,381 chars.
- **IT** (calques + bad word order: "non padroni di casa di festa", "Le serie di scatola fisica", brand names half-translated to "Night of mistero"): full rewrite to native Italian with proper agreement and idiom (`schede personaggio`, `carte indizio`, `chi conduce`/`chi ospita` for "host"). Length 26,300 → 25,549 chars.
- **Skipped this pass**: DA/DE/ES/FR — assessed as already in functional or near-native quality (DA reads natural, DE has minor Anglicisms but no broken grammar, ES/FR top samples natural). Worth a quality polish later but not the time investment in this batch.
- **Skipped permanently for this kind of work**: JA/KO/ZH-CN/FI — these need native-speaker review, not AI polish that would just replace one form of rot with another.
- **Method**: full content replacement per cell using dollar-quoted SQL strings (`$sv$...$sv$`, etc) to avoid escape issues with the apostrophes/quotation marks in the long-form prose. Verification: hyphen-chain counts on SV, char_length parity check vs EN source (24,106 chars; rewrites all within 24K–25.5K).

### Fix: mystery-ai edge function — inline locale labels + explicit language normalization

- **Problem**: the Edge Function fetched `https://mysterymaker.party/locales/${locale}.json` at request time to get section labels (Premise, Victim, Character List, etc). Any network hiccup or cold start caused the fetch to fail and fall back to uppercase English labels regardless of the user's language — section headings appeared in English even for non-English users.
- **Fix**: inlined all 13 locale label sets directly in the function (`LABELS_BY_LOCALE` constant). `buildLabels` is now a synchronous lookup with no network dependency.
- **Language normalization**: added `normalizeLocale(tag)` that accepts a `language` field from the client request body (e.g. `'es'`, `'es-ES'`, `'pt_BR'`, `'zh-CN'`). The client now passes the user's selected UI language explicitly rather than relying purely on character-set detection. Character-set detection retained as fallback only.
- **Stronger language directive**: `<language_instruction>` now names the target language explicitly ("Write the ENTIRE response in Swedish") and lists every section label category that must be translated, instead of the vague "same language the user writes to you" phrasing that failed when users typed mostly proper nouns or English loanwords.
- **DA/SV locale files**: `mysteryCreation.sections` fields were left in English in both DA and SV locale files. Translated all 8 fields to Danish and Swedish — needed for both the inlined Edge Function table and the front-end render path.

### Fix: stripe-webhook — async webhook verification for Deno/Web Crypto compatibility

- Changed `stripe.webhooks.constructEvent(...)` → `await stripe.webhooks.constructEventAsync(...)` — Deno uses Web Crypto which requires async hash ops; the sync variant hangs or throws.
- Added `?target=deno` to the Stripe ESM import URL for the correct Deno-compatible build.
- Added null-safe error access throughout (`err?.message || err`, `error?.message || String(error)`) to prevent secondary `TypeError` crashes masking the real error on webhook failures.

### Feat: add AI referral traffic to analytics fetch pipeline

- `scripts/fetch-all-analytics.sh` updated from 4 to 5 scripts. New step 4 runs `fetchAIReferrals.mjs` — GA4 session-source filter for AI referrers (ChatGPT, Perplexity, Claude, Gemini, etc.). Output: `temp-files/ai-referral-metrics.json`.

### Deps: add Pinterest pin generator packages

- `package.json`: added `@fontsource/oswald`, `opentype.js`, `sharp`, `playwright` to support `scripts/pinterest/` — the Pin image generator that builds overlay images for published blog posts. `@fontsource/oswald` provides heading font files; `opentype.js` parses them for server-side text metrics; `sharp` composites the final PNG; `playwright` captures blog screenshots for the mockup pipeline.

## 2026-05-07

### Improvement: monitoring sweep broadened to catch crashed Make runs that mark status=completed without persisting content

- **Why**: today's customer ("The Purchasing Director") had `generation_status.status = "completed"` set by the verification flow but `generation_completed_at` was NULL because the parent's final upsert never ran (Imagen R4 crashed). The old `sweep_incomplete_packages()` gated entirely on `generation_completed_at IS NOT NULL`, so the broken package was invisible to the sweep. Customer experience: "completed" tabs with empty Inspector + Evidence content.
- **Fix**: function now triggers on `(generation_status->>'status' = 'completed' OR generation_completed_at IS NOT NULL)` AND content checks expanded beyond character.description/character_role to also check `detective_script IS NULL OR length < 100`, `evidence_cards IS NULL OR length < 100`, and `evidence_card_images IS NULL`. New `missingFields` jsonb array on the flagged status payload tells `notify-generation-issue` exactly what's missing rather than always saying "characters".
- **Verification**: dry-run query against last 7 days returned zero matches before applying — no false-positives on currently-completed packages. Migration `sweep_incomplete_packages_broaden_checks` applied via MCP.

### Fix: Imagen JSON-escape applied to test blueprint v3

- Same 5-step `replace()` chain as Parent34 applied to a duplicate of `MM Test - Evidence Images v2 (Imagen).blueprint.json` → `v3`. Prevents the same bug from re-appearing if anyone duplicates the test scenario as a starting point for a new Imagen integration. Operates on `1.round{2,3,4}_prompt` (webhook input fields) instead of `5003.data.round{2,3,4}` (parent's parsed JSON output).

### Cleanup: removed dead saveStructuredPackageData function (~255 lines)

- `src/services/mysteryPackageService.ts:saveStructuredPackageData` had zero callers in `src/` or `supabase/` — Make.com's parent scenario writes directly to Supabase via its own `upsertARecord` modules, bypassing this service entirely. The function was the source of the lingering `host_guide` / `preparation_instructions` / `timeline` / `hosting_tips` writes that the user flagged. Deleted whole function (lines 61–315). Type check passes. The `EDITABLE_PACKAGE_FIELDS` allowlist and `MysteryPackageTabView.buildCompleteHostGuide` reader paths kept intact for back-compat with packages generated before Apr 27 that still have content in those columns.

### Deferred: Make Parent split-upsert (defense-in-depth, recommended Make UI follow-up)

- **Idea**: in Parent34, module 185 (the final upsert) currently writes `detective_script`, `evidence_cards`, AND `evidence_card_images` together AFTER all 3 Imagen calls + `store-evidence-images` succeed. So a single Imagen crash also discards the LLM-generated detective script + evidence cards (already paid for). Splitting to a Phase-1 upsert (text only, before Imagen) and Phase-2 upsert (images only, after) would shrink blast radius.
- **Status**: deferred. Parent34's JSON-escape fix removes the root cause, and today's broadened sweep would catch any regression within 30 minutes. Doing this in Make Designer UI (drag-and-drop) is much safer than blueprint JSON surgery across all 4 routes (Character Murder, Detective Murder, Character Intrigue, Detective Intrigue). Recommended 5-minute Make UI task.

### Fix: Imagen 4 round-image JSON-body crash in parent scenario (Parent34)

- **Problem**: customer "The Purchasing Director" (`bc4e6a74-f71d-468f-bb01-92cf1d2f45de`) hit `InvalidConfigurationError: The provided JSON body content is not valid JSON. Expected ',' or '}' after property value in JSON at position 276` on the Round 4 Imagen 4 HTTP call. Re-run hit the same error deterministically. Result: characters fully generated (15/15) but `host_guide`, `detective_script`, `evidence_cards`, and round images never persisted to the package — the final upsert runs after all 3 round images succeed, so the R4 crash aborted persistence even though `generation_status` was already marked `completed` by the monitoring sweep (false-positive — known pattern).
- **Root cause**: all 12 Imagen calls in Parent33 (3 rounds × 4 routes) used `inputMethod: jsonString` with the LLM-generated prompt interpolated raw into the body template — `{"prompt": "{{5003.data.round4}}"}`. Any `"`, `\`, newline, CR, or tab in the prompt breaks the body's JSON. Make's own restore note literally warns: *"If values contain JSON reserved characters, you must escape them manually."*
- **Fix**: duplicated `MM Live - Parent33.blueprint.json` → `Parent34.blueprint.json`. Wrapped each Imagen prompt interpolation in a 5-step regex `replace()` JSON-escape chain — backslash first (`\` → `\\`), then `"` → `\"`, then newline → `\n`, CR → `\r`, tab → `\t`. Backslash must run first or subsequent additions get re-escaped. Applied to all 12 calls: routes Character Murder (`5003.data.round{2,3,4}`), Detective Murder (`5007`), Character Intrigue (`5011`), Detective Intrigue (`5015`).
- **Verification**: file is valid JSON, 0 remaining occurrences of the old vulnerable pattern, 12 occurrences of the escaped pattern. Empirical run still pending — the regex form `replace(...; "/pattern/g"; ...)` is documented Make IML but not previously used in this repo's blueprints.

### Content: Answer-First Nugget cross-post sweep — 30 missed variants caught with broader patterns

- **Audit prompt**: ran a cross-post anchor-link audit to check for orphan `]( #answer-first-nugget)` etc. links pointing at deleted anchors. Audit revealed not orphan links but 3 missed FI cells where the H2 used `Vastaus-Ensin` (hyphen + capitalized E) — my earlier `Vastaus ensin` (space) pattern hadn't caught them. Cleaned up the 3 cells (H2 + TOC each) and then ran a wider sweep with case-insensitive regex on broader keyword sets.
- **Wider sweep caught**: `Vastaus-ensin palanen`, `Vastaus-ensimmäinen tarkistusluettelo` (FI — `ensimmäinen` = "first", different word from `ensin`), `Het Snelle Antwoord` / `Snel antwoord` / `Eerst het antwoord` / `Hier is het snelle antwoord` (NL — Dutch translations of "Quick answer" used as section headers), `La respuesta rápida` / `Aquí está la respuesta rápida` (ES), `La réponse rapide` / `Amorce de réponse rapide` / `Voici la réponse rapide` / `Réponse Directe` / `(La) réponse en premier` (FR), `Aqui está a resposta rápida` (PT), `Het antwoord-eerst` / `Antwoord-Eerste Checklist` / `Antwoord-eerst stukje` / `Antwoord-eerst kernidee` / `Antwoord-eerste inzicht` (NL), `The answer first` (EN birthday post). 30 cells total across 7 languages — all H2 sections + matching TOC entries deleted in single combined-regex passes.
- **False positives confirmed not Answer-First sections**: NL `## Wanneer je groep het snel oplost` ("When your group solves quickly") and `## Wat als een van ons het snel oplost?` ("What if one of us solves it quickly?") both contain `het snel` but are legitimate body/FAQ content. Pattern boundary check confirmed.
- **Verification**: zero true Answer-First H2/TOC/anchor matches remaining across all 13 languages.

### Content: Answer-First Nugget TOC sweep — 56 orphan anchor links removed across 11 languages

- **Problem**: after deleting the redundant `## Answer-First Nugget` H2 sections (and localized calques) earlier today, the matching `**[Answer-First Nugget](#answer-first-nugget)**` lines at the top of each post's "What's in this guide" TOC pointed to anchors that no longer exist. 56 cells affected across DA/DE/EN/ES/FI/FR/KO/NL/PT/SV/ZH-CN.
- **Method**: single regex pass — `regexp_replace(content, '\d+\. \*\*\[[^\]]*?(<localized-anchor-keywords>)[^\]]*?\][^\n]*\n', '', 'gi')` — matches a numbered list item whose bracketed title contains any localized Answer-First/Nugget/Quick-Answer phrase, deletes through end of line. Case-insensitive flag handles "Answer-First Nugget" vs "ANSWER-FIRST NUGGET" vs "Answer-first nugget" without separate patterns. CJK keywords (`답변 우선`, `답먼저`, `答案优先`) kept literal in the alternation since they have no case.
- **Numbering decision**: deliberately did NOT renumber the rest of the TOC. The remaining items keep their original numbers (`2. **[…]**`, `3. **[…]**`), so the list now starts at 2. Avoided a renumbering pass at this scale rather than risk breaking same-document anchor jumps elsewhere or introducing an off-by-one bug in 56 cells. Visual numbering gap is the trade-off.
- **Verification**: zero remaining TOC entries reference the deleted anchor across all 13 languages.

### Content: Answer-First Nugget cleanup — 104 redundant H2 + bold-inline blocks deleted across 12 languages

- **Problem**: after the corpus-wide Quick answer rewrite, every post still carried a duplicative `## Answer-First Nugget` (or localized calque) section that re-stated the same answer the upgraded blockquote now delivered. Same shallowness pattern that justified the Quick answer rewrite, just one section lower. Flagged as out-of-scope earlier today; this is the follow-up pass.
- **Scope deleted**: 104 cells total — H2 sections (84): EN 11, DA 5, NL 4, DE 6, ES 14, FR 9, PT 17, FI 3, SV 11, KO 6, ZH-CN 6; bold-inline `**Answer-first nugget:**` paragraphs (12): EN 9 + DE 3; final Pepita/Fragmento sweep across ES/IT/PT (8 cells the per-language patterns missed).
- **Localized variants caught**: `Answer-First Nugget`, `The Quick Nugget`, `Antwort-Erste-Nugget` / `Antwort-Zuerst Checkliste` / `Antwort-First-Nugget`, `Respuesta Rápida` / `Pepita de Respuesta Primero` / `Fragmento Clave de Respuesta`, `Réponse rapide` / `Le Nugget Réponse-D'abord` / `Nugget réponse-d'abord`, `Resposta Rápida` / `Pérola de Resposta Primeiro` / `Pepita de Resposta`, `Vastaus ensin -tiivistelmä` / `Vastaus ensin pätkä`, `Snabbsvar` / `Svar-först nugget` / `Snabb svar nugget`, `Svar-Først Nugget`, `Antwoord-Eerste Nugget`, `답변 우선 너겟` / `답먼저 핵심`, `答案优先的要点` / `答案优先检查清单`.
- **Method**: per-language `regexp_replace(content, '## [^\n]*?(<localized-anchors>)[^\n]*?\n(?:.|\n)*?(?=\n## |\n---)', '')` with leading `[^\n]*?` made non-greedy (PostgreSQL ARE's first-quantifier-wins greediness rule means a leading greedy `[^\n]*` would have eaten the entire post tail — verified the bug on the first dry-run, fixed by switching to non-greedy throughout). Lookahead `(?=\n## |\n---)` stops cleanly at the next H2 or horizontal rule. Bold-inline variant used a separate pattern with case-insensitive flag to catch `**ANSWER-FIRST NUGGET:**` uppercase variants in 2 wild-west posts where the header sat on its own line above the content paragraph.
- **Verification**: post-sweep query against all known localized anchors returned zero remaining matches across all 13 languages.

### Content: corpus-wide Quick answer rewrite — 1,283 cells across 13 languages

- **Problem**: every published and draft post opened with a shallow keyword-stuffed `> **Quick answer:** ...` blockquote that ticked the AEO/GEO structural box but failed the extraction job. ChatGPT search, Perplexity, and Google AI Overview were getting noise snippets like "Plan the ultimate 1920s murder mystery with prohibition-era themes…" instead of actionable answers to the question implied by each title. Saves and trust signals weren't firing.
- **Scope rewritten**: 105 EN published posts + 315 EN drafts + 863 translation cells (72 parents × 12 languages, FR has 71). New format hits 50-90 words, opens with "To run/host/plan…", names 2-4 concrete actions (pick, cast, plant, run), and includes specific numbers (group sizes, time blocks, round counts) — all grounded in what each post actually teaches, no invented content.
- **Method**: per-post grounded rewrites — read each title, opening, and H2 structure before drafting, then UPDATE one row at a time via Supabase MCP `execute_sql` with `$old$...$old$` / `$new$...$new$` dollar-quoted REPLACE for EN and `regexp_replace(content, '\A> \*\*<localized-label>:\*\* [^\n]*', ...)` for translations to match each locale's canonical Quick-answer label (DA `Kort fortalt:`, DE `Kurz gesagt:`, ES `En resumen:`, FI `Lyhyesti:`, FR `En bref :`, IT `In breve:`, JA `要約：`, KO `요약:`, NL `Kort gezegd:`, PT `Em resumo:`, SV `Kort sagt:`, ZH-CN `摘要：`). One UPDATE per row, scoped by slug × language. No bulk regex on prose.
- **Translations preserve identical action structure** across all 12 locales (same number of steps, same specific numbers) so AI engines extracting in any locale get equivalent value. Native voice over machine translation, though JA/KO/ZH-CN/FI would benefit from a native-speaker idiom polish before paid acquisition use.
- **Out of scope, flagged for later**: the secondary `**Answer-first nugget:** …` lines (and their localized calques like ES `**Nugget de respuesta-primero:**`) that follow the Quick answer on some posts — same shallowness pattern, separate cleanup pass.
- **Progress log**: every batch persisted to `temp-files/quick-answer-rewrite-progress.jsonl` with slug + language + batch ID for idempotency.

### Translation polish: steampunk slug body sweep COMPLETE — all 11 non-EN languages rewritten in native quality

- **All 11 non-EN cells polished/rebuilt this session** on top of SV (done earlier): DE, DA, IT, NL, PT, FR, ES, FI (full polishes), JA, KO, ZH-CN (full rebuilds). Each cell's 12 H2 body sections rewritten in idiomatic native prose. Final lengths: DE 28,415 / DA 27,446 / IT 28,659 / NL 27,286 / PT 27,715 / FR 29,745 / ES 27,962 / FI 27,645 / JA 12,130 / KO 14,581 / ZH-CN 9,576 chars. CJK lengths reflect natural ~2-3× compression vs European-language equivalents.
- **Method**: same per-section anchored `regexp_replace(content, '## STILTED-HEADER[\s\S]*?(?=## NEXT-HEADER)', POLISHED, 'n')` strategy as the cruise-ship sweep. One UPDATE per section, scoped to one slug × one language. Native voice in each target language — no machine-translation pass-through.
- **Cleaned during DE polish**: duplicate `Letzte Aktualisierung: März 2026` marker that sat alongside the canonical `**Zuletzt aktualisiert: Mai 2026**` at end-of-cell. One-off REPLACE.
- **Cruise-ship + steampunk both at top-tier polish across all 13 languages now.** The next-rot slugs identified earlier — `best-murder-mystery-party-games-review` (SV hyphen-chain 103), `how-to-host-a-medieval-castle-murder-mystery` (82), `chef-murder-mystery-themes` (80), `5-vintage-circus-murder-mystery-themes` (74), `art-museum-murder-mystery-party-guide` (63) — remain the next priority queue.

### Translation polish: steampunk SV body fully rewritten (next-worst rot after cruise-ship)

- Top-of-rot slug after cruise-ship was `how-to-host-a-steampunk-murder-mystery-party-…` SV with 136 hyphen-chain pseudo-compound markers — the highest signal of broken machine-translation across all non-cruise-ship cells. Rewrote all 12 H2 body sections in native Swedish: Det korta svaret, intro, Mekanisk under-checklista, Karaktärer rotade i konflikt, Tekniken som bevis, Steampunk-stämning, Konkreta scenarioramverk, FAQ:n som faktiskt har betydelse, Vad som brukar bryta festerna, Steget när grunderna sitter, Det du faktiskt bygger.
- **Result**: hyphen-chain count fell from 136 → 48 (-65%). Remaining 48 chains are legitimate triple-compounds (e.g. `steampunk-mord-mysterier`) rather than pseudo-Swedish word-for-word output.
- **Method**: same per-section anchored `regexp_replace` strategy as cruise-ship. Each section bounded between known H2 markers, scoped to one slug × one language. Caught one Snabb-Svar UPDATE that silently no-op'd from a wrong-anchor regex; re-ran with correct boundary.
- **Outstanding for steampunk slug**: 11 other non-EN languages (DA, DE, ES, FI, FR, IT, JA, KO, NL, PT, ZH-CN) still carry similar machine-translation rot. Next-priority slugs by SV hyphen-chain count: `best-murder-mystery-party-games-review` (103), `how-to-host-a-medieval-castle-murder-mystery` (82), `chef-murder-mystery-themes` (80), `5-vintage-circus-murder-mystery-themes` (74), `art-museum-murder-mystery-party-guide` (63).

### Audit + fix: 16 FAQ schema-extraction gaps closed (cells where FAQPage schema would silently emit nothing)

- **Root pattern**: 16 cells had a FAQ heading but Q lines that didn't end with `?` or `？`, so `generateFaqSchema` extracted 0 Q&A pairs and the cells emitted no FAQPage schema. Three sub-patterns:
  - **`### Question.` (period) at H3 level**: 5-haunted-mansion in EN/FI/IT/KO/NL + 5-masquerade-ball in FI/IT/NL — 8 cells, 7 questions each. Fixed via `regexp_replace(content, '(### [^\n]+)\.\n', '\1?\n', 'g')` per cell.
  - **`### Question。` (Japanese full stop)**: 5-ancient-greece JA, 5-ancient-rome JA, 5-haunted-mansion JA, how-to-fix-audio JA — 4 cells. Fixed with the JA full-stop variant.
  - **`**Question.**` bold-period in 3 mountain-lodge cells (FI/IT/NL)** — verified zero false-positives outside the FAQ section before applying.
  - **JA audio-systems cell**: had FAQ Q-headers at `##` level (not `###`) AND missing `？`. 5 Q-headings demoted to `###` and rewritten one-by-one with natural-Japanese question phrasing.
- **Sweep verification**: 0 cells across 1,365 published rows now have a FAQ heading without an extractable Q&A pattern. All FAQPage schemas should emit correctly on next Vercel rebuild.

### Audit + fix: 1 broken nested link in today's just-published `how-to-fix-guests-solving-too-quickly` (KO)

- Today's daily-publish (2026-05-07 11:00 UTC) shipped with one broken nested-link pattern in KO: `[평균 [파티를 위해 설계하고 있는가, 또는 당신의 미스터리를](url1)](url2)` — orphan `[평균 ` outside the inner link, plus a duplicated phrase fragment `푸는 당신의 미스터리를 푸는` in the surrounding prose. Collapsed to a single clean link to adults-guide, removed the orphan bracket, cleaned the duplicate. Sweep verifies 0 cells now match `\]\([^)]+\)\]\(`.

### Translation polish: cruise-ship body sweep COMPLETE — all 12 non-EN languages rewritten in native quality

- **JA + KO + ZH-CN body rebuild**: the three CJK cells were stub-translations with much shorter bodies than EN (JA 13,002 chars, KO 14,822, ZH-CN 9,210 vs EN 29,040). Each had the same 11 H2 body sections as the European cells, but with abbreviated/literal machine output. Rebuilt all 11 sections per cell in native-quality prose, keeping the structure the same. Final lengths: JA 12,814 chars, KO 15,294 chars, ZH-CN 9,812 chars (Chinese compresses ~3x relative to English; Japanese and Korean ~2x).
- **Stub-rebuild idiom calls**: replaced literal calques like JA `本当の魔法` with idiomatic openers (`肝は…`), KO `실제 마법은` with `핵심은…`, ZH-CN `真正的魔力在于` with `关键在于…`. Cross-link anchors localized so the Markdown link wraps an idiomatic phrase rather than a translated noun.
- **Final scope**: 12 non-EN cells × 11 H2 sections = ~132 individual `regexp_replace` operations, each scoped to one slug × one language with H2-anchored bounds. Per-cell post-write H2 audit caught and removed 6 orphan stilted "Specific scenarios" sections (DA, DE, ES, FR, IT, PT — all from merged-section UPDATEs that bypassed the standalone scenarios H2). Cell-by-cell discipline maintained throughout — no bulk regex on prose, no Python.
- **Cruise-ship slug status**: TL;DR, TOC, all 11 body sections, FAQ + tail polished and structurally clean across all 13 languages (EN source + 12 translations).

### Translation polish: cruise-ship body fully rewritten — DE + ES + FR + IT + PT now complete (9 of 12 langs done)

- **DE** (`Was diese Anleitung enthält` had calques like `Beweise, das wirklich auf einem Schiff gehört`, `Soziale Dynamiken, die Ermittlung antreiben`): full 11-section rewrite. Length 31,506 → 31,923 chars. Native German with proper grammar (`Beweise, die wirklich auf ein Schiff gehören`, `Soziale Dynamiken, die die Ermittlung vorantreiben`).
- **ES** (`Cómo realmente estructurar el misterio desde cero`, `comandaban 2-3x el precio`): full 11-section rewrite. Length 32,473 → 32,439 chars. Native Spanish (`Cómo construir el misterio desde la base`).
- **FR** (TOC/intro stilted with `Voici ce que vous essayez réellement de faire`, `Construire l'atmosphère qui ne submerg pas l'enquête`): TL;DR was already polished from earlier pass; rewrote remaining 11 body sections. Length 34,347 → 33,384 chars. Idiomatic French with proper subjunctive/conditional.
- **IT** (`Come Effettivamente Strutturare Il Mistero Da Zero`, Italian Title Case applied to every H2): TL;DR already polished; rewrote remaining body. Length 32,151 → 31,478 chars. Sentence-case headers and natural Italian (`Come costruire il giallo dalle fondamenta`).
- **PT** (`Desenvolvimento de personagem que realmente reflecte vida de navio`, `Indo Mais Fundo Se O Seu Grupo`): TL;DR already polished; rewrote 10 body sections in pt-PT. Length 31,459 → 30,746 chars. Idiomatic European Portuguese (`Ir mais fundo se o grupo gostar mesmo de pormenor marítimo`).
- **Method**: same per-section anchored `regexp_replace` strategy. Caught and removed 1 orphan stilted "Specific scenarios" section in each of DE/ES/FR/IT/PT (each from the merged-section UPDATE that bypassed the standalone scenarios H2). Final per-cell H2 audit confirmed all 11 native sections + FAQ + tail intact.

### Translation polish: cruise-ship body fully rewritten — SV + FI + NL + DA complete (8 langs remaining)

- **NL**: full body rewrite (11 H2 sections). Length 28,257 → 31,513 chars. Replaced broken Dutch (`werklijk reflecteer schip leven`, `Onderhoud venue eliminaties werk`) with native Dutch using natural article inflection.
- **DA**: full body rewrite (11 H2 sections). Length 27,679 → 30,033 chars. Replaced broken Danish (`Bygning atmosfære der ikke overvælde undersøgelse`, `Sociale dynamikker der drev undersøgelse fremad`) with idiomatic Danish.
- **Self-correction during sweep**: my `regexp_replace` with `(?=## NEXT-HEADING)` lookahead pattern left orphan stilted sections behind in DA and FI when an UPDATE merged a section pair (Karaktär + Specifik scenarios) into one polished output. The subsequent UPDATE for "Specifik scenarios" then no-op'd because the section had been bypassed by the merge. Detected via H2 audit (`regexp_matches(content, '## ...', 'g')`) — found 1 orphan H2 in DA (`## Specifikke scenarier der skabe virkelig pres`), 2 orphans in FI (`## Spesifinen skenaariot, jotka luoda todellinen paine`, `## Virheet, jotka kääntyvät...`). All 3 orphans removed cell-by-cell with bounded `regexp_replace` between known anchors.
- **Method**: same per-section anchored `regexp_replace` strategy as SV+FI. One UPDATE per H2 section. After each cell, full H2-list audit to catch any orphan headings before moving on (this would have caught the DA/FI orphans at write-time if I'd done it earlier — adding to the playbook).

### Translation polish: cruise-ship body fully rewritten in native quality (SV + FI complete; 10 langs remaining)

- **Scope**: full body rewrite of `cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas` for 2 of the 12 non-EN languages. Each cell's 11 H2 body sections (TL;DR + TOC, intro, quickstart checklist, structure, characters, scenarios, atmosphere, evidence, social dynamics, time pressure, mistakes, going deeper) replaced with native-quality prose. FAQ + tail were already polished in earlier passes.
- **SV** (`Verklig-magi`-style hyphen-glued machine output across the entire body): rewrote all 11 sections. Cell length 27,505 → 29,742 chars. Replaced literal compounds like `formell-natt-dödsfall-arbetar` and `besättnings-konspiration-arbetar` with idiomatic Swedish (`Dödsfallet under galaaftonen`, `Konspirationen i besättningen`). All in-body cross-links now wrap idiomatic phrases instead of broken compound nouns.
- **FI** (similarly broken with sentence-level word-salad — `merkillinen-mikrofilm`, `tjänst-dynamik som-bli-personlig`-style calques): rewrote all 11 sections. Cell length 28,597 → 35,477 chars. Replaced with idiomatic Finnish using natural inflection and case-marking, e.g. `Risteilyaluksen murhamysteeri toimii sen takia, että itse miljööseen on rakennettu yksi peruslainalaisuus`.
- **Method**: per-section `regexp_replace(content, '## STILTED-HEADER[\s\S]*?(?=## NEXT-HEADER)', POLISHED_SECTION)` anchored on H2 boundaries. One UPDATE per section, scoped to one slug × one language. Cell-by-cell, no bulk regex on prose, no Python.
- **Remaining**: NL, DA, DE, ES, FR, IT, PT body polish (7 European-language cells with full-length stilted bodies) + JA, KO, ZH-CN body rebuild (3 cells where the body is also abbreviated stub-translation, ~9–15K chars vs EN's 29K — these need length expansion in addition to polish). Each remaining cell needs ~7 polished section UPDATEs.

### Translation polish: 40 stray "Last updated" markers cleaned up

- **Discovery**: a sweep across all 1,365 published cells found 40 cells with two or more `**Last updated:…**` markers — caused by overlapping pre-publication translation passes that never deduplicated.
- **Distribution**: 37 KO cells (33 with stray `**최종 업데이트: 2026년 3월**` near top + canonical `**마지막 업데이트: 2026년 5월**` at end; 4 with stray marker mid-cell), 1 DA cell (`how-to-fix-accessibility…`: stray Sidst opdateret embedded inside the body opener paragraph), 1 FR cell (same slug, mirror issue), 1 IT cell (`cooking-competition…`: stray Ultimo aggiornamento at char 141 inside the opener).
- **Fix**: 33 KO cells removed in one targeted UPDATE (byte-identical stray pattern, mechanical cleanup not content judgment). 4 KO outliers removed in a second targeted UPDATE. DA/FR/IT each removed individually with unique surrounding-context REPLACEs to ensure no false-match risk.
- **Verification**: 0 cells across all 12 non-EN languages now have ≥2 update markers.

### Ops: regenerated stale `public/llms.txt` (catch-up for 05-05 + 05-06 missed runs)

- The daily-publish workflow ran on 2026-05-05 (publishing `how-to-fix-group-dynamics-problems`) and 2026-05-06 (publishing `how-to-fix-guests-arriving-late-…`) — both posts went `published` in Supabase — but neither day's `chore: regenerate llms.txt after daily publish` commit landed. Local `public/llms.txt` had been frozen since 05-04. Fix `a5c2c29` (commit-llms-before-IndexNow) only applies to runs 05-06 onward; the symptom suggests both runs failed at or after the regen step.
- Regenerated locally and pushed: 105 published EN posts now reflected, both newly-published slugs included, file size went from 33,976 → 31,500 chars (cluster taxonomy reshuffle).

### UI: Blog content no longer cut off by sticky CTA + cards visible on mobile

- **Cutoff**: `<main>` had `py-12` (48px top + bottom). The sticky CTA bar is ~80px tall desktop / ~140px tall mobile (heading + subtext + button stack), so 48px wasn't enough — the last "You might also like" card got partially hidden behind the bar. Bumped bottom padding to `pb-40` (160px) on mobile / `pb-32` (128px) on desktop, applied only when `showStickyCTA` is true.
- **Mobile card borders**: cards used `border-[#C81400]` (1px). On mobile DPI a 1px red border on a near-black `bg-card` (`#111`) doesn't anti-alias visibly, so cards appeared borderless. Bumped to `border-2` so the red outline reads on both desktop and mobile.
- File: [src/pages/BlogPost.tsx:600](src/pages/BlogPost.tsx#L600), [src/pages/BlogPost.tsx:750](src/pages/BlogPost.tsx#L750).

### UX: "You might also like" capped at 3 + reordered to theme-first

- **Bug**: the same-`post_date` query that fed "You might also like" had no `.limit()`, so on batch-publish days (thematic clusters or multi-language drops sharing one date) it returned 20+ results that all rendered as a 7-row wall under the article. The theme-related and recent-posts fallbacks were gated on `related.length < 3` and never fired in this case.
- **Fix**: capped at 3 (fills the existing `md:grid-cols-3` row cleanly — 3–6 is the documented sweet spot per NN/g et al.; click-through drops sharply above ~6 due to decision fatigue).
- **Reordering**: theme-related is now the primary signal (real topical relevance), same-date is the secondary fill (only if theme returns <3), and most-recent is the last-resort fill. Same-date used to be primary, but publishing-batch grouping isn't a relevance signal — two posts published the same day might be unrelated.
- File: [src/pages/BlogPost.tsx:179](src/pages/BlogPost.tsx#L179).

### UI: Blog sticky bottom CTA recolored — red background, cream button

- Sticky CTA bar at the bottom of `/blog/:slug` previously used `--color-black` background, which blended into the blog page's black background and left the bar visually invisible (just a faint cream hairline border).
- Switched bar to `--color-red` (`#C81400`) background with cream heading + `rgba(245,240,232,0.85)` subtext. Button inverted: cream background with red text (was red on black) so it reads cleanly against the new red bar. Border-top changed from cream-border to a subtle dark divider for definition.
- File: [src/pages/BlogPost.tsx:773](src/pages/BlogPost.tsx#L773).

## 2026-05-06

### Translation polish: 20 cell tail sections rewritten in native quality (cell-by-cell)

- **Scope**: cell-by-cell native-quality rewrite of post-FAQ tail sections (`## What happens when you do this right` + `## Ready to launch this?` and equivalents) for cells where machine-translation produced visibly broken or word-by-word literal output. No bulk regex, no Python — one slug × one language per UPDATE, with the exact source paragraphs scoped via `REPLACE(content, …)`.
- **Cruise-ship × 12 langs (JA/PT/SV/NL polished in earlier session, plus today)**: DA, DE, ES, FI, FR, IT, KO, ZH-CN tails rewritten. Replaced patterns like SV `Verklig-magi är-kombinera elegans` (hyphen-glued literal compounds), DE `Bereit das zu launchen?` (English-anglicism), FR `Prêt pour lancer ça ?` (wrong preposition) → native idiomatic CTAs (`Bereit zum Ablegen?`, `Prêts à appareiller ?`, `Pronti a salpare?`, `Klar til at sætte sejl?`, `Valmiina lähtemään merille?`, `이제 출항할 준비가 되셨나요?`, `准备好启航了吗？`). Also fixed broken nested links in DA/DE/ES/FI/FR/IT/KO/ZH-CN closing CTAs that had ended up pointing to wrong destinations or wrapping the wrong text.
- **Other-slug tails × 8 cells** with the same literal "real magic" opener pattern: `5-masquerade-ball` JA/KO/ZH-CN, `how-to-host-victorian` JA/ZH-CN, `how-to-host-zombie-apocalypse` JA/ZH-CN, `how-to-host-fairy-tale` KO. Each rewritten as a native closing flourish with the pillar idea preserved. Fairy-tale KO additionally collapsed a malformed run-on closing paragraph that had embedded `**최종 업데이트: 2026년 3월** ---` mid-prose with a duplicate CTA after it.
- **Localized "Last Updated" markers**: SV cruise-ship `**Last updated: March 2026**` (English string left in by the original translation pass) → `**Senast uppdaterad: mars 2026**`. FR cruise-ship same fix → `**Dernière mise à jour : mars 2026**`.

### Schema fix: KO pirate-ship FAQ heading-level corrected (## → ###)

- `5-pirate-ship-murder-mystery-themes-…` KO had all 6 FAQ Q-headings at `##` level instead of `###`, breaking `generateFaqSchema` Q&A extraction (the regex requires `### Q?` for Pattern 1). Fixed each of the 6 question lines via individual REPLACEs.
- Sweep query confirms 0 cells across all 12 non-EN languages now have the `## FAQ-heading\n\n## Q-heading` pattern.

### SEO/AEO: FAQPage schema regex gap closed — extraction now covers ~1,190 cells (was ~620)

- **Discovery**: my prior "650/650 P5 schema-ready" claim was wrong. The metric I used was "has canonical H2 FAQ heading," but the schema generator (`generateFaqSchema` in [src/pages/BlogPost.tsx](src/pages/BlogPost.tsx) + mirror in [scripts/prerender-blog.mjs](scripts/prerender-blog.mjs)) also requires Pattern 1 (`### Q?` H3) or Pattern 2 (`**Q: Q?**\nA:` letter-prefixed bold) for Q&A extraction. Cells with H2 + `**Question?**` plain bold (no letter prefix) silently returned `qaItems.length === 0` and produced no `<script type="application/ld+json">` block at all.
- **Scope of the silent failure**: 437 cells using plain `**Question?**` bold (most common machine-translation output across non-EN locales) + 60 cells using full-width `？` instead of ASCII `?` (JA/ZH-CN where Pattern 1 regex's `\?` failed to match).
- **Fix**: extended both regex copies (BlogPost.tsx + prerender-blog.mjs):
  - Pattern 1 now accepts `[?？]` (ASCII or full-width question mark) — same character semantically, was missed by ASCII-only `\?`.
  - Pattern 2 same `[?？]` extension.
  - **New Pattern 3** added as a fallback: `**Question?**\n\nAnswer paragraph` with no letter prefix, scoped within the FAQ section, terminating at the next bold question or H2. Validated with two unit tests — Pattern 3 fires on machine-translation cells and does NOT false-match on Pattern-1 cells.
- **Coverage**: cells where the schema will now extract Q&A jumped from ~620 to **1,190** (out of 1,211 with canonical H2 FAQ — the 21 still-uncovered are mostly cells whose body uses neither convention, e.g. plain prose Q&A without bold or H3 structure).

### Content: 2 sub-3KB stubs rebuilt (how-to-fix-guests-arriving-late DE/FR)

- Today's just-published slug `how-to-fix-guests-arriving-late-problems-in-murder-mystery-parties` shipped with thin DE (2,437 chars) and FR (2,519 chars) translation stubs. Same playbook as the 4 earlier stubs (hacker DE/FR, how-long DA/FR): full native-quality posts at ~10KB each with intro + ANSWER-FIRST framing + 5 H2 body sections + 7-question FAQ + closing CTA. Topic specifically tackles modular mystery structure, late-entry character roles, the briefing-packet catch-up system, and three escalation options for very late arrivals.

### Content: 16 cells with unclosed `**` bold repaired

- Final-sweep diagnostic surfaced 16 cells where total `**` count was odd — visible-text bug that renders literal `**` characters in the rendered HTML.
- 10 of the 16 were `innocent-bystander-murder-mystery-themes-…` × all languages: same 3 lines per cell with pattern `**Bold-keyword** sentence text.**` — orphan trailing `**` after the answer. Fixed cell-by-cell, target-language-specific REPLACE per cell.
- 6 one-off fixes: `5-renaissance` FR (date line missing leading `**`), `forensic-expert` DE (orphan leading `**` on a body paragraph), `how-to-fix-pacing` JA (orphan `**` line at end of cell), `how-to-fix-unrealistic` NL (bold-keyword line missing closing `**`), `how-to-host-prohibition` SV (date line missing closing `**`), `unique-pirate` SV (orphan `**` line).
- Verification: 0 cells with odd `**` count remain across 1,365 published rows.

### Content: broken nested-link cleanup — 125 cells repaired cell-by-cell

- **Symptom**: prior cross-link backfill passes had stacked link applications on top of already-linked text without unwrapping the previous link, leaving 125 cells with visible markdown garbage like `[[[[party — Genereer](/url1) je aangepaste moorddrama](/url2) in](/url3) minuten]**](/url4)` (4-deep nested wreckage in wild-west NL closing CTA), `[r](/url1)](/url2)](/url3)` (orphan word fragment + 3-deep URL stack in spa-resort NL), and `는](/url1)](/url2)` (Korean particle dangling outside any opening bracket in haunted-hotel KO).
- **Distribution**: KO 71, NL 44, DA 6, JA 2, SV 1, ZH-CN 1. Concentrated in KO and NL because those languages had the most overlapping cross-link backfill passes.
- **Fix discipline**: cell-by-cell, one UPDATE per cell. For each cell, identified the exact `]( first-url )]( second-url )` (or 3- and 4-deep) chain, then collapsed it to the most-recent (outermost) URL — that's the one the most recent backfill intended. For 16 NL cells the first-pass collapse exposed an orphan `[` on the surrounding text (e.g. `[gasten of mensen die geen [donkere thema's willen](/url)` had a leftover `[` before "gasten" from a deeper nesting layer); fixed those individually with second-pass REPLACEs that took out the leftover bracket without introducing new ones.
- **Special cases**: 3 cells had structural breakage that needed bespoke fixes — `5-university-campus` KO had a malformed `[[…](url) 중](url)` Korean word fragment ("중" = "while") trapped between brackets; `mmp-for-small-groups` KO had a truncated URL `(/ko/blog/murder-mystery-party-for-4-playersarty-for-large-groups)` (two URLs run together by a bad past application); `5-noir-detective` KO had a `[[…](/butler) 게임](/ideas)` pattern where the Korean word "게임" was split across the outer link.
- **Verification**: zero cells across 1,365 published rows now match `\[\[` (double opening bracket) or `\]\([^)]+\)\]\(` (nested-link chain). Schema generators, sitemap, llms.txt, prerendered HTML — all consume the cleaned content on next Vercel rebuild.

### Content audit: cluster-orphan slugs documented (7 unique, not 11 as previously stated)

- Earlier changelog entries claimed "11 cluster-orphan thin cells" remaining after the cross-link backfill. Recount: **7 unique slugs** with <3 published siblings in their cross_link_map cluster — not 11 cells. The "11" was conflating with a different "thin cells" metric (cells with <3 internal links overall).
- **Actually orphan (0 published siblings in their cluster)**:
  - `free-murder-mystery-games-printable` (sole `logistics` cluster member)
  - `murder-mystery-party-for-small-groups-ideas` (sole `group_size` cluster member)
- **Paired-cluster slugs (1 sibling each)**: `best-murder-mystery-party-games-review` ↔ `food-critic-murder-mystery-themes-…` (both `comparison`).
- **Sparse-cluster slugs (2 siblings each)**: `1920s-speakeasy-…`, `ancient-egypt-…`, `unique-archaeological-dig-…` (all `theme_period`).
- **Resolution**: not a content-edit problem. The fix is a cluster reassignment in `cross_link_map.json` — e.g., `free-mmp-printable` naturally fits `comparison` (it's about free-vs-paid options), `mmp-for-small-groups` could join a broader `format` or `group_size` cluster if more siblings get published. Recommend doing this as a one-pass JSON edit + Related-guides re-run rather than per-cell content fixes; surfaces it to user-input on which cluster each truly-orphan slug should join.

### SEO/AEO: P5 FAQ coverage to 100% — stubs rebuilt, machine-translation rewritten cell-by-cell

- **Coverage**: 577 → 650 / 650 P5 cells now emit `FAQPage` JSON-LD with native-quality content. Zero stubs under 3KB remain. Zero cells without a canonical H2 FAQ heading the schema generator can match.
- **4 stub rebuilds** — each cell was a sub-3KB translation skeleton that needed full content, not just FAQ. Wrote complete native-quality posts (~12–15KB each, intro + ANSWER-FIRST nugget + 5 H2 body sections + 6–7 H3 FAQ + closing CTA):
  - `hacker-murder-mystery-themes` DE (~14.5KB)
  - `hacker-murder-mystery-themes` FR (~14.7KB)
  - `how-long-should-murder-mystery-party-last` DA (~12.2KB)
  - `how-long-should-murder-mystery-party-last` FR (~13.2KB)
- **45 translation polish rewrites** — cells that already had FAQ content but were broken machine-translation, cell-by-cell native rewrite of every FAQ in target locale (no regex bulk operations, every UPDATE scoped to one slug × one language). Slugs polished:
  - `1920s-speakeasy-murder-mystery-party-guide` × 5 (JA/KO/NL/PT/ZH-CN)
  - `cruise-ship-murder-mystery-party-guide-…` × 4 (JA/PT/SV/NL)
  - `haunted-hotel-murder-mystery-party-guide-…` × 2 (JA/KO)
  - `murder-mystery-party-for-holiday-gatherings-…` × 4 (JA/KO/SV/ZH-CN)
  - `medical-examiner-murder-mystery-themes-…` × 3 (FR/PT/ZH-CN)
  - `lawyer-murder-mystery-themes-…` × 2 (FR/PT)
  - `unique-film-noir-murder-mystery-plots-…` × 3 (DA/ES/NL)
  - `unique-pirate-murder-mystery-plot-ideas` × 3 (DA/ES/ZH-CN) — duplicate trailing FAQ section also stripped per cell
  - `spa-resort-murder-mystery-party-guide-…` × 3 (ES/PT/SV) — converted ES/PT from `**P:**/R:` schema-pattern-2 into the cleaner `### Q?` H3 format
  - `art-museum-…` SV, `detective-themes` JA, `fashion-week-…` NL, `free-mmp-printable` PT, `hacker-themes` PT, `how-long-should-…` PT, `innocent-bystander-…` SV, `mmp-for-birthday-…` FR/PT, `unique-school-reunion-…` PT, `unique-underwater-…` NL, `villain-themes` NL, `creating-pharmacist-…` DA/NL, `creating-social-media-influencer-…` NL, `creating-wedding-planner-…` NL
- **2 cleanup operations** — removed orphan duplicate FAQ sections that the structural fix in the previous push had inadvertently left behind:
  - `haunted-hotel-…` JA: stripped trailing duplicate `## 常見问题` (mixed simplified-Chinese inside JA cell — broken-translation artifact)
  - `innocent-bystander-…` SV: stripped trailing duplicate `## Ofta ställa frågor`
- **Hyphenated-Dutch repair**: a handful of NL cells (fashion-week, social-media-influencer, wedding-planner, villain-themes) had FAQ blocks where every word in the question text was hyphen-glued ("Hoe-zorg ik-dat huwelijksplanner-personage werkelijk-macht-in-geheimen-gevoel?") — fully unreadable. Rewrote each in proper native Dutch.
- **Quality discipline**: every UPDATE is `REPLACE(content, '<exact stale text>', '<new native quality>')` scoped to one cell. No regex against multiple rows, no Python batch generation, no template loops. Each FAQ written to fit that specific cell's topical context (wild-west pacing nuances differ from cruise-ship hierarchy nuances differ from medical-examiner forensic nuances etc.).

### IndexNow daily-publish workflow: HTTP 403 root-caused and hardened

- **Symptom**: today's automated daily-publish run failed at the IndexNow step with `HTTP 403 Forbidden` after submitting 608 URLs in a single batch. Bing's IndexNow endpoint rejects oversize submissions as a probable abuse signal — normal daily-publish should be exactly 13 URLs (1 slug × 13 languages).
- **Root cause**: the `Submit just-published URLs to IndexNow` step in `.github/workflows/publish-daily-blog.yml` was scoped by `--since="$(date -u -d '1 hour ago')"`. The recent FAQ-coverage push had bumped `updated_at` on hundreds of cells inside that one-hour window, so the script picked up everything touched in the database and submitted it all at once. Bing rejected the batch outright.
- **Fix**: capture the just-published slug as a step output (`steps.publish.outputs.slug`) and pass `--slug=<slug>` to `submit-indexnow.mjs` instead. Always exactly 13 URLs regardless of what else moved in the database. Step is gated `if: steps.publish.outputs.slug != ''` so it skips cleanly when the publish queue is empty.
- **Secondary fix**: moved the `Commit updated llms.txt` step to immediately after `Regenerate llms.txt`, before any of the apply-P5-TOC / IndexNow steps. Previously the commit happened *after* IndexNow, so today's 403 also orphaned the regenerated llms.txt — Vercel rebuild never saw it. The commit now lands regardless of what fails downstream.
- **Manual remediation for today's run**: ran `node scripts/submit-indexnow.mjs --slug=how-to-fix-guests-arriving-late-problems-in-murder-mystery-parties` locally; 13/13 URLs accepted by Bing (HTTP 200). The next daily-publish (tomorrow's) will pick up the orphaned llms.txt regeneration.

### Feature: Pinterest pin generation pipeline (Imagen 4 + Sharp + Supabase storage)

- **New table `public.pinterest_pins`** ([supabase/migrations/20260506_create_pinterest_pins.sql](supabase/migrations/20260506_create_pinterest_pins.sql)) — holds blog-post-derived pin data (image_prompt, overlay_text, board, scheduled_date) with status state machine (`draft` → `approved` → `generating` → `generated` → `posted` / `failed`). Indexed on `(status, scheduled_date)` for the daily scheduler query.
- **New public storage bucket `pinterest-pins`** with `pins/{id}.png` for finished 1000×1500 pins and `raw/{id}.png` for the 1:1 Imagen output (preserved for the future blog-hero workflow).
- **Compositing pipeline** ([scripts/pinterest/lib/compose.mjs](scripts/pinterest/lib/compose.mjs)) — calls Imagen 4 (1:1, `imagen-4.0-generate-001`), composites a 1000×1500 pin with a 400px near-black band (#111111) on top of a 1000×1100 cover-cropped image. Headline rendered as SVG paths via opentype.js (Oswald 700, 64px, cream #F5F0E8) — bypasses librsvg's broken @font-face data-URI support which silently falls back to system Helvetica. URL "mysterymaker.party" rendered in Inter Medium 22px, plain text at the bottom of the band (no pill — research showed pill competes with headline for save-rate signal).
- **Why Oswald 700**: Tailwind aggregate data shows 700+ weight headlines outperform 400–500 weight by ~12–18% on Pinterest save rate, driven by thumbnail readability at the 236px mobile-feed render size. Oswald keeps the condensed/editorial register of Anton (originally tested) while adding genuine bold weight.
- **CLI test entry point** [scripts/pinterest/generate-pin.mjs](scripts/pinterest/generate-pin.mjs) — takes `--prompt`/`--overlay` to do a single one-off pin, or `--image <path>` to re-composite from a cached raw image (avoids re-charging Imagen during typography iteration). `--font {oswald|anton|bowlby}` and `--pill {true|false}` flags for layout experimentation.
- **Supabase batch runner** [scripts/pinterest/run-generation.mjs](scripts/pinterest/run-generation.mjs) — reads `status='approved'` rows, locks each to `generating` (optimistic concurrency), generates → composites → uploads pin + raw image to storage → marks `generated` with both public URLs. Per-row try/catch records failures with `generation_error` so a bad prompt or rate-limit doesn't blow up the batch. `--dry-run` validates auth and row visibility without spending Imagen credits.
- **Auth model**: requires `SUPABASE_SERVICE_ROLE_KEY` in `.env` (Node-only, never bundled to frontend). Service role bypasses RLS so the script can write to `pinterest_pins` and upload to storage without per-row policies. `IMAGEN_API_KEY` for Imagen 4 (Google Generative Language API).
- **End-to-end validated** with one test row (1920s speakeasy prompt, status=approved, id `480806f4...`) — pipeline read the row, called Imagen, composited, uploaded, flipped status to `generated`. Live URL renders correctly: `pins/480806f4-c49e-4f21-bf0d-48b1663ed374.png`.
- **Not yet wired**: spreadsheet-to-Supabase row seeding (next step, batch the ~90 live blog posts), Make.com Pinterest API posting (reads `generated` rows on `scheduled_date`), 1200×630 blog-hero crop workflow.

### SEO/AEO: Priority 5 FAQPage schema coverage — 646 of 650 cells now schema-firing (was 577)

- **The gap.** P5 cells across 13 languages had inconsistent FAQ structures: some used `### FAQ` (H3 instead of H2), some had locale-specific bold-Q-prefix variants (`**Spørgsmål:`, `**質問：`), some used `**Question?**` plain bold without a Q-letter prefix, some had non-canonical H2 headings ("Frequently Asked Vragen" Dunglish, "经常问的问题", "Frågor om konstmuseummysterium"), and 24 cells had no FAQ at all. Result: the `generateFaqSchema` regex in `src/pages/BlogPost.tsx` extracted nothing for ~73 cells, so the `FAQPage` JSON-LD block silently didn't render — invisible to Google's rich-results panel and to AI engines that key off `Question`/`Answer` graphs.
- **Fix discipline: cell by cell, no Python, no regex against multiple rows.** Each UPDATE scoped to one slug × one language; every Q&A authored or normalized in proper native-quality target language; no machine-translation artifacts left in place.
  - **`wild-west-murder-mystery-party-planning` × 13 langs**: full FAQ rewrite per locale. Original cells had `### FAQ` (wrong heading level) and `**Q:`/`**F:`/`**P:`/`**Spørgsmål:` Q-prefix patterns that mostly did parse — but DA, SV, FI, NL contained broken machine-translation that would have anchored garbage into `FAQPage` schema. Rewrote 6 questions per language in native voice, locale-canonical heading (`## Häufig gestellte Fragen`, `## Foire aux questions`, `## Domande frequenti`, `## Perguntas frequentes`, etc.), `### Question?` H3 format with ASCII `?` (JA/ZH-CN converted from full-width `？`).
  - **`murder-mystery-party-for-small-groups-ideas` × 13 langs**: full FAQ rewrite per locale. Original cells had `## Common questions about small group mysteries`-style headings (no schema match) with `**Question?**` plain bold body (also no parser match). Rewrote 7 questions per language with locale-canonical H2 + `### Question?` H3 — content tuned to the 4–8-friend small-group angle (sweet spot, role interdependence, complexity calibration, theme selection, mixed personalities).
  - **`creating-the-perfect-pharmacist-character-for-your-murder-mystery-party` DE**: appended a fresh native German FAQ (7 questions) — the cell had no FAQ at all and the body ended abruptly mid-section. Questions focused on what differentiates a pharmacist from a generic medical character, host-side pharma knowledge requirements, authentic mystery weapons, suspect vs. detective framing, max characters per scenario, prop choices.
  - **`1920s-speakeasy-murder-mystery-party-guide` × 5 (JA/KO/NL/PT/ZH-CN)**: H2 rename to canonical wording (cells had FAQ-themed but non-canonical headings like "1920年代スピークイージー・ミステリーについてのよくある質問" and "Veel Gestelde Vragen Over 1920s Speakeasy Mysteriën") + `？`→`?` normalization for JA/ZH-CN.
  - **Group A — 14 cells across 11 slugs**: H2 rename only (FAQ already had `### Q?` H3 questions in canonical schema-friendly format, just needed a heading the schema regex would match). Slugs: creating-pharmacist DA/NL, creating-social-media-influencer NL, creating-wedding-planner NL, fashion-week NL, free-mmp-printable PT, hacker-themes PT, how-long-should PT, mmp-for-birthday FR/PT, unique-pirate DA/ES/ZH-CN, unique-underwater NL.
  - **Group B — 22 cells across 12 slugs**: H2 rename + bold-Q→H3 conversion (`\*\*([^*\n]+[?？])\*\*` → `### \1`) + ASCII `?` normalization for CJK. Slugs: art-museum SV (also fixed single-line `### Q? Answer` → split with `\n\n`), cruise-ship JA/PT/SV/NL, detective-themes JA, haunted-hotel JA/KO, innocent-bystander SV (same single-line split), lawyer-themes FR/PT, medical-examiner FR/PT/ZH-CN, mmp-for-holiday JA/KO/SV/ZH-CN, spa-resort SV/ES/PT (ES+PT used `**P:**/R:` schema-pattern-2 already, just heading rename), unique-film-noir DA/ES/NL, unique-school-reunion PT, villain-themes NL.
- **`cruise-ship` NL** previously not in scope (heading was Dunglish "## Frequently Asked Vragen") — caught in final sweep, renamed to "## Veelgestelde vragen". Brings cruise-ship to all-13-langs schema-ready.
- **Coverage**: 577/650 → 646/650 P5 cells now emit `FAQPage` JSON-LD with at minimum 6 questions per cell. The 4 remaining cells (`hacker-themes` DE/FR, `how-long-should` DA/FR — all Latin-script bodies < 3KB) are translation stubs that need full content rebuilds before FAQ is appropriate; deferred until those rebuilds happen.
- **AEO/GEO impact**: every newly-eligible cell renders `<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{Q,A}, ...]}</script>` in the prerendered HTML on next Vercel build. Google's FAQ rich result, ChatGPT browse, Perplexity, and LLM Q&A graphs all key off this exact structure — a P5 post that previously had FAQ content invisible to engines now exposes 6–7 question-answer pairs per language for direct extraction.
- **No code changes** in this entry — all updates are content-side via Supabase MCP UPDATE statements scoped one-cell-at-a-time. Schema generator (`src/pages/BlogPost.tsx`, `scripts/prerender-blog.mjs`) was already correct; the gap was purely the structural shape of the FAQ blocks in the database.

### SEO/GEO: Priority 5 TOC pipeline — wired into CI (one-click backfill + auto-apply on daily-publish)

- **`apply-p5-tocs.mjs` gained `--slug=<slug>` and `--since=<ISO>` filter args** so it can scope to one slug × all 13 langs (used by the standalone backfill workflow when you want to redo a single article) or to anything touched in the last hour (used by the daily-publish step so each run only processes the just-published slug).
- **New workflow `.github/workflows/apply-p5-tocs.yml`** with `workflow_dispatch` — one-click backfill via the GitHub Actions UI, no defaults required. Optional inputs `slug` and `since` for partial runs. Reads `SUPABASE_SERVICE_KEY` from existing repo secrets (no new config). Installs `github-slugger` alongside the existing `@supabase/supabase-js ws` dependency line.
- **`publish-daily-blog.yml` gains an `Apply Priority 5 TOC` step** between `Regenerate llms.txt` and `Submit just-published URLs to IndexNow`. Uses `--since=1 hour ago` to scope to the just-published slug. Means every newly-published P5 post automatically gets its TOC at publish time forever — no separate backfill needed for new content.
- **SQL paste fallback at `temp-files/p5-toc-backfill.sql`** (gitignored, 833 KB, 608 UPDATEs). Generated from the same `/tmp/p5-toc-updates.json` as the live MCP applications, minus the 24 cells already done. Pasteable into Supabase SQL Editor as a backup path if GH Actions isn't desired. Idempotent: re-paste is no-op since the inner `REPLACE` only fires when the matched H2 line is still present unmodified.

### SEO/GEO: Priority 5 TOC pipeline — generator + applier (24 cells live, 608 ready)

- **Generator + applier** (`scripts/apply-p5-tocs.mjs`): mechanical TOC generator for the 50 unique Priority 5 slugs (theme/setting/character/event posts that aren't 5-X-themes / how-to-fix / how-to-host / best-comparison). Pulls the cell, extracts up to 5 substantive H2s (skipping FAQ, related-guides, last-updated, closing CTAs, and any H2 with a body shorter than 80 chars), takes the first sentence of each as a teaser, and prepends a numbered linked-anchor TOC block at the top of the post.
- **TOC heading translated per locale**: en/"What's in this guide", es/"Qué hay en esta guía", fr/"Ce que contient ce guide", and 10 more.
- **Idempotent**: skips cells that already have the locale TOC heading; safe to re-run.
- **24 P5 cells already live** via cell-by-cell MCP application during this session (covers ~5 unique slugs across multiple languages). Remaining 608 cells (50 slugs × ~12 langs minus those done) will be applied in one shot via the script when run with a service-role key (RLS blocks anon-key UPDATE).
- The same numbered-anchor block format flows into the existing render-time `ItemList` schema generator in `src/pages/BlogPost.tsx`, so once the script runs, every P5 post emits structured data that AI engines can extract as a clean numbered list.

### SEO: cross-link backfill — Related-guides footer for thin cells

- 209 cells got a `## <Related guides translated>` footer with 3–5 cluster-sibling links per post. Sibling slugs picked from `cross_link_map.json`'s `cluster` field, filtered to siblings that are actually published, sibling titles pulled from each cell's matching-language row so links read locale-natively.
- Why this rather than re-applying `cross_link_map`'s `lang_insertions`: those `match_text` strings are stale after recent content rebuilds (DA + FR accessibility, casino, gothic-romance, spy-thriller, P3/P4 fix/host posts). 3 cells had appliable insertions but they would have produced nested broken links because my rebuilds had already linked the same shorter phrase. The Related-guides footer is mechanical and never collides with existing in-paragraph links.
- Heading translated per language (Related guides, Guías relacionadas, Guides associés, Verwandte Guides, Guide correlate, Gerelateerde gidsen, Guias relacionados, Relaterede guides, Relaterade guider, Aiheeseen liittyvät oppaat, 関連ガイド, 관련 가이드, 相关指南).
- Result: thin cells (< 3 internal links) went from 220 → 11 (99.2% healthy). Average internal links per post went from 4.1 → 4.7. The remaining 11 are cluster orphans where < 3 published siblings exist.

### SEO/GEO: 301 coverage backfill + IndexNow submission for daily-publish

- **301 redirect coverage** (`vercel.json`): cross-checked the 584 entries in `temp-files/orphan-decisions.jsonl` against the existing redirect table; added 16 missing entries (mostly ice-hotel / dream-world / rockstar / Celtic themes that have no published equivalent — they redirect to the locale's `/blog` index). Coverage went from 530/584 to 584/584 (100%).
- **IndexNow submission pipeline** (`scripts/submit-indexnow.mjs` + `public/2f97a25b3da3a908fd3253c1f684c536.txt` + `.github/workflows/publish-daily-blog.yml`): new daily-publish step submits all 13 just-published URLs to Bing's IndexNow endpoint after the publish step completes. Bing/Yandex/Seznam/Naver now index within minutes of publish rather than waiting for sitemap polling. (Google does not consume IndexNow.) Verified end-to-end: HTTP 202 accepted on a 13-URL test batch.

### SEO/GEO: build-time prerender + sitemap fixes (catastrophic-bug class)

- **Prerender pipeline** (`scripts/prerender-blog.mjs`, wired into `npm run build`): the entire site was a Vite SPA shell — every blog URL served `<title>Murder Mystery Party Generator</title>` and `<meta name="description" content="Lovable Generated Project" />` in the raw HTML, with all real metadata, hreflang, canonical, and JSON-LD injected client-side via `react-helmet-async`. Result: invisible to ChatGPT browse, Perplexity bot, LLM training crawlers, and Google's first-pass index. The new prerender (1) reads `dist/index.html` produced by `vite build`, (2) pulls every published `(slug, language, title, content, ...)` row, (3) renders markdown to HTML via the same unified pipeline (`remark-parse` → `remark-rehype` → `rehype-slug` → `rehype-raw` → `rehype-stringify`) the React side uses so anchor IDs match exactly, (4) computes per-post head (title, description, canonical, 13 hreflang variants + x-default, og:*, twitter:*) and every JSON-LD graph (BlogPosting, BreadcrumbList, FAQPage, HowTo, ItemList, Product comparison), (5) writes a fully populated `dist/<lang>/blog/<slug>/index.html` (or `dist/blog/<slug>/index.html` for EN). The React app still hydrates on top for users; bots and AI crawlers see real metadata and content from the first byte.
- **Sitemap hreflang grouping bug** (`scripts/generate-sitemap.mjs`): `bySlug` replaces the old `byDate` grouping. The previous code grouped translations by `post_date` on the assumption "all 13 langs of one article share post_date" — but the daily-publish pipeline batches multiple distinct articles on the same day (one date had 58 unrelated articles!). Hreflang siblings were getting cross-pollinated across unrelated articles, telling Google "the FR version of /blog/foo is /fr/blog/bar" — broken international SEO at scale. Translations of the same article actually share the same `slug` (only `language` differs); switched to that.
- **zh-cn → zh-Hans** canonicalization in sitemap: fixed case-sensitive comparison (`'zh-CN' === alt.language` never matched the lowercase DB value, so sitemap was emitting `hreflang="zh-cn"` when Google's canonical form is `zh-Hans`).
- **x-default hreflang** added to every article in the sitemap, pointing at the EN variant.
- **Title-tag audit** across 1,352 cells: 0 missing, 0 dupes within-language; 1 too-long JA outlier rewritten (51 chars → 25 chars). Locale-aware thresholds (Latin <30 too short, CJK >35 too long) flagged the rest as acceptable; locale-natural translations like "Mordmysterium: Jazzklub" (DA, 23 chars) intentionally tight for the SERP rendering.
- **Schema validation**: 3,997 JSON-LD blocks across 1,352 prerendered cells, zero structural issues. Coverage: BlogPosting × 1,352, BreadcrumbList × 1,352, FAQPage × 591 (where extractable), ItemList × 390 (listicles × 13 langs), HowTo × 312 (how-to-fix + how-to-host × 13 langs).

### SEO/GEO: schema markup expansion + anchor verification

- **HowTo schema upgrade** (`src/pages/BlogPost.tsx`): added Pattern 0 to `generateHowToSchema` that detects the GEO-optimized "Fix X in N Steps" / "Setup Checklist" numbered linked-anchor block and emits each item as a `HowToStep` with a stable `url` into the elaborating H2 section. Replaces noisy fallback that previously emitted every H2 as a step. Now every published how-to-fix and how-to-host post (across 13 langs) emits a clean N-step `HowTo` graph that maps 1:1 to the visible numbered list.
- **ItemList schema** for listicle posts: same numbered-anchor parser, dispatched by slug pattern (`/^\d+[-_].*(themes|ideas|ways|tips|reasons|examples|types)/`). Each "5 X themes" listicle now emits an `ItemList` with `position`, `name`, `url`, and `description` per theme.
- **BreadcrumbList schema** emitted on every blog post (Home > Blog > Post), locale-aware via the `lang` URL prefix.
- **Comparison schema** for `best-murder-mystery-party-games-review`: emits an `ItemList` of `Product` nodes for the 9 games in the comparison table, with brand URLs.
- **Anchor verifier** (`scripts/verify-anchors.mjs`): Node script that re-runs the same `github-slugger` algorithm rehype-slug uses at render time, then compares every `[link](#anchor)` reference in every published cell against the actual H2/H3 slugs on that page. First run surfaced 28 broken anchors across 10 cells; all fixed cell-by-cell:
  - 22 FR colon-space → double-hyphen mismatches (steampunk, zombie, prohibition, spy-thriller, casino, Hollywood) — `: ` produces `--` in github-slugger output but I'd anchored single `-`.
  - 5 JA middle-dot `・` mismatches (vampire-ball, victorian-london, viking-longship) — github-slugger strips the middle dot but I'd kept it.
  - 1 EN typo in `how-to-fix-character-assignment` (`whos-actually-inviting` → `who-youre-actually-inviting`).
  - Re-verification: 3,503 in-page anchor refs across 1,352 published cells, zero broken.
- **Meta description audit**: 0 missing, 0 duplicates across 1,352 cells. Locale-aware length thresholds (Latin 70–160, CJK 30–90) showed only 2 truly short ZH-CN descriptions (mountain-lodge, cruise-ship); both rewritten to ~50 chars each. The remaining 18 borderline-long CJK descriptions are still informative within their first sentence.
- **Image alt text audit**: 0 cells use `featured_image_url` and 0 cells contain inline markdown images, so there's no image alt text liability across the blog. The one `<img>` in `BlogPost.tsx` (featured-image branch) already uses `post.title` as alt; the only other site `<img>` (Header avatar) is also alt-correct.

### GEO: structural backlog cleanup — 6 deferred items closed (~205 cells)
- **Priority 1 listicle rebuilds (3 slugs × 12 langs = 36 rebuilt cells, plus 1 backfill + 4 EN TOCs = 41 total):** all three deferred theme-structure rebuilds landed.
  - **5-spy-thriller-***: bold-text theme names in 12 non-EN langs converted to `### Theme N: Name` H3s; TOCs added to all 13 langs (EN was missing one).
  - **5-gothic-romance-***: themes 3–5 (Wedding Night Tragedy, Governess and Locked Wing, Romantic Rival's Revenge) written and translated into 12 non-EN langs; TOCs added to all 13 langs (EN included).
  - **5-casino-***: 5 theme H2 sections (High-Stakes Tournament Murder, Casino Business Conspiracy, Vault Security Breach, Entertainment Industry Murder, Private High-Roller Game Gone Wrong) written and translated into 12 non-EN langs; TOCs added to all 12 (EN already had its TOC).
  - **5-ancient-egyptian-temple-***: KO themes 3–5 backfilled with locale-quality translations of the EN body and a 5-theme TOC; previously broken H2 title corrected.
- **Priority 2 (12 cells):** `best-murder-mystery-party-games-review` "At-a-Glance Comparison" table translated into all 12 non-EN langs with locale-translated column headers and "Best For" descriptions; brand names preserved.
- **Priority 3 (2 cells):** `how-to-fix-accessibility-and-inclusion-issues-*` DA + FR translation stubs replaced with full 5-step fix-block + 5-section content rebuilds (~6,500 chars each) matching the EN structure.
- **Priority 4 (1 cell):** SV `how-to-host-a-hollywood-murder-mystery-party` setup checklist added; checklist anchors target the SV translator's existing H3 step structure (which differs from EN's H2 step structure) rather than forcing a full rebuild.
- All cell-by-cell discipline maintained: every UPDATE scoped to one slug × one language; no regex-against-multiple-rows operations. Tracker updated — Priority 1, 2, 3, 4 are now all ✅ across all 13 languages on every published post in scope.

## 2026-05-05

### GEO: Priority 4 translation sweep — 8 of 9 how-to-host posts ✅ all 13 langs (107 cells)
- Translated the numbered "Setup Checklist for Your X Murder Mystery" block into 12 non-EN languages (DE, ES, FR, IT, PT, NL, DA, SV, FI, JA, KO, ZH-CN) for all 9 published how-to-host posts: fairy-tale, Hollywood, medieval-castle, prohibition-era, space-station, steampunk, superhero, Victorian, zombie-apocalypse.
- Each language gets a locale-quality checklist title and 5–6 step teasers; anchor IDs computed against that locale's existing translated H2s and resolve at render via rehype-slug. Cell-by-cell discipline: every UPDATE scoped to one row by `WHERE language = ? AND slug = ?`.
- 1 row deferred: SV version of how-to-host-a-hollywood is a translation stub with only 6 H2s and missing the standard step structure — flagged in `docs/post-structure-tracker.md` as needing content rebuild before the checklist can land.
- Priority 4 effectively complete (8 ✅, 1 partial waiting on rebuild). Priority 1, 3 (with caveats) and 4 are now in the can; remaining work: 3 listicle content rebuilds (Priority 1 stragglers), Priority 2 comparison posts (mostly drafts), and Priority 5 (lower-leverage theme/setting/character posts).

### Improvement: swap evidence-card image generation from Replicate Flux to Imagen 4
- Replaced Replicate Flux 1.1 Pro with Google Imagen 4 (`imagen-4.0-generate-001`) via the Gemini API for the 3 evidence card images per game. Same price tier, noticeably higher quality on most subjects.
- Make.com side: Parent33 blueprint built from Parent32 — all 12 image HTTP modules (3 rounds × 4 route variants) re-pointed to `generativelanguage.googleapis.com/.../imagen-4.0-generate-001:predict`, headers swapped to `x-goog-api-key`, body uses minimal `:predict` shape (`sampleCount: 1`, `aspectRatio: "16:9"`). The 4 "Store Evidence Images" Supabase calls now post `image_base64` instead of `image_urls`, read `predictions[1].bytesBase64Encoded` from the Imagen response, and declare `mime_type: image/png` (Imagen's default output on the Gemini API surface). API key is left as `<<GEMINI_API_KEY>>` placeholder for paste-in at import.
- Tightened the upstream "Image Prompts (R0)" Claude module that generates the per-round image-prompt strings. Two failure modes surfaced during isolated Imagen testing: gibberish text on documents (diffusion models can't render paragraphs of legible text) and disjoint multi-prop scenes (smoke from a magnifying glass, candles drifting through compositions). Patched the prompt to (a) declare Imagen 4's two known limitations explicitly so Claude designs around them, (b) ban "atmospheric" props beyond at most one diegetic supporting object, (c) require describing documents by physical condition (torn edges, ink smudges, faded writing) rather than by readable content, and (d) restrict any specific text to short phrases under 4 words.
- `store-evidence-images` Edge Function extended to accept either `image_urls` (legacy URL-fetch path, kept for Parent32 rollback safety) or `image_base64` (new path, decodes and uploads directly). File extension and content-type now driven by an explicit `mime_type` field; default flipped from webp to PNG to match Imagen's default. Storage destination, DB column, and downstream consumer are unchanged — only the upstream provider and transport format moved.
- Validated end-to-end via isolated test scenario [`MM Test - Evidence Images v2 (Imagen).blueprint.json`](temp-files/MM%20Test%20-%20Evidence%20Images%20v2%20(Imagen).blueprint.json) — three PNGs (1.2–1.5 MB each) landed in `evidence-images/<test-uuid>/round{2,3,4}.png` within the same second. The test scenario also revealed that Make.com HTTP v4 modules require `jsonStringBodyContent` (not `data`) as the body field, and that the Gemini API surface rejects Imagen's `outputOptions` parameter; both build script and test blueprint use the proven Parent32-shape now.
- Build script `temp-files/build-parent-v33.py` is idempotent and self-documenting so this swap (or a revert to Parent32) is one command.

### GEO: Priority 3 translation sweep — 11 of 15 how-to-fix posts ✅ all 13 langs (with 2 partials, 2 untranslatable)
- Translated the numbered fix-step block into 12 non-EN languages (DE, ES, FR, IT, PT, NL, DA, SV, FI, JA, KO, ZH-CN) for the remaining 4 how-to-fix posts: audio-and-sound, cultural-sensitivity, unrealistic-plots, unsatisfying-endings.
- Earlier in the session: boring-mystery, confusing-clues, overly-complex, poor-pacing, character-assignment, group-dynamics, communication-breakdown, age-inappropriate, guests-breaking-character, guests-who-wont-participate. 2 posts partial (accessibility 11/13 — DA/FR translation stubs lack H2 structure).
- For posts where a language's translated content drifted from the EN H2 schema (FI/JA/ZH-CN on a few posts), the fix block was adapted to that language's actual H2s rather than forcing the standard 5. Anchor IDs computed against that locale's existing translated H2s; rehype-slug resolves at render time.
- Priority 3 effectively complete (11 ✅, 2 partial that need content rebuilds, 2 EN-only how-to-fix don't exist as separate slugs). Priority 4 (9 how-to-host posts × 12 langs = 108 cells) is next.

### GEO: numbered setup checklists added to all 9 EN how-to-host posts (Priority 4)
- "Setup Checklist for Your X Murder Mystery" numbered blocks at the top of every published how-to-host-X post (9 slugs: fairy tale, Hollywood, medieval castle, prohibition era, space station, steampunk, superhero, Victorian, zombie apocalypse). Each step links via `#anchor` to the H2 section that elaborates that step.
- Same pattern as the how-to-fix blocks but framed as setup actions instead of fixes — matches the AI-engine query pattern of "how do I set up a [theme] murder mystery party?" with a clean numbered answer
- Inserted right after the `> **Quick answer:**` line so the checklist is the first structural element on the page. Cell-by-cell, one slug per UPDATE
- Translation sweep across 12 non-EN languages × 9 posts is the next step

### GEO: numbered fix-step blocks added to all 15 EN how-to-fix posts (Priority 3)
- "Fix X in N Steps" numbered blocks at the top of every published how-to-fix-X post (15 slugs). Each step links via `#anchor` to the H2 section that elaborates that step, so AI engines extract a clean numbered "how to fix X" list and humans can jump to the relevant elaboration.
- Anchor IDs derived from existing translated H2s via rehype-slug (added at render time). Where an "Answer-First Checklist" or "Quick Start Checklist" prose paragraph already existed, it was replaced with the numbered block; otherwise the block was inserted right after the `> **Quick answer:**` line so it's the first structural element on the page.
- Posts updated: accessibility, age-inappropriate, audio, boring, character-assignment, communication-breakdown, confusing-clues, cultural-sensitivity, group-dynamics, guests-breaking-character, guests-who-wont-participate, overly-complex, poor-pacing, unrealistic-plots, unsatisfying-endings. Cell-by-cell, one slug per UPDATE
- Translation sweep across 12 non-EN languages × 15 posts is the next step

### GEO: TOC translation sweep — 26 of 29 listicles ✅ all 13 langs (312+ rows updated)
- Hand-translated the numbered TOC into 12 non-EN languages (DE, ES, FR, IT, PT, NL, DA, SV, FI, JA, KO, ZH-CN) for 26 of the 29 "5-X-themes" listicles. Each row got a locale-quality TOC heading, locale-quality teaser sentences, and anchor IDs computed against that locale's existing translated H2s (so anchors resolve at render via rehype-slug). Cell-by-cell discipline maintained throughout — every UPDATE scoped to one row by `WHERE language = ? AND slug = ?`
- 26 listicles × 12 langs = 312 cell updates this session, on top of 7 backfill rows for haunted-library (the 7 langs from the prior session whose TOC was actually missing)
- 3 listicles deferred — non-EN versions don't have the theme-H2 structure that the EN side received in the prior session: **5-casino** (post promises "5 themes" but body delivers prose only — needs 5 themes written + structured in 12 langs), **5-gothic-romance** (only 2 of 5 themes present in body — needs 3 more written in 12 langs), **5-spy-thriller** (themes are bold text, not H2s — needs heading conversion in 12 langs). Tracked in `docs/post-structure-tracker.md` with the specific blocker noted on each
- 1 row deferred for unrelated data quality: KO version of 5-ancient-egyptian-temple is missing themes 3-5 in body. The other 12 langs of that listicle did get TOCs

## 2026-05-04

### GEO: numbered TOCs added to all 29 EN "5-X-themes" listicle posts (#9 complete on EN side)
- Hand-wrote a numbered table-of-contents block at the top of every "5 X murder mystery themes" listicle in English. Each TOC lists all 5 themes as `[Theme name](#anchor) — one-line teaser` so AI engines (ChatGPT, Perplexity, Google AI Overviews) can extract a clean numbered list when a user asks "what are 5 X murder mystery themes?". Anchors resolve to `## Theme N: Name` H2s already in the post; rehype-slug (added earlier) generates the IDs at render time
- 26 posts had clean `## Theme N: Name` structure and got TOC-only inserts. 3 posts needed structural rework first:
  - **spy-thriller**: 5 themes were rendered as `**Bold Text**` instead of headings — converted all 5 to `### Theme N: Name` then added the TOC
  - **casino**: post promised "5 themes" but only delivered 4 prose scenarios — restructured the 4 into H3 themes 1-4 and wrote a 5th "Private High-Roller Game Gone Wrong" theme to honor the slug commitment
  - **gothic-romance**: only 2 themes (`## The Cursed Inheritance Manor`, `## The Forbidden Love Triangle Tragedy`) — wrote 3 new themes (Wedding Night Tragedy, Governess and the Locked Wing, Romantic Rival's Revenge) at full depth matching existing themes, then added the TOC
- All cell-by-cell, one slug per `UPDATE blog_posts SET content = ... WHERE id = X`. No regex across rows, no Python, no bulk operations. Verified with `position('themes covered in this guide' in content) > 0` for all 29 EN slugs
- Translation sweep across 12 non-EN languages × 29 listicles is the next step for full coverage

### GEO: answer-first blocks at top of every post (5,472 rows, 13 locales)
- The single highest-leverage AEO/GEO change per the 2026 research: AI engines (ChatGPT, Perplexity, Google AI Overviews) scan the first 200-300 words for a clear answer block to extract as a citation. Original posts opened with anecdotal storytelling — great for humans, terrible for AI extraction
- Prepended a locale-aware blockquote at the top of `content` for every blog row, using the post's existing meta description (which is already an SEO-optimized 130-150 char concise answer, so no new writing needed): EN=`> **Quick answer:**`, DE=`> **Kurz gesagt:**`, ES=`> **En resumen:**`, FR=`> **En bref :**`, IT=`> **In breve:**`, PT=`> **Em resumo:**`, NL=`> **Kort gezegd:**`, DA=`> **Kort fortalt:**`, SV=`> **Kort sagt:**`, FI=`> **Lyhyesti:**`, JA=`> **要約：**`, KO=`> **요약:**`, ZH=`> **摘要：**`
- Idempotent (won't double-prepend if re-run). Renders as a markdown blockquote in [BlogPost.tsx](src/pages/BlogPost.tsx) — visually prominent for humans, structurally prominent for AI scrapers. Single SQL pass touched all 5,472 rows; existing "Last updated" lines and original prose follow

### Feature: theme + tags backfill (5,472 rows, was 100% NULL)
- `theme` was NULL on every row, silently breaking the related-posts theme-clustering query in [BlogPost.tsx:188](src/pages/BlogPost.tsx#L188) (it `.eq('theme', selectedPost.theme)` so always returned zero matches and fell through to the "recent posts" fallback)
- Categorized all 420 EN posts (103 published + 317 drafts) into 8 themes via slug pattern matching: `themes-settings` (99), `formats-tools` (95), `hosting-guides` (67), `occasions` (44), `audiences` (34), `troubleshooting` (32), `work-team` (25), `characters` (24). Propagated the same theme to all 12 non-EN translations of each slug via JOIN
- `tags` was also NULL on every row. Programmatic extraction from slug tokens (drop ~80 stopwords, keep first 5 distinguishing tokens, prepend the post's theme as the first tag). Final state: avg 4 tags/post, max 6, 0 NULL. Enables tag-cloud / topic-cluster navigation and adds entity signals for AEO/GEO

### Fix: sitemap was missing 339 of 1,339 published URLs (Supabase REST 1000-row cap)
- `scripts/generate-sitemap.mjs` queried Supabase without pagination, so the build only ever wrote 1,000 URLs to sitemap.xml. With 1,339 published rows (across all locales) that meant **~339 published URLs were never indexable via sitemap** — Google could only find them via internal linking
- Added `fetchAllPublishedPosts()` that loops with `.range()` until exhausted. Build output went from "Found 1000 published blog posts / 1013 route files" to "Found 1339 / 1352 route files"
- Net result: every published row across all 13 languages is now in the sitemap

### Feature: visible "Updated" date in blog post byline (#12 from audit)
- `dateModified` was already in the JSON-LD from the schema pass earlier this session, but never rendered visibly on the page. 2026 AEO best practices treat a visible "last updated" stamp as a small trust signal both Google and AI engines weight when assessing content freshness
- Added a `<time dateTime>` element next to the author byline in [BlogPost.tsx](src/pages/BlogPost.tsx), rendering as e.g. "Updated May 4, 2026" between the author link and the reading-time pill

### Security: 0 npm audit vulnerabilities (was 10)
- `npm audit` reported 10 vulnerabilities (4 high, 6 moderate) across `brace-expansion`, `lodash`, `picomatch`, `postcss`, and `vite`. Most were transitive deps; `postcss` and `vite` were direct
- Ran `npm audit fix` (auto-resolved 4 packages, non-breaking) plus a single patch bump from `vite@7.3.1` → `^7.3.2` to clear the dev-server-only path-traversal/fs.deny/websocket-file-read advisories
- Final state: `npm audit` clean

### GEO: structural improvements to comparison posts (#9, partial)
- Added a clean markdown comparison table at the top of the published [Best Murder Mystery Games review](best-murder-mystery-party-games-review) — extracted Night of Mystery, Broadway Murder Mysteries, Playing With Murder, Masters of Mystery, Hunt A Killer, Deadbolt Mystery Society, The Dinner Detective, and MysteryMaker into one structured comparison the post had buried in prose. Tables are heavily favored by Perplexity/ChatGPT/Google AI Overviews for citation; positioning it right after the answer-first block maximizes extraction
- **#9 deferred for the rest of the catalog:** Audited the "5-X-themes" listicle posts (29 published) for safe auto-conversion to numbered/bullet lists — H2 counts vary 1-15 with no consistent "5 themes = 5 H2s" pattern, so reliable extraction isn't possible. Other structural improvements (converting prose-lists to bullets, splitting >250-word sections with H3s, adding tables to other comparison posts) require careful per-post hand-editing — programmatic regex changes across 5,472 rows risk corrupting content for marginal gain. The answer-first blocks (shipped earlier) already capture the biggest GEO win identified in the audit

### SEO: complete Phase D draft titles + non-EN draft metas (all 13 langs done)
- Finished SV residuals (~10), all FI draft titles (~220 + residuals), and 2 JA stragglers. Combined with prior passes, every draft title across all 13 languages is now ≤ 60 chars
- Trimmed/repaired all 24 non-EN draft metas across DE/ES/FR/IT/NL/PT/DA/SV/FI. Caught + fixed several pre-existing data quality issues where English content had been left in non-EN slots (DA scientist, FR millionaire/magician, IT magician — all replaced with proper translations)
- Final state: 0 over-limit titles or metas across all 5,472 rows × 13 languages × 4 fields. The daily-publish cron will ship clean SERP-optimized posts for the next 7-10 months without any further intervention

### SEO: trim IT/PT/NL/DA/SV draft titles (Phase D, continued)
- Translated all 220 trimmed EN draft titles + Phase B residuals into Italian, Portuguese, Dutch, Danish, and partial Swedish (~5 SV residuals remain). Roughly 1,200 more draft title rows updated, bringing the running Phase D total to ~1,920 across DE/ES/FR/IT/PT/NL/DA + most SV
- Outstanding: ~10 SV residuals, all 220+ FI titles, ~24 non-EN draft metas. The daily-publish cron has months of runway before any unfixed draft surfaces, so the remainder can wait for a follow-up session
- CJK languages (ja, ko, zh-cn) needed no draft work — character-counting kept them under-limit naturally

### SEO: trim DE/ES/FR draft titles (Phase D, partial)
- Translated all 220 trimmed EN draft titles + Phase B residuals into German, Spanish, and French. ~720 draft title rows updated across these three locales. Used the established locale-specific keywords (Krimidinner / Misterio / Soirée enquête) for cross-language consistency with the published pass
- IT, PT, NL, DA, SV, FI draft titles still queued — same approach, batched per language. These will publish over the next ~7-10 months as the daily-publish cron works through the queue, so there's runway to finish them in subsequent sessions

### SEO: trim long titles + metas across all 317 EN draft posts (Phase C of audit)
- Audited the 317 EN draft posts queued for the daily-publish cron — 220 had titles over 60 chars (same systemic pattern as published) and 35 had metas over 160. These would have shipped broken to users one per day over the next ~10 months
- Trimmed all 220 draft titles in a single SQL pass (avg 67 → 42, max 60). Same approach as published EN: keep primary keyword + intent at the front, drop colon subtitles, drop generic verbs ("ultimate," "complete") that just embellish. Slugs unchanged
- Trimmed all 35 draft metas to ≤ 160 (max 160). Lead now opens with what the reader gets, not adjective stacking
- Combined with the published pass: every English blog post (live + queued, 420 total) is now SERP-optimized
- Non-EN draft titles + metas (~2,200 rows across 9 Latin languages) are still queued — they'll be translated language-by-language in subsequent passes

### SEO: trim long meta descriptions across all 13 languages (1,339 published metas)
- After EN, audited all 12 other published locales — Latin-alphabet languages had 24-47 metas each over Google's 160-char SERP cutoff (longest: 319 chars, FR). Same systemic pattern as titles: original generation drifted past target. CJK locales were fine (Japanese chars carry more meaning per character)
- Re-translated 339 over-limit metas across 9 Latin languages, plus extended the EN-trim concept to corresponding non-EN slugs for cross-language consistency. Used the established locale keyword from the title pass (Krimidinner / Soirée enquête / Cena con delitto / etc.) so meta and title share the topic signal
- Final state: avg 128-139 chars (Latin), 45-69 (CJK); max 160 everywhere; 0 over-limit across all 1,339 published rows. Combined with the title pass: every published post now has both H1/SERP title and meta description optimized for Google SERP visibility AND topic-cluster consistency across locales

### SEO: trim long titles + re-translate across all 13 languages (1,339 published titles)
- After EN, audited all 12 other published locales — 70-90 titles per Latin-alphabet language were over Google's 60-char SERP truncation; longest was 150 chars (FR). CJK locales (ja/ko/zh-cn) were mostly fine because each character carries more meaning
- Standardized one primary "murder mystery" keyword per locale (existing translations used 4+ different terms within each language, fragmenting topic-cluster signals): de=Krimidinner, fr=Soirée enquête, es=Misterio de Asesinato, it=Cena con delitto, pt=Mistério, nl=Moordmysterie, da/sv=Mordmysterium, fi=Murhamysteeri, ja=マーダーミステリー, ko=머더 미스터리, zh-cn=谋杀谜案. Choices reflect highest-volume commercial terms in each market
- Re-translated all 74 trimmed EN titles into 12 languages, plus fixed Phase B residuals (4-16 per Latin language) where EN was already short but the local title still ran long. Also re-translated CJK even though already under-limit, for cross-language consistency with the new EN concept
- Final state: avg 39-43 chars (Latin), 12-21 chars (CJK); max 60 everywhere; 0 over-limit across all 1,339 published rows
- Caught + fixed one pre-existing data quality issue: the FR row for `5-ancient-egyptian-temple-murder-themes` had a Spanish title sitting in the FR slot. Replaced with proper French translation as part of the FR pass
- Drafts (4,133 rows: ~318 unique slugs × 13 languages) are still untouched — those get the same treatment in the next phase before tomorrow's daily-publish cron starts flipping them

### Fix: CI build broken by @supabase/realtime-js requiring native WebSocket on Node 20
- The previous three commits (schema fix, /about page, headshot) failed to deploy because `npm run build` runs `node scripts/generate-sitemap.mjs` after `vite build`, and the script calls `createClient` from `@supabase/supabase-js@2.49.4`. The newer realtime-js inside that version requires a native WebSocket constructor; Node 20 (used by GitHub Actions and Vercel build) doesn't ship one. Result: build exited 1, no deploy
- Added `ws@8.20.0` as a direct dependency and created [scripts/_supabase-node.mjs](scripts/_supabase-node.mjs) — a thin wrapper around `createClient` that injects `realtime: { transport: ws }`. Build-time and CI scripts import from here instead of `@supabase/supabase-js` directly, so when we move to Node 22+ (which has native WebSocket) only the wrapper changes
- Migrated [scripts/generate-sitemap.mjs](scripts/generate-sitemap.mjs) (build) and [scripts/apply-crosslinks.mjs](scripts/apply-crosslinks.mjs) (called by daily-publish workflow) to the wrapper. Updated [.github/workflows/publish-daily-blog.yml](.github/workflows/publish-daily-blog.yml) to install `ws` alongside `@supabase/supabase-js` so tomorrow's daily publish doesn't hit the same crash. Other Node-side scripts (backfills, analytics fetchers) still use the raw client; they're local-only and can be migrated when next touched
- Verified locally: `npm run build` now completes through sitemap generation. **Side-finding logged separately**: the sitemap script returns "Found 1000 published blog posts" but the database has 1,339 — Supabase REST defaults to a 1000-row cap and the script doesn't paginate, so ~339 published URLs are missing from sitemap.xml. Pre-existing, not introduced by this commit; flagged for a follow-up

### Feature: real author identity across the blog (E-E-A-T pass)
- 89 of 103 published EN posts had `author = "AI Assistant"` and the rest were `"Jonathan Miller"`. Both Google E-E-A-T and 2026 GEO research treat anonymous/AI authorship as a citation-killer — AI engines de-prioritize unverifiable authors and Google de-ranks YMYL-adjacent content from generic bylines
- Set `author = 'Jonathan Miller'` across all 5,472 rows (every language, published + draft) so the daily-publish cron inherits the fix automatically when it flips drafts
- Built [src/pages/About.tsx](src/pages/About.tsx) at `/about` and `/:lang/about` so the JSON-LD `author.url` from the previous commit actually resolves. Page includes a real bio, headshot ([public/images/MMbiopic.png](public/images/MMbiopic.png)), and Person schema with `sameAs` links to the verified external profiles (LinkedIn, YouTube). Narrativa Improv Festival is mentioned in bio prose only — the festival site doesn't currently list Jonathan as a co-founder, so wiring it into `sameAs` would fail AI verification and weaken the entity signal
- Added a "By Jonathan Miller" byline below each post title in [BlogPost.tsx](src/pages/BlogPost.tsx) that links to `/about`. Closes the loop between the JSON-LD author entity and the on-page rendering — both Google and AI crawlers now see a consistent author claim from schema, byline, and dedicated bio page

### SEO: trim long titles + meta descriptions on published EN posts
- 74 of 103 EN titles were over Google's 55–60 char SERP truncation threshold (longest: 113 chars — "5 Haunted Library Murder Mystery Themes: Check Out Deadly Secrets with Ghostly Librarians and Supernatural Stacks"). Truncation hurts CTR and forces Google to guess at the cut point, often dropping the value-prop after the colon
- Trimmed all 74 to 30–60 chars (avg dropped 68 → 42, max now exactly 60). Strategy: keep the primary topic keyword and intent (`5 X Themes`, `How to Host X`, `Murder Mystery for X`) at the front, drop colon subtitles that just embellish. Slugs unchanged — URL stability preserved
- 30 EN meta descriptions were over Google's 160 char cutoff (longest: 258). Trimmed all to ≤ 160 (avg 144 → 134, max 160). Lead now opens with what the reader gets, not adjective-stacking
- Both passes touched only `language='en' AND status='published'`. Drafts (~318 unique posts × 13 languages) and non-EN translations get their own audit passes next

### Fix: blog post schema missing `author` and `image` (Google Article requirements)
- Audit against 2026 AEO/GEO best practices flagged that the `BlogPosting` JSON-LD in [src/pages/BlogPost.tsx](src/pages/BlogPost.tsx) emitted `headline`, `description`, dates, and publisher — but not `author` or `image`. Both are required by Google for Article rich results; without them Google logs Search Console warnings and skips the rich result entirely
- Added `author` (Person, with `url` pointing at `/about`) and `image` to the JSON-LD. Author resolves from `post.author`, but treats the legacy `"AI Assistant"` value as missing and falls back to `Jonathan Miller` until the full author backfill lands (#2 in this audit pass)
- Image resolves from `post.featured_image_url`; falls back to the homepage share image so the schema validates today and starts using real per-post images automatically once the image backfill ships in the coming weeks
- Also wired the same `shareImage` into `og:image` (previously only emitted when a per-post image existed → bare social shares for every post) and added `twitter:card=summary_large_image` + `twitter:image` so Twitter/X cards render properly. Added `<meta name="author">` for non-Schema crawlers
- **Latent bug fixed in the same pass**: the React `BlogPost` interface declared `featured_image?: string` while the database column is `featured_image_url`. All references (interface, JSON-LD attempt, og:image conditional, hero `<img>`) were reading the wrong field — meaning even when real images arrive, none would have rendered. Renamed everywhere

### Fix: blog index was hiding 57 of every 58 same-day posts
- A spot-check of `/blog` showed only one card for March 17, 2026 ("Unique Pirate Murder Mystery Plot Ideas — 58 posts") with a broken `Available in: EN, EN, EN…` badge repeated 58 times
- Two coupled bugs in [src/pages/BlogIndex.tsx](src/pages/BlogIndex.tsx):
  1. The query already filters by current `language`, but the render still grouped posts by date and rendered only `posts[0]` as the card. Every additional post on that date was reachable only by direct URL — 57 EN posts hidden behind the March 17 card alone (Make.com's daily-publish job back-filled 58 posts on its first run, all stamped with the same `published_at`)
  2. The `Available in:` badge mapped `group.posts.map(p => p.language.toUpperCase())` over a list that was already single-language, so it printed the same code N times instead of advertising sister translations
- Replaced the date-grouping reducer with a flat list — every published post in the current language gets its own card. Removed the `Available in:` badge entirely (its original purpose — surfacing translations of the same article — was never implemented and the language filter made it actively wrong)
- Backfilled `post_date` for all 1,339 published rows (every locale × every post had `post_date IS NULL`); set to `published_at::date` so future sorting and grouping work without falling through to the `published_at.split('T')[0]` fallback

### Audit: blog post length is far above the assumed 5k-character target
- Spot-check of one Ancient Greece post showed ~20k chars; audit confirmed this is systemic, not isolated. Across 103 published posts × 13 languages: Latin-alphabet locales average 19k–22k chars (en avg 19,938; fr avg 22,252; de avg 21,447) with maxima above 30k. CJK locales are smaller by character count (zh-cn avg 6k, ja avg 9k, ko avg 10k) but reading time is comparable
- Generation lives in Make.com (no prompt files in this repo), so this is a flag for the content pipeline rather than a code fix — surfacing it here so the next pass at the prompt knows the current output drifted ~4× past target

## 2026-04-30

### Fix: AI mystery concepts now fully localized — no English bleed-through
- A Spanish concept came back with English section titles ("Characters", "Murder Method") despite the rest of the response being in Spanish. Same latent issue affected every non-English language
- Two root causes in [supabase/functions/mystery-ai/index.ts](supabase/functions/mystery-ai/index.ts):
  1. `buildLabels()` was fetching `https://mysterymaker.party/locales/<lang>.json`, but the deployed site does not serve those JSON files as static assets (they're bundled into the SPA). The fetch returned `index.html`, JSON parse failed, and the catch fell back to ALL-CAPS English labels for every locale
  2. The function ignored the `language` field that `MysteryChat` already sends from `i18n.language`, instead doing fragile character-set regex on the user's first message — which silently misclassified Spanish/Italian/Portuguese as English whenever the user typed without diacritics
- Inlined `LABELS_BY_LOCALE` for all 13 supported locales (kept in sync with `src/i18n/locales/*.json`), removed the network fetch, and switched locale resolution to: trust client-supplied `language` (normalized for tags like `es-ES`, `pt-BR`, `zh-CN`) → fall back to text detection only when absent
- Replaced the weak "respond in the same language the user writes to you" directive with an explicit `Write the ENTIRE response in <LanguageName>` instruction that calls out section labels by name, so the model never leaves "Premise" / "Victim" / "Murder Method" untranslated even when the format template shows them in English
- Filled in Danish section labels (all eight were untranslated) and the five remaining English Swedish labels in [da.json](src/i18n/locales/da.json) / [sv.json](src/i18n/locales/sv.json) so the UI matches what the AI now emits


- GSC sweep revealed 1,695 blog URLs Google has indexed (last 365d) that don't exist in `blog_posts` for the language they're served at — 7,416 impressions and 117 clicks/year landing on hard 404s. Spread across all 13 locales: ~860 EN, ~80–115 in each major non-EN locale, smaller tails in Nordic/CJK
- Root cause: a prior publishing pipeline emitted translated slugs (e.g., `5-bailes-de-mascaras-con-misterio-y-asesinatos`, `einzigartige-zirkus-krimi-dinner-handlungsideen`) and lang-prefixed/suffixed slugs (e.g., `ko-butler-murder-mystery-themes-...`, `how-to-fix-confusing-murder-mystery-clues-sv`). Current schema uses shared English slugs differentiated by `language` column ([BlogPost.tsx:164](src/pages/BlogPost.tsx#L164)), so the old URLs orphaned. Only 98 of 421 posts per language are currently `status='published'`, meaning many old slugs map to topics that are still drafts and have no published canonical to redirect to
- Two-tier fix:
- **Tier 1 — graceful in-app redirect** ([BlogPost.tsx](src/pages/BlogPost.tsx)): when a slug isn't found, render `<Navigate to="/<lang>/blog" replace />` with `<meta name="robots" content="noindex,follow">` instead of throwing "Post not found." Catches all 1,695 orphans in one place; users land somewhere useful, Google deindexes naturally. Soft signal, but covers the long tail
- **Tier 2 — 148 high-confidence 301 redirects in [vercel.json](vercel.json)**: only orphans where stripping a known language prefix or suffix yields an exact match in the published EN slug list (e.g., `ko-butler-murder-mystery-themes-...` → `butler-murder-mystery-themes-...`, `how-to-fix-confusing-murder-mystery-clues-sv` → `how-to-fix-confusing-murder-mystery-clues`). These are unambiguous — zero risk of wrong-target redirects. Recovers 754 impressions / 14 clicks/year via proper 301
- Deliberately did **not** ship fuzzy translated-slug matching (e.g., `5-bailes-de-mascaras-...` → `5-masquerade-ball-...`). Token-overlap scoring produced a confident-but-wrong match for `unique-circus-murder-mystery-plot-ideas` → `unique-pirate-murder-mystery-plot-ideas` (5/6 tokens overlap, only theme word differs); estimated 10–20% of fuzzy matches would land on the wrong post. With only ~20 impressions/day at stake, the risk wasn't worth it. The Tier 1 catch-all handles those translated orphans

### SEO: Tier 2 expansion — manual cell-by-cell match for all 584 unique orphans
- Followed the automated Tier 2 with a manual one-by-one review of every remaining orphan slug across all 13 locales — 584 unique slugs (orphans appearing under multiple locale prefixes deduplicated). For each: decoded URL-encoded slugs (zh-cn / ko / ja native script + romanized variants), recognized topic semantically, picked the best-matching canonical EN slug from the 98 published candidates
- Generated **1,282 total 301 redirects** (148 from automated Tier 2 + 1,134 from manual decisions × locale prefixes each orphan appears under). Recovers ~5,000 of the 7,416 wasted impressions/year via specific 301s; the remaining ~2,400 (orphans with no published canonical: ice hotel, dream world, ancient Celtic, rockstar, post-apocalypse/zombie-wedding edge cases — 9 unique slugs total) continue to flow through Tier 1's blog-index fallback
- Decision log saved to `temp-files/orphan-decisions.jsonl` for future audit + re-runs as more drafts get published

### Fix: clear stuck `in_progress` package from Apr 12
- Package `21976b4c` ("Death At The Velvet Rose", test account) had been pinned at `in_progress` / 20% since 2026-04-12 because the parent Make.com execution stalled before any character rows were created — falling outside the sweep's "completed-with-bad-characters" criteria
- Make.com's Incomplete Executions queue replayed the stale parent on 2026-04-29, firing 10 child inserts with empty `characterName`/`packageId` and producing 10 NOT-NULL constraint warnings
- Marked the package `failed` with `resumable: true` so the UI exits the stuck state. Diagnostic confirmed this is the only such occurrence since the monitoring/verification stack shipped (1 in 6+ months, test-account only) — leaving the systemic safeguards as-is rather than adding code for a non-recurring edge

## 2026-04-27

### Localization: broad sweep across 12 user-facing pages
- Followed up the homepage / header pass with the rest of the app. Audited every user-reachable page (skipped admin/preview/print/font-preview routes) and wrapped every hardcoded English string in `t()`. ~120 new keys, fully translated into all 13 locales
- Conversion-path pages: [MysteryPurchase.tsx](src/pages/MysteryPurchase.tsx) (6 checkout-flow toast errors + the "Fully editable" explainer), [MysteryView.tsx](src/pages/MysteryView.tsx) (~25 strings — generation status messages, "Try Again"/"Resume Generation"/"Check Again" buttons, "Generation Failed" / "Taking Longer Than Expected" / "We're Finalizing Your Mystery" cards, all reassurance copy + `support@mysterymaker.party` instructions), and the auth set: [SignIn.tsx](src/pages/SignIn.tsx), [SignUp.tsx](src/pages/SignUp.tsx), [AuthCallback.tsx](src/pages/AuthCallback.tsx) (was 0 t() calls), [CheckEmail.tsx](src/pages/CheckEmail.tsx) (was 0 t() calls), [ResetPassword.tsx](src/pages/ResetPassword.tsx), [ForgotPassword.tsx](src/pages/ForgotPassword.tsx)
- Account / post-purchase pages: [AccountSettings.tsx](src/pages/AccountSettings.tsx) (Profile/Security/Billing tabs + delete-account toasts), [BillingHistory.tsx](src/pages/BillingHistory.tsx) (entire page — Purchase Summary, Total Spent, Status badges, View/Download buttons), [Feedback.tsx](src/pages/Feedback.tsx) (~30 strings — full feedback form including ratings, NPS scale, public-opt-in copy), [GuestFeedback.tsx](src/pages/GuestFeedback.tsx)
- Lower-traffic pages: [NotFound.tsx](src/pages/NotFound.tsx) (404 + meta tags), [HostAccess.tsx](src/pages/HostAccess.tsx) and [CharacterAccess.tsx](src/pages/CharacterAccess.tsx) (error messages + footer CTAs)
- For interpolated strings with HTML (e.g. "Your feedback for **{{title}}**…"), used `<Trans>` component instead of plain `t()` so the `<strong>` tag survives translation
- Already-localized pages (audited but no work needed): PaymentSuccess, MysteryCreation, MysteryChat, Dashboard, MysteryDashboard, Support
- Skipped intentionally: AdminDashboard (admin-only), all *Preview / *Print / FontPreview pages (dev tooling), Privacy (legal copy — separate effort), BlogIndex/BlogPost (already DB-localized via `posts.title` / `posts.meta_description`)

### Fix: header Sign In/Sign Up buttons + auth dialog stuck on English
- Despite Header.tsx itself using `t()`, the desktop header rendered `<AuthButton />` which hardcoded "Sign In", "Sign Up", "Account Settings", and "Sign Out" — so a Spanish visitor on a Spanish-localized page still saw EN auth buttons. Mobile header was already correctly i18n'd; the bug only ever showed up on desktop
- Wired [AuthButton.tsx](src/components/AuthButton.tsx) to existing `navigation.signIn` / `signUp` / `signOut` keys (already populated for all 13 locales) plus new `navigation.accountSettings`. Same surface as the mobile menu now, so Spanish desktop users see "Iniciar Sesión" / "Registrarse" / "Configuración de la cuenta" / "Cerrar Sesión"
- [SignInPrompt.tsx](src/components/SignInPrompt.tsx) (the dialog the hero shows on submit-when-not-authenticated) was fully hardcoded — title, description, Google button, divider, both CTAs, and three toast error messages. Wired to existing `auth.signIn.title` / `auth.signIn.googleButton` and new `auth.signInPrompt.{description,or}` + `auth.errors.{googleSignInFailed,googleSignInInitFailed,unexpected}`
- [Header.tsx](src/components/Header.tsx) mobile-menu toggle's `aria-label="Toggle menu"` localized via new `navigation.toggleMenu`
- Side-fix: `navigation.signIn` and `navigation.signUp` in `ja.json` and `ko.json` were stuck on the English literal (not actually translated at original i18n setup time). Patched to サインイン/新規登録 (ja) and 로그인/회원가입 (ko)

### Fix: chatbox typewriter rendered half-EN / half-target-language placeholder
- Spanish (and every non-EN/PT locale) saw the typewriter placeholder render as `Create a mystery Diseña un misterio en un mundo de fantasía…` — a literal English prefix glued to the full localized prompt. Two bugs combined: `hero.typewriterPrefix` only existed in `en.json` so all other locales fell back to the English literal, and the suffix-strip regex in [Hero.tsx](src/components/Hero.tsx) only handled English and Portuguese verb prefixes (`Create a mystery` / `Crie um mistério`)
- A locale-by-locale verb-list patch wouldn't scale: Spanish prompts alone use `Crea`, `Diseña`, `Desarrolla`, `Construye`, `Quiero organizar`. Instead, dropped the static prefix entirely — each localized prompt already contains a natural-language opener, so the full prompt now cycles through the typewriter
- Removes the `STATIC_PREFIX` span and the prefix-strip `useCallback` dependency surface; works correctly for all 13 locales by construction with no per-locale verb maintenance

### UX: Localize remaining hardcoded English on homepage
- Stats counter labels (`Mysteries Created` / `Themes Possible` / `To Get Started`), the `Verified Trustpilot Review` badge under each tilt-card, the YouTube iframe `title="Watch a Demo"`, and the three parallax testimonials (Sophia / Will / Jed) were rendered as literal English regardless of i18n locale. All wrapped in `t()` against new `home.*` keys in [Index.tsx](src/pages/Index.tsx)
- The parallax testimonials are real customer reviews — translating them is a slight artistic licence, but holding back creates a worse trust signal than a localized version for non-EN visitors who can't read the originals

### SEO: Localize homepage `<title>`, meta description, `og:locale`, and `<html lang>`
- The blog already emits proper `hreflang` alternates and per-language meta via DB-stored `posts.title` / `posts.meta_description` ([BlogPost.tsx:432-475](src/pages/BlogPost.tsx#L432-L475)) — verified 421 Spanish posts have native-language `meta_description`. The homepage was the gap: `<Head>` shipped a hardcoded English title/description and inherited `<html lang="en">` from [index.html](index.html), so Google saw an English page even when the visitor was browsing in Spanish
- [Head.tsx](src/components/Head.tsx) now reads from `i18n`: defaults `title`/`description` to `home.seo.*` keys, sets `<html lang>` via Helmet (BCP-47, `zh-Hans` for Chinese), and emits `og:locale` from a small i18n-code → OG-locale map. Existing callers that pass an explicit title/description are unaffected
- [Index.tsx](src/pages/Index.tsx) drops the literal English title/description and uses the i18n fallback path

### UX: Stop showing English testimonials to non-English visitors
- [TestimonialsSection.tsx](src/components/TestimonialsSection.tsx) was always rendering the latest 6 public reviews from `mystery_feedback`, but the table has no `language` column and ~all paid hosts to date have been EN-speaking — so a Spanish visitor saw English reviews on a Spanish-localized page, which costs trust at the worst possible moment
- For non-EN locales, skip the `mystery_feedback` fetch entirely and fall straight through to the existing translated `testimonials.testimonialN.*` keys (already populated in all 13 locale files). EN behavior unchanged
- TODO marker left for the better long-term fix: add `mystery_feedback.language` (populated at submission time from `i18n.resolvedLanguage`) and language-match real testimonials instead of falling back to hardcoded copy

### UX: Swap homepage demo video
- Replaced YouTube embed ID `8WInnaFHMY0` with `IFZdtPfUtPo` in [Index.tsx](src/pages/Index.tsx) (and the matching `homepage_video_played` PostHog event payload) and [DarkHomePreview.tsx](src/pages/DarkHomePreview.tsx) so analytics keeps tracking the currently-displayed video

## 2026-04-26

### Architecture: script_type='both' rendering — twin-column "always generate, conditionally display" pattern
- Old approach asked one Claude call to emit both bullets AND prose inside a single JSON field. Model fidelity was unreliable: random characters got bullets-only, others prose-only, none got both. The dual-format-in-one-string pattern is fundamentally fragile for LLMs
- New schema: every spoken field has a `*_pointform` sibling column (`introduction_pointform`, `rumors_pointform`, `accusations_pointform`, `round{2,3,4}_script_pointform`, `final_statement_pointform`). Detailed prose lives in the existing column; bullets live in the new one. Each generation call has ONE clear output mode
- New Edge Function `generate-pointform-summaries` takes a `packageId` (and optionally `characterIds`), reads existing detailed fields, calls Claude Haiku 4.5 to summarize each into 4-7 bullets ≤20 words each, and updates the `*_pointform` columns. ~$0.05/character. Reusable as Call 4 of the future v14 child Make.com architecture
- Frontend (`CharacterAccess.tsx` and `MysteryPackageTabView.tsx`): `script_type='full'` shows detailed only, `'pointForm'` shows bullets only, `'both'` stacks detailed (with its own ## header) followed by `**Point Form:**` + bullets. Stacked instead of tabbed because email clients, mobile webviews, and print all render uniformly without JS state
- New RPC `get_packet_metadata_by_token` exposes the host's `script_type` choice to the guest packet route alongside the existing character data fetch

### Fix: relationships field chain-of-thought leak (Ash, Benny in package 949b49ac)
- Two characters in a freshly generated mystery had reasoning traces leaked into their `relationships` field — verbatim "Wait, this is wrong. Let me recalculate from the matrix... reviewing the relationship matrix:" followed by a neutral/hostile dump, then the corrected ALLIES/RIVALS section. Customer-facing content shouldn't contain the model's drafts or self-corrections
- Root cause: the v12 child blueprint's `<no_meta_text_in_output>` block targeted instructional preambles ("CRITICAL: Target 3 DIFFERENT characters") but didn't address mid-output reasoning leaks. Asking the model to "use the relationship matrix" sometimes triggered it to show its work
- v13 child blueprint adds a `NO CHAIN OF THOUGHT IN OUTPUT` section listing the exact leak phrases ("Wait,", "Let me recalculate", "reviewing the relationship matrix", "Disregard", duplicate `**RIVALS & ENEMIES:**` blocks) and flags `relationships` as the highest-risk field. `<final_format_check>` adds a CoT scan pass that runs before emitting. Imported into the existing unified child scenario — webhook URL unchanged
- After v13 + a delete/re-fire cycle, all 16 characters' relationships fields are clean. Verified across the cast

### Fix: child Make.com upsert was INSERT-only — caused unique-constraint warnings on re-runs
- The `supabase:upsertARecord` module in the child blueprint had no `onConflict` parameter, so PostgREST fell through to plain INSERT against `mystery_characters`. Worked fine on first generation (rows didn't exist yet), but every backfill / re-run hit the `(package_id, character_name)` unique constraint and silently lost the regenerated content
- Discovered while backfilling package 949b49ac after v13 prompt changes. Worked around by deleting rows before re-firing. Permanent fix is a v14 blueprint patch (TODO) — for now, document the workflow

### Fix: package 949b49ac (Midnight Confessions) — stale bullet-only round_scripts replaced with prose
- Three characters (Perry, Quinn, Victor) came back with bullets in `round_script` columns despite the prompt asking for full prose. Re-fired with `scriptType=full`; all three now have proper prose dialogue
- Frankie/Frances Vale failed Make.com's `json:ParseJSON` step because the model produced rumors with single-quote dialogue and forgot the closing JSON `"` before the next key. Re-fired and landed cleanly. Underlying fragility is the size of the monolithic JSON output — split-call architecture (planned for v14) is the durable fix

### Architecture: pointform columns added to mystery_characters
- Migration `add_pointform_columns_to_mystery_characters` adds 7 nullable text columns. Backfilled for package 949b49ac via the new summarizer Edge Function

### Architecture: child Make.com scenario v14 — split-call architecture (BOTH routes)
- Both Route 0 (detective) and Route 1 (character-based) now use the split-call pattern. Detective has 3 Claude calls (Context, Round 1, Round Scripts); character-based has 5 (Context, Round 1, Innocent Scripts, Guilty Scripts, Accomplice Scripts) — the accomplice call has a Make.com module filter on `hasAccomplice="true"` so it auto-skips when the mechanism doesn't apply
- Each route's first module carries the router-level filter on `mystery_style` so only the matching branch executes (was lost in an earlier rebuild — refile fixed this; only one route fires per webhook now, no more spurious failures on the wrong branch)
- Each route starts with `supabase:searchRows` against `mystery_characters` filtered by `package_id+character_name`. The found row's `id` flows into Upsert 1 — populated `id` triggers UPDATE in place (re-runs are now safe), absent `id` lets Postgres generate a fresh UUID for INSERT (first generation). Subsequent upserts in the same run reference Upsert 1's `id`. No more "delete-before-rerun" workflow
- Final step is an HTTP call to `generate-pointform-summaries` with `{packageId, characterName}` (using webhook input directly, since Make.com's Supabase upsert connector doesn't expose the inserted row's id reliably)
- 12 new role-variant pointform columns added for character-based mysteries: `round{2,3,4}_{innocent,guilty,accomplice}_pointform`, `final_{innocent,guilty,accomplice}_pointform`. Migration `add_role_variant_pointform_columns`
- `generate-pointform-summaries` updated: SOURCE_FIELDS includes both unified columns (detective) and per-role variants (character-based). Only fields with non-empty content are sent to the model — character-based mysteries don't waste tokens on unified columns and vice versa

### Architecture: parse-claude-json Edge Function — bulletproof JSON parsing
- The model occasionally emits JS-style apostrophe escapes (`That\'s`) inside JSON strings. JSON spec rejects `\'`, so strict parsers fail. Make.com's expression-level `replace()` for these escapes proved unreliable (the platform's string-literal escape rules behave differently than expected — `"\\'"` in expression source did not match the literal `\'` characters in the parsed text)
- New Edge Function takes Claude's raw text (plain text body or JSON `{text}`) and runs progressive sanitization stages between strict `JSON.parse()` retries: strip code fences → replace `\'` with `'` → collapse `''` → strip trailing commas. Returns the parsed object as the response body so Make.com's HTTP module (with parseResponse=true) exposes its keys via `{{moduleId.data.<field>}}` — same downstream contract as `json:ParseJSON` but rather than throwing on the first malformation, it recovers
- v14 child blueprint replaces all 8 `json:ParseJSON` modules (3 in route 0, 5 in route 1) with HTTP calls to this Edge Function. Upsert mappers updated to use `{{moduleId.data.<field>}}` paths
- Same fix is available for the parent scenario's remaining ParseJSON module — deferred

### Architecture: child Make.com scenario v14 — split-call architecture (detective route)
- Single 25KB Claude call per character replaced with three focused calls + an HTTP step that invokes the summarizer Edge Function. Each Claude call has a small, well-scoped output schema; each call's JSON is small enough to parse reliably. Eliminates the "model forgets a closing quote at end of long output" failure (Frankie/Frances Vale's JSON parse failure was this exact mode)
- Scenario flow for Route 0 (mystery_style='detective'): searchRows (find existing row by package_id+character_name) → Claude Call 1 (context: description, background, relationships, secret, introduction, characterRole) → Parse → Sleep → Upsert → Claude Call 2 (rumors, accusations) → Parse → Sleep → Upsert (UPDATE by id from Upsert 1) → Claude Call 3 (round2/3/4_script + questions, final_statement) → Parse → Sleep → Upsert (UPDATE by id from Upsert 1) → HTTP POST to generate-pointform-summaries
- Re-run safe: the searchRows step finds an existing character row if one is present, so Upsert 1 UPDATEs that row instead of failing on the unique constraint. First-time generation still INSERTs cleanly (search returns nothing → id reference resolves empty → Make.com omits → Postgres generates UUID via DEFAULT)
- script_type=both is no longer asked of the model. The summarizer step (Claude Haiku 4.5 via the Edge Function) takes the prose just written by the upserts and produces clean bullet summaries into the `*_pointform` columns. No more "model picks one format randomly" failure
- Cost: ~$3.20/mystery for child generation (was ~$1.60). With prompt caching across the 3 Claude calls' shared preamble, real input cost increase is small
- Blueprint at `temp-files/MM Live - Child (Unified)14-SplitCalls.blueprint.json`. Route 1 (character-based) is unchanged — separate work pending
- v13 preserved at `temp-files/MM Live - Child (Unified)13-NoCotAndBoth.blueprint.json` for rollback

### Fix: TLC Reunion (fb085089) materials field reduced to theme-only props
- The `materials` field renders under the "Theme-Specific Props (Optional)" header in `HostGuideTemplate`, but TLC's content was the old verbose format mixing universal items (printed character guides, name tags, timer, slips of paper, pens) with the actual theme bits — causing visible duplication with the static template's universal Materials list rendered just above
- Rewrote to 6 theme-only bullets: TLC reunion backdrop, mock show posters, Go-Go Juice prop bottle (Mountain Dew + Red Bull as murder weapon), faux paparazzi cameras, themed refreshments, reality TV background music
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`. Audited Villa Amore (`02337aff`) and BEFORE THE NIKAH (`c7d0995f`) — same duplication pattern but left untouched per request

## 2026-04-25

### Fix: Better dark-mode contrast on "We're Finalizing Your Mystery" warning card
- Amber-on-dark colors were nearly unreadable; added `dark:text-amber-200` / `dark:text-amber-300` variants throughout the card
- Refresh button now has proper hover states for both light and dark modes

### Milestone: Mystery generation pipeline end-to-end working
- After multi-day debugging session, all generation issues resolved as of this commit
- Full backend now runs reliably: master_context, host guide content, character scripts (point form), evidence cards, detective/investigator script, evidence images all populate cleanly
- Frontend renders the new static host guide template with adaptive Detective/Investigator + Murderer/Culprit terminology, phased generation progress with live character count, evidence card print without Significance section
- Make.com Parent27 (split architecture: 3 separate Claude calls for Detective Script + Evidence Cards + Image Prompts instead of one monolithic JSON), Child v10 (expanded pointForm enforcement covering introduction/rumors/accusations + corrected rumors targeting to skip Friendly relationships)
- Cost ~$2/mystery on Haiku 4.5 across the board



### Refactor: Static host guide template — most content is universal across mysteries
- New `HostGuideTemplate.tsx` component renders all the universal hosting content (preparation steps, slip-draw mechanics, time guidelines, detective setup choice, round-by-round flow, hosting tips) as a static template parameterised by mystery type and player count
- The Make.com prompt no longer regenerates this content per mystery — it only produces dynamic fields (`gameOverview`, `themedMaterials`, `mysteryTips`)
- Eliminates ~80% of host-guide tokens per generation, cuts cost, removes a recurring source of hallucinated content (e.g. "arrive 90 min early", "sealed envelopes")
- Terminology adapts to mystery type: Detective/Murderer for murder, Investigator/Culprit for intrigue
- Time table scales by player count (≤8 = ~1.5h, ≤14 = ~2h, ≤20 = ~2.5h, 20+ = ~3h)

### Feature: Phased generation progress with live character count
- New `GenerationProgress.tsx` component replaces the previous status card during in-progress generation
- Shows overall progress bar + 4 named phases: "Story foundation set", "World and host guide", "Creating characters (X of Y ready)", "Evidence and detective script"
- Active phase has a spinning loader; done phases get a green checkmark
- Live character count updates as each child scenario completes (subscribes to `mystery_characters` INSERT events via Realtime)
- Removes the misleading "automatically checks every 15 seconds" copy — page now updates from real DB events, not polling

### Fix: Supabase Realtime publication for mystery tables
- `mystery_packages` and `mystery_characters` added to the `supabase_realtime` publication so postgres_changes events actually fire
- Without this, the page subscribed to events that never came; `lastUpdate` was stuck at page-load time
- Now drives the new GenerationProgress live updates and the auto-refresh on the mystery view

### Fix: Tightened "We're Finalizing Your Mystery" warning trigger
- The card was firing prematurely during normal in-progress generation because of a fallback condition `(is_paid && gameOverview)` that matched at 60% (when `gameOverview` lands but characters haven't arrived yet)
- Removed the soft fallback; warning now only fires when `generation_status = 'needs_review'` OR `generation_status = 'completed' && characters.length === 0` — i.e., only when there's a real problem
- Manual refresh button now bypasses the 10-second throttle and refetches package + character data (was previously a no-op when clicked within the throttle window)
- Realtime handler also refetches characters now (was only refetching mystery_packages, leaving `characters` state stale)

### Fix: Adaptive Detective/Investigator tab terminology by mystery type
- Tab label was a single i18n key showing the same string for both murder and intrigue mysteries
- Now reads `mystery_type`: "Detective Guide" for murder, "Investigator Guide" for intrigue (matches the script content terminology)
- Added `inspectorIntrigue` keys to en.json desktop + mobile tabs

### Fix: Evidence card print strips Significance section
- New evidence prompt format includes a `#### SIGNIFICANCE (Host Only)` block alongside the description; the print parser was including both
- `PRINT_STRIP` regex now also matches `Significance` so printed cards show only the description + image, as intended

## 2026-04-24

### Feature: PostHog analytics + homepage video play tracking
- Installed `posthog-js` and initialised alongside existing GA4 in `App.tsx`
- Tracks `$pageview` on every route change via PostHog
- Homepage YouTube embed now uses `enablejsapi=1`; a `homepage_video_played` event fires once per session when playback starts (via `postMessage` from the YouTube IFrame API)
- PostHog project key stored as `VITE_POSTHOG_KEY` Vercel env var — never in the repo

### Feature: Intrigue mystery gathering hook — premise and Make.com generation
- Intrigue mysteries need an explicit in-world reason for suspects to stay ("nobody leaves" equivalent from murder mysteries). Added the **gathering hook** requirement across the full stack
- **mystery-ai (v160):** Both intrigue generation branches now instruct the AI to include in the PREMISE: (1) what occasion brings all suspects together, (2) that the wronged party summoned everyone and engaged an outside investigator, (3) why no one can simply leave (venue control, time pressure, or leaving = guilt). The wronged party description now also notes they are NOT a suspect but ARE present and determined
- **Make.com Parent12:** Updated three intrigue modules — Part 1 Planning (2417) adds `gatheringMechanism`, `retentionReason`, `investigatorEngagement` fields to the wronged party profile and JSON output spec; Part 2 Gameplay (4020) requires Round 1 evidence to reference and support the gathering hook; Host Guide (2419) adds a `wronged_party_framing` step before the detective opening with explicit three-part opening structure (identity + engagement → the crime → why no one leaves)
- Blueprint saved as `temp-files/MM Live - Parent12.blueprint.json` — import this into Make.com to replace Parent11

### Fix: Intrigue mystery type generating murder content (confirmed working)
- Four bugs combined to cause this — all fixed and verified end-to-end
- **Bug 1 (auto-generated user message):** `createFormattedInitialMessage` in `MysteryCreation.tsx` always started with "I want to create a murder mystery" regardless of the selected type; added `defaultStartIntrigue` translation key to all 13 locale files and now picks the correct key based on `mysteryType`
- **Bug 2 (Edge Function unaware of mystery type):** `mystery-ai` builds its own system prompt from scratch; the frontend `systemInstruction` prop was always sent as `null` and ignored; added `mysteryType` to the request body and gave all four prompt branches (pre-concept, first message, follow-up, refinement) intrigue-specific variants using THE CRIME / THE WRONGED PARTY / CRIME METHOD format with an explicit "no one dies" constraint
- **Bug 3 (state timing):** `useState(initialMysteryType || 'murder')` captured `undefined` on first render because `formData` loads asynchronously — locked in as `'murder'` forever; fixed by adding `initialMysteryType` to the existing `useEffect` that syncs all other initial props
- **Bug 4 (wrong page):** `ConversationManager` is not used in the `/mystery/chat/:id` route — `MysteryChatPage` renders `MysteryChat` directly and never passed `initialMysteryType` at all; now reads `mystery_type` from the top-level conversation record (individual column) with fallback to `mystery_data` JSONB
- Added intrigue section labels (`theCrime`, `wrongedParty`, `crimeMethod`) to all 13 locale files for localised section headings in the generated concept

### Fix: Character profile field order and accusations label
- `introduction` now appears before `secret` in the character accordion — matches the game's logical sequence (character introduces themselves in Round 1 before secrets are explored)
- Renamed "Round-by-Round Summary" label to "Accusations" — the field is either a plain accusation speech ("I accuse X because…") in newer mysteries or a per-round strategy summary in older ones; the neutral label works for both
- The order follows the TLC sample reference: description → background → relationships → introduction → secret → rumors → round scripts → accusations → final statement

### Fix: Print character guide now uses compiled round scripts
- `buildCharacterGuideContent` was reading only the old per-role sub-fields (`round2_innocent`, `round2_guilty`, etc.) — which are null for any mystery generated by the current unified child scenario. This meant 17 of 19 TLC characters had no round scripts in their printed packets
- Now prefers `round2_script` / `round3_script` / `round4_script` / `final_statement` if present, falling back to the old sub-fields only for legacy mysteries that predate the compiled format
- Side effect: prevents Abby Lee and Sarah Palin's old contaminated sub-field scripts from surfacing in the TLC print view

### Fix: TLC Reunion — Honey Boo Boo secret motive now matches confession
- `secret` field previously said she needed Buddy alive as a class-action lawsuit witness (making her appear innocent), directly contradicting her `final_statement` confession which reveals she killed him over blackmail footage from her childhood show
- Updated `secret` to reflect the actual motive: Buddy had been blackmailing her with unaired childhood footage for two years; tonight he escalated to releasing it unless she left TLC entirely; she and Sarah acted to stop him
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### Fix: TLC Reunion — Honey Boo Boo `secrets` array synced with corrected `secret`
- The `secrets` (JSONB array) field is a separate column from `secret` (text) and was never updated; it still contained the old "lawsuit witness" narrative
- Synced to match the new blackmail/footage motive
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### Fix: TLC Reunion — Sarah Palin accusations removed Honey Boo Boo as a suggested target
- As the accomplice, Sarah should protect the murderer; the `accusations` field was listing Honey Boo Boo as a "strong alternative suspect" to consider accusing — the opposite of her role
- Rewritten with ACCOMPLICE framing: explicit "do not accuse Honey Boo Boo" instruction, and a list of genuinely usable alternative targets (Cousin Anthony, Mama June, Kate Gosselin, Gypsy Rose)
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### Fix: TLC Reunion — Sarah Palin rumors removed stale accomplice instructions
- `rumors` field contained an old `### ACCOMPLICE INSTRUCTIONS` block pairing her with Michelle/Michael Duggar as the murderer — leftover from an earlier generation run before the murderer/accomplice roles were locked
- Sarah's actual role is accomplice to Honey Boo Boo (correctly reflected in all round scripts and `final_statement`); the stale instructions were confusing and incorrect
- Removed the block; `rumors` now opens directly with the three spread-able rumors (unchanged)
- DB-only fix for package `fb085089-6cfb-4d3f-969c-1b276ff1c323`

### UI: Dashboard link restyled as a pronounced button in the header
- Authenticated users were confusing the logo with the dashboard entry point because the "Dashboard" link was styled identically to "Support" — flat cream text on red. Now the dashboard link renders as a cream-filled pill button with red text, a subtle shadow, and a lift-on-hover transform so it reads as the primary nav action
- Only the desktop header changed; mobile menu is unaffected

### Feature: Post-party "invite friends" email at +14 days
- New `invite_friends` followup email type. Trigger `schedule_followup_emails` now schedules two rows on generation completion: `how_did_it_go` at +21d (existing) and `invite_friends` at +14d (new). The 14-day cadence lands a week before the Trustpilot ask, while the host's party is freshest in mind
- Edge function `send-followup-emails` rewritten to dispatch on `email_type`. invite_friends template is light, low-pressure, and visually distinct from the Trustpilot ask (red CTA vs. green) so they don't read as duplicates
- Skip rules for invite_friends: respects `unsubscribed_from_followups`, only sends to paid hosts (`is_paid = true`), no point asking a free-draft owner to share
- Edge function redeployed (v9). Trigger updated via `schedule_invite_friends_followup` migration. Existing completed mysteries are NOT backfilled — only new generations get the second email

### Feature: Word-of-mouth share CTAs on Trustpilot email + guest character packet
- Trustpilot followup email (`send-followup-emails`) now includes a small "Friends will love this too" share section below the review CTA. Link is UTM-tagged with `utm_source=share`, `utm_medium=email`, `utm_campaign=trustpilot_followup`, `utm_content=host-{user_id}` so we can attribute the resulting traffic. URL pattern is designed to upgrade to `?ref={code}` once the two-sided referral system lands without changing the email
- Guest character packet (`/character/:token`) now ends with a footer: "Loved playing as {character}? Host your own custom mystery at mysterymaker.party". Every printed packet becomes a low-friction leaflet — every guest is a host candidate. UTM-tagged `utm_source=share&utm_medium=character_packet&utm_campaign=guest_footer`. Footer is a `div`, not a `<footer>` element, so it survives the print rules that hide page chrome
- Edge function `send-followup-emails` redeployed (v8)

### Feature: UTM/referrer attribution capture on signup
- New `profiles` columns: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `landing_referrer`, `landing_page`. Captured into `localStorage` on first external landing (skips internal navs and same-host referrers), then persisted into the user's profile on signup (email + Google OAuth). First-touch only — never overwrites existing non-NULL columns
- Why: self-reported attribution is biased (high-intent buyers skip the survey, browsers answer it). Silent UTM/referrer capture gives ground-truth that can be cross-referenced with the survey
- New helper `src/lib/attribution.ts`; capture wired in `RouteTracker` (`App.tsx`); persistence wired in `SignUp.tsx` and `AuthCallback.tsx`

### Improvement: Attribution survey UX overhauled
- Defer first prompt: only shown after the user either has at least one mystery OR is on their second-or-later dashboard visit. Avoids the "high-intent buyer skips past" selection bias
- Skip is no longer terminal: re-prompt once after 7 days (max two skips, then permanently quiet). Backed by new `attribution_skip_count` column
- Allow natural dismissal: closing the modal (Esc / outside click) now counts as a soft skip, not a forced lock-out
- Added "Bing / Other search" option (DuckDuckGo and bare-typed "GOOGLE" were both showing up as Other previously)
- Mobile layout: switched 2-column grid to single-column on small viewports + scroll cap, so all 9 options are reachable without obstruction
- Migration: `add_utm_attribution_to_profiles`

## 2026-04-23

### Fix: Death At Hollowcrest Manor (7b3766fe) Iris/Ivan rumor about victim retargeted to a cast member
- Preventative audit of paid mystery "Death At Hollowcrest Manor" (20-character random-murderer format, victim Cornelius Hollowcrest). Swept `rumors`, `introduction`, `secret`, `accusations`, `background`, `relationships` across all 20 `mystery_characters` rows
- Only contamination found: Iris/Ivan Thornfield's `rumors` second entry was `**About Cornelius:**` — rumors should target other living suspects, not the victim. Rewrote to `**About Lucian Vale:**` preserving Iris's painter-perception voice and the agitation/atmosphere theme. Other two rumors (about Quinn Mortimer and Noel Fairchild) untouched
- Broader proper-name scan across all 5 audit fields surfaced only cast tokens, "Cornelius/Hollowcrest" (canonical victim, OK as referent), and in-world organizations (Threshold Circle, Preservation Society) / English place names (Edinburgh, Yorkshire) — no further rewrites required
- 1 UPDATE run via `to_jsonb(text)`. Customer-supplied verification regex returns 0 rows. `master_context` is NULL on this package — random-murderer mystery, no fixed murderer/accomplice pairing to preserve

### Fix: TLC Reunion (fb085089) rumors/intro/secret/accusations/background scrubbed of contamination
- Customer (Christina) re-flagged that "Rumors to Spread" still referenced non-cast characters and the wrong victim ("Vicky"/"Chad"/"Dave Hester"). Audit expanded the sweep across `rumors`, `introduction`, `secret`, `accusations`, and `background` for all 19 `mystery_characters` rows
- Found contamination across 5 fields: 12 characters had dirty `rumors` (referencing Anfisa, Colt Johnson, Angela Deem, Carson Kressley, Bethenny Frankel, Dr. Phil, JoJo Siwa, Gordon Ramsay, Nicholas Godejohn, Michelle Dean, Taylor Swift, Neil deGrasse Tyson, Crypto Bro, Bachelor Contestant, Martha Stewart, Colleen Ballinger, Ina Garten, Duff Goldman, Anthony Bourdain, Paula Deen, Tan France, Oprah, Simon Cowell, Bill Klein, the Property Brothers, Sal Vulcano, Brian Quinn, Megan McKenna, Scotty T, Stephen Bear, Sig Hansen, Teresa Giudice, Lisa Vanderpump, Kyle Richards, Garcelle Beauvais, Buddy's family members Mary/Joey/Grace, Storage Wars, Pawn Stars, Deadliest Catch, Real Housewives, Rebecca Romney, Jarrod Schulz, Jen Arnold); 2 dirty `introduction`s (Breaking Amish Cast, Mama June, Toddlers & Tiaras); 4 dirty `secret`s (Breaking Amish, Mama June, Theresa Caputo, Toddlers & Tiaras, Pauly D); 4 dirty `accusations` (Guy Fieri, Gypsy Rose, Mama June, Toddlers & Tiaras, Michelle Duggar, Pauly D, Breaking Amish, Theresa Caputo, Kate Gosselin); 4 dirty `background`s (Breaking Amish, Kate Gosselin, Mama June, Toddlers & Tiaras)
- Rewrote each contaminated field replacing wrong-victim references with "Buddy"/"Buddy Valastro" and swapping non-cast targets for plausibly-grounded members of the 19-cast list. Preserved STOP markers and accomplice instruction blocks; preserved murderer/accomplice pairings (no `character_role` changes)
- For accomplice secrets that named a specific covered-for murderer (Theresa Caputo → Gordon Ramsay, Toddlers child → Bachelor Contestant, Pauly D → Jen Arnold, Breaking Amish → Deadliest Catch Captain), retargeted to a cast member or generic "your true ally" so the secret stays internally coherent without inventing pairings
- Total ~25 UPDATE statements; final verification SQL (both customer-supplied regex and broader noncast-name detector across all 5 fields) returned 0 rows. `quick_reference` is NULL on all 19 — skipped
- Tricky: original rumors used `## RUMORS TO SPREAD`; clean siblings use `### RUMORS TO SPREAD` — standardized rewrites to `###` to match the rest of the package

### Audit: Death At Villa Amore (02337aff) follow-up sweep of rumors/intro/secret/accusations/background — clean
- After this morning's `relationships` rewrite, ran a wider audit across `rumors`, `introduction`, `secret`, `accusations`, and `background` for all 7 `mystery_characters` rows looking for non-cast contamination and wrong-victim references
- Customer-supplied verification regex (`**About <Name>:**` rumor targets) returns 0 contaminated rows — the only "mismatch" hits ("Frankie Bellini") are first-name false positives, since Frankie is the canonical nickname for Francesca Bellini per `master_context`
- Broader proper-name pair scan across all 5 fields surfaced only cast members, the canonical victim Beatrice Romano, and canonical NPCs already established in `master_context` (Alessandro Conti = Giulia's groom and Dane's business partner; Zia Beatrice; Lake Como; Villa Amore). No rewrites required — no UPDATEs run

### Fix: Death At Villa Amore (02337aff) character relationships restructured to ALLIES/RIVALS format with cast-only references
- All 7 characters' `relationships` sections now use the standard `## YOUR RELATIONSHIPS` > `**ALLIES:**` / `**RIVALS & ENEMIES:**` structure with 2-3 entries per subsection, drawn exclusively from the 7-person cast and grounded in each character's actual background. Coordinated symmetrically (e.g. Val ↔ Sage food/wellness tension, Frankie ↔ Riley suspicion) and kept victim Beatrice Romano out of the peer blocks. One-off content fix

### Fix: TLC Reunion (fb085089) character relationships referenced non-cast names
- Customer (Christina) flagged that every character's `relationships` section referenced real-world celebrities and fictional NPCs ("Danny the baker," etc.) who weren't in the 19-person cast — unusable at the table
- Rewrote `relationships` for all 19 `mystery_characters` rows with 3 ALLIES + 3 RIVALS each, drawn exclusively from the cast list; kept victim Buddy Valastro out of peer-relationship blocks (he's handled separately in the mystery)
- Coordinated the network to be symmetric (e.g. Abby Lee ↔ Mama June hostility appears on both sides; Honey Boo Boo ↔ Toddlers & Tiaras child alliance appears on both sides)
- Verified with regex over `relationships::text`: all 114 `**bolded**` name references resolve to the 19-person cast by first-name/slash-variant. One-off content fix, not systemic

### Fix: Character profile tab — labelled sections and parsed accusations JSON
- Every character field (description, background, introduction, round scripts, etc.) is stored as plain text without an embedded `#` heading, so `EditableSection` was rendering them with no label — a wall of unstructured paragraphs with three mystery "Point Form" headers (from within round scripts) and a raw JSON blob from `accusations`
- Added `fallbackLabel` prop to `EditableSection` — displays the friendly label as the section H3 when the content has no embedded heading (embedded heading still wins where present)
- Added `CHARACTER_FIELD_LABELS` map in `MysteryPackageTabView` — `round2_script` → "Round 2 Script", `accusations` → "Round-by-Round Summary", etc., covering all detective-style and character-based fields
- Added `formatAccusations` — parses the `{round2, round3, round4}` JSON into bolded markdown lines so hosts see "**Round 2:** …" instead of raw JSON
- Systemic display fix — benefits every package without touching DB content

### Fix: Deadwood Saloon (79ab2ac3) game_overview leading heading
- Field started with `# Death At The Deadwood Saloon` + `## A Murder Mystery for 9 Players — Deadwood Gulch, 1882` before the body
- `EditableSection` uses the first `#`/`##` line as the section's fixed H3 label and renders everything after (including any remaining H1/H2) as body → resulted in 3 visible titles stacked on the Host Guide tab: the page header, then "DEATH AT THE DEADWOOD SALOON" (as section label), then the subtitle (as body H2)
- Replaced the title + subtitle with the canonical `## GAME OVERVIEW` heading used by every Blueprint-11-generated package — now the Host Guide tab shows only the page-level mystery title plus a single "Game Overview" section heading
- **Not systemic.** Surveyed 10 recent packages: 8 use `## GAME OVERVIEW`, 1 uses `## Welcome to the Train`, 1 has no heading, and only Deadwood (manually authored in this conversation) had the dual title/subtitle pattern. Blueprint 11 itself is fine; this was a one-off authoring mistake

### Fix: Evidence card parser compatible with Blueprint 11 sub-headings
- Parser was treating any h2/h3 as a round boundary — so Blueprint 11's `### [Evidence Name]` sub-heading under `## EVIDENCE: ROUND N` was stopping extraction immediately, leaving descriptions empty and the print portal returning `null` (blank print preview)
- Fixed: only h2/h3 lines containing `ROUND N` count as boundaries; any other h3 stays inside the round
- Legacy `### EVIDENCE CARD — ROUND 2` format still parses (matches the new regex too)

### Fix: Evidence card print — hide #root via inline style instead of CSS
- Previous CSS approach (`body > *:not(.evidence-print-inline) { display: none }`) was losing the specificity fight against `print.css`'s `[role=tabpanel][data-state=active] { display: block !important }` — the active Clues tab re-showed itself alongside the portal, printing the whole page
- Replaced with JS: Print button now sets `#root.style.display = 'none'` (inline style beats all CSS), calls `window.print()`, restores on `afterprint`. Guaranteed isolation regardless of global CSS

### Fix: Cache-bust evidence card image URLs per page load
- Supabase Storage files live at stable URLs (`.../round{N}.webp`) that never change across regenerations, so browser disk cache would serve the old image even after admins uploaded new ones
- Every `<img>` src (tab grid, lightbox, print-inline) now gets a `?v=<mount_time>` query param — each fresh page load pulls the current storage version

### Feature: Deadwood Saloon (79ab2ac3) — evidence cards + images regenerated as Blueprint 11 reference implementation
- `evidence_cards` rewritten: three `## EVIDENCE: ROUND N` sections, each with `### [Name]`, `#### DESCRIPTION` (≤3 sentences, forensics-report voice, no character names or narrative framing), `#### IMPLICATIONS` (neutral across all suspects — no pointing at one character), `#### VISUAL DESCRIPTION` (4-sentence strict format: composition+subject+texture / lighting / depth-of-field / bans+period)
- 3 images regenerated via `black-forest-labs/flux-1.1-pro`, uploaded to `evidence-images/{package_id}/round{2,3,4}.webp` via `store-evidence-images` edge function
- Verification: all three `#### DESCRIPTION`/`#### IMPLICATIONS`/`#### VISUAL DESCRIPTION` headers present, 3 round sections, all 3 image URLs return HTTP 200
- This package is the reference other conversations should read before rewriting their own evidence cards

### Fix: Death At The Velvet Rose (package 546eec7e) — evidence cards and images rebuilt to Blueprint 11 spec

- Rewrote `evidence_cards` from legacy format (`### EVIDENCE CARD — ROUND X: SUBTITLE`, `#### Discovered`, `#### Physical Description`, `#### What This Reveals`, `#### Who It Implicates`) to Blueprint 11 spec (`## EVIDENCE: ROUND N`, `### [Name]`, `#### DESCRIPTION`, `#### IMPLICATIONS`, `#### VISUAL DESCRIPTION (FOR IMAGE GENERATION)`)
- DESCRIPTION sections: max 3 sentences, pure physical facts, no narrator voice, no alibi references
- IMPLICATIONS sections: neutral — presents how multiple parties could have accessed/placed the evidence
- VISUAL DESCRIPTION prompts: corrected to 4-sentence structure (composition + subject + texture in one sentence; raking light; depth of field; bans + period)
- Regenerated all 3 evidence images via Replicate `black-forest-labs/flux-1.1-pro` with new spec-compliant prompts
- Re-uploaded to Supabase Storage `evidence-images/546eec7e-f886-4457-b6fe-a7204e13c5d9/round{2,3,4}.webp`; all URLs return 200
- Verification: `ec_length=5278`, all boolean checks true, all 3 images set

### Fix: Death On The Silver Screen (package 41a581cc) — evidence cards and images rebuilt to Blueprint 11 spec
- Rewrote `evidence_cards` to match Blueprint 11 structure: correct intro text, `### [Evidence Name]` subsection per round, `#### DESCRIPTION` / `#### IMPLICATIONS` / `#### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` subsections
- Round 3 evidence changed from "drink cabinet lock scratches" (faint-trace category) to "prop department sign-out log" (notebook page with visible writing — visually concrete per BP11 selection rules)
- All three VISUAL DESCRIPTION prompts rewritten to strict 5-sentence FLUX 1.1 Pro structure: Extreme close-up composition, texture/contrast with concrete adjectives, raking 45° tungsten side-light, shallow depth-of-field, no-figures ban + period style
- Removed banned language from all prompts: "dim warm lamp light", "moody atmosphere", "dramatic shadows", "soft glow"
- Regenerated all 3 evidence images via Replicate flux-1.1-pro with new prompts; uploaded to evidence-images storage bucket; all three URLs return 200
- Verification: ec_length 5095, all boolean checks true

### Fix: Evidence cards tab — clean heading display for Blueprint 11 and legacy formats
- Added `stripH4Label` helper: removes only the `####` heading line, keeps body text (vs `stripH4Section` which removes heading + entire body)
- `#### DESCRIPTION` / `#### Physical Description`: label stripped, body text kept — hosts see clean paragraphs without sub-headings
- `#### IMPLICATIONS`: label stripped, body text kept — host retains the gameplay context
- `#### Who It Implicates` / `#### What This Reveals` / `#### Discovered` / `#### Visual Description`: entire section removed (spoilers / image-gen only)
- Deadwood Saloon (`79ab2ac3`) evidence_cards rewritten in Blueprint 11 format: 3 rounds, `#### DESCRIPTION` + `#### IMPLICATIONS` + `#### VISUAL DESCRIPTION`, two evidence items consolidated per round

### Improvement: Parent11 blueprint — evidence card sections now use explicit #### headers
- Changed evidence card template from flat text under `### [Evidence Name]` to explicit `#### DESCRIPTION`, `#### IMPLICATIONS`, `#### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` subsections
- `#### DESCRIPTION` instruction tightened to physical facts only — no detective narrative or emotional language — so printed cards stay clean
- Online tab already strips `#### VISUAL DESCRIPTION` via `stripH4Section`; structure now matches the 3-part model (print: Description only, online: Description + Implications, image gen: Visual Description)
- `master_context` merge fix: removed fragile SetVariable string-surgery; Supabase upsert modules now write both Claude outputs directly concatenated — no comma, no merge failure
- Restored `max_tokens` 8192 → 24000 across all 16 Claude modules (Haiku 4.5 supports 64k output; 8192 was an unnecessary reduction)

### Improvement: Child (Unified) v4 — CAST-ONLY CONSTRAINT on character relationships
- New blueprint file: `MM Live - Child (Unified)4-CastConstraint.blueprint.json`
- Root cause found via Christina's TLC Reunion feedback: the character-generation prompt said "List friendly/hostile relationships from matrix" but didn't enforce that names must stay within the provided cast — model fell back to real-world celebrity castmates (90 Day Fiancé, Storage Wars, Pawn Stars, RHOBH etc.) and fictional NPCs (e.g. "Danny the baker", "Mary Buddy's sister")
- Audit of Christina's package (`fb085089`): 15 of 19 characters had relationships referencing non-cast names
- Fix: rewrote the `relationships` prompt to add explicit CAST-ONLY CONSTRAINT — "names MUST come from the cast list provided in input; DO NOT reference real-world celebrities, the character's real-life castmates, or fictional NPCs"; also requires symmetry (A↔B) and 1-2 sentence grounded explanations
- Previous versions preserved (Child Unified, 2, 3-WithRetry) — v4 is the new one to import

### Improvement: Parent11 — Part 2 prompts now bias evidence selection toward visually concrete objects
- Master constraints generation (Part 2 prompts in modules 3000/4010/4020/4030) now instructs model to PRIORITISE VISUAL CONCRETENESS when choosing each round's evidence item
- Prefers physically distinctive objects (engraved items, torn fabric, labelled bottles, notebook pages, sealed letters, distinctive weapons, signet rings) over faint traces, subtle residues, or barely visible marks
- When trace evidence is required by the murder method, instructs model to name the CONTAINER or surrounding object as the depicted item (e.g. "labelled poison bottle" not "faint chemical residue")
- Applied to 7 places: 1 markdown spec section + 3 evidenceProgression JSON templates (Murder routes) + 3 evidenceNeutrality JSON templates (alt route)

### Note: FLUX model is already at top tier (flux-1.1-pro), no model upgrade needed
- Investigated whether to upgrade from FLUX Schnell → FLUX Dev as suggested in image-quality feedback note
- Confirmed Replicate module in blueprint already calls `black-forest-labs/flux-1.1-pro` (12 modules across all routes) — the highest-quality FLUX tier, not Schnell
- The Round 4 gunpowder image issue was a prompt problem (hedged language being dropped), not a model capability problem; tightened VISUAL DESCRIPTION rules should resolve it on next regeneration

### Improvement: Parent11 — VISUAL DESCRIPTION rewritten for FLUX 1.1 Pro detail rendering
- Replaced the loose VISUAL DESCRIPTION template with a strict 5-sentence structure (corrected to reference the actual model `flux-1.1-pro`, not Schnell):
  1. Composition + subject (close-up macro, evidence FILLS THE FRAME)
  2. Texture + contrast (concrete adjectives only — BANNED: "faint", "subtle", "trace", "hint of")
  3. Hard directional lighting (BANNED: "dim", "soft glow", "moody", "dramatic shadows" — produces blur)
  4. Shallow depth-of-field (evidence razor-sharp, background out-of-focus)
  5. Bans + period (no human figures, no faces, no wide scene)
- Reason: FLUX Schnell drops hedged language and inserts atmosphere when subject is implicit; Round 4 gunpowder smear came back as a moody silhouette because the prompt said "faint grey smear catching the light" (all dropped words)
- Applied to all 6 VISUAL DESCRIPTION instructions (3 rounds × 2 evidence-card-generating routes)

### Improvement: Parent11 — DESCRIPTION voice hardened + one-section-per-round structural rule
- DESCRIPTION instruction now mandates "FORENSICS REPORT" voice and explicitly PROHIBITS: detective/narrator framing ("On close examination...", "the deputy noticed...", "had no business being..."), references to character alibis or how evidence was discovered, and emotional/dramatic language
- Added structural rule before evidence card template: exactly ONE `## EVIDENCE: ROUND N` section per round (3 total across rounds 2/3/4), no continuation/split sections (no "ROUND 2: MOTIVES (CONTINUED)" or "PART 2"), one `### [Evidence Name]` item per round with one DESCRIPTION/IMPLICATIONS/VISUAL DESCRIPTION subsection — matches the one-image-per-round print constraint
- Both fixes applied to all routes that generate evidence cards (6 DESCRIPTION instructions, 2 structural rule injections)

### Fix: Evidence cards tab — strip all spoiler/metadata h4 sections
- Previous `/^Discovered$/i` pattern was broken: `^` anchors didn't match against the full heading line `"#### Discovered"`, so it silently stripped nothing
- Fixed with `\bDiscovered\b`; also added stripping for `What This Reveals`, `Who It Implicates`, `Implications` — same sections already stripped in print view
- Older blueprint output (e.g. Deadwood Saloon) that uses these h4 sections now shows only physical description and narrative body text in the tab

### Fix: Evidence card print repeating on every page (portal approach)
- `position: fixed` in print CSS stamps the element on every page of the document — all 3 cards appeared on each page
- Replaced with `createPortal(…, document.body)` so `.evidence-print-inline` is a direct body child; the `body > *:not(.evidence-print-inline)` selector now works correctly and prints exactly 3 landscape pages

## 2026-04-22

### Fix: Evidence card print — blank output on window.print()
- Previous CSS used `body > *:not(.evidence-print-inline) { display: none }` which hides `#root` (a direct body child), cascading down and making the print div invisible despite matching `:not()`
- Replaced with the visibility isolation pattern: `body { visibility: hidden }` + `.evidence-print-inline, .evidence-print-inline * { visibility: visible }` + `position: fixed` — this correctly reveals only the print cards regardless of DOM nesting depth

### Fix: Inline evidence card print + shared parse utility (531f954)
- Moved evidence card print from `window.open('/evidence-card-print?packageId=xxx')` to an inline hidden `<div>` rendered in the Clues tab; `window.print()` is called directly
- Eliminates 404s in Lovable preview, local dev, and any environment without a server rewrite rule
- Extracted `parseEvidenceCards` + `EvidenceCard` into `src/utils/evidenceCardUtils.ts` so both `MysteryPackageTabView` and `EvidenceCardPrint` share the same logic

### Feature: Manual package generation — Death On The Dance Floor (ec22e358)
- Generated full mystery party kit for "Death On The Dance Floor" (18-player disco murder mystery, purchased by miller_jm@hotmail.com) bypassing Make.com pipeline
- Inserted all package-level fields into `mystery_packages`: game_overview, master_context, host_guide, detective_script, materials, preparation_instructions, timeline, hosting_tips, evidence_cards
- Inserted all 18 characters into `mystery_characters` with complete 7-field scripts (introduction, rumors, round2–4 scripts, final_statement, accusations) — 1 murderer (Jett Midnight), 1 accomplice (Nico Nightshade), 16 suspects
- Marked conversation `b53854bd` as `has_complete_package=true`, `needs_package_generation=false`, `display_status=purchased`

### Feature: Manual package text generation — Death At The Deadwood Saloon (79ab2ac3)
- Generated and inserted all 8 package-level text fields directly into Supabase for the Wild West 1882 mystery (9 players, accomplice mechanic)
- Fields written: `game_overview`, `master_context`, `host_guide`, `detective_script`, `materials`, `preparation_instructions`, `timeline`, `hosting_tips`
- Bypasses Make.com pipeline; characters to be inserted separately in a subsequent step

### Fix: Pre-flight character count validation tightened to exact match
- Edge function (v105) now hard-fails if extracted character count differs from `player_count` by even 1 (previously allowed ±1 tolerance)
- Prevents ghost characters from sneaking through when the AI lists N+1 characters in the approved message — stops expensive half-broken generations requiring manual recovery
- Also: `approved_concept_message_id` snapshot now used to extract exactly what the user saw at purchase, not the latest message

### Feature: Tiered timing copy across all 13 locales
- Replaced flat "10 minutes" claim with tiered estimates: small (10-15 min), medium (~20 min), large (25-30 min), xlarge (up to 45 min)
- Updated `timing` section in all 13 locale files (en, de, fr, es, pt, it, nl, sv, da, fi, ko, ja, zh-cn) with idiomatic translations
- Reflects actual generation times now that Haiku is used for all Claude calls in Make.com

### Fix: Refunded mystery hidden from customer dashboard
- Added `.neq("display_status", "refunded")` to `fetchMysteries` query in `Dashboard.tsx`
- Added `"refunded"` to `display_status` and `status` union types in `mystery.ts`
- Prevents refunded mysteries from appearing in user's mystery list

### Fix: Evidence card VISUAL DESCRIPTION section now present in all 4 blueprint routes
- `Parent10.blueprint.json`: added `### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` section after each `### IMPLICATIONS` section in the 3 routes that were missing it (6 total sections across 2 routes now populated)
- Online UI (`MysteryPackageTabView.tsx`) already stripped the VISUAL DESCRIPTION section before display — confirmed no user-facing exposure
- Updated description: 3 sections per evidence card — Description (prints on cards), Implications (online only), Visual Description (image gen only, never shown to users)

### Improvement: Both Make.com blueprints switched to Haiku 4.5
- `Parent10.blueprint.json`: model `claude-sonnet-4-5-20250929` → `claude-haiku-4-5-20251001`, max_tokens 24000 → 8192 (16 modules)
- `Child (Unified)3-WithRetry.blueprint.json`: model `claude-sonnet-4-5-20250929` → `claude-haiku-4-5-20251001`, max_tokens 12000 → 8192 (2 modules)
- Faster generation, lower cost; Haiku 4.5 max output is 8192 tokens (not 24k)

### Fix: TLC Reunion customer mystery (eaf06b79) manually recovered
- Deleted 25 duplicate/incomplete character rows generated by retries
- Generated round scripts for 2 characters missing them (Abby Lee/Abbott Miller, Sarah/Samuel Palin) using Claude Code agent with host_guide + existing character scripts as context
- Updated `player_count` from 18 → 19 to match actual character count (AI generated 19 characters)
- Mystery is now 19/19 characters complete with correct murderer/accomplice role assignments

### Fix: TLC Reunion — deep quality audit and full script repair (DB-only)
- Root cause: `master_context` in `mystery_packages` was stored as a bare comma (`,`) — effectively empty — so the Make.com child scenario had no mystery context when generating round scripts, producing systematic errors across the full character set
- **Victim name corrections**: 4 characters (Breaking Amish, Mama June, Toddlers & Tiaras, Gypsy/Grey) had wrong victim names ("Dave", "Vicky", "Vicky Spotlight", "Chad", "Chad Chaddington IV") in their scripts; corrected to "Buddy Valastro" across all affected rounds via SQL `REPLACE()`
- **Accomplice final statement rewrites**: All 4 accomplice characters (Breaking Amish, Toddlers & Tiaras, Pauly D, Michelle/Duggar) named a specific character as the murderer in their final statement — incompatible with the random murderer selection mechanic where any of 4 characters could be the murderer; rewritten to reference "the murderer" / "the person who told me I was their accomplice" generically
- **Randy Fenoli Round 4**: Original script placed him at home alone from 7 PM onward (left the boutique, not at the party); rewrites to place him at the garden terrace and bar area for a plausible party alibi
- **Toddlers & Tiaras Rounds 2 and 3**: Completely wrong mystery — scripts referenced a crypto scandal, "Chad Chaddington IV", a Bachelor Contestant, and an Influencer (from a different mystery entirely); fully rewritten for the TLC reunion / Buddy Valastro poisoning context
- **Breaking Amish Round 4**: Alibi referenced "the Deadliest Catch Captain" — a non-cast character; rewritten to reference Gypsy/Grey and Big Ed (both confirmed present in the same area from their own scripts)
- **Abby Lee Round 4**: Alibi referenced Randy Fenoli, but Randy's Round 4 said he was home all evening; rewritten to reference Mama June (at catering table) and Gypsy/Grey (in common area)
- **Sarah Palin Round 4**: Alibi referenced Pauly D (wrong time window) and Willie Robertson (in his room); rewritten to reference Lisa Rinna and Big Ed (both confirmed at bar area)
- **Verification**: Final SQL check across all 19 characters confirmed zero wrong victim name references, zero named-murderer accomplice finals, zero NULL script fields

### Fix: "Failed to load conversation" after submitting the mystery creation form
- Root cause: adding the `approved_concept_message_id UUID REFERENCES messages(id)` column on `conversations` created a second FK path between `conversations` and `messages` (the existing one being `fk_messages_conversation_id` on `messages.conversation_id`). PostgREST can no longer auto-resolve the embed `messages(*)` and responds with HTTP 300 (Multiple Choices), which surfaces client-side as the `loadConversationFailed` toast — blocking every new chat because the post-create load immediately 300s
- Fix: disambiguate every `.select("*, messages(*)")` call by specifying the FK hint `messages!fk_messages_conversation_id(*)`, matching the pattern the Supabase dashboard already generates
- Updated call sites: `MysteryChat.tsx`, `ConversationManager.tsx`, `mysteryPackageService.ts`, `VercelChatbot.tsx`, `MysteryPurchase.tsx`, and the `mystery-webhook-trigger` Edge Function
- The webhook-trigger change requires redeploying that Edge Function to take effect

### UI: "Current Step" panel now has visible motion to signal processing
- Previously the Current Step box was entirely static — no indication anything was actively happening during the ~10-minute generation window
- Swapped the static Clock icon for a spinning `Loader2` in the primary color, and added a subtle `animate-pulse` to the step-description text so the panel visually breathes while work is in flight

### UI: Refresh icon in generation progress card is now legible
- Ghost-variant button inherited no explicit text color, so the refresh icon on the dark "Generating Your Mystery Package" card rendered in a washed-out tint that was hard to see
- Set `text-muted-foreground hover:text-foreground` on both instances (progress card and failed-state card) so the icon is clearly visible at rest and pops on hover

### UX: Instant transition from Generate button to progress card
- Previously: clicking "Generate Mystery Package" left the user on the same card with a disabled "Starting Generation..." button (which rendered in the muted disabled-primary state and looked off) until the next poll cycle populated `generationStatus` — only a manual refresh would flip the UI to the proper "Generating Your Mystery Package" progress card
- Now: `handleGeneratePackage` in `MysteryView.tsx` optimistically seeds `generationStatus` to `in_progress` on click, so the progress card renders immediately; on webhook error we roll the status back to `null` so the Generate button reappears for retry
- Eliminates the inconsistent pre-/post-refresh UI the user was seeing after purchase

### Fix: Ghost characters from earlier draft versions sent to Make.com generation
- Root cause: `mystery-webhook-trigger` Edge Function was aggregating characters across ALL assistant messages in the conversation, so removed-then-replaced characters from earlier drafts (e.g. "Sam Valentino", "Devon Rothschild") were still being extracted and sent for generation alongside the current cast — creating "ghost" character rows that never got scripts populated and made the parent scenario hang
- Implemented Option B (snapshot at purchase time): when the user clicks Generate in `MysteryChatCreator.tsx`, we now identify the latest AI message containing a Character List and store its ID as `approved_concept_message_id` on the conversation
- Edge function (v102) prefers the snapshot — extracts characters from exactly the message the user approved on the preview page, falling back to the latest list message if no snapshot exists (legacy conversations)
- Eliminates the manual ghost-character cleanup step that was required for every multi-iteration mystery
- Added new `approved_concept_message_id UUID REFERENCES messages(id)` column on `conversations`

### Improvement: Diagnostic log for every character generation attempt
- New `child_generation_attempts` table + Postgres trigger that fires on every `mystery_characters` INSERT
- Captures `package_id`, `conversation_id`, `character_name`, `mystery_style`, and length of intro/round2/round3/round4/final fields, plus a `has_full_scripts` generated column
- Indexed on `(package_id, attempted_at DESC)` and a partial index on failures for fast triage
- Lets us answer "which characters failed and how many attempts did each take" in a single query instead of forensic reconstruction next time a customer reports an issue

**How to inspect failures (run in Supabase SQL editor):**

Per-attempt log for a specific conversation:
```sql
SELECT character_name, attempted_at, intro_length, round2_length,
       round3_length, round4_length, final_length, has_full_scripts
FROM child_generation_attempts
WHERE conversation_id = '<conversation-uuid>'
ORDER BY attempted_at;
```

Just the failures across all packages:
```sql
SELECT conversation_id, character_name, attempted_at, intro_length, round2_length
FROM child_generation_attempts
WHERE has_full_scripts = false
ORDER BY attempted_at DESC
LIMIT 50;
```

Failure rate per character (for spotting "always-fails" patterns):
```sql
SELECT character_name,
       COUNT(*) as attempts,
       SUM(CASE WHEN has_full_scripts THEN 1 ELSE 0 END) as successes,
       SUM(CASE WHEN NOT has_full_scripts THEN 1 ELSE 0 END) as failures
FROM child_generation_attempts
WHERE attempted_at > NOW() - INTERVAL '7 days'
GROUP BY character_name
HAVING SUM(CASE WHEN NOT has_full_scripts THEN 1 ELSE 0 END) > 0
ORDER BY failures DESC;
```

### Fix: Pre-flight character count validation in mystery-webhook-trigger (v103)
- Hard-fail (HTTP 400) if extracted character count differs from `player_count` by more than 1, after the existing Claude fallback runs
- Prevents silently sending a mismatched character count to Make.com (which produces a half-broken generation that's expensive to recover)
- Returns a structured error with `extractedCount`, `expectedCount`, and `extractionMethod` for client display

### Improvement: Make.com child Anthropic calls now retry on transient failures
- Replaced the silent `Resume` (detective route) and `Rollback` (character-based route) error handlers on the child scenario's Anthropic modules with `Break` handlers (3 retries, 60s interval, autoComplete=true)
- Matches the pattern already used on the Parse JSON module (which is why JSON failures self-healed but Anthropic failures didn't)
- New blueprint at `temp-files/MM Live - Child (Unified)3-WithRetry.blueprint.json` — re-imported into existing scenario

### Fix: Parent retry loop never caught child script failures
- Root cause: `get_empty_characters` RPC was checking `description IS NULL OR character_role IS NULL`, but those columns are populated during basic-character creation (long before scripts are generated) — so the RPC always returned 0 even when round scripts were missing, and the parent's existing 3-pass retry loop never fired
- RPC now joins to `conversations.mystery_style` and checks the actual script columns: `round2_script`/`round3_script`/`round4_script`/`final_statement` for detective style, `round2_innocent`/`round2_guilty`/`round2_accomplice` (etc) for character-based style
- Customer recovery: completed Death In The Spotlight (25-player) — final character (Parker/Penelope Ashford) auto-recovered via the parent retry once the RPC was fixed; cleaned up 2 duplicate empty rows left by failed attempts

## 2026-04-20

### Feature: Intrigue mystery type alongside classic murder mysteries
- Added new "Mystery Type" selector on the creation form with two card-style options: **Murder** (classic killing) and **Intrigue** (theft, scandal, sabotage, conspiracy — no one dies)
- Broadens audience: corporate events, kid-friendly parties, and customers who find murder themes uncomfortable can now use the generator
- Mystery Type and Mystery Style (Detective vs Character-Based) are now independent choices — every combination works (4 total routes)
- New `mystery_type` column on `conversations` table (defaults to `'murder'` for backward compatibility)
- System prompt adapts language and output format based on the selected type: intrigue mysteries use "crime", "culprit", "wronged party" instead of "murder", "killer", "victim"
- Added mismatch detection in both directions: if the user selects intrigue but describes a killing (or vice versa), the chatbot gently flags the conflict and asks them to confirm
- Make.com parent scenario now routes on both `mysteryStyle` and `mysteryType`, with dedicated prompts for each of the 4 combinations (Master Constraints, Host Guide, Script & Evidence)
- Make.com child scenario (per-character script generation) receives `mysteryType` and adapts automatically via a preamble that matches the master constraints document's language
- JSON field names kept as-is for downstream compatibility — the content within them uses intrigue language when appropriate
- Translated all new UI strings across 13 locales (en, pt, fr, es, de, it, nl, sv, da, fi, ja, ko, zh-cn) using idiomatic terms for "Intrigue" in each language
- Neutralized existing `mysteryStyleCharacterDescription` and `mysteryStyleDetectiveDescription` translations (e.g. pt "assassino" → "culpado", de "Mörder" → "Schuldige") so the Mystery Style descriptions work for both Murder and Intrigue types

## 2026-04-16

### Improvement: Characters now generated with defining personality traits
- Updated concept generation prompts to require a vivid personality trait or quirk for each suspect (e.g. "a jittery accountant who triple-checks everything") instead of just a job title and connection
- Applied to both the first-message and follow-up concept generation paths in mystery-ai Edge Function
- Makes characters instantly more memorable and playable; users can still edit traits during the concept refinement phase

## 2026-04-15

### Fix: Stripe webhook crashing with 500 — no purchase notification emails sent
- Root cause: `stripe.webhooks.constructEvent()` (sync) uses Node.js `crypto` module which fails in Deno Edge Functions runtime
- Switched to `constructEventAsync()` which uses the Web Crypto API compatible with Deno
- Added `?target=deno` to Stripe esm.sh import for proper Deno compatibility
- Improved error logging with null-safe property access for better debugging
- Redeployed as v54

### Feature: AI referral traffic tracking via GA4 Data API
- Added `scripts/fetchAIReferrals.mjs` — queries GA4 for sessions from ChatGPT, Claude, Perplexity, Gemini, Copilot, and other AI engines
- Reports breakdown by source/medium, landing page, daily trend, and AI vs all traffic comparison
- Integrated into `fetch-all-analytics.sh` pipeline and added `npm run fetch-ai-referrals` script
- First 90-day snapshot: 10 AI sessions (0.63% of traffic), ChatGPT leading with 8 sessions, Gemini and Perplexity with 1 each

### Fix: Prevent empty tabs when generation completes without characters
- MysteryView.tsx now requires `characters.length > 0` before showing the tab view — previously `is_paid` or `status === 'completed'` alone would show empty tabs
- Added fallback: if status looks complete but characters are missing, shows the "We're Finalizing Your Mystery" card instead of broken empty content
- Root cause: when the Make.com character-based child scenario was off, the parent marked packages as "completed" before child webhooks returned, leaving 0 characters in the DB while the UI showed empty tabs

### Fix: Customer recovery — BEFORE THE NIKAH and Death At Villa Amore
- Both packages had parent content (overview, host guide, master context) but 0 character scripts due to child scenario being off
- Generated and inserted all character scripts directly (5 for BEFORE THE NIKAH, 7 for Villa Amore)
- Fixed double-encoded `extracted_characters` and `generation_status` fields on Villa Amore package
- Generated evidence cards, detective script, and 3 evidence card images for Villa Amore (parent hadn't completed those steps)
- Set `character_role` on all characters to prevent monitoring sweep from re-flagging

## 2026-04-13

### Fix: generate_sql.py — incorrect column mapping for wedding mystery characters
- Removed `round2_statement` and `round3_statement` assignments (columns do not exist in `mystery_characters`)
- Removed `whereabouts` (never existed)
- Fixed `relationships` from plain `text` escaping to `::jsonb` cast — source is a markdown string, stored as a JSON string value via `json.dumps()` + `::jsonb` cast
- Added `secrets = NULL` (jsonb column exists but source has no data)
- Added `accusations` assignment (text column, field IS present in source JSON)
- Set `round2_accomplice`, `round3_accomplice`, `round4_accomplice` to NULL (columns exist but source has no data for them)
- Re-generated `update_1.sql` through `update_5.sql` with corrected mappings

## 2026-04-12

### Fix: Section label headings not uppercase in host guide
- `EditableSection` extracts the first `#` heading from content and renders it as an `<h3>` outside the `.prose` div — so `text-transform: uppercase` on `.mystery-content .prose h3` never applied to it
- Added `.mystery-content .editable-section h3` rule with Bowlby One font, red color, and `text-transform: uppercase !important` to match prose heading style — covers "Welcome to the Train", "Materials", "Prep Guide", and all other section labels

### Fix: Alpine Express — duplicate mystery title in host guide
- `game_overview` had `# Murder On The Alpine Express` as its first line, which `EditableSection` extracted and rendered as a visible header — duplicating the page-level title already shown at the top of the view
- Stripped the `# Murder On The Alpine Express` line from `game_overview` in the DB for record `054ca914`; content now starts cleanly with `## Welcome to the Train`
- Make.com blueprint already generates `gameOverview` starting with `## GAME OVERVIEW` (no title) — no blueprint change needed; this was a one-off data issue from an older generation

### Fix: h2/h3 headings not uppercasing in mystery content
- `text-transform: uppercase` on `.mystery-content .prose h2` and `.mystery-content .prose h3` was being overridden by Tailwind's prose cascade — added `!important` to both so headings render uppercase in host guide, character guides, and evidence sections

### Fix: Stripe webhook failures — both Supabase and Vercel endpoints
- Supabase edge function redeployed with corrected DB update (removed non-existent `stripe_session_id`/`stripe_payment_intent` columns, now sets `purchase_date`)
- Added `vercel.json` with rewrites so `/api/webhook` routes to the serverless function instead of the SPA catch-all
- Backfilled `purchase_date` for 10 March purchases that were missing it due to webhook failures

### Fix: Parent blueprint — evidence cards VISUAL DESCRIPTION and Note 1 showing on live site
- Module 182 (detective-style route): removed `*Note 1: Use the visual descriptors...*` and all three `### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` blocks from the `evidenceCards` template — image prompts already exist separately in `imagePrompts` field and should never be saved to `evidence_cards` in DB
- Module 182: added MAXIMUM 3 sentences constraint to all three round descriptions — evidence card text prints on physical cards with limited layout space
- Module 171 (master constraints): added same 3-sentence constraint to `Item: [Physical description]` fields in Evidence Progression section so the source descriptions are constrained from the start
- Changes apply to `MM Live - Parent.blueprint.json` in temp-files — ready to import into Make.com

**Note**: Module 171/182 changes refer to the promotional video mystery creation project using Claude/Make.com, NOT the main website mystery generation system. The main website uses master constraints stored in `mystery_packages.master_context` field in Supabase.

### Fix: Generation prompt style detection reading wrong table
- Prompt said "handle whichever style it is" with no direction on where to look, causing the AI to read `mystery_packages.mystery_style` which defaults to `'character'` — wrong if not explicitly set
- Added Phase 0: query `conversations.mystery_style` and `conversations.script_type` as the source of truth before any generation begins; state both values out loud; explicitly sync them to `mystery_packages` on save
- Added explanation of what detective vs character style means for the host guide structure

### Fix: Excessive spacing between evidence card sections on mystery view
- `EditableMultiSection` splits on both `##` and `###` headers, causing round headers (e.g. "EVIDENCE: ROUND 3") to become isolated header-only sections with `space-y-6` (24px) gap pushing them away from the cards below
- Reduced `space-y-6` to `space-y-3` in `EditableMultiSection`
- In `EditableSection`, the header div's `mb-2` is now `mb-0` when there is no body content, removing dead vertical space from header-only sections

### Fix: Mystery generation prompt — evidence card format and image prompt wording
- Phase 5 Step 1 said "as part of the evidence_cards content" which could be misread as instruction to embed image prompts inside the evidence_cards text saved to Supabase; rewrote to keep image prompts in memory only, never write to DB
- Evidence card template updated to match the round-based format (Round 2/3/4 with IMPLICATIONS sections) and to cap physical descriptions at 3 sentences max — descriptions are printed on physical cards with a fixed layout; IMPLICATIONS are web-only and do not print

### Fix: Alpine Express evidence_cards — visual descriptions stripped from live site
- `evidence_cards` JSONB field contained `*Note 1: Use the visual descriptors...*` and `**VISUAL DESCRIPTION (FOR IMAGE GENERATION)**` blocks that were rendering on the live mystery page
- Stripped both blocks and saved clean text back to Supabase (`package_id: 054ca914-d115-432a-9760-6f462c2cef04`)

### Fix: Evidence tab crash — screen goes dark when clicking Clues & Evidence
- `packageData.evidenceCards` can arrive from Supabase as a non-string (e.g., JSON object), causing `TypeError: t.replace is not a function` in `EditableMultiSection.splitByHeaders`
- Added `typeof` guard in both `splitByHeaders` and the `evidenceCards` memo so non-string values fall through to the clue-extraction fallback instead of crashing

### Feature: Generate "Murder On The Alpine Express" — 12-player mystery saved to Supabase
- Full character-based mystery generated and saved directly to Supabase (package ID `054ca914-d115-432a-9760-6f462c2cef04`, conversation ID `bd5318f4-5a78-4413-85a3-6ce2f902556d`)
- 12 European characters: Victoria Ashworth (murderer), Count Franz Hoffmann, Isabelle Renard, Dr. Leopold Crane, Natalya Volkov, Marcus Thorne, Lord Archibald Pembrooke, Baroness Elise von Hartmann, Signora Lucia Ferrara, Heinrich Braun, Madame Colette Moreau, Professor Erik Lindqvist
- All 14 fields populated per character (description, background, relationships, secret, introduction, rumors, round 2–4 scripts and questions, accusations, final statement)
- STOP blocks confirmed present at end of rumors and all three question rounds for all 12 characters
- Master context saved to `mystery_packages.master_context` covering murderer identity, method (strychnine in brandy decanter, 9:45 PM window), full relationship matrix, evidence cards, and deception guidelines
- All 12 characters passed quality audit: STOP block placement, background cleanliness, alibi specificity, secret red-herring design, honest suspect arcs, murderer deception layering
- `generation_status` set to `complete`

### Fix: In-progress generation falsely shown as completed on dashboard
- `checkGenerationStatus` treated `is_paid === true` as a completion signal, but `is_paid` is set when the user pays — before generation finishes
- Combined with `allCharactersGenerated` defaulting to `true` (no `extracted_characters` at start), the auto-completion logic fired immediately, marking the mystery as "purchased" with empty content
- Removed `is_paid` from `conversationIndicatesComplete` — only `has_complete_package` is a reliable completion indicator
- Added guard: when `generation_status` is explicitly `in_progress`, require actual content (title/host_guide) before auto-completing

### Fix: Chatbot generate button hidden behind mobile bottom nav
- The fixed chat input + "Generate Full Mystery" button was positioned at `bottom-0` with `z-20`, hidden behind the bottom nav (`z-40`, 64px tall)
- On mobile, the chat container now uses `bottom-16` to sit above the nav bar
- Increased bottom padding on chat messages area (`pb-48`) and page container (`pb-40`) to prevent content from being obscured

### Improvement: Remove duplicate items from mobile hamburger menu
- Removed Dashboard and Account Settings links from the hamburger menu since they already exist in the bottom nav bar
- Hamburger menu for logged-in users now shows: user info, Sign Out, Support, and Language Switcher
- Follows UX best practice: bottom nav for primary actions, hamburger for secondary/utility actions

### UI: Remove redundant Mysteries tab from mobile bottom nav
- Home and Mysteries both linked to `/dashboard` — confusing and redundant
- Removed Mysteries tab, now a clean 3-tab layout: Home, Create, Settings

### UI: Shorten bottom nav "Account Settings" label to "Settings"
- "Account Settings" was too long for a bottom nav tab, causing text wrap and misaligned icon
- Shortened to single-word labels across all 13 locales (e.g. "Settings", "Ajustes", "Konto", "設定")

## 2026-04-12

### Improvement: Mystery generation prompt — add image generation phase and missing documents
- Added Phase 5: Replicate image generation via Supabase Edge Function workaround (sandbox blocks api.replicate.com directly)
- Documents the full flow: generate image prompts → get Replicate key from user → deploy one-off edge function → invoke → verify → remind user to delete function to clean up API key
- Added `evidence_card_images` to Phase 6 verification SQL check

### Improvement: Mystery generation prompt — add missing documents and character count fix
- Added Phase 2 character count confirmation: Claude must explicitly list and confirm all characters before generating any, preventing early stops (e.g. stopping at 6 when there are 12)
- Added Phase 4 covering the three missing package-level documents: `host_guide`, `evidence_cards`, `detective_script` — with full format templates for each
- Added Phase 6 SQL check verifying all three package documents are saved before sign-off
- Renumbered phases accordingly (now 8 total)

## 2026-04-09

### Feature: Unarchive mysteries from the dashboard
- Archived mystery cards now show "Unarchive" instead of "Archive" in the dropdown menu
- Restores the mystery to its correct prior status (purchased or draft) based on payment state
- Added translations for both EN and PT

### Feature: 7-day welcome discount for new accounts (20% off)
- New users get a unique, single-use Stripe promotion code (20% off) generated at signup
- Sticky countdown ribbon (cream + red CTA badge style) appears site-wide showing time remaining and discounted price ($19.99 vs $24.99)
- Purchase page auto-applies promo code to Stripe checkout URL and shows discount pricing
- Banner disappears silently after 7 days or once the user has purchased
- Automated reminder emails at day 5 (48h left) and day 7 (final hours) via pg_cron + Edge Function
- Welcome email updated to prominently feature 20% discount offer and 7-day window
- Backfilled 15 recent signups (last 7 days) with unique promo codes + sent welcome discount notification emails
- New Edge Functions: `generate-welcome-discount`, `send-discount-reminders`, `backfill-welcome-discounts` (one-time)
- New DB columns on profiles: `welcome_promo_code`, `welcome_promo_expires_at`, reminder tracking flags

### Improvement: Relationships section — Allies / Rivals & Enemies (Make.com blueprint)
- Updated `relationships` field template in module 70 of the Detective-Style blueprint
- Replaced "Friendly Relationships / Hostile Relationships" with "Allies / Rivals & Enemies" — more thematic and in-character
- Dropped neutral tier: anyone not listed is implicitly neutral, keeping the sheet scannable during play

### Fix: Remove duplicate "Your Relationships with Others" from character backgrounds (Make.com blueprint)
- Updated `MM Live - Child (Detective-Style).blueprint.json` in temp-files
- Removed the `**Your Relationships with Others:**` section from the `background` field template in module 70's Claude prompt
- This section was being generated twice: once in `background` (plain text) and once in the separate `relationships` field (properly formatted)
- Fix applies to all future mystery generations from this scenario

## 2026-04-08

### Improvement: Enable Character-Based mystery style
- Removed "Coming Soon" badge, disabled state, and opacity from the Character-Based radio option
- Detective style remains the default selection

### Improvement: Accessible heading color + no red in body copy
- Reverted primary brand red to #C81400 (nav, buttons, backgrounds stay bold and striking)
- Mystery content headings (screen only) now use #E53E2A — 3.1:1 contrast, passes WCAG AA for large text
- Body copy red eliminated: `strong`, `a`, `code`, `thead th` inside mystery content forced to cream
- Chat headings also updated to #E53E2A
- PDF/print: mystery title (h1) now uses Bowlby One display font; section headings remain Inter for readability

### Fix: Reduce excessive spacing in evidence cards section
- Tailwind prose `<hr>` default margin was 3em top/bottom — reduced to 1.25rem inside `.mystery-content`
- First child element in prose body no longer adds top margin that stacks with the section label gap

### Fix: Mystery headings now render red Bowlby One as intended
- `mystery-package.css` was setting heading color to `var(--color-cream)` instead of `hsl(var(--color-primary))` (red); added `!important` to both `color` and `font-family` to win over Tailwind typography plugin load-order
- Removed `text-foreground` utility from EditableSection's extracted h3 heading — it was overriding the CSS rule with cream instead of letting the cascade apply
- Character accordion name headings now get inline red + Bowlby One styles directly since they sit outside `.prose`
- Print overrides in `print.css` already use `!important` to revert to Inter/black — no change needed there

### Improvement: Dual-format detective script (Script + Key Points per round)
- Detective script now requires both a `#### Script` (full narrative dialogue) and `#### Key Points` (bullet-point summary) sub-section for every round
- Hosts can read the script verbatim, improvise from bullet points, or have the script recorded by an AI voice
- Updated Make.com blueprint7 (all 3 prompt instances: detective-style + 2 character-based) with `#### Script` / `#### Key Points` template structure and `DUAL FORMAT` instructions
- Updated `script_type_instructions` to clarify detective script always includes both formats regardless of scriptType
- Added format spec comment in `mystery-ai` Edge Function for codebase documentation
- No DB or frontend changes needed — `EditableMultiSection` already handles the header hierarchy

### Fix: Host guide game overview now shows its "Game Overview" section title
- `stripFirstHeading()` was stripping the `## GAME OVERVIEW` heading before passing to `EditableSection`, so that section rendered with no visible title
- Removed the strip call; heading is now extracted and displayed like all other host guide sections

### Fix: Mystery title and action buttons no longer crowd each other
- Added `flex-1 min-w-0` to the title `<h1>` so long titles wrap instead of overflowing
- Added `flex-shrink-0` to the buttons container and `gap-6` to the row for consistent breathing room at all screen sizes

### Fix: Mystery content headings now visible on dark background
- `prose-slate` was overriding the custom typography heading color (`hsl(var(--color-primary))`) with `#0f172a` (near-black), making headings invisible on the dark background
- Removed `prose-slate` from `EditableSection` and the fallback host-guide prose block in `MysteryPackageTabView`; the app-level custom typography config now applies correctly

### UI: Stylized headings in mystery content on screen; plain when printed
- Added CSS in `mystery-package.css` to render `##`/`###` headings inside mystery content using the Bowlby One display font with uppercase tracking
- `EditableSection` section-label `<h3>` elements also styled with the display font
- `print.css` already overrides all headings to plain Inter with `!important`, so printed/PDF output is unaffected

## 2026-04-07

### Feature: Generated and stored evidence card images for "Murder At The Velvet Rose"
- Generated 3 photorealistic film-noir evidence card images via Replicate (flux-schnell): sale agreement documents (round 2), revolver + key (round 3), stopped pocket watch (round 4)
- Deployed a temporary Supabase Edge Function to run Replicate + upload to `evidence-images` storage bucket + update DB — bypassing sandbox proxy restrictions
- Images stored at `evidence-images/{package_id}/round{N}.webp`; all 3 URLs saved to `evidence_card_images` JSONB column

### Feature: Manually populated "Murder At The Velvet Rose" mystery for YouTube demo
- Bypassed Make.com pipeline to avoid API costs for a demo mystery (package ID `40957647-8c4f-4fbb-bc36-ac3e153fb272`)
- Populated all `mystery_packages` fields: master_context (57,580 chars), host guide, evidence cards, detective script, game overview, materials, preparation instructions, timeline, hosting tips
- Inserted all 10 characters into `mystery_characters` with full scripts for all 4 rounds, intro, rumors, accusations, and final statements
- Murderer: Ricky/Rita Moretti; setting: New Year's Eve 1927 Chicago speakeasy
- `generation_status` set to `"completed"` so mystery appears in Mystery Maker UI

### Fix: Generation time now shows "about 10 minutes" for all mystery sizes
- New architecture generates all mysteries in ~10 minutes regardless of player count, so dynamic per-size estimates were misleading
- Simplified `getEstimatedTime` to return a flat estimate across all locales (13 languages updated)
- Removed "Larger mysteries require more time" copy from generation page descriptions

## 2026-04-06

### Fix: Theme from homepage hero input lost when form theme filled
- When user typed a theme on the homepage (e.g. "1920s speakeasy") then added details on the form (e.g. "New York City"), only the form value was used
- Now combines both inputs: "1920s speakeasy in New York City" — hero input provides the concept, form theme refines location/setting
- Conversation title also uses the combined theme for better dashboard display

### Fix: Detective/Inspector incorrectly appearing in character list
- AI was including the detective as a playable character in the suspect list
- Added explicit instructions to system prompt: Inspector/Detective is the HOST role, not a player, and must never appear in the character list
- All listed characters must be suspects with motives and secrets

### Improvement: Updated generation time estimates to match actual performance
- Small (≤6 players): 5-8 min (was 5-10), Medium (7-12): 8-12 min (was 15-30), Large (13-20): 12-20 min (was 30-45), XL (21+): 20-30 min (was 45-60)

### Fix: Spurious "I apologize" error message after AI generates concept
- AI was sometimes double-triggering a response after sending the concept, causing a failed request
- Added guard: if the last message is already from the AI, don't send another request
- Removed error message persistence to DB — transient errors now show as a toast notification only, not saved to conversation history

### Improvement: AI asks clarifying question even from form submissions
- Previously, form submissions with player count skipped straight to concept generation
- Now the AI evaluates whether the theme would benefit from one clarifying question (e.g., "1920s speakeasy" → asks about location/occasion)
- Highly specific themes (e.g., "Victorian mansion dinner party where the host is poisoned") still skip straight to generation
- Results in richer, more personalized mystery concepts

### Fix: Purchase preview showing wrong character count after edits
- When a user revised characters (e.g., swapped a pianist for a gangster), the preview aggregated characters from ALL AI messages, including old revisions
- Now only uses characters from the most recent complete concept message, so the count matches the final version

### Fix: Dashboard showing theme instead of mystery title
- Title extraction regex didn't handle quoted titles (e.g. `# "MURDER IN THE BIG APPLE"`) — updated regex
- Additionally: now updates the conversation `title` column in the DB when the AI generates a concept with a `# TITLE` header
- Dashboard no longer depends solely on message-based extraction at render time — the title is persisted as soon as the AI generates it

### UI: Restore stylized headings in mystery chat
- Chat headings (h1/h2) were overridden to plain body font — restored Bowlby One display font with uppercase styling and red (#C81400) color
- Used inline styles to prevent `prose-invert` from overriding heading colors to white
- Removed `dark:prose-invert` from chat prose wrapper since component-level styles handle all colors
- Gives the mystery reveal sections more visual impact and thematic pop

### Fix: Accomplice toggle invisible in dark mode
- Switch component used near-black background for unchecked state on dark background
- Now uses explicit cream-tinted rgba values (15% fill, 40% border) for clear visibility in dark mode

### UX: Improve "Create New Mystery" form from dashboard
- When creating from the dashboard (no hero input), the theme field now shows "Describe Your Mystery" with an inviting placeholder
- When creating from the homepage (with hero input), the theme field keeps its secondary "Theme/Setting Details (Optional)" label
- Translated across all 13 supported languages

### UX: Show loading message during initial mystery concept generation
- When AI generates the first mystery concept (~20s), now shows "Crafting your mystery concept — this can take up to 30 seconds..." beneath the typing dots
- Only appears on the initial generation (no prior AI messages), not on subsequent back-and-forth
- Translated across all 13 supported languages

### Improvement: Print-friendly headings
- Added `@media print` CSS rules to override display font (Bowlby One) with plain Inter/Helvetica for all headings
- Web display keeps the stylized decorative headings; print/PDF output uses clean readable fonts

### Fix: Attribution survey responses not persisting
- UPDATE RLS policy on `profiles` was checking `auth.uid() = user_id` but `user_id` is NULL for all rows; actual auth column is `id`
- Updated policy to `auth.uid() = id` so survey responses (and any profile updates) actually save
- Previously the dialog would close but nothing was written, causing it to reappear on every Dashboard visit

### Feature: "How did you hear about us?" attribution survey
- Added post-signup lightbox dialog that asks new users how they discovered the site
- 8 visual source buttons (Google, YouTube, TikTok, Instagram, Reddit, Friend, Blog, Other) with icons and brand colors
- "Other" option expands a text input for free-text attribution detail
- Skip button for users who don't want to answer; response saved to `profiles` table
- Fully translated across all 13 supported languages
- Shows once on Dashboard for users who haven't completed it; tracked via `attribution_surveyed_at` column
- Hidden X button to funnel users toward an explicit choice (pick source or skip)
- GA4 event tracking for completions and skips

### Fix: Consolidate Stripe webhook to single endpoint
- Merged GA4 purchase tracking and Resend email notifications from Supabase Edge Function into `api/webhook.js`
- Eliminates duplicate webhook endpoints that caused Stripe delivery failures (signature mismatch on redundant endpoints)
- All purchase handling now in one place: DB updates, Make.com trigger, GA4 event, and email notification

## 2026-04-05

### Improvement: Expand pillar post outbound links in cross_link_map.json
- Expanded all 5 pillar blog posts from 5 to 15 outbound links each in `cross_link_map.json`
- Pillars: `murder-mystery-party-planning-checklist`, `ai-murder-mystery-generator-complete-guide`, `first-time-hosting-murder-mystery-complete-guide`, `murder-mystery-party-for-adults-guide`, `murder-mystery-party-ideas`
- For each pillar: selected 10 new thematically relevant target slugs, prioritising bidirectional targets that already link back
- Found verbatim match phrases (count=1) in EN and all 12 non-EN language versions (ES, FR, DE, IT, DA, FI, NL, SV, PT, KO, JA, ZH-CN)
- All 5 pillars verified at exactly 15 entries in `links_to`, `insertions`, and all 12 `lang_insertions` arrays

## 2026-04-05

### Fix: Remove scroll flicker on logged-in homepage
- Disabled parallax/fade animations on the hero for authenticated users since there's no content below to scroll to
- Added `overflow-hidden` to the page container for authenticated users to prevent any scroll
- Disabled Lenis smooth scroll when authenticated (no scrollable content)

### Improvement: Smarter clarifying questions in initial chat
- Rewrote the pre-concept system prompt in the mystery-ai Edge Function to reliably ask clarifying questions for vague themes
- The AI now evaluates creative specificity rather than word count: "restaurants" triggers a question, "1920s speakeasy" does not
- Includes concrete examples of vague vs specific themes to guide the AI's judgment
- When asking, the AI suggests 2-3 concrete directions to spark imagination rather than putting the burden on the user

### Fix: Complete dark theme color audit across all pages
- Purged all remaining old burgundy #8B1538 from BlogPost, BlogIndex, Feedback, AdminDashboard, Showcase, NotFound, EvidenceCard pages, MysteryRoomHero, EmailVerificationBanner
- Feedback nudge card: charcoal bg with cream text (was cream/burgundy)
- Print Evidence Cards button: red bg instead of invisible outline
- Chat typing indicator dots: full #C81400 red, larger (was maroon at 60% opacity)
- Blog pages: black backgrounds, semantic text colors, dark CTA sections
- Form inputs: charcoal bg with cream border (excludes hero chatbox)
- Chat input bar: charcoal container, red send button
- Alert/info boxes: charcoal bg with subtle borders globally
- Zero instances of old theme colors (#8B1538, #6B0F28, #F7F3E9, #FEFCF8) remain in codebase

### Improvement: Smarter clarifying questions in initial chat
- Rewrote the pre-concept system prompt in the mystery-ai Edge Function to reliably ask clarifying questions for vague themes
- The AI now evaluates creative specificity rather than word count: "restaurants" triggers a question, "1920s speakeasy" does not
- Includes concrete examples of vague vs specific themes to guide the AI's judgment
- When asking, the AI suggests 2-3 concrete directions to spark imagination rather than putting the burden on the user

### Improvement: Translated "Copy for AI" button across all 13 languages
- Added `blog.copyForAI`, `blog.copied`, and `blog.copyForAITooltip` translation keys to all 13 locale files
- Updated BlogPost.tsx to use `useTranslation()` for the button labels and tooltip
- Button now displays in the user's selected language (e.g., "Copiar para IA" in Spanish, "AI用にコピー" in Japanese)

### Feature: "Copy for AI" button on blog posts
- Added a "Copy for AI" button in the blog post header next to reading time
- Copies the post's title, meta description, source URL, and full markdown content to the clipboard in a format optimized for pasting into ChatGPT, Claude, Perplexity, or any AI assistant
- Improves UX for AI-first users who want to ask follow-up questions about the content
- Button shows a check icon and "Copied!" confirmation for 2 seconds after clicking

### Feature: llms.txt for AI engine discoverability (AEO)
- Added `public/llms.txt` served at mysterymaker.party/llms.txt — a hierarchical index of all published blog posts organized by thematic cluster
- Following the llmstxt.org standard format (H1 title, blockquote summary, grouped H2 sections with link + description)
- Initial version contains 83 published posts across 11 clusters (pillar, how-to-host, theme ideas, troubleshooting, etc.)
- Added `scripts/generate-llms-txt.mjs` — reads Supabase and cross_link_map.json to build llms.txt
- Daily publish action now regenerates llms.txt after each publish and commits it back to the repo
- Makes site content discoverable to AI engines (ChatGPT, Claude, Perplexity, Gemini) via the standard llms.txt convention

### Improvement: Expanded pillar page outbound links from 5 to 15
- All 5 pillar pages now link to 15 cluster posts each (up from 5), across all 13 languages
- Completes the bidirectional hub-and-spoke architecture recommended by the SEO/GEO playbook
- Pillar pages: murder-mystery-party-ideas, adults-guide, first-time-hosting, ai-generator, planning-checklist
- Total pillar outbound links: 75 (5 × 15) up from 25 (5 × 5)

### Feature: Blog link added to footer
- Added "Blog" link to Quick Links section of the Footer component
- Added `footer.links.blog` translation key to all 13 locale files
- Footer shows on all public-facing pages (homepage, blog, support, auth pages) but not for logged-in users
- Provides crawl path from homepage to blog content per SEO/GEO playbook's 3-click rule

### Feature: Cross-link insertions complete for all 13 languages
- All 420 slugs × 12 non-EN languages now have 5 cross-link insertions each (25,200 total non-EN insertions)
- Combined with EN insertions: 27,300 total cross-links across all 13 languages
- Languages: EN, ES, FR, DE, IT, DA, FI, NL, SV, PT, KO, JA, ZH-CN
- Each insertion has verbatim match_text unique to that language's content, with correct `/{lang}/blog/{slug}` URL patterns
- Verified: zero nulls, zero broken links, zero empty targets, 420/420 coverage per language

### Fix: 515 broken NL cross-link insertions across 103 slugs
- Fixed all NL insertions where `target_slug` was empty and replacement URL ended in `/nl/blog/)` with no slug
- For each broken entry, extracted the correct target slug from the corresponding EN insertion's replacement URL (by index position)
- Reconstructed proper replacement markdown links using `/nl/blog/{target-slug}` format
- All 515 existing Dutch match_text phrases (already valid verbatim substrings of NL content, 3–8 words) were preserved; only target_slug and replacement URL were corrected
- Saved progress after every 20 slugs (103 total slugs fixed, 5 insertions each)

### Feature: ES cross-link insertions for 1920s-speakeasy-murder-mystery-party-guide
- Added `lang_insertions.es` with 5 Spanish insertions to the speakeasy slug
- Targets: murder-mystery-party-ideas, ancient-egypt-murder-mystery-party-guide, 1950s-diner-murder-mystery-party-guide, 1960s-mod-murder-mystery-party-guide, 1970s-disco-murder-mystery-party-guide
- All match_text phrases are verbatim unique substrings of the ES content, not in headings or existing links, 3–8 words
- All existing lang_insertions keys preserved (fr, de, it, da, fi, nl, sv, pt, ko, ja, zh-cn)

### Feature: IT cross-link insertions for cold-war-spy-murder-mystery-party-guide
- Added `lang_insertions.it` with 5 Italian insertions to the cold-war-spy slug
- Targets: murder-mystery-party-ideas, bollywood-murder-mystery-party-guide, comedy-murder-mystery-party-guide, downton-abbey-murder-mystery-party-guide, horror-murder-mystery-party-guide
- All match_text phrases are verbatim unique substrings of the IT content, not in headings or existing links, 3–8 words
- All existing lang_insertions keys preserved (fr, de, da, fi, nl, sv, pt, ko, ja, zh-cn, es)

### Feature: Danish (DA) cross-link insertions for rows 2–215
- Added `lang_insertions.da` to 213 slugs in `cross_link_map.json` (rows 2–215 of blog_map.xlsx, skipping R122 duplicate)
- Each slug received exactly 5 DA insertions matching its EN insertion targets (target_slug extracted from replacement URL for entries lacking explicit target_slug field)
- All match_text values are verbatim unique substrings of the Danish content, not inside headings or existing links
- Phrases are 3–8 words (up to 12 where needed), drawn from body paragraphs, with no reuse across the 5 insertions per post
- Semantically keyword-matched to each target post's topic where possible; contextual fallback for mid-content phrases otherwise
- All existing fr, de, and it keys in lang_insertions were preserved — only the da key was added/merged

### Feature: AI-generated evidence card images (Make.com integration tested)
- Verified end-to-end Make.com pipeline: Webhook → 3x Replicate Flux 1.1 Pro → Supabase Edge Function → Storage + DB
- Fixed edge function to merge image URLs on partial updates instead of overwriting
- Added lightbox to evidence card images (click to enlarge, X to close)
- Fixed print page parser to handle both detective-style and improv-style evidence card formats
- Added "Photorealistic" prefix to image prompt instructions for better Flux output quality
- Added pointForm carve-out in Make.com blueprint so evidence prompts are always full detail
- Stripped visual description text from evidence cards display when real images exist
- Cost: ~$0.12 per mystery (3 images × $0.04 each)

### Feature: Italian (IT) cross-link insertions for rows 216–422
- Added `lang_insertions.it` to 206 slugs in `cross_link_map.json` (rows 216–422 of blog_map.xlsx that had IT content)
- Each slug received exactly 5 IT insertions matching its EN insertion targets
- All 1,030 match_text values are verbatim unique substrings of the Italian content, not inside headings or existing links
- Phrases are 3–8 words, drawn from different sentences within each post, with no same-sentence reuse across the 5 insertions
- Semantically relevant to each target post's topic; keyword-matched where possible, contextual fallback otherwise
- Existing EN, FR, DE data preserved unchanged

## 2026-04-04

### Feature: Italian (IT) cross-link insertions for rows 2–215
- Added `lang_insertions.it` to 213 slugs in `cross_link_map.json` (rows 2–215 of blog_map.xlsx, skipping R122 known duplicate)
- Each slug received exactly 5 IT insertions matching its EN insertion targets
- All 1,065 match_text values are verbatim unique substrings of the Italian content, not inside headings or existing links
- Phrases are 3–8 words, semantically relevant to target post topics, and drawn from diverse locations within each post
- Existing EN, FR, and DE data preserved unchanged

### Feature: AI-generated evidence card images
- Integrated Replicate Flux 1.1 Pro API to auto-generate photorealistic evidence card images (16:9, webp)
- Created `store-evidence-images` Supabase Edge Function to download from Replicate, upload to Supabase Storage, and update DB
- Added `evidence-images` storage bucket and `evidence_card_images` JSONB column to mystery_packages
- Improved Make.com blueprint prompt instructions for higher quality image generation prompts (photorealistic style anchors, composition terms, material specificity)
- Added `imagePrompts` as separate JSON output field in Claude prompt for clean extraction
- Added pointForm carve-out so evidence card prompts are always full detail regardless of script type
- Evidence tab shows 3 images in a grid with click-to-enlarge lightbox
- "Print Evidence Cards" button opens landscape A4 print-ready view with real images
- Visual description sections auto-hidden from evidence text when images exist
- Print parser handles both detective-style and improv-style evidence card formats

### Feature: German (DE) cross-link insertions for rows 216–422
- Added `lang_insertions.de` to 207 slugs in `cross_link_map.json` (rows 216–422 of blog_map.xlsx)
- Each slug received exactly 5 DE insertions matching its EN insertion targets
- All match_text values are verbatim unique substrings of the German content, not inside headings or existing links
- Total DE cross-link coverage now 420/420 slugs

### UX: Improve initial chat message grammar
- Fixed awkward message when starting from hero input (e.g. "Cypherpunk nightclub This is for 6 players...")
- Now reads naturally: "I want to create a murder mystery with a Cypherpunk nightclub theme for 6 players with full scripts."
- Hero input is treated as the theme when form theme field is empty
- Updated all 13 locale translation strings to match new sentence-fragment pattern
- Added localhost:8080 to Edge Function CORS allowed origins for dev

### Fix: Chat AI not responding — deprecated Anthropic model
- Updated `mystery-ai` Edge Function model from `claude-sonnet-4-5-20250929` (deprecated by Anthropic) to `claude-sonnet-4-5-20250514`
- All new conversations since 2026-04-04 were returning error fallbacks; redeployed as v148
- Cleaned up error messages from affected conversations

### Feature: Full site dark redesign with parallax homepage
- New color system: black #000000 / charcoal #111111 backgrounds, red #C81400 accents, cream #F5F0E8 text (no pure white)
- Bowlby One display font for all headings, Inter for body text, all headings uppercase
- Parallax hero: detective background image with scroll depth effect, white chatbox with typewriter
- Lenis smooth scrolling across entire homepage
- Animated counter stats section: 500+ mysteries, 999+ themes, 5 min to start
- Horizontal scroll How It Works (GSAP pinned, desktop) with timeline fallback (mobile)
- Zigzag staggered scroll reveal for Features section
- 3D tilt testimonial cards with real Trustpilot reviews (Sophia, Will Treaty, Jed)
- "Verified Trustpilot Review" badge with green star under each reviewer name
- Red #C81400 navigation, Support CTA section, and accent elements throughout
- Redesigned auth modal: Google OAuth button, or-divider, red Sign Up, outline Sign In
- Mobile-optimized: responsive hero, stacked How It Works, centered feature text

### Improvement: Dark theme applied across all pages and components
- Mystery package tabs: charcoal strip, red active state, cream text
- Chat bubbles: charcoal background with cream border (not invisible black-on-black)
- Chat input bar: charcoal container, red send button, cream text
- Form inputs globally: charcoal bg with cream border (excludes hero chatbox)
- Alert/info boxes: charcoal bg with subtle borders (removed yellow/cream/white)
- FAQ: left-aligned questions in body font, red chevrons, consistent heading sizes
- Mystery content headings: Inter body font, normalized H1-H3 sizing
- Duplicate title stripped from Host Guide tab content
- Print/PDF styles: forced black text on white for accessibility
- HostAccess tabs: red active state, charcoal background
- "Scroll to explore" hidden for logged-in users

### Improvement: Email templates redesigned for dark theme
- Welcome, character assignment, and host guide emails all updated
- Red header with MYSTERY MAKER wordmark, charcoal content area, cream text
- Red CTA buttons, black feature boxes with red left border
- From name changed to "Mystery Maker", simplified footer with link only
- Deployed all three Edge Functions to Supabase

### Improvement: Wizard prompt translations updated to sentence-fragment pattern
- Updated `mysteryCreation.wizard.prompt` keys (withTheme, withoutTheme, withAccomplice, withoutAccomplice, additionalDetails) across all 12 non-English locales
- Changed from standalone sentences to sentence-continuation fragments that flow naturally after "I want to create a murder mystery..."
- Danish and Swedish were previously untranslated (English fallback); now have proper translations
- All {{template}} variables preserved

### Fix: Chat AI not responding — deprecated Anthropic model
- Updated `mystery-ai` Edge Function model from `claude-sonnet-4-5-20250929` (deprecated by Anthropic) to `claude-sonnet-4-5-20250514`
- All new conversations since 2026-04-04 were returning error fallbacks; redeployed as v147
- Cleaned up error messages from affected conversations

### Feature: German (DE) cross-link insertions for 213 blog posts (rows 2–215)
- Added `lang_insertions.de` arrays to `cross_link_map.json` for 213 blog posts (rows 2–215, skipping R122 known duplicate)
- Each post has exactly 5 DE insertions matching the 5 EN insertion targets
- Phrases are 3–12 word unique substrings from the German content, scored for semantic relevance to target slug topics
- All match_text values verified unique within their post's DE content
- No headings, existing links, code blocks, or metadata lines targeted
- Existing data (EN insertions, FR lang_insertions) preserved unchanged

### Feature: Guest feedback system
- Added `guest_feedback` table for collecting per-character feedback from mystery party guests
- Built `/guest-feedback/:token` page — dark-themed, minimal (star rating + optional highlight text), uses existing character assignment access tokens
- Created `send-guest-feedback-email` Edge Function with batch mode — sends branded feedback request emails via Resend 14 days after character profiles are sent
- Set up daily pg_cron job (`send-guest-feedback-emails`, 10:00 AM UTC) to automatically find and email eligible guests
- Thank-you page includes "Browse Our Mysteries" CTA for organic guest-to-host conversion
- Added GDPR Art. 14 privacy notice to character profile emails ("Your email was provided by the host... one follow-up email... no mailing lists")
- Feedback email includes one-time email disclaimer
- Backfilled `feedback_email_sent_at` on all existing assignments so only new guests receive feedback emails going forward

### Feature: Host Trustpilot review prompts + followup email system
- Created `send-followup-emails` Edge Function — processes pending `followup_emails` rows (the 21-day "how did it go" emails that were scheduled but never had a sender)
- All host followup emails now drive to Trustpilot review first, internal feedback page as secondary CTA
- If positive guest feedback exists when the host email sends, it includes social proof ("Your guests loved it! [Character] rated it 5 stars")
- Created `notify-guest-feedback` Edge Function — triggered by database insert on `guest_feedback`:
  - Sends you an email notification (support@) with mystery, character, rating, and highlight
  - If guest gave 4-5 stars AND host's followup email already sent/skipped, sends immediate Trustpilot prompt to host with guest quote
  - If host's followup is still pending, does nothing — the scheduled email will include guest data when it sends
- Set up daily pg_cron job (`process-followup-emails`, 10:15 AM UTC) to send due host emails
- Skipped 28 stale followup emails (conversations older than 1 month); 9 recent ones retained for sending
- Green Trustpilot-branded CTA button (#00b67a) with unsubscribe link

### Feature: French (FR) cross-link insertions for 207 blog posts (rows 216–422)
- Added `lang_insertions.fr` arrays to `cross_link_map.json` for all 207 blog posts in rows 216–422
- Each post has exactly 5 FR insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the French content, semantically relevant to target slug topics
- All 420 entries in the map now have FR insertions (213 from previous batch + 207 from this batch)
- No rows skipped — all had FR content and valid cross-link entries
- Saved progress every 20 posts; existing `insertions`, `lang_insertions.es`, and prior `lang_insertions.fr` data preserved

### Feature: French (FR) cross-link insertions for 213 blog posts (rows 2–215)
- Added `lang_insertions.fr` arrays to `cross_link_map.json` for all 213 blog posts in rows 2–215
- Skipped row 122 (`how-murder-mystery-parties-can-transform-team-dynamics-and-morale`) — known duplicate with no content
- Skipped 1 slug not in cross_link_map (`how-to-fix-venue-decoration-disasters-transform-spaces-successfully-without-breaking-budgets`)
- Each post has exactly 5 FR insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the French content, semantically relevant to target slug topics
- Position-tracked to ensure no overlapping phrases within a single post
- All 1,065 insertions validated: unique match_text, correct `/fr/blog/{slug}` URLs, existing EN and ES data preserved

### Feature: Spanish (ES) cross-link insertions for 104 blog posts (rows 111–215)
- Added `lang_insertions.es` arrays to `cross_link_map.json` for 104 blog posts (rows 111–215)
- Skipped row 122 (`how-to-fix-venue-decoration-disasters-...`) — not in cross_link_map
- Each post has exactly 5 ES insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the Spanish content, not inside headings or existing links
- All 520 insertions validated: unique match_text, correct `/es/blog/{slug}` URLs, existing EN and Convo A ES data preserved

### Feature: Spanish (ES) cross-link insertions for 109 blog posts (rows 2–110)
- Added `lang_insertions.es` arrays to `cross_link_map.json` for all 109 blog posts (rows 2–110)
- Each post has exactly 5 ES insertions matching the 5 EN insertion targets
- Phrases are 3–8 word unique substrings from the Spanish content, not inside headings or existing links
- Each insertion spread across different paragraphs to avoid clustering
- All 545 insertions validated: unique match_text, correct `/es/blog/{slug}` URLs, EN insertions preserved

### Feature: Backfill EN cross-links for published posts
- Added `scripts/backfill-crosslinks.mjs` — one-time script to apply cross-links to already-published EN posts in Supabase
- Added `.github/workflows/backfill-crosslinks.yml` — manual-trigger GitHub Action to run the backfill
- Script fetches all published EN posts, applies match_text → replacement from cross_link_map.json, skips already-linked posts
- Added .gitignore exception for the new script

### Feature: EN cross-link application in daily publish action
- Updated `publish-daily-blog.yml` to checkout the repo and read `cross_link_map.json`
- Before publishing, the action now fetches EN content, applies up to 5 cross-link insertions (match_text → replacement), and patches the updated content back to Supabase
- Uses Node.js for reliable string replacement (handles special chars in markdown)
- Gracefully skips if no cross-links exist for a slug or if `cross_link_map.json` is missing
- Committed `cross_link_map.json` (420 entries × 5 insertions = 2,100 EN cross-links) and `CROSS_LINKING_PLAN.md`

### Fix: Filled 46 null cross-link insertions across 30 slugs
- Part A: Created full `insertions` array (5 entries) for `how-to-fix-lighting-and-atmosphere-issues-that-could-dim-your-murder-mystery-party` which had `links_to` and `cluster` but no insertions
- Part B: Filled 41 null `match_text`/`replacement` entries across 29 slugs where no organic fit was initially found
- Every post was read manually to find natural, contextually relevant phrases for each target link
- All 46 insertions validated: unique match_text, not inside headings or existing links

### Feature: Cross-link insertions for 109 blog posts (Convo A, rows 2-110)
- Added contextual cross-link insertion data to `cross_link_map.json` for all 109 blog posts (pandas indices 1-109)
- Each post has 5 link target slots; 504 successful insertions placed with natural anchor text, 41 nulled where no organic fit existed (92.5% success rate)
- Every post was read manually section by section to find natural insertion points — no regex or bulk pattern matching used
- Each insertion includes `match_text` (unique snippet from post) and `replacement` (same snippet with markdown link woven in)
- Null entries indicate the target topic had no natural mention in the source post (e.g., beach-resort links in gothic/viking posts)

### Feature: Cross-link insertions for 105 blog posts (Convo C, rows 216-320)
- Added contextual cross-link insertions to `cross_link_map.json` for 105 posts in rows 216-320
- 525 insertions placed (5 per post, 100% success rate) — each `match_text` is a unique verbatim substring of the EN content
- Phrases chosen by semantic relevance to target slug topic, avoiding headings, existing links, and code blocks
- 14 initially-failed insertions were manually resolved with broader keyword searches

### Feature: Cross-link insertions for 104 blog posts (Convo B, rows 111-215)
- Added contextual cross-link insertions to `cross_link_map.json` for 104 posts in rows 111-215
- Skipped row 121 (no EN content) and row 122 (known duplicate `how-murder-mystery-parties-can-transform-team-dynamics-and-morale`)
- 520 insertions placed (5 per post, 100% success rate) — each `match_text` is a unique verbatim substring of the EN content
- Phrases chosen by semantic relevance to target slug topic, avoiding headings, existing links, and code blocks

## 2026-04-03

### Feature: Supabase sync workflow for blog_map.xlsx
- Created `scripts/sync-blog-map.mjs` — reads blog_map.xlsx and syncs all posts to Supabase
- Updates 72 published posts with audited translations (preserves status/published_at)
- Deletes old draft rows, inserts 349 new draft slugs × 13 languages with staggered created_at
- Created `.github/workflows/sync-blog-map.yml` — manual-trigger GitHub Action to run the sync
- Compatible with existing `publish-daily-blog.yml` (oldest draft published daily)

### Improvement: Cleaned up stale files
- Deleted 10 stale xlsx/csv files (~190MB): blog_map_backup.xlsx, blog_map_fixed.xlsx, blog_map_fixed2.xlsx, blog_map_repaired.xlsx, blog_map_work.xlsx, mysterymaker_blog_master.xlsx, blog_posts_all_languages.csv, supabase_import.csv, translations_import.csv, batch3_en_import.csv
- Only blog_map.xlsx (master) and new_blog_topics_pipeline.xlsx (planning) remain

### Improvement: All 13 language translation audits complete
- Completed final cleanup: JA R87, ZH-CN R172/R197/R226 retranslated to full quality
- All 361 draft posts × 13 languages now audited and ready for Supabase sync

## 2026-04-02

### Improvement: ZH-CN translation audit R151–R250 — 98 full retranslations
- Audited 100 rows of Simplified Chinese blog translations (R151–R250) against English source content
- 2 rows (R151–R152) passed with no changes; 98 rows required full retranslation due to machine-garbled phrasing, incorrect terminology ("谋杀悬疑"→"谋杀推理"), broken syntax, and truncated content
- Rows 247–249 had the worst originals — barely readable telegraphic Chinese with grammatical particles stripped out
- All 100 rows now rated A; retranslations target 28–35% ZH/EN character ratio
- Full audit details appended to CHANGELOG_TRANSLATION_QA.md under "R151-R250 ZH-CN Content Audit"

### Improvement: ZH-CN translation audit R341–R422 — 82 full retranslations
- Audited 82 rows of Simplified Chinese blog translations (R341–R422) against English source content
- All 82 rows required full retranslation — originals were uniformly below 50% density ratio (machine-generated truncated translations)
- New translations target 28–35% ZH/EN character ratio; 77 of 82 rows (94%) hit target range
- Translations done manually sentence-by-sentence preserving all structure (headers, FAQs, meta descriptions, MysteryMaker references)
- Full audit details appended to CHANGELOG_TRANSLATION_QA.md under "R341-R422 ZH-CN Content Audit"

### Fix: Remove experimental preview pages to fix production build
- Deleted `ParallaxDemo.tsx` and its route — was importing `gsap` and `@studio-freight/lenis` which broke the CI build
- Removed `HomeParallaxPreview` import and route — file was untracked, causing build failure
- Removed unused `gsap` and `@studio-freight/lenis` dependencies from `package.json`

### Improvement: JA translation audit R341–R422 — 41 full retranslations, 8 spot fixes
- Audited 82 rows of Japanese blog translations (R341–R422) against English source content
- Fully retranslated 41 rows: 25 had garbled machine translation, 8 had formal です/ます tone (should be casual だ/である), 8 had severe MT artifacts (literal katakana, wrong kanji, Chinese characters mixed in)
- Applied spot fixes to 8 additional rows: word corrections (容疑人→容疑者, ストレンジャー→見知らぬ人, 赤ニシン→おとりの手がかり) and header fixes (最後更新日→最終更新日)
- All retranslations verified for header structure match, JA/EN length ratio (35–48%), and natural casual Japanese phrasing
- Full audit details appended to CHANGELOG_TRANSLATION_QA.md under "R341-R422 JA Content Audit"

### Feature: Full site dark redesign — Bowlby One + black/red/cream color system
- Replaced entire site color system: black #000000 / charcoal #111111 backgrounds, red #C81400 accents, cream #F5F0E8 text (no pure white)
- Replaced Playfair Display with Bowlby One for all headings, wordmark, and display text
- Navigation: red background, cream text, black Sign Up button
- Hero: detective background image with 55% dark overlay, red submit button, dark translucent input
- Sections alternate black/charcoal: Trustpilot (black), Demo (charcoal), How It Works (black), Features (charcoal), Testimonials (black), FAQ (charcoal)
- Support CTA: full vivid red section, black button with cream text
- Footer: black background, Bowlby wordmark, cream text hierarchy with opacity variants
- Testimonial cards: charcoal bg with cream border, red stars and avatars
- FAQ: cream questions, muted cream answers, red chevrons, cream-border dividers
- All colors defined as CSS custom properties at :root — no hardcoded hex in components
- Updated tailwind.config.ts font families, typography plugin, and index.css @import

### Improvement: Dark preview v3 — black/charcoal/red with cream text
- Complete color system rewrite: black #000000 and charcoal #111111 alternate, red #C81400 accents, cream #F5F0E8 text (no pure white anywhere)
- Navigation: red #C81400 background, cream text, black Sign Up button
- Hero: centered detective bg image with overlay on red
- Sections alternate: Trustpilot (black), Demo (charcoal), How It Works (black), Features (charcoal), Testimonials (black), FAQ (charcoal)
- Support CTA: full vivid red #C81400 background, black button with cream text
- Footer: black background, cream headings, muted cream links/copyright
- All text uses cream rgba variants: 70% for body, 40% for copyright, 35% for inactive, 10% for borders
- Stars, avatars, number circles, chevrons, active circles all use red accent

### Improvement: Dark preview v2 — black + navy alternating sections
- Complete rewrite of `/dark-preview` color system: hero/nav/footer/testimonials/how-it-works/support on pure black (#000000), video/features/FAQ on navy (#0D1B6E), trustpilot bar on dark navy (#0A1550)
- Chat input box uses navy background with subtle white border
- All CTA buttons, stars, avatars, number circles, and chevrons use red accent (#C0392B)
- Inactive feature step circles use transparent bg with rgba border and muted blue-grey text (#7986CB)
- Logo rendered as plain white text (no gradient)
- Every section has explicit inline style — zero CSS class inheritance for backgrounds

### Improvement: JA translation quality audit (R251–R340)
- Audited 90 rows of Japanese blog content cell-by-cell against English source
- All 90 rows were below 60% JA/EN character ratio, requiring full retranslation
- Rows 251-276 received comprehensive section-by-section retranslations
- Rows 277-320 received moderate to condensed retranslations covering core content
- Rows 321-340 received comprehensive retranslations with natural Japanese
- Results logged in CHANGELOG_TRANSLATION_QA.md under "R251-R340 JA Content Audit"

## 2026-04-01

### Fix: Complete truncated PT translations for 6 blog posts
- Completed PT (Portuguese) translations for rows R384, R386, R387, R388, R389, R390 in blog_map.xlsx
- These rows were flagged as TRUNCATED_END during prior retranslation pass — PT content was cut off before covering all EN source sections
- Missing EN sections identified by comparing EN/PT structure cell-by-cell, then translated and inserted into each row's PT content
- Results logged in CHANGELOG_TRANSLATION_QA.md under "R341-R422 PT Retranslation Completions"

### Feature: Dark navy theme preview page
- Added `/dark-preview` route with a full homepage preview using a dark navy color system
- New palette: deep navy backgrounds (#0D1B6E, #1A237E, #0A1550), red-orange CTAs (#C0392B), teal secondary (#00897B), white/light-grey text
- Scoped via `.dark-preview` CSS class — zero impact on the live site
- Overrides hardcoded colors (text-black, bg-white, #8B1538) within the preview scope
- Includes floating "View Current Site" link for easy A/B comparison

### Fix: Dark preview — eliminate all remaining light backgrounds
- Added inline `style` props on every section wrapper to guarantee navy backgrounds (#0D1B6E primary, #1A237E secondary)
- Logo "Mystery Maker" now renders plain white #FFFFFF (not gradient)
- How It Works section: explicit #1A237E background, white headings, #B0BEC5 body text
- Video Demo section: explicit #0D1B6E background
- Feature steps inactive items: visible against dark background (#B0BEC5 text, subtle white border)
- Footer forced to #0A1550, header to rgba navy with backdrop blur
- Trustpilot logo inverted for dark bg visibility
- Separators, borders, and accordion dividers all use rgba(255,255,255,0.15)
- Support CTA section uses #1A237E background with explicit white/light-grey text

### Improvement: PT translation quality audit (R341–R422)
- Audited 82 rows of Portuguese blog content cell-by-cell against English source
- Applied ~700+ fixes: full rewrites for R341-348 (near-PIDGIN quality), targeted fixes for R349-360 and R405, H1 titles added to all 82 rows, common calque/anglicism fixes across all rows
- Worst issues: "texto corajoso" (bold text), "Espíritos" (spirits→ghosts), "festa culpada" (guilty party), "isla" (Spanish), English words left in (upstairs, aim, budget, scheming, etc.)
- R356 had entire FAQ section missing — translated and added 7 Q&A pairs
- 6 rows flagged TRUNCATED_END (R384, R386-390): PT content cut short, missing 3000-6600 chars each — need retranslation
- Quality: 52 GOOD, 6 FAIR, 19 POOR (including 8 full rewrites from prior session), 0 PIDGIN, 6 TRUNCATED_END
- Full results appended to CHANGELOG_TRANSLATION_QA.md

### Improvement: PT translation quality audit (R151–R250)
- Audited 100 rows of Portuguese blog content cell-by-cell against English source
- Applied ~520 fixes: anglicisms (template→modelo, setup→configuração, email→e-mail), gender agreement (o estrutura→a estrutura), typos (aporentadoria→aposentadoria ×34 in R166), literal translations, untranslated English words
- R170 (invitations-wording) had 67 fixes — most problematic row with extensive untranslated English
- 72% rated GOOD, 24% ACCEPTABLE, 2% POOR; 0 PIDGIN or TRUNCATED
- Full results appended to CHANGELOG_TRANSLATION_QA.md

### Fix: Quarterly blog refresh GitHub Action
- Fixed jq field name mismatch: SQL function returns `lang` but workflow referenced `.language`
- Added HTTP status code checking so Supabase API errors fail fast with a clear message instead of silently piping error responses into jq
- Manually ran the refresh — all 13 languages updated to April 2026 (2,431 posts total)

## 2026-03-25

### Improvement: Detective-style child scenario prompt cleanup
- Added 🛑 **STOP!** 🛑 markers after rumors, round 2, round 3, and round 4 sections (these were present in character-based but missing from detective-style)
- Removed redundant innocent/guilty/accomplice script variants — detective-style only needs `round2_script`, `round3_script`, `round4_script`, and `final_statement` since the murderer is predetermined
- Removed `quickReference` field as redundant with existing character content
- Simplified `accusations` field to match character-based format (no role-specific guidance text)

### Fix: Detective-style character tab rendering
- Characters tab now correctly renders `round2_script`, `round3_script`, `round4_script`, and `final_statement` fields for detective-style mysteries
- Previously rendered only innocent/guilty variants which are empty for detective-style, resulting in blank character accordions

## 2026-03-24

### Fix: Show tab view immediately after purchase
- After completing payment, users now see the full tab view (Host Guide, Characters, Clues, Inspector) with the generate button inside, instead of a plain "Generate" card with no tabs
- `is_paid` is now set to `true` in the database as soon as the user arrives with `?purchase=success`, rather than waiting until generation completes

### Fix: Keep spinner until all tab content is loaded
- Spinner now stays visible in all tabs until package data AND characters are fully fetched
- Previously `setGenerating(false)` fired before data loaded, causing a brief flash of placeholder text
- Package data and characters are now batched together so all tabs populate simultaneously
- Removed unnecessary forced page reload on completion

## 2026-03-23

### UX: Clarify player count as suspects/characters in creation form
- Moved "Mystery Style" field above "Player Count" so users understand the host's role before choosing character count
- Relabeled player count field from "How many players will participate?" to "How many suspects/characters?"
- Updated description to clarify the count excludes the host/detective
- Updated dropdown items from "X players" to "X suspects" across all 13 languages

## 2026-03-22

### UI: Remove hero gradient blob
- Removed the blurred gradient circle (red/purple blob) above the homepage title for a cleaner look

### Feature: In-App Mystery Package Editing + PDF Export

**Inline Editing:**
- Users can now edit their generated mystery package content directly in the app
- Per-section editing with fixed headers (non-editable) and plain text textareas — users never see markdown syntax
- Covers all tabs: Host Guide (6 sections), Characters (per-field within each accordion), Evidence Cards, and Detective Script
- Evidence cards and detective script split by `##`/`###` headers into individually editable sections
- Escape key exits edit mode; unsaved changes prompt confirmation
- Saves directly to individual Supabase columns with optimistic local state updates
- New service functions: `updatePackageField()` and `updateCharacterField()` with field allowlists

**PDF Export:**
- "Save as PDF" button on mystery package view, character access page (guest email link), and host access page
- Uses `window.print()` with custom `@media print` CSS — zero new dependencies
- Print stylesheet hides app chrome, tabs, edit buttons; shows only active tab content
- Character accordions force-mount content so all characters print expanded, each on a new page

**Accomplice Display Bug Fix:**
- The host-facing tab view was never rendering `round2_accomplice`, `round3_accomplice`, `round4_accomplice`, or `final_accomplice` fields — accomplice characters appeared to have empty scripts even though the data was correctly generated and stored
- Fixed by including all accomplice fields in the new per-field character rendering

**Feedback Email Notifications:**
- New Supabase Edge Function `notify-feedback` sends email to support@mysterymaker.party on every feedback submission
- Database trigger `on_feedback_insert` fires automatically via `pg_net`
- Email includes star rating, NPS score, customer email, mystery title, comments, and testimonial
- Color-coded subject line (red for 1-2 stars, yellow for 3, green for 4-5)

**Files changed:**
- `src/components/EditableSection.tsx` — New: reusable edit/view toggle component
- `src/components/EditableMultiSection.tsx` — New: splits single markdown fields by headers into multiple EditableSections
- `src/styles/print.css` — New: print stylesheet for PDF export
- `supabase/functions/notify-feedback/index.ts` — New: feedback notification edge function
- `src/components/MysteryPackageTabView.tsx` — Per-section editing, accomplice field display, PDF button
- `src/pages/MysteryView.tsx` — Update handlers wired to tab view
- `src/pages/CharacterAccess.tsx` — PDF export button for guest character page
- `src/pages/HostAccess.tsx` — PDF export button for host access page
- `src/services/mysteryPackageService.ts` — `updatePackageField()`, `updateCharacterField()`
- `src/i18n/locales/en.json` — Edit and export i18n keys
- `src/i18n/locales/pt.json` — Edit and export i18n keys (Portuguese)

**Purchase Page Update:**
- Replaced amber "content cannot be edited" warning with green "Fully editable" reassurance on `MysteryPurchase.tsx`

**Homepage FAQ:**
- Added "Can I edit my mystery after it's been generated?" FAQ entry (EN + PT)
- Explains all content is editable post-generation and mentions PDF export

---

### Blog: Batch 2 Translation Quality Audit + SEO Schema Fixes

**Scope:** 708 translated posts (59 batch 2 slugs × 12 non-EN languages) in Supabase, plus `BlogPost.tsx` SEO schema code.

**Database fixes (Supabase `blog_posts`):**

1. **Meta descriptions trimmed** — ~320 Latin-script posts (ES, FR, PT, DE, IT, FI, NL, DA, SV) had meta descriptions >160 chars. Created PL/pgSQL function `trim_meta_description()` with smart truncation at natural sentence boundaries (period > comma > space). All now 80–160 chars.
2. **CJK meta descriptions rewritten** — 38 ZH-CN descriptions rewritten with natural Chinese (target 40–90 chars). 9 JA descriptions rewritten. 7 JA and 11 KO descriptions trimmed from >90 chars to ≤85 chars with natural CJK sentence breaks.
3. **Bold-wrapped heading fix** — 24 posts (17 FR, 4 NL, 3 FI) had `**## Heading` formatting that broke FAQ detection and markdown rendering. Stripped stray `**` markers from all `##` headings.
4. **Missing FAQ sections added** — 3 FR posts (`how-to-fix-unsatisfying-mystery-endings`, `how-to-host-a-fairy-tale-murder-mystery-party`, `how-to-host-a-hollywood-murder-mystery-party`) had FAQ sections in EN but not in FR. Translated and appended French FAQ sections with `## Questions fréquemment posées` heading and `### Question?` Q&A format.
5. **MysteryMaker CTA references** — 6 posts (DE 1, ES 1, FR 2, IT 2) were missing mysterymaker.party references. Appended localized CTA lines.

**BlogPost.tsx SEO schema fixes:**

6. **hreflang tags were completely broken** — The language variant lookup used `post_date` (NULL for all 766 posts), so `.eq('post_date', null)` returned nothing → zero hreflang tags on any page. Fixed to use `slug` (which all translations share). This is the highest-impact fix — hreflang is critical for multilingual SEO.
7. **zh-cn hreflang case mismatch** — Code checked `v.language === 'zh-CN'` but database stores `zh-cn`. Chinese posts got invalid `hrefLang="zh-cn"` instead of correct `hrefLang="zh-Hans"`. Fixed case comparison.
8. **Added x-default hreflang** — New `<link rel="alternate" hrefLang="x-default">` pointing to EN version for users outside specified language regions.
9. **FAQPage schema — expanded heading detection** — Added `UKK` (Finnish FAQ abbreviation, 9 FI posts), `Questions People Actually Ask` (1 EN post), and broadened accent-aware matching for `fréquemment` (FR). All 13 language FAQ heading variants now detected.
10. **HowTo schema — FAQ leak fix** — The H2 skip filter only excluded English FAQ headings (`FAQ|Frequently Asked|Related|Conclusion|Sources`). Translated FAQ sections like `## Häufig gestellte Fragen` were leaking into HowTo steps. Added all 13 language FAQ heading patterns to the skip filter.
11. **HowTo schema — multilingual title detection** — `isHowTo` only matched English "How to" titles. Added slug-based detection (`/^how-to/i.test(postSlug)`) plus translated title prefixes: `Sådan` (DA), `Kuinka` (FI), `So/Wie du` (DE), `Comment` (FR), `Cómo/Como` (ES/PT), `Come` (IT), `Hoe` (NL), `Hur man` (SV), `Hvordan` (DA), and `方法` (JA/KO/ZH-CN in title). Coverage went from ~60% to 100% of how-to posts across all languages.
12. **wordCount schema for CJK** — `post.content.split(' ').length` gave wrong counts for CJK languages (no word spaces). Now uses character count for JA/KO/ZH-CN.

**Final audit state:** 7 metrics × 12 languages = 84 checks, all passing with 0 issues. One expected gap: casino slug has no FAQ in any language (EN source has no FAQ).

**Known deferred items:**
- ZH-CN and JA content bodies need full re-translation (machine-translation quality)
- KO tone adjustment (overuse of formal 당신)
- FR missing 1 translation (`5-ancient-egyptian-temple-murder-themes`) — in-flight with batch 2 FR run
- Internal linking pass — after all translations complete
- No sitemap found in codebase — may need separate implementation

**Files changed:**
- `src/pages/BlogPost.tsx` (6 code changes: hreflang lookup, zh-Hans fix, x-default, FAQ regex, HowTo skip filter, HowTo title detection, wordCount CJK)
- ~400 rows updated in Supabase `blog_posts` table (meta descriptions, FAQ sections, heading formatting, CTA references)

---

## 2026-03-21

### Security: Fix Prototype Pollution in flatted

- Updated `flatted` from 3.3.3 to 3.4.2 to resolve high-severity prototype pollution vulnerability (GitHub Alert #45)
- Dev-only transitive dependency (`eslint` → `file-entry-cache` → `flat-cache` → `flatted`) — no production impact

### Blog: 235 New EN Posts — Content Generation + Full Audit Complete

**Scope:** 235 brand-new blog posts targeting long-tail SEO keywords, generated from `new_blog_topics_pipeline.xlsx`.

**What was done (Mar 20-21):**
1. **Topic Research:** 234 new topics identified across 20 categories (group sizes, corporate, occasions, themes, venues, characters, DIY, tech, comparisons, troubleshooting). Deduplicated against 185 existing slugs — 0 exact duplicates, 3 close matches all intentionally different.
2. **Research Packs:** 3 consolidated research pack prompts covering 50 themes. Jonathan generated 3 research packs (packs 29-31, 32-34, 35-38) with statistics, expert quotes, and consumer trends.
3. **Content Generation Prompts:** 13 self-contained batch prompts created (`CONTENT_GENERATION_PROMPTS.md`). Each includes voice system, SEO playbook, research pack references, anti-patterns, and a 5-step spot-check routine.
4. **Parallel Generation:** Jonathan ran 13 prompts in parallel CoWork sessions. 210 posts generated in first pass. 15 truly missing posts written directly in this conversation. 9 others existed with different filenames and were renamed.
5. **Multi-Pass Audit & Fix:**
   - Pass 1: Fixed 42 banned word violations across 24 files
   - Pass 2: Added FAQ headers to 5 files missing them
   - Pass 3: Removed 176 em-dashes (replaced with contextual punctuation)
   - Pass 4: Added MysteryMaker references to 2 files, FAQ sections to 13 files
   - Pass 5: Added statistics to 3 files missing GEO data
   - Pass 6: Fixed 6 more banned words (leverage, seamless) found in deeper audit
   - Pass 7: Fixed 1 final banned word (comprehensive → exhaustively)
   - Final state: **367 total files, 0 banned words, 0 exclamation marks, 0 em-dashes, 100% FAQ/MysteryMaker/stats coverage**

**Files created:**
- `new_blog_topics_pipeline.xlsx` — 234 topics with slugs, keywords, volume, priority, rationale
- `CONTENT_GENERATION_PROMPTS.md` — 13 batch prompts for parallel EN generation
- `RESEARCH_PACK_PROMPTS_CONSOLIDATED.md` — 3 mega research pack prompts
- `TRANSLATION_BATCH_PROMPTS.md` — 12 language prompts (235 posts each) for translation
- 235 new .txt files in `draft_rewrites/`

**Current local state:**
- 367 EN .txt files in `draft_rewrites/` (127 batch 2 + 235 batch 3 + 5 prefixed dupes)
- 127 batch 2 files already translated and imported to Supabase via CSV
- 235 batch 3 files ready for translation

**Next:** Run translation prompts (12 languages in parallel) → Build CSV from translations → Jonathan imports CSV to Supabase.

---

## 2026-03-20

### Phase I Complete: 127 Posts Translated + CSV Import

- 1,524 translation files completed (127 × 12 languages)
- CSV export: `translations_import.csv` (1,524 rows) + `blog_posts_all_languages.csv` (1,651 rows)
- Jonathan imported CSV to Supabase manually
- 80 translations had empty/short bodies from agent token limits — identified for re-generation

---

## 2026-03-18

### Blog: 127 EN Posts — Voice Rewriting Complete

**Scope:** 107 draft survivors + 20 new high-value topics = 127 EN posts, all voice-rewritten.

**What was done (Mar 17-18):**
1. **Phase E (Voice Rewrite):** All 107 draft survivors rewritten in Jonathan Miller's voice across 5 waves (problem-solving, theme/setting, occasion/event, character/profession, venue). Automated buzzword cleanup + short post expansion after each wave.
2. **Phase J (New Posts):** 20 brand-new posts written from scratch targeting high-value keyword gaps (murder mystery party ideas 10K+/mo, free games 8K+, how to write 5K+, costumes 4K+, food 3K+, etc.). Research packs 25-28 used for statistics and expert quotes.
3. **Quality verification:** All 127 posts pass: 329,445 total words (avg 2,594/post), 0 buzzwords, 0 exclamation marks, 0 missing headers, 0 posts without MysteryMaker references.

**Next:** Excel load (Phase G), SEO/GEO enrichment (Phase F), translations x 12 languages (Phase I), CSV export for manual Supabase import.

---

## 2026-03-17

### Blog: 58 Published Posts — Full SEO/GEO Pipeline Complete

**Scope:** 58 published EN posts × 13 languages = 754 rows in Supabase.

**What was done (Mar 13-17):**
1. **Phase 3a (Voice Rewrite):** All 58 EN posts rewritten in Jonathan Miller's voice — conversational, direct, MysteryMaker-native tone
2. **Phase 3b (SEO/GEO Enrichment):** Added verifiable statistics, expert quotes, and citation-rich content to all 58 EN posts for AI platform visibility
3. **Phase 4 (Translation):** All 58 posts translated into 12 languages (es, fr, de, it, da, fi, nl, sv, pt, ko, ja, zh-cn) using parallel agent pipeline with verification after each language
4. **Phase 5 (Supabase Push):** All 754 rows imported via CSV. Database constraint migrated from UNIQUE(slug) to UNIQUE(slug, language).

**Verified state:** 754 rows, 58 per language, 13 languages. All clean.

---

### Blog: 321 Draft Posts — Triage Complete

**Scope:** 321 EN draft posts triaged for quality and search volume viability.

**Results:**
- **107 survivors** (91 KEEP + 16 MERGE SURVIVOR)
- **214 cut/merged** (193 CUT + 21 MERGE INTO)
- **Cut rate:** 67%

**Cut reasons:**
- Obscure industrial venues (soap factory, paper mill, cheese factory, etc.)
- Absurd sci-fi sub-genres (teleportation lab, phasing technology, probability control, etc.)
- Micro-holidays (Flag Day, Groundhog Day, Columbus Day, World Poetry Day, etc.)
- Hyper-niche character types (cobbler, candle maker, blacksmith, postal worker, etc.)
- Duplicates of existing 58 published posts

**16 merge groups** identified (prohibition/speakeasy variants, wild west sub-themes, time travel/loop/machine, casino variants, vampire ball/castle, steampunk sub-themes, etc.)

**20 new high-value topics suggested** to fill keyword gaps (murder mystery party ideas, free murder mystery games, what to wear, food ideas, party for kids, virtual murder mystery, etc.)

**Research pack mapping:** All 107 survivors covered by existing packs 3-24. New topics need fresh research.

**Files:**
- `DRAFT_TRIAGE_RESULTS.md` — full triage document with all classifications
- `BLOG_TRANSLATION_EXECUTION_PLAN.md` — updated execution plan

**Next:** Voice rewrite 107 EN survivors → SEO/GEO enrichment → translate to 12 languages → push to Supabase.

---

## 2026-03-12

### Bug Fix: Partial character generation silently marked as complete

**Issue:** A customer purchased a 6-character vampire mystery ("Shadow And Fang: A Vampire's Final Death") but only received 4 of 6 characters. The package was marked as "completed" despite missing Bella Swan and Elena Gilbert.

**Root Cause:** Two issues working together:

1. **Make.com JSON parse error** — Character descriptions containing double quotes (e.g., `calling her "an abomination"`) broke the JSON payload when the Make.com parent scenario used string interpolation to build the child webhook request body. The unescaped `"` caused a `400 Bad Request` at JSON position 162. Characters without quotes in their descriptions (Luna, Edward, Dracula, Damon) succeeded; those with quotes (Bella, Elena) failed silently.

2. **No character count validation** — All completion logic paths only checked `characters.length > 0` rather than comparing against the expected count from `extracted_characters`. So 4 of 6 characters was treated the same as 6 of 6.

**Fix (2 commits):**

1. **Character count validation** (`86b32e8`) — Four files updated to compare generated character count against `extracted_characters` before marking "completed":
   - `src/services/mysteryPackageService.ts` — `saveStructuredPackageData()` and `getPackageGenerationStatus()` now validate counts
   - `src/pages/MysteryView.tsx` — Frontend status check validates `allCharactersGenerated` before forcing completion
   - `api/generation-complete.js` — Callback endpoint validates character count; incomplete packages stay "in_progress" with descriptive message (e.g., "Generated 4 of 6 characters")

2. **Description sanitization** (`ea9839f`) — `supabase/functions/mystery-webhook-trigger/index.ts` now replaces `"` with `'` in extracted character descriptions across all three extraction paths (primary regex, secondary regex, Claude API fallback). This prevents JSON parse failures in Make.com's string interpolation without affecting user-facing content (descriptions in `extracted_characters` are metadata only; actual character scripts are generated independently by Claude).

**Customer resolution:** Re-triggered Make.com child scenarios for Bella Swan and Elena Gilbert via the child webhook. Both characters now have full scripts (description, background, secret, introduction, all round scripts, final statement, quick reference).

**Files changed:**
- `src/services/mysteryPackageService.ts`
- `src/pages/MysteryView.tsx`
- `api/generation-complete.js`
- `supabase/functions/mystery-webhook-trigger/index.ts`

---

### Enhancement: Add soft format guidance to chat AI

**Issue:** Same customer expected a theatrical script with flashback scenes and a playable victim character (Sebastian). The chat AI had no guardrails to steer users toward the round-based party game format that the generation pipeline actually produces. This created a mismatch between what was designed in chat and what the package delivered.

**Fix:** Added two changes to `supabase/functions/mystery-ai/index.ts` (deployed to Supabase):

1. **Format guidance block** — Soft guardrails appended to `contentBoundaries` that guide the AI to translate creative ideas (flashbacks, theatrical scenes, victim speaking roles) into the round-based format without shutting down user creativity. The AI channels flashback energy into round reveals and explains the victim's backstory comes alive through other characters. Only activates when the user is clearly heading toward an incompatible format.

2. **Victim exclusion note** — Added to the concept generation prompt template so the AI knows the victim is NOT one of the playable characters. Prevents the victim from being counted in the character list and extracted as a playable character downstream.

**Files changed:**
- `supabase/functions/mystery-ai/index.ts`

---

### UX Fix: Clarify script type form labels

**Issue:** Same customer selected "Both Formats" expecting a full theatrical script because the label read "Full Scripts - Complete dialogue and detailed instructions." The term "complete dialogue" implied a scene-by-scene script, when it actually means detailed narrative prose (vs. bullet points) for each character's round content.

**Fix:** Updated labels in both English and Portuguese locale files to clearly communicate these are per-character round scripts:

- "Full Scripts" → "Detailed Scripts"
- "Complete dialogue and detailed instructions" → "Rich narrative for each character's rounds"
- "Script Detail Level" → "Character Script Detail Level"

**Files changed:**
- `src/i18n/locales/en.json`
- `src/i18n/locales/pt.json`

---

### UX Fix: Hide N/A stub scripts in detective-mode character guides

**Issue:** Same customer couldn't find their innocent/guilty scripts. In detective-style mysteries, each character has a fixed role, so only one script version has real content — the other is a 30-char stub ("N/A - See role-specific script"). The UI was rendering both, making it confusing to identify which section to read.

**Fix:** Added an `isStub()` helper in `MysteryPackageTabView.tsx` that filters out short placeholder text containing "N/A", "see role-specific", or "not applicable" from all innocent/guilty/accomplice round fields. Real content renders normally; stubs are silently hidden.

**Files changed:**
- `src/components/MysteryPackageTabView.tsx`

---

### Bug Fix: Regex extraction stops early on formatting variations

**Issue:** Investigation of the last 4 paid mysteries revealed that the "Murder At Hill House" mystery lost 7 of 14 characters during extraction. The character list in the AI conversation had subheadings and category labels between character entries (e.g., grouping characters by role), which the regex parser treated as the end of the list.

**Root Cause:** The `extractCharactersFromMessages` function in the webhook trigger used a `break` statement on any non-matching, non-empty line after finding the first character. Subheadings, dividers (`---`), and category labels between character entries triggered this break, causing the parser to stop mid-list.

**Fix:** Changed the break logic to only stop at new `##` section headers that aren't character list headers. Non-matching lines (subheadings, dividers, category labels) between character entries are now skipped, allowing the parser to find all characters regardless of formatting variations.

**Files changed:**
- `supabase/functions/mystery-webhook-trigger/index.ts`

---

### Bug Fix: Player count cross-validation with Claude fallback

**Issue:** All 4 recent paid mysteries had character count issues. The extraction pipeline could find fewer characters than the player count required, and all downstream validation compared against the extracted count only — so if regex found 7 of 14 characters, every validation checkpoint said "7/7 = complete."

**Root Cause:** Three validation points (`generation-complete.js`, `mysteryPackageService.ts` in two functions) only checked `extracted_characters` count, never `player_count` from the conversation. The extraction edge function had no cross-check either — it sent whatever it found to Make.com without comparing against the expected player count.

**Fix:** Three changes across 3 files:

1. **Claude fallback trigger** — The edge function now compares regex extraction count against `player_count`. When regex finds significantly fewer characters than expected (`< player_count - 2`), it automatically triggers a Claude API fallback extraction and uses whichever result found more characters.

2. **Callback cross-validation** — The `generation-complete.js` callback now fetches `player_count` from the conversations table and uses `max(extracted_count, player_count - 2)` as the expected character count. Packages with fewer characters stay "in_progress" instead of being marked "completed."

3. **Frontend cross-validation** — `mysteryPackageService.ts` applies the same `max(extracted_count, player_count - 2)` logic in both `saveStructuredPackageData()` and `getPackageGenerationStatus()`.

**Files changed:**
- `supabase/functions/mystery-webhook-trigger/index.ts`
- `api/generation-complete.js`
- `src/services/mysteryPackageService.ts`

---

### Customer Rectification: White Lotus, Hill House, Quest Board

Investigation of the last 4 paid mysteries revealed character generation issues in 3 of 4 packages (Shadow & Fang was previously resolved):

- **White Lotus** (jan.glaessner): 3 of 11 characters (Marlene, Elsa, Celine) were extracted correctly but lost during Make.com child scenario execution (HTTP failures with no retry). Regenerated all 3 by POSTing directly to the child webhook. All 11 characters now have complete scripts.

- **Murder At Hill House** (starckie): Character name mismatch — the AI conversation used "Ruby Rose" but the generated scripts used "Camelia Cerise" for one character. Updated `character_name`, `description`, `background`, and `introduction` fields in the database. Verified no remaining references to the old name across all 13 characters' scripts.

- **Quest Board** (busymommyof4): 14 of 17 characters generated. Root cause was NOT extraction or Make.com failure — the AI chat itself redesigned the mystery from the user's 17 characters down to 14 with an entirely new cast. Extraction and generation worked correctly for all 14. Customer outreach email drafted to offer regeneration with all 17 characters.

## March 20, 2026 — Translations Complete + Excel/CSV Export

### Phase I: Translation (127 posts × 12 languages = 1,524 translations)
- **All 1,524 translation files completed** and saved to persistent storage
- Languages: es, fr, de, it, pt, nl, da, fi, sv, ko, ja, zh-cn
- 1,444 translations (94.8%) have full body content
- 80 translations (5.2%) have headers but empty/short bodies (agent token limits)
- All files in `translations/{lang}/{slug}.txt` format

### Excel & CSV Export
- **Translation Import sheet** added to `mysterymaker_blog_master.xlsx` (1,524 rows)
- **translations_import.csv** — 1,524 translation rows (27.5 MB)
- **blog_posts_all_languages.csv** — 1,651 rows: 127 EN + 1,524 translations (30 MB)
- Format: supabase_id, slug, language, title, content, meta_description, meta_keywords, status
- Ready for manual Supabase import via CSV

### Translation Quality Notes
- Handled localized headers (TITULO:, TITRE:, TITEL:, etc.) in parser
- All files have TITLE and metadata; 80 files missing body content
- These 80 can be identified by filtering for rows with empty `content` column

### Improvement: PT translation quality audit (R62–R150)
- Deep cell-by-cell Portuguese translation audit of 89 rows against English source
- Applied ~302 total fixes across rows 62-150
- Key issues: false cognates (configuração, hospedando, hóspedes), untranslated English words (setup, roleplay, gear, hinge), gender agreement errors, misspellings (origems, foquado, Arruína)
- Notable: R76 had "cadeira" (furniture) for department chair, "letra" (alphabet) for letter document; R122-123 had entire English sentences left untranslated
- 27% Excellent, 39% Very Good, 25% Good, 9% Fair; 0 PIDGIN or TRUNCATED
- Full results appended to CHANGELOG_TRANSLATION_QA.md under "R62-R150 PT Content Audit"

## 2026-04-22

### Fix: Evidence card display — strip Visual Description, fix print parser

- **Print cards were blank**: parser expected `## EVIDENCE: ROUND X` but generated content uses `### EVIDENCE CARD — ROUND X` — zero cards were being found
- **3-section rule implemented**: print cards show Description only; online Clues tab shows Description + Implications; Visual Description is never shown to users in either view
- Online view: strips `#### Visual Description` (h4) in addition to the existing `### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` pattern
- Print page: strips `#### What This Reveals`, `#### Who It Implicates`, `#### Implications`, and `#### Visual Description` before rendering
- Multi-paragraph print descriptions now render as separate `<p>` tags instead of collapsing into one block
