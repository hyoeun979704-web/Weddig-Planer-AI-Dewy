# PR #514 감사 — 경쟁 갭 해소 Phase 1-2 + 홀구조 수집 (260701)

> 범위: 이 세션이 PR #514에 쌓은 diff(`git diff origin/main...HEAD`, ~2025줄/45파일 —
> 신규 7기능 + 세션 초반 파트너 감사 수정 + 마이그레이션 3건 + RPC 3개). **레포 전 surface
> 전체감사가 아니라 이 diff 대상 14차원 정밀 감사**(주간 전체감사는 별도).
> 방법: 병렬 리뷰 서브에이전트 3(보안·DB / 정확성·dead-end / iOS·a11y·개인화) + 운영자
> DB ground-truth 교차(RLS 정책·트리거·멱등 실측).

## TL;DR
- **P0 0 · P1 1건(수정 완료) · P2 다수(명확한 것 수정, 개인화 심화는 이월).**
- 보안/인가/멱등/PGRST 정합 **무결**(라이브 DB 실측): 신규 RPC·트리거가 전부 auth.uid()
  본인 데이터만, 교차 사용자·권한상승·이중지급 경로 0. 클라가 verification_tier·하트 위조 불가.
- 파트너 감사 수정(loadError 재시도·게이지 단일화·events count·min_price NaN 가드)은 모두
  **실버그 정확 교정 + 회귀 0**.

## 영역별

### 1. 보안·인가·DB (✅ 무결 — 라이브 실측)
- **인가**: `check_planning_milestones`·`set_review_verification`·`upsert/get_my_listing_detail`
  전부 `auth.uid()` 본인 스코프. planning 리워드는 남의 진행으로 적립 불가, 인증 트리거는
  `NEW.user_id` 본인 로그만 읽고 `verification_tier` 를 무조건 서버 세팅(클라 위조 무효).
- **멱등/부정적립**: partial unique index `heart_tx_planning_once(reason,ref_id=user)` + EXISTS
  가드 = referral 검증 패턴 그대로. 동시성 race 시 2번째 INSERT 가 인덱스로 abort → 이중지급 0.
- **place_reviews INSERT 정책 실측**: `place_reviews_insert_own WITH CHECK (auth.uid()=user_id)`
  확인 → user_id 위조 불가라 인증배지 무결성 성립(정책이 마이그에 없던 드리프트일 뿐 라이브 정상).
- **PGRST202**: `upsert/get_my_listing_detail` 재정의가 **10개 카테고리 분기 전부 보존**, wedding_hall
  에만 table_count·seats_per_table 추가(INSERT·ON CONFLICT·get SELECT 3곳 일관). 인자 불일치 0.
- **트리거 안전**: `set_review_verification`(BEFORE INSERT) ↔ `trg_lock_place_review_body`(BEFORE
  UPDATE) 이벤트 disjoint. `SECURITY DEFINER`+search_path 고정 + `REVOKE EXECUTE`(트리거는 권한
  무관 동작) — advisor surface 제거.

### 2. 정확성·견고성 — **P1 수정**
- **[P1 적용] `usePlanningRewards` 재방문 오탐 토스트**: `granted` 가 react-query 캐시(staleTime
  60s)로 재생되는데 `toastedRef` 는 컴포넌트 스코프라 카드 재마운트 시 리셋 → 실제 지급 없이
  "하트 30개 적립 🎉" 재노출 + 불필요 캐시 무효화. **수정**: 모듈 스코프 `handledGrants` Set 을
  `(userId:dataUpdatedAt)` 키로 써 같은 fetch 재토스트 차단, 새 fetch(진짜 지급)만 알림.
  `usePlanningRewards.ts`
- ✅ 그 외 clean(실측): mealCost 단위 게이트([3,25]만원·원단위 변환·null/0/음수/NaN), computeMealCost
  보증인원 헛돈/예산delta/over-capacity, prefill↔draft race(loadDraft bail + 함수형 setState),
  reviewRanking null 가드·원본불변, D-day 계산. 단위테스트 34 커버.

