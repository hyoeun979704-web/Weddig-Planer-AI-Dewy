# 경쟁 갭 해소 + 초개인화 업그레이드 마스터플랜 (260630)

> 목적: 한국 1위 웨딩앱(웨딩북·아이웨딩·웨딩의여신)이 공통으로 미는 **거래·신뢰 레이어**를
> Dewy 에 들이되, **복제가 아니라 Dewy 신호(페르소나 20모드·taste·D-day·예산·지역·진행단계·
> 역할·행동로그)로 한 단계 위로 개인화**해서 차별화한다.
> 근거: `docs/260630_codereview.md`(기업감사) + 경쟁사 3사 심층조사 + 코드 실측(스키마 교차).
> 개인화 깊이 사다리(AGENTS 차원14): ①없음 ②정렬/필터 ③콘텐츠 큐레이션 ④카피/CTA 변형 ⑤생성형 맞춤·추천이유.

## 0. 설계 원칙 (전 기능 공통)

1. **신호 재사용(단일소스)**: `src/lib/weddingPersona.ts`(20모드)·`usePersonaInsights`(D-day·진행%·
   style·persona)·`weddingSettings`(예식일·지역·식장·예산)·`tasteTaxonomy`(MOOD_TAGS)·
   `budget_settings`(category_budgets)·행동로그(찜·견적·문의·주문). 새 신호원 만들지 말 것.
2. **공급 의존 분리**: B2B 인벤토리·운영이 필요한 기능(실시간 홀 예약·박람회·사람 플래너)은
   뒤 Phase 로. 공급 없이 **수요측 데이터만으로 되는 것**(식대·인증배지·가격통계)을 먼저.
3. **빈 신호 폴백**: 개인화 신호가 없을 때 우아한 기본값(빈화면/dead-end 금지).
4. **RLS·큐레이션 게이트**: 모든 노출은 `is_active`·`moderation_status`·owner-scope 준수.
5. **점진 출시**: 각 기능은 피처플래그 뒤 → 데이터 충분 시 ON(taste boost 패턴).

---

## Phase 1 — 저비용·고적합 (스키마 보유, 공급 무관) ⭐ 먼저

### 1-A. 식대 계산기 (#6) — "RSVP → 식대 자동 정산"
경쟁사: 웨딩북 RSVP 식수 Excel. **Dewy 차별화**: 식수에서 끝나지 않고 **내 식장 실단가 ×
예상참석 → 예산 자동연동 + 페르소나별 시나리오**.
- **데이터(보유)**: `invitation_rsvp`(is_attending·companion_count·child_count·meal_preference·side),
  `guest_list_items`(attending_count·side), `place_halls.meal_price`/`min_guarantee`/`max_guarantee`,
  `weddingSettings.wedding_venue_place_id`(내 식장 → 실단가), `budget_settings.category_budgets.meal`.
- **로직**: 예상식수 = max(보증인원, 신랑측+신부측 RSVP 참석 + 동반/자녀 가중). 식대 = 식수 × 단가.
  단가는 ① 내 식장(place_halls.meal_price) 있으면 실값 ② 없으면 지역 평균 폴백.
- **개인화 ④→⑤**: 예산형 페르소나(`budget_analytic`)는 "보증인원 초과분 ₩" 경고·절감 시나리오,
  D-day 가까우면 "최종 인원 확정 D-7" 알림. 신랑/신부 role 별 분담 합산. 빈 신호(RSVP 0건)면
  보증인원 기준 예상치 + "청첩장 보내면 실시간 갱신" 안내.
- **산출물**: 준비도구(`/budget` 또는 `/board` 내) 식대 카드 + 청첩장 RSVP 대시보드 연동.
- **신규 스키마**: 없음(계산은 클라/뷰). 식장 단가 미상 지역평균용 참조표만 lib 상수.
- 난이도: **S** · 위험: 낮음.

