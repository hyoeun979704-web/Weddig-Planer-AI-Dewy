# 260621 경쟁·벤치마크 분석 v2 — 기능별 best-in-class (웨딩 + 비웨딩)

> 목적: "세상에서 제일 완벽한 웨딩앱". Dewy 기능 섹션별로 ① 국내 웨딩앱 ② 글로벌 웨딩앱
> ③ 해당 기능을 가장 잘하는 비(非)웨딩 앱을 조사해 "적용하면 좋을 것"을 정리한다.
> 이 문서는 `260621_personalization_redesign.md`(재설계)의 입력이다.
>
> **방법/한계**: 7개 멀티에이전트 공개 자료 리서치(앱스토어·공식·언론·UX 블로그). **인앱 화면
> 직접 캡처는 불가**(로그인·모바일 제약) — 다수 1차 도메인이 WebFetch 403이라 WebSearch 요약 +
> 접근 가능한 2차 분석 기반. 모든 주장에 출처 URL. 미교차검증은 `[미검증]`. 실기기 워크스루로
> 사후 확인 권장.

---

## 0. 시장 진실 (전체 조사에서 수렴한 핵심)

1. **개인화의 시장 표준 = "예산+취향 입력 → AI 자동 설계/타임라인"** — 메링·푸딩·요즘웨딩·웨딩북
   (국내), Bridebook·The Knot·Zola(글로벌) 모두 수렴. 단 **대부분 1회성 온보딩 입력**이고 지속
   학습형 프로필이 아니다. → Dewy의 **20모드 페르소나 레지스트리**는 더 깊은 세그먼트지만,
   "기능"이 아니라 **체감되는 UX 분기**로 보여줘야 가치가 된다.
2. **이미지 취향 → 벤더 자동 매칭이 글로벌 표준이 됨** — The Knot/Zola "Make it Yours"(영감 사진
   favorite → AI가 스타일·지역으로 벤더 추천), The Knot은 **벡터 임베딩 + "% 매치 점수 + LLM
   '왜 맞는지'"**까지. 국내엔 거의 없음(요즘웨딩의 '좋아요 스타일 분석'이 가장 근접).
3. **AI 이미지 스튜디오를 코어로 가진 웨딩 슈퍼앱은 없다** — 국내외 모두 기껏해야 **드레스 가상
   피팅**(웨딩북 WeddingFit·웨딩핏·Hunliji AI試纱). Dewy의 광범위 AI 스튜디오(드레스·헤어·메이크업·
   컨설팅)는 **가장 명확한 해자**.
4. **대화형 AI가 ChatGPT 안으로 나가는 중** — The Knot(2026.2 "업계 최초 ChatGPT 앱")·Bridebook
   (ChatGPT 내 venue 검색). 웨딩북은 **실시간 예약가능 슬롯 반영 NL 벤더검색, 상담→방문예약 전환
   20~25%**.
5. **"결혼 이후"로 LTV 확장이 신흥 전장** — 메링·푸딩의 **축의금 디지털 장부·신혼 쇼핑 개인화·신혼
   커뮤니티**. Dewy가 비어있는 구간(리텐션 후행).
6. **리텐션 공통 후크 = 포인트→현금/잔금 결제** (요즘웨딩 1만P·마웨프 프렌즈머니·메마웨 캐시백·
   웨딩북 캐시백). 단 **placeholder가 아니라 실제 결제 경로**까지 끝나야 함.
7. **공급 측 해자 = B2B ERP 락인**(웨딩북Biz: 수도권 홀 ~40%·드레스샵 ~80%). 단기 모방 불가 →
   Dewy는 **AI 스튜디오·페르소나**로 비대칭 경쟁.
8. **신뢰·전환은 "시각화"가 좌우** — 당근 매너온도(체온계 게이지), 무신사 "나와 비슷한 체형 후기",
   The Knot "% 매치 + 이유". Dewy의 별점 하나보다 **합성 신뢰지표 + 이유 라벨**이 고가 결정에 강하다.

---

## 1. 온보딩 · 페르소나 · 홈 대시보드

- **국내 웨딩**: 요즘웨딩 = "예식일만 입력 → 맞춤 계획표 + **좋아요 스타일 분석으로 취향 파악** +
  체형·스타일 드레스 큐레이션"([App Store](https://apps.apple.com/kr/app/id6739044980)). 메링/푸딩 =
  예산+취향 입력 → AI 자동설계. 대부분 **1회성**.