### 3. dead-end / DRY / 비용 (✅)
- dead-end 0: 신호 0건 시 카드 숨김(QuoteContextCard·MealCostCalculator·RegionalPriceGuide) 또는
  설정 유도 CTA. fetch 실패 빈상태 위장 없음. DRY: QUOTE_STYLE_LABEL·MEAL_*_LABEL·
  VERIFICATION_TIER_META 단일 소스, QuoteNew 하드코딩 STYLES 를 공유 라벨로 교체. 비용: venue 쿼리
  `enabled`+staleTime, planning staleTime 60s — 매 마운트 남발·N+1 없음.
- **[P2] regionalPriceGuide `BUDGET_GUIDE_LABEL.meal` 죽은 엔트리**: place 카테고리가 meal 로
  매핑 안 돼 미도달. **수정**: 제거 + 주석. `regionalPriceGuide.ts`

### 4. iOS/사파리 · draft (✅)
- 모든 draft 가 `formDraft`(safe localStorage try/catch) 경유, raw 접근 0. prefill↔draft 경합
  안전(draft 우선·빈 필드만 시드·오인 복원토스트 방지). safe-area/`input type=date` 처리.

### 5. 접근성(a11y) — **일부 적용**
- **[P2 적용] 인증 칩 `title`만 → 터치 미도달**: 후기 인증 칩에 `aria-label`(label+hint) 추가.
  `PlaceDetailLayout.tsx`
- **[P2 적용] 터치타깃 <44px**: MealCostCalculator 설정 링크(`py-2 min-h-44`)·예산반영 CTA(`h-11`),
  RegionalPriceGuide 예산설정 버튼(`py-2 min-h-44`).
- ✅ HomeQuickLinks(nav aria-label+가시라벨)·Guests/QuoteNew 삭제버튼(aria-label) clean.

### 6. 초개인화(차원14) — 강점 다수, 심화 여지(이월)
- ✅ 강점: MealCostCalculator(식수 우선순위·식장 실단가·예산형 페르소나 경고·D-day), rankReviews
  (인증>지역>최신), RegionalPriceGuide(지역·예산 위치) = 깊이 3~4. 빈 신호 폴백 우아.
- **[P2 이월] 페르소나 카피 단일 분기**: RegionalPriceGuide/MealCostCalculator 가 예산형 1개만
  차등, 나머지 19모드·예산 초과 시 코칭 없음. 깊이 4(카피 변형)로 올릴 여지 → 개인화 백로그.

### 7. 스토어 컴플라이언스 (✅)
- planning 리워드는 하트 **적립(earn)**만 — 실결제/IAP/anti-steering 무관. 결제 진입 게이트
  (`isPaymentEntryVisible`) 불변. 외부결제 링크 신설 0.

### 8. 파트너 감사 수정 회귀 (✅ 모두 정확)
- loadError 재시도(Coupons/Events/Products) 실동작·에러위장 제거. events count DATE 비교
  (starts_at 실제 DATE 확인)+approved 필터 정확. 게이지 `computeListingCompleteness` 단일화.
  min_price NaN 가드. 전부 실버그 교정, 새 버그 0.

## 적용 표
| 차원 | 항목 | 파일 | 상태 |
|---|---|---|---|
| 정확성 | P1 재방문 오탐 토스트(캐시 replay) 차단 | usePlanningRewards.ts | ✅ |
| a11y | 인증 칩 aria-label | PlaceDetailLayout.tsx | ✅ |
| a11y | 터치타깃 44px(설정링크·CTA) ×3 | MealCostCalculator·RegionalPriceGuide | ✅ |
| DRY | "+30하트" 하드코딩 → 상수 | PlanningRewardsCard.tsx | ✅ |
| 정리 | 죽은 meal 라벨 제거 | regionalPriceGuide.ts | ✅ |

## 남은 작업 (deferred)
- **개인화 심화**: RegionalPriceGuide·MealCostCalculator 페르소나 카피 20모드 확장(예산 초과 코칭 등).
- **좌석배치 UI(②)**: 홀 구조(①)·하객 명단 데이터 축적 후.
- **읽음/타이핑(2-A fast-follow)**: quote_messages read_at UPDATE RLS 정책.
- **QuoteNew etc/invitation_venue 카테고리 프리필 미매칭**(저빈도) — 카테고리 목록 정합 시 개선.

---
*P0 0·P1 1 적용·P2 명확분 적용/심화 이월. 보안·인가·멱등·PGRST·파트너 회귀 무결(라이브 실측).
빌드·lint 0·테스트 1258 통과. 커밋: 본 PR.*
