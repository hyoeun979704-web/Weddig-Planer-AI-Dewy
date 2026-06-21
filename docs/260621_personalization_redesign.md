# 260621 개인화 고도화 — 재설계 (검수용)

> 입력: `260621_persona_simulation.md`(20모드 갭) + `260621_competitor_analysis_2.md`(벤치마크).
> 목적: Dewy를 "세상에서 제일 완벽한 웨딩앱"으로 가는 **개인화 고도화** 설계. **이 문서는 구현 전
> 검수용**이다 — 아래 "검수 결정사항"을 확정해야 착수한다. 임의 구현 없음.

---

## 0. North Star & 전략 한 줄

**"Dewy의 20모드 페르소나 엔진은 경쟁사가 수백억 들여 만드는 cold-start prior를 이미 공짜로
갖고 있다."** 다만 지금은 그게 **'기능'으로만 존재하고 사용자가 체감하지 못한다.** 고도화의 본질은
새 엔진을 만드는 게 아니라, **이 엔진을 (1) 온보딩에서 명시 seed 하고 (2) 모든 surface(홈·AI·체크
리스트·예산·벤더·청첩장·알림)에 일관되게 흘려보내, "이 앱은 내 결혼을 안다"는 체감을 만드는 것**이다.

차별화 2대 베팅: **① 시각 취향 임베딩**(AI 스튜디오·벤더·청첩장을 하나의 취향 벡터로 통합 — 국내
부재) **② "결혼준비 Wrapped" 공유 카드**(카카오 바이럴 신규획득).

---

## 1. 개인화 데이터 아키텍처 (설계의 척추)

현재(분산): `weddingPersona.ts`(20모드) → `PersonaDashboard`·`personaMissions`·`tipCuration`·
`AIPlanner`가 **각자** persona_mode를 읽음. 시각취향·favorite·dwell 같은 행동 신호는 미수집/미활용.

**재설계(단일 흐름):**
```
[입력 신호]                         [프로필 레이어]              [소비 surface]
온보딩 인텐트/스타일 스와이프  ┐
behavioral signals(기존)      ├─►  ① persona_mode (20)     ┐
favorite/저장/dwell(신규)     │    ② visual_taste_vector   ├─► 홈 추천행·AI스튜디오 prior·
예산/날짜/지역/하객수         ┘    ③ progress/phase        │   벤더 %매치·청첩장·체크리스트
                                   ④ couple(공유) 프로필    ┘   재정렬·알림·Wrapped
```
- ①은 이미 있음(보강). ②③④는 신규 — 단, **DB 선확인 게이트**(types.ts) 후 도입.
- 전 surface는 **큐레이션 게이트 + "왜" 라벨 + 0건 숨김 + 품질보상**(§ 가드레일) 공통 적용.

---

## 2. 우선순위 이니셔티브 (개인화 핵심 = I1~I5)

각 항목: **무엇 → 벤치마크 근거 → Dewy 매핑(파일) → 신규 데이터 → 가드레일 → impact/effort/phase.**

### I1. 온보딩 인텐트·스타일 캡처 → 페르소나·취향 seed  [P0 · Phase 1]
- **무엇**: 가입 직후 토스식 one-thing 단계로 (예식일/하객수 → 자동 예산추정 → 지역 → 스타일) +
  **드레스·홀·청첩장 이미지 스와이프(thumbs)**. 결과 = 20모드 1차 분류 + 시각취향 seed + 빈 대시보드 제거.
- **근거**: 토스 One-Thing·역발상 입력 / Stitch Fix StyleFile+Style Shuffle / The Knot Wedding
  Vision / 요즘웨딩 좋아요 분석.
- **Dewy 매핑**: `WeddingInfoSetupModal.tsx`(확장), `weddingPersona.ts`(derivePersonaMode 재사용),
  신규 온보딩 스텝 컴포넌트.
- **신규 데이터**: `user_style_swipes`(image_id, verdict) 또는 기존 신호 테이블 확장.
- **가드레일**: 스킵 가능(강제 금지), 입력은 `safeLocalStorage` draft, 추측 분류 금지.
- **impact 高 / effort 中 / 가장 먼저.**

### I2. AI 스튜디오 페르소나 인지 + 표준 루프  [P0 · Phase 1~2] (Dewy 해자)
- **무엇**: (a) 카드/프리셋을 **페르소나·ceremony로 필터**(persona-sim P0: self/snap/no-wedding/
  groom에게 스드메 헤드라인 제거 — 기존 `shouldHideWeddingCeremony` 확장). (b) **SNOW/EPIK 루프**:
  카메라롤 직접→프리셋→**대량 결과 그리드→variation→저장/공유**, **대기시간=하트 티어**, **테마팩**.
  (c) 결과를 **시각취향 벡터(I4)·벤더매칭·청첩장에 연결**.