- **글로벌 웨딩**: The Knot **Wedding Vision**(4갤러리 이미지 평가 → 1·2차 스타일 텀 + 이상적 베뉴
  타입)([blog](https://www.theknotww.com/blog/b-technology_and_innovation/personalized-vendor-recommendations-with-semantic-search-on-the-knot/)).
  Zola = 체크리스트가 첫 진입 시 **가이드 수준·문화/종교 전통 여부**로 self-segment([app](https://www.zola.com/wedding-planning/app)).
  Bridebook = 날짜+예산+postcode → 추천([promesse](https://promesse.uk/best-wedding-planner-apps-uk-2025/)).
- **비웨딩 gold-standard**:
  - **토스 "One Page–One Thing"** + 역발상 입력순서(은행 대신 계좌번호 먼저)([Toss Tech](https://toss.tech/article/toss-money-transfer-bank-recommendation), [disquiet](https://disquiet.io/@rafa/makerlog/%ED%86%A0%EC%8A%A4%EC%9D%98-ux-%EC%B2%A0%ED%95%99-one-page-one-thing)).
  - **Stitch Fix StyleFile**(추천 전 ~90 데이터포인트 구조화 캡처) + **Style Shuffle**(이미지 thumbs로 시각취향)([Style Shuffle](https://newsroom.stitchfix.com/blog/10-billion-interactions-and-counting-on-style-shuffle-the-data-powering-your-personalized-shopping-experience/)).
  - **Netflix 페르소나-큐레이션 행 스택**(dedup+diversity)([TechBlog](https://netflixtechblog.com/artwork-personalization-c589f074ad76)).
- **Dewy 적용 후보**: (a) 토스식 one-thing 온보딩으로 페르소나·예산·지역 입력을 단계 1결정으로
  분할 + 역발상(예식일/하객수 먼저 → 예산 자동추정). (b) **온보딩 스타일 스와이프**(드레스·홀·청첩장
  이미지 thumbs) → 20모드 페르소나 cold-start seed + 시각취향 벡터. (c) 홈을 **페르소나+진척 기반
  추천 행 스택**으로(현 `PersonaDashboard` 확장).

## 2. AI 플래너 (대화형)

- **국내**: 웨딩북 AI플래너(OpenAI+10년 데이터, 실시간 슬롯 반영 NL 벤더검색, 상담→방문 20~25%
  전환)([얼루어](https://www.allurekorea.com/2026/05/11/이제는-결혼도-ai-웨딩-시대)). 푸딩/메링 = 취향+예산+일정 → AI 타임라인 자동생성.
- **글로벌**: The Knot ChatGPT 앱(2026.2)·Bridebook ChatGPT venue 검색. **Zola "Split the
  Decisions GPT"** — 커플 각자 강점 평가 → **태스크를 두 사람에게 분배**(성별편향 제거 훈련)([Businesswire](https://www.businesswire.com/news/home/20240403905368/en/Zola-Expands-into-Emerging-Technology-with-Launch-of-Split-the-Decisions-GPT)).
- **비웨딩**: (대화형은 §0 트렌드 참조) — 핵심은 **자연어 → 실행가능 추천 + LLM 이유 설명**.
- **Dewy 적용 후보**: (a) 기존 AI 플래너에 **describePersonaForAI 톤 주입**(persona sim deferred)
  + 추천 시 **큐레이션 게이트 + "왜 추천하는지" 라벨**. (b) **커플 강점 기반 태스크 분배**(Zola) —
  한국은 양가 분담까지 확장 여지, 페르소나 엔진과 시너지, 국내 부재 기능.

## 3. AI 스튜디오 (이미지 생성) — Dewy 해자

- **국내**: 웨딩북 WeddingFit·웨딩핏(디엘토) = 사진 1장 → 체형 맞춤 드레스 피팅 이미지 + 스타일보드.
  **드레스 단일 use-case만 경쟁**.
- **글로벌**: Hunliji AIGC가 가장 앞섬 — AI試纱(30초 가운 试穿)·魔镜(25초 보정)·8장 AI 포트레이트([sohu](https://www.sohu.com/a/890230499_121956424)).
- **비웨딩 gold-standard**: **SNOW/EPIK**(소수 업로드→**대량 결과 30~60장**→공유, **대기시간=가격
  티어** 5,500/8,800원, 테마팩 바이럴)([디지털투데이](https://www.digitaltoday.co.kr/news/articleView.html?idxno=490930)). **Remini**(카메라롤 직접 입력=업로드 단계 제거).
  **Midjourney**(결과 그리드 variation/remix 강도, 크레딧=GPU시간). **Canva**(실시간 크레딧 트래커).
- **Dewy 적용 후보**: (a) 플로우 표준화 — **카메라롤 직접 → 웨딩 프리셋 → 결과 그리드 → variation →
  저장/공유**. 결과를 1~2장이 아니라 **풍성하게**. (b) **대기시간 = 하트 티어**(`HeartCharge` 결합).
  (c) **테마팩**(야외웨딩룩·한복화보·신혼여행 스냅) + 공유 시 워터마크·리퍼럴. (d) 크레딧 상시표시 +
  0이면 실제 충전 경로(placeholder 금지). (e) 스튜디오 결과를 **§1 시각취향 벡터·§5 벤더매칭·청첩장에 연결**.

## 4. 스케줄 · 체크리스트

- **국내/글로벌 웨딩**: D-day 역산 체크리스트(요즘웨딩·Bridebook·The Knot·WeddingWire 공통).
  Bridebook = 날짜→타임라인 자동, 체크리스트 % 진척.
- **비웨딩 gold-standard**: **Things 3**(시작일 vs 마감일 분리 + 자연어 날짜파서 + delight)([Cultured Code](https://culturedcode.com/things/blog/2017/07/things-3-1-repeating-to-dos-date-parsing/)).
  **Todoist**(자연어 1줄 + 2가지 반복 모드). **Asana/TeamGantt**(마일스톤+의존성 타임라인).
- **Dewy 적용 후보**: (a) **시작일(노출)·마감일(꼭 이때까지) 2축**으로 "오늘 할 일"이 과하지 않게.
  (b) 한국어 자연어 입력("다음 주 토요일 본식촬영", "매달 15일 잔금"). (c) 예식일 anchor **의존성
  타임라인**(가봉→피팅→본식 깨지면 경고). (d) 페르소나별 경로 변형(국제=비자/공증, 스몰=대형항목 제거).

## 5. 예산 — Dewy 핵심 가치

- **국내**: 푸딩 자동 예산 계산·예상 vs 실제 비교. 대부분 단순 트래커.
- **글로벌**: **Bridebook = actual-spend 엔진**(예상/실지출 2열 + **"수천 커플 실제 지출" + 게스트수/지역
  기반 카테고리 배분**)([budget](https://bridebook.com/uk/wedding-planning-tools/budget)).
  Zola Wedding Cost Index(지역 벤치마크). The Knot "지역 평균 비용".
- **비웨딩 gold-standard**: **YNAB**(zero-based + **True Expenses 미래비용 분할적립**)([method](https://www.ynab.com/ynab-method)).
  **Monarch**(좌석당 무과금 **공유 예산 + 역할 권한**). **Copilot**(AI 자동분류).
- **Dewy 적용 후보**: (a) 항목별 **예상가·실지출·잔금/완납 3열**. (b) **한국 평균 벤치마크 개인화**
  (게스트수·지역·홀타입 → "또래 평균 대비 ±%") — Dewy `places` 실거래 데이터가 경쟁우위. (c) YNAB
  True Expenses → **잔금 분할 적립 알림**. (d) **커플 공유 예산 + 양가 역할 권한**(한국 분담 문화 적합).
  주의: 만원 단위·label vs value, 평균은 실 DB 집계 교차검증(추측 금지).

## 6. 업체 발견 · 추천 · 상세 · 예약

- **국내**: 웨딩북 즉시예약·잔여타임·14만 후기. 아이웨딩 정찰제 패키지·실비공개. 요즘웨딩 취향 큐레이션.
- **글로벌**: The Knot **벡터 임베딩 + "% 매치 + LLM 왜" + 24카테고리**, "Your Vendors" CRM 허브.
  Zola **유료 우선 아닌 organic 랭킹 + "Best of Zola"(후기+90% 응답률 게이트)**. (둘 다 유료 티어
  반면교사: 벤더 신뢰 불만 공개 존재.)
- **비웨딩 gold-standard**: **캐치테이블**(단일 CTA 바텀시트 + **캘린더 예약 플로우** + 점수별 후기
  분포 + 원격 웨이팅)([waiting](https://app.catchtable.co.kr/ct/exhibition/240325_waiting2)). **배민**(인기점수
  정렬 + "다시 주문"). **무신사**("나와 비슷한 체형 후기" + 항목형 후기). **당근**(매너온도 신뢰 게이지).
- **Dewy 적용 후보**: (a) **캐치테이블식 단일 CTA + 실제 예약/문의 캘린더** → Dewy의 dead-end
  CTA 약점 정면 해결(상담 가능일→시간대→하객규모→확정). (b) The Knot식 **"% 매치 + 왜 맞는지"**를
  `partner_rank` 큐레이션 위에 + AI 리뷰 요약. (c) 무신사식 **"나와 비슷한 예신 후기"**(체형·예산·홀타입).
  (d) 당근식 **합성 신뢰 게이지**(응답률·예약완료율·실혼후기 검증). (e) "다시 문의 이어가기" 재방문 숏컷.

## 7. 커뮤니티 · 인플루언서 · 콘텐츠/영감

- **국내**: 웨딩북 커뮤니티(월 신규 8천글). 웨딩의여신 **익명 견적 공유**(가격 비대칭 해소). 마이웨딩
  프렌즈 화보 피드. 메이크마이웨딩 **사진→업체 태그**.
- **글로벌**: The Knot/WeddingWire/Zola **Real Weddings 갤러리**(setting/style/color 필터, 모든
  사진이 실 벤더 링크, **favorite 많을수록 피드 학습**). WeddingWire 활성 포럼.
- **비웨딩 gold-standard**: **오늘의집**(콘텐츠→커머스 **"이 사진 속 상품" 파란 (+)태그** + **다중
  폴더 스크랩북**)([advices](https://ohou.se/advices/10621)). **당근 동네생활**(하이퍼로컬 + 감정 리액션).
  **Discord/Reddit**(JTBD 채널구조 + 반복 의식 + 점진적 권한 모더레이션).
- **Dewy 적용 후보**: (a) Gallery/ConsultingGallery 실웨딩 사진에 **"이 사진 속 업체/상품" 태그** →
  업체 상세·드레스·Deals 직행. (b) Favorites를 **무드보드형 다중 컬렉션**(커플 공유 `useCoupleFavorites`).
  (c) 커뮤니티를 **페르소나·준비단계 JTBD 카테고리 + 지역 라운지**("○○구 예신") + 반복 의식. (d) 익명
  견적 공유 보드(무료 유입 후크). 모두 **moderation_status 게이트** 준수.

## 8. 모바일 청첩장 · RSVP

- **국내**: 웨딩북/메링 **평생 무료 무제한**. 모이티/씬쿵/데어무드 = 미감/무드 템플릿 경쟁,
  데어무드 **모청스냅**(QR로 하객 사진→드라이브 자동수집). 푸딩 **온라인 축의대**(축의금 송금+자동 장부).
- **글로벌**: Joy 600+ 템플릿 + **웹사이트와 동일 스타일 앱 자동매칭** + 0수수료 현금펀드. Zola
  **200+ 청첩장↔웹 정확 매칭 스위트**. Hunliji 영상 电子请柬 + 收礼金.
- **비웨딩 gold-standard**: **Partiful**(전화번호만 RSVP, 앱설치 불필요, **미응답자에게만 리마인더**,
  참석자 소셜증명, Text Blast)([reminders](https://help.partiful.com/hc/en-us/articles/24470120681115-What-event-reminders-do-you-send)).
  **Paperless Post**(호스트 대시보드: 열람/응답 색상추적, co-host, 게스트 질문, **체크인→감사장 대상**).
  **Canva**(Brand Kit + Magic Resize).
- **Dewy 적용 후보**: (a) **카톡 링크 1개 마찰제로 RSVP**(로그인 없이 참석·식권·동행수) + **미응답자
  리마인더 + 참석 소셜증명**. (b) **신랑신부 호스트 대시보드**(질문·집계·양가 co-host, 체크인→감사장
  자동 대상). (c) **커플 Brand Kit**(메인색·폰트·대표사진을 청첩장·썸네일·감사장·SNS에 일괄) +
  Magic Resize(청첩장→카톡/인스타 9:16). (d) **AI 스튜디오 결과를 청첩장에 자동 연결**(§3 해자 활용).
  주의: iOS Safari localStorage throw·draft 유실 → `safeLocalStorage`/`formDraft`.

## 9. 커머스(스토어) · 딜/쿠폰 · 포인트/하트 · 프리미엄 · 게이미피케이션 · 알림 · 리퍼럴

- **국내**: 포인트→현금/잔금(요즘웨딩·마웨프·메마웨·웨딩북 캐시백). 메링 신혼 쇼핑 AI 개인화.
- **글로벌**: Joy/Zola/The Knot 0수수료 현금펀드 레지스트리.
- **비웨딩 gold-standard**:
  - 커머스: **Amazon FBT**(함께구매 원클릭, 매출 35%+) + **Shopify**(UGC 사진리뷰 +161% 전환,
    slide-over 카트, 무료배송 진척바)([PDP](https://www.shopify.com/blog/what-is-pdp-in-ecommerce)).
  - 게이미피케이션: **Duolingo**(손실회피 스트릭 + 프리즈 2개 한도 + 리그) + **Finch**(셀프케어
    외재화·약속 메커닉·위젯) + **Spotify Wrapped/Strava**(9:16 세로 슬라이드 공유 recap)([StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo)).
  - 리워드/알림: **토스 만보기**(걸음 스트릭→포인트, 광고 재원) + 행운퀴즈. **Duolingo** 최적시각·
    최근성 페널티 알림.
- **Dewy 적용 후보**: (a) **준비 스트릭(프리즈 2개) + "결혼준비 Wrapped" 공유 recap**(D-100/30/7 +
  결혼후 Final, 9:16, 예약수·아낀금액·완료미션·함께한 일수 → 카톡/인스타, **0건이면 슬라이드 숨김**,
  실 budget/checklist를 client query로 검증). (b) 스토어 **"함께 준비" 번들 원클릭 + UGC 사진리뷰 +
  slide-over 카트**. (c) 가입 즉시 포인트 + 활동적립 → **실제 결제 경로**(placeholder 금지). (d)
  딜/쿠폰 발견단계 전면화 + 인기점수 정렬. (e) 마일스톤·최적시각 알림. **리그(주간경쟁)은 보류**
  (웨딩 1회성·기간짧음 → 매칭풀 부족, 개인 milestone 권장).

---

## 10. 전 항목 공통 가드레일 (AGENTS.md 정합 — 구현 시 필수)
- **추천/관련 섹션 큐레이션 게이트**: `is_active`·`moderation_status` 승인 + `partner_rank` 우선 +
  현재항목 제외 + 다양성. 기존 `usePlaceRecommendations` 재사용. **0건이면 섹션 숨김**(dead-end 방지).
- **보상은 품질 인게이지먼트로**: bandit/랭커/좋아요는 raw 탭이 아니라 **저장·문의완료**로(anti-clickbait
  + placeholder CTA 금지). 좋아요는 실제 신호/벡터 업데이트까지 연결.
- **DB 선확인**: 임베딩(pgvector)·favorite·dwell·streak 테이블 신규 전 `types.ts` 존재 확인.
- **iOS/사파리(웹)**: dwell·피드·draft는 탭 폐기 유실 → `safeLocalStorage`/`formDraft`. 공유 카드는
  실데이터 e2e 캡처(만원 단위·enum).

## 출처
각 섹션 인라인 링크 참조. 전체 리서치 출처(웨딩북·요즘웨딩·아이웨딩·메링·푸딩·웨딩의여신·웨딩핏·
오딩·신부야·모이티·마이웨딩프렌즈·메이크마이웨딩 / Zola·The Knot·Joy·Bridebook·Hitched·WeddingWire·
Hunliji·WedMeGood / Netflix·Spotify·Pinterest·TikTok·Duolingo·Stitch Fix·Amazon / 오늘의집·토스·당근·
배민·무신사·캐치테이블·SNOW·EPIK / Things·Todoist·Asana·YNAB·Monarch·Midjourney·Remini·Canva·
Partiful·Paperless Post·Discord·Reddit·Finch·Shopify)는 각 서브에이전트 리포트에 URL 단위로 기록됨.