### 1-B. 실거래 인증 배지 (#1) — "Dewy 인증 후기"
경쟁사: 웨딩북 방문·계약 리얼후기(14만). **Dewy 차별화**: ERP 없이 **행동로그 기반 소프트 인증**
3단계 + 페르소나 매칭 후기 우선.
- **데이터(보유)**: `place_reviews.is_verified`·`source_type`(필드 존재, 부여로직 없음), 행동로그
  (`quote_requests`/`place_inquiries`/`orders` 의 place_id, `weddingSettings.wedding_venue_place_id`).
- **인증 단계**: ① 문의/견적 이력 있음=`상담 인증` ② 결제/주문 있음=`거래 인증` ③ 내 식장 등록=`계약 인증`.
  작성 시 user×place 행동로그 조회로 자동 배지 부여(서버 RPC, 위변조 방지).
- **개인화 ③→④**: 후기 정렬에 **나와 같은 페르소나/예산대/지역 작성자 후기 우선**("나와 비슷한
  예산형 신부 후기"), taste 겹치는 작성자 가중. 빈 신호면 인증·도움돼요 순.
- **신규 스키마**: `place_reviews.verification_tier`(text: consult/transaction/contract) 컬럼 +
  부여 RPC. (기존 `is_verified` 는 외부수집 후기용으로 유지.)
- 난이도: **M** · 위험: 중(부여로직 정확성·RLS).

### 1-C. 가격 투명성 — 견적가 통계·비교 (#2) — "내 조건 대비 시세 위치"
경쟁사: 아이웨딩 품목별 비교·웨딩의여신 익명 실견적·웨딩북 실시간견적. **Dewy 차별화**:
**내 예산·지역·페르소나 대비 백분위**로 "이 가격이 나에게 비싼가/싼가"를 말해줌(단순 평균 아님).
- **데이터(보유)**: `place_details.avg_total_estimate`·`wedding_count`(미노출), `place_halls.meal_price`,
  `quote_requests`(budget_min/max × category × region — 실수요 분포), `budget_settings`(내 예산).
- **로직**: 지역×카테고리 평균/중앙값/사분위 집계(RPC, 표본 N 표기). 상세페이지·견적폼에 노출.
- **개인화 ④→⑤**: "내 예산(₩X)은 강남 웨딩홀 상위 30%대 — 보증인원 낮추면 중앙값 진입" 식
  **추천이유 카피**. 페르소나(스몰/셀프)면 해당 세그먼트 통계만. 표본<임계면 광역 폴백 + 한계 명시.
- **신규 스키마**: 집계 RPC `get_category_price_stats(region, category)` + 캐시 뷰. (원천 무가공 노출 금지.)
- 난이도: **M** · 위험: 중(표본부족 시 오도 — N 게이트 필수).
- **구현 노트(260630) — 데이터 정직성으로 범위 조정**: 실측 결과 의도 소스가 부재/더러움 →
  `place_details.avg_total_estimate`=**0(완전 비어있음)**, `quote_requests`=**1**, `places.min_price`
  는 **카테고리 내 단위 혼재**(웨딩홀 min_price 가 1인 식대 8.5만 ~ 총액 1,200만 섞임; 1만원
  드레스샵 등 이상치). 표본도 region×category 36버킷만 N≥5. → **개별 업체 실가격 백분위는
  보류**(오추정 위험). 대신 **큐레이션 지역 평균(regionalAverages, 완전·정합) + 내 예산 비교**
  (같은 budget-category 단위=사과-사과)를 상세페이지에 "참고 평균"으로 노출. sdm 은 번들임을
  정직 표기. 구현: `regionalPriceGuide.ts`(+7테스트)·`RegionalPriceGuide.tsx`(상세 BasicTab).
  **이월**: 실거래가 분포/백분위는 가격 데이터 정제·수집(업체 가격 입력 정규화, quote_responses
  가격 누적) 후 재개.

---

## Phase 2 — 기존 인프라 확장 (중간 난이도)

### 2-A. 실시간 채팅 상담 (#4) — quote_messages 라이브챗 업그레이드
경쟁사: 웨딩북·아이웨딩 인앱 실시간 채팅. **Dewy 차별화**: 채팅 시작 시 **페르소나 컨텍스트
카드 자동 첨부**(예식일·지역·예산·취향)로 업체가 즉시 맞춤 답변.
- **데이터(보유)**: `quote_messages`(body·read_at·sender·request_id·place_id — 메시지 테이블 존재,
  현재 비동기). Supabase Realtime 구독으로 라이브 전환.
- **개인화 ③→④**: 첫 메시지에 견적폼 신호(이미 prefill 한 예식월·지역·예산) 요약 카드, 읽음/타이핑
  표시. 미입점 업체는 라이브챗 대신 비교견적 폴백(dead-end 금지).
- **신규 스키마**: 없음(realtime 구독 + typing presence). 알림 연동.
- 난이도: **M** · 위험: 중(실시간 RLS·알림·비용).

### 2-B. 계약 캐시백/리워드 (#5) — "진행단계 연동 리워드"
경쟁사: 웨딩북 10% 캐시백(스펜드 기반). **Dewy 차별화**: 스펜드가 아니라 **준비 진행·미션 완료
연동**(이미 있는 `personaMissions`·진행%)으로 "행동 보상" — 신생앱 유인책 + 리텐션.
- **데이터(보유)**: 하트/포인트(`points`), `personaMissions`, 진행%(usePersonaInsights), 주문/결제.
- **개인화 ④**: 페르소나 미션 완료·계약 인증 시 하트 지급, D-day 구간별 리워드 부스트.
- **신규 스키마**: 리워드 적립 규칙 테이블 or 기존 포인트 트랜잭션 확장. 결제 연동은 Phase 3 펀딩과 합류.
- 난이도: **M** · 위험: 중(부정적립 방지·정산).

### 2-C. 좌석배치 도구 (#7) — "관계 기반 자동 배치 초안"
경쟁사: 대부분 수동 or 미제공. **Dewy 차별화**: `guest_list_items`(side·relationship)로 **자동
배치 초안 생성** 후 드래그 수정 — 처음부터 빈 캔버스 아님.
- **데이터(보유)**: `guest_list_items`(name·side·relationship·attending_count).
- **개인화 ③→⑤**: 관계(가족/친구/회사)·side 로 테이블 군집 자동 제안, 식장 테이블수 입력 시 분배.
- **신규 스키마**: `seating_layouts`(invitation/user scope, JSON 배치) 신규 테이블.
- 난이도: **M~L** · 위험: 중(UX 복잡도).
- **구현 노트(260701) — 데이터 소스 선결로 범위 조정(옵션 B)**: 좌석배치 데이터 소스인
  하객 명단 페이지(`Guests.tsx`)가 **라우팅 안 됨**(orphan) — 사용자가 명단을 만들 화면이
  없어 빈 데이터 위 좌석 도구는 시기상조. → 먼저 `Guests.tsx` 를 `/guests` 로 라우팅 +
  진입점(홈 퀵링크 `HomeQuickLinks`, RSVP 대시보드 "하객 명단에서 관리하기") 추가로 **하객
  명단 관리 접근을 살림**(RSVP→명단 import 루프 완성). 사용자 노출되므로 삭제 confirm 추가.
  **좌석배치(seating_layouts + 드래그 UI)는 명단이 채워진 뒤로 이월.** 구현: App.tsx 라우트·
  HomeQuickLinks·InvitationRsvpDashboard·Guests.tsx(삭제 confirm).
- **구현 노트(260701-b) — 좌석배치 데이터 수집 ① 착수**: 좌석 미리보기는 각 홀 구조가
  필요한데 미수집이었다. 정밀 평면도 대신 **"테이블 수 × 테이블당 좌석" 구조 숫자만** 수집:
  `place_wedding_halls`(파트너 편집 detail 테이블 — place_halls 는 카탈로그)에
  `table_count`·`seats_per_table` 추가 + `upsert_my_listing_detail`/`get_my_listing_detail`
  wedding_hall 분기 확장(tailor_shop 선례 패턴, 전체 CREATE OR REPLACE) + 기업 홀 관리
  폼(`BusinessListingDetailForm`)에 입력칸 2개. 마이그 20260701010000, 라이브 적용.
  DB 라운드트립 실측(upsert→get, 25/10 정상). **좌석배치 UI(②)는 구조·명단 수집 뒤.**

---

## Phase 3 — 신규 결제·공급/운영 의존 (heavy, 합의 후)

### 3-A. 축의금 송금/펀딩 (#8)
경쟁사: 웨딩북 현금펀딩·바른손/다디단 마음전하기(계좌). **Dewy 차별화**: 청첩장 RSVP·하객명단과
연동된 **개인화 감사메시지 + 송금 추적**.
- **데이터**: 결제 인프라(`orders`/`payments`/kakaopay) 재사용. **신규**: `cash_gifts`/`gift_funding`
  테이블 + 정산. 법적(전자금융·에스크로) 검토 필수.
- 난이도: **L** · 위험: 높음(결제·법규).

### 3-B. 실시간 홀 예약/잔여타임 (#3)
경쟁사: 웨딩북 핵심(ERP 설치기반 해자). **Dewy 현실**: 인벤토리 공급원 없음 → **업체가 직접
가능일 입력하는 경량 캘린더**부터(B2B 파트너 화면). 공급 모이면 즉시예약으로 확장.
- **신규 스키마**: `place_availability`(place_id·date·slot·status) + 파트너 입력 UI + 예약 RPC.
- 난이도: **L** · 위험: 높음(공급·노쇼·동시성).

### 3-C. 박람회 연동 · 사람 플래너 매칭
경쟁사: 아이웨딩 전담플래너·웨딩북 혜택. **Dewy 현실**: 운영/제휴 선행. 경량화 = **Dewy 자체
온라인 박람회(상시 혜택 큐레이션)** + 페르소나 매칭 상담 신청 폼부터.
- 난이도: **L** · 위험: 높음(운영).

---

## 실행 순서·관리

| Phase | 기능 | 난이도 | 신규 스키마 | 개인화 목표 | 공급의존 |
|---|---|---|---|---|---|
| 1-A | 식대 계산기 | S | 없음 | ④→⑤ | 무관 |
| 1-B | 인증 배지 | M | tier 컬럼+RPC | ③→④ | 무관 |
| 1-C | 가격 통계·비교 | M | 집계 RPC | ④→⑤ | 무관 |
| 2-A | 라이브챗 | M | 없음 | ③→④ | 무관 |
| 2-B | 진행연동 리워드 | M | 적립규칙 | ④ | 무관 |
| 2-C | 좌석배치 | M~L | seating_layouts | ③→⑤ | 무관 |
| 3-A | 축의금 펀딩 | L | cash_gifts | ④ | 결제/법규 |
| 3-B | 홀 예약 캘린더 | L | place_availability | ② | B2B 공급 |
| 3-C | 박람회·플래너 | L | 신청/혜택 | ④ | 운영 |

- **PR 전략**: Phase 1 의 1-A/1-B/1-C 를 각각 별도 PR(작게·검증가능). Phase 2~3 은 합의 후 착수.
- **DB 변경 게이트(AGENTS)**: 신규 컬럼/테이블/RPC 는 "테이블 선확인 → 마이그 → types.ts 재생성 →
  클라" 순서. RPC 인자↔시그니처 교차확인(PGRST202 회귀 방지).
- **검증**: 각 기능 e2e(데이터 채워 화면 확인) — SQL/타입통과만으로 완료 보고 금지.
- **감사 반영**: 신규 surface 는 `docs/audit-surface-map.md` + 개인화 기회 매트릭스에 추가.

## 검증 한계 (경쟁사 조사)
공식사이트·앱스토어 일부 403 → 검색 스니펫 기반 교차확인. "직거래/실거래가 공개"는 경쟁사도
명시 미확인(마케팅은 "합리적 가격"). 마이리얼웨딩·캐치웨딩·데이트는 현행 앱 존재 미확인 → 제외.