- **근거**: SNOW/EPIK·Remini·Midjourney·Canva / Hunliji AIGC. (국내 웨딩앱은 드레스 피팅만 경쟁.)
- **Dewy 매핑**: `AIStudio.tsx`·`StudioBannerCard`·`ConsultingGallery`·`DressFitting`·`HairPreview`,
  `HeartCharge`/`heartPackages`(티어), `useWeddingPersona`.
- **가드레일**: AIStudio 카드 필터는 persona-sim 권고대로 **기존 규칙 확장**(새 콘텐츠 판단 최소).
  크레딧 0이면 실제 충전 경로(placeholder 금지). 얼굴 업로드 동의·자동삭제·PII 로그 금지.
- **impact 高 / effort 中~高.** (a)는 즉시, (b)(c)는 단계.

### I3. 페르소나-큐레이션 홈 추천 행 스택  [P0/P1 · Phase 2]
- **무엇**: 홈을 페르소나+진척 기반 **추천 행 스택**으로 — "너를 위한 업체 / 이번 주 체크 / 비슷한
  커플의 픽 / D-30 할 일". 행 내 정렬 = 페르소나적합 × `partner_rank` × 신선도. dedup+diversity.
- **근거**: Netflix 행 스택·BYW 앵커행 / Zola "favorite 많을수록 학습" / The Knot 24카테고리.
- **Dewy 매핑**: `PersonaDashboard.tsx`(확장), `usePersonaInsights`·`useSmartSuggestions`,
  `usePlaceRecommendations`(큐레이션 재사용).
- **가드레일**: 모든 행 큐레이션 게이트, **0건이면 행 숨김**, "왜 추천" 라벨, 보상=저장/문의.
- **impact 高 / effort 高.**

### I4. 시각 취향 임베딩 (통합 취향 벡터)  [P1 · Phase 3] (차별화 베팅 ①)
- **무엇**: 웨딩 이미지 CLIP 임베딩 평균 → **커플 스타일 벡터**. (1) AI 스튜디오 프롬프트 prior
  자동주입 (2) 벤더 대표이미지 **코사인 매칭 + "% 매치 + 왜 맞는지"** (3) 청첩장 템플릿 매칭.
- **근거**: Pinterest PinSage / Stitch Fix Style Graph / The Knot 시맨틱 "%매치+LLM 이유".
- **Dewy 매핑**: 신규 `pgvector` 컬럼/테이블, `_shared/llm`(이유 생성), `usePlaceRecommendations` 확장.
- **신규 데이터**: pgvector 확장 + place 이미지 임베딩 배치 + favorite 신호. **DB 선확인 필수.**
- **가드레일**: 임베딩 코퍼스는 Dewy 스튜디오 생성물·place 이미지로 구축. 0건 숨김, 큐레이션 게이트.
- **impact 高 / effort 高.** (가장 큰 차별화지만 인프라 필요 — Phase 3.)

### I5. AI 백엔드 페르소나 톤 + 커플 강점 태스크 분배  [P1 · Phase 2]
- **무엇**: (a) AI 플래너 프롬프트에 **페르소나 톤 주입**(persona-sim deferred). (b) **커플 강점
  기반 태스크 분배**(누가 꼼꼼/창의 → 신랑·신부·양가 분배).
- **근거**: persona-sim §AI백엔드 / Zola Split the Decisions(국내 부재).
- **Dewy 매핑**: `supabase/functions/ai-planner/user-data.ts`, `describePersonaForAI`(현재 클라 전용),
  `AIPlanner.tsx`.
- **⚠️ 아키텍처 결정 필요**: `describePersonaForAI`는 `src/lib`(프론트)라 **Deno 엣지에서 import
  불가**. 옵션 (A) 페르소나→톤 맵을 `_shared`로 이전(단일 소스화) (B) 클라가 톤 문자열 주입. → **검수 결정.**
- **impact 中~高 / effort 中.**

## 3. 지원 이니셔티브 (완벽한 웨딩앱 로드맵 — 개인화와 결합)

