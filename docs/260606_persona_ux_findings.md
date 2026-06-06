# 260606 페르소나 UX 점검 (현재 코드 기준)

> 20모드 페르소나 레지스트리(`src/lib/weddingPersona.ts`)가 홈/AI플래너엔 소비되지만
> **하위 surface(Schedule·Budget·MyPage·Premium)는 여전히 wedding_style 3-way(general/
> small/self)로만 분기**해, 같은 사용자가 홈과 다른 화면에서 모순된 경험을 한다.
> 모든 항목은 실제 컴포넌트 코드로 확인. 대부분 **표시 라벨만 분기**(value/검색/분류 키워드
> 불변)라 회귀 위험 낮음 — 신기능이 아니라 이미 만든 persona_mode 를 하위 surface 가
> 소비하게 굳히는 작업.

## TL;DR — 가장 큰 횡단 갭 3가지
1. **`shouldHideWeddingCeremony`(snap_only/no_wedding_travel)가 PersonaDashboard 에서만
   소비**(`weddingPersona.ts:335`, `PersonaDashboard.tsx:152`). Schedule·Budget·MyPage
   DdayCard·Premium 은 여전히 "결혼식까지 D-Day", 본식 SDME 타임라인, 본식 PDF 노출.
2. **하위 surface 큐레이션이 persona_mode 무시, wedding_style 3-way 분기.**
   RecommendedSection·AIStudio·Premium·Schedule 이 hotel/regional/remarriage/snap_only/
   international 등 13개 모드를 무시 → "내 결혼식 같지 않다".
3. **미션 일부가 라우트/콘텐츠와 어긋남.** snap_only 미션이 웨딩 스튜디오 목록으로,
   다수 성향 모드에 PERSONA_SPECIFIC 미션 부재 → standard 폴백.

---

## 우선순위 백로그 (컨셉정합 × 1인운영비용)

### P1 — 횡단 모순 (❌ high), 동일 helper 재사용으로 저비용
- [ ] **Schedule 페르소나 분기 전무** — `Schedule.tsx:217-235` "결혼식까지/결혼식 날짜",
      타임라인 phase `schedule.ts:30-78` "웨딩홀&스드메 계약"·"드레스 최종 피팅" 하드코딩.
      홈에선 "촬영 당일"인 사용자가 여기선 본식 5단계. → `shouldHideWeddingCeremony` 시
      D-day 라벨·타임라인 카피를 촬영/노웨딩 버전으로(PersonaDashboard buildLabel 재사용).
- [ ] **Premium 9종 PDF 전부 본식 중심** — `Premium.tsx:31-49`(본식 타임라인·가방순이·
      축의대·사회자·하객). snap_only/no_wedding_travel/self_no_ceremony 엔 가치 0인데
      동일 노출·결제 유도. → hideCeremony 페르소나에 featureGroups 필터 + 대체 가치.
- [ ] **MyPage DdayCard 가 hideCeremony 무시** — `DdayCard.tsx:30-72,89` "결혼식 날짜를
      설정"/"D-Day"만(personaMode prop 미수신). → personaMode 전달 후 동일 라벨 분기.
- [ ] **Schedule D-day 프리미엄 배너 본식 문구** — `Schedule.tsx:103-110`. hideCeremony 는
      `getDDayBanner()` null 또는 별도 배너 세트.

### P2 — 라벨/카피 분기 (⚠️ medium)
- [ ] **Budget D-day·공유텍스트 본식 고정** — `Budget.tsx:409` "결혼식까지 D-{days}일",
      `271` "우리 결혼 예산". → persona_mode 읽어 "촬영까지"/"준비까지"로(value 불변).
- [ ] **AIPlanner 성향 모드 quickQuestions 부재** — `AIPlanner.tsx:130` 맵에 designer_late/
      budget_analytic/first_timer/(regional 부분) 없음 → `buildQuickQuestions(style)` 폴백,
      헤더 칩과 카드가 어긋남. → 해당 키 엔트리 추가.
- [ ] **Community 자동 스타일 필터·empty state 가 3-way** — `Community.tsx:157-175,71-88`.
      재혼/임신/해외/지방(보통 general)은 "일반 결혼식 글 필터" 토스트 + 자기 카테고리 칩은
      수동. → persona_mode 비표준이면 해당 카테고리 칩을 selectedCategory 초기값으로.
- [ ] **snap_only 미션이 웨딩 스튜디오로** — `personaMissions.ts:290-305` "스냅 작가
      둘러보기"→`/studios`(스드메 스튜디오 목록). → 스냅 전용 목적지 없으면 `/ai-planner`
      (스냅 콘셉트 프롬프트) 또는 studios 에 스냅 필터 파라미터.

### P3 — 낮음 / 콘텐츠 보강
- [ ] AIStudio 정적(페르소나 무관) — `AIStudio.tsx:19-74`. snap_only/self_no_ceremony 에
      청첩장 카드 순서 하향/라벨 조정(우선순위 낮음).
- [ ] 홈 하위 섹션(InvitationTemplateSection·식 카테고리 그리드)을 hideCeremony 시 숨김 —
      `TabContent.tsx:31-47`.
- [ ] pregnancy 외 성향 모드(designer_late/budget_analytic/first_timer/
      remarriage_with_children) PERSONA_SPECIFIC 미션 부재 → standard 폴백. 최소 1개씩 추가.

## 잘 돼 있는 것(확인, 조치 불필요)
- AI Planner 페르소나별 greeting+quickQuestions 분기(standard 계열) — `AIPlanner.tsx:130-257`.
- Budget single_household 분담/파트너 카드 숨김 — `Budget.tsx:81-84,613-668`.
- Community 페르소나 카테고리 칩 실제 작성 가능(dead chip 아님) — `CommunityWrite.tsx`.
- 기존 `docs/persona-ux-review-v2.md` 의 "P7/P9/P10/P17/P20 부재" 주장은 레지스트리 구현
  이전 stale 스냅샷 — 현재 20모드 존재.

## 구현 메모
- 거의 전부 **표시 라벨만 분기**. value/검색 키워드/분류는 불변 → 회귀 위험 낮음.
- 공통화: `weddingPersona.ts` 에 `personaCeremonyNoun(mode)`("결혼식/촬영/준비")·
  `personaDdayLabel(mode, days)` 헬퍼를 두고 PersonaDashboard·Schedule·Budget·DdayCard 가
  공유하면 드리프트 차단(표준 페르소나는 기존 문자열과 byte-identical 유지가 필수).
- **시각 검증 필요**: 페르소나별 실제 화면 walkthrough 로 카피/노출을 눈으로 확인 후 머지
  권장(자동 머지보다 사람 눈). 그래서 본 PR 은 점검 리포트(문서)로 제출, 코드 변경은
  위 백로그를 승인/우선순위 확정 후 진행.