| # | 이니셔티브 | 벤치마크 | Dewy 매핑 | P/Phase |
|---|---|---|---|---|
| I6 | **예산 actual-spend 3열(예상·실지출·잔금) + 한국 평균 벤치마크 개인화 + 커플 공유 권한** | Bridebook·YNAB·Monarch | `useBudget`·`BudgetAddSheet`·`Budget`·`priceFormat` | P1/2 |
| I7 | **체크리스트 시작일·마감일 2축 + 한국어 자연어 입력 + 페르소나 경로 변형/의존성** | Things·Todoist·Asana | `checklistTemplate`·`Schedule`·`relativeTime` | P1/2 |
| I8 | **카톡 마찰제로 RSVP + 호스트 대시보드 + 미응답 리마인더 + 체크인→감사장** | Partiful·Paperless | `invitation_rsvp`·청첩장 뷰어 | P1/2 |
| I9 | **준비 스트릭(프리즈2) + "결혼준비 Wrapped" 공유 recap** | Duolingo·Spotify·Strava | `useDailyStreak`·신규 recap | P1/2 (차별화 ②) |
| I10 | **신뢰 합성 게이지 + 캐치테이블식 실제 예약 CTA(바텀시트+캘린더)** | 당근·캐치테이블·The Knot | `PlaceDetailLayout`·`InvitationVenueDetail` | P1 (dead-end 해결) |
| I11 | **콘텐츠→커머스 사진 태그 + 무드보드 다중 컬렉션** | 오늘의집·Zola | `Gallery`·`Favorites`·`useCoupleFavorites` | P2 |
| I12 | **"결혼 이후" 확장(축의대·신혼 쇼핑·신혼 커뮤니티)** | 메링·푸딩 | 신규(LTV) | P2/3 |
| I13 | **스토어 번들 원클릭 + UGC 사진리뷰 + slide-over 카트** | Amazon·Shopify | `Store`·`Cart`·`Checkout` | P2 |
| I14 | **커플 Brand Kit + Magic Resize(청첩장→다포맷)** | Canva | 청첩장 빌더(Konva) | P2 |

(I10·I8은 개인화는 아니지만 dead-end·전환의 최대 레버리지라 우선 포함.)

---

## 4. 단계별 로드맵 (제안)

- **Phase 1 — "체감되는 개인화의 시작"**: I1(온보딩 seed) + I2(a)(AIStudio 페르소나 필터 — persona-sim
  P0) + I5(a)(AI 톤 주입). → "앱이 내 결혼을 안다" 첫인상 + 가장 가벼운 갭 해소.
- **Phase 2 — "일관된 개인화 + 전환"**: I3(홈 추천행) + I2(b)(스튜디오 루프) + I6/I7(예산·체크리스트)
  + I8/I10(RSVP·예약 CTA) + I9(스트릭/Wrapped).
- **Phase 3 — "차별화 해자"**: I4(시각취향 임베딩) + I12(결혼 이후) + I13/I14.

각 Phase는 **별도 PR 단위**로 쪼개고, 머지·배포·앱 재빌드까지 확인(반영 규칙).

---

## 5. 검수 결정사항 (착수 전 확인 — 가장 중요)

1. **로드맵 우선순위**: Phase 1 범위(I1+I2a+I5a)로 먼저 시작하는 게 맞나? 아니면 다른 조합?
2. **차별화 베팅 순서**: I4(시각취향 임베딩, infra 큼)와 I9(Wrapped 공유, 바이럴) 중 **무엇을 먼저**?
3. **I5 아키텍처**: 페르소나 톤을 (A) `_shared`로 단일소스 이전 vs (B) 클라 주입 — 어느 쪽?
4. **AI 스튜디오 페르소나 필터(I2a) 강도**: no-ceremony/groom에 스드메 **숨김만**(보수) vs **대체
   카드까지 큐레이션**(적극)?
5. **신규 데이터 인프라 승인**: pgvector(I4)·favorite/dwell/streak 테이블 신설 — 진행해도 되나?
   (DB 선확인 게이트 후 마이그레이션)
6. **"결혼 이후" 확장(I12) 사업 범위**: 축의대(결제/정산) 포함? PG·세무 부담 고려.
7. **각 이니셔티브를 어느 깊이로 문서화**할지 — 확정된 것부터 상세 구현 설계서를 따로 뺄까?

## 6. 리스크 / 원칙
- **"기능 추가"가 아니라 "체감 분기"**: 페르소나가 화면에서 다르게 보여야 가치. 백엔드만 바꾸면 무의미.
- **dead-end·placeholder 금지**: 모든 CTA·좋아요·추천은 실제 동작/신호 업데이트까지. 0건 섹션 숨김.
- **검증**: 평균/벤치마크/Wrapped 수치는 실 DB client query로 교차검증(추측·빈카드 금지). iOS Safari
  저장소·draft. label vs value·만원 단위·enum.
- **반영까지**: 각 Phase PR을 origin/main 머지 + 웹 배포 + 앱 재빌드까지(머지 전엔 미반영).
