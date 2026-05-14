# 활성화 점검 + 모든 탭 UX 감사 & 개선

> 모든 라우트의 활성화 상태, 사용되지 않는 코드, 그리고 5개 하단 탭 + 5개 카테고리 탭의 UX 분석 결과.

---

## 1. 비활성/사용되지 않는 코드 감사

### 1.1 삭제 (확실히 dead, 이번 PR 반영)

| 파일/라우트 | 사유 |
|---|---|
| `src/components/VenueCard.tsx` | 아무 곳에서도 import 안 됨. VenueGrid·CategoryGrid가 같은 역할. |
| `src/components/NavLink.tsx` | react-router의 NavLink wrapper. 0건 사용. |
| `src/hooks/useAgent.ts` | `/api/agent` 호출용 클라이언트 훅. 운영 AI는 `useAIPlanner` → Supabase Edge Function 사용. import 0건. |
| `src/pages/More.tsx` + `/more` 라우트 | 마이페이지(`MyPage`)에 완전히 흡수된 구 버전. BottomNav가 `/mypage`로 직행. |
| `src/pages/Reviews.tsx` + `/reviews` 라우트 | 하드코딩 mock 후기. 어떤 곳에서도 링크되지 않음. 실제 후기는 `ReviewSection` 컴포넌트(홈)에서 제공. |

### 1.2 의도적 비활성 — 보존

| 항목 | 비활성 이유 |
|---|---|
| `/payment/success`, `/payment/fail`, `/points/charge/success(fail)`, `/premium/payment/success(fail)`, `/order-complete/:id` | TossPayments 외부 redirect 콜백 URL. 코드 내부에서 navigate되지 않지만 결제 성공/실패 시 진입. |
| `/budget/category/:category`, `/community/:id/edit`, `/couple-diary/edit/:id` | 동적 경로. Budget/Community/CoupleDiary에서 `navigate(\`...\`)` 동적 생성. |
| `/vendors/:category`, `/venue/:id` | 카테고리 목록 → 상세로 동적 navigate. |
| Detail re-exports (`HanbokDetail.tsx` 등) | `:id`별 별도 URL이지만 같은 `VendorDetailPage`를 렌더. SEO·딥링크 용. |
| `src/lib/agent/*`, `src/app/api/agent/route.ts`, `types/index.ts` | Phase-1 서버 사이드 에이전트. curl/관리자에서 호출 가능. (관련된 useAgent.ts만 삭제) |
| `AIStudio`의 `coming_soon` / `coming_v2` / `coming_v3` 카드 | "곧 출시" 의도. **단, locked 카드 클릭 핸들러가 console.log만 호출하는 버그가 있음 → 이번 PR에서 토스트로 수정** |
| `BusinessDashboard` 조회수 0 (TODO 표시) | 비즈니스 트래픽 추적은 후속 작업 |

### 1.3 TODO 마커 (코드는 활성이지만 미완)

- `src/pages/BusinessDashboard.tsx`: 조회수 트래킹 미구현 (항상 0)
- `src/components/detail/PlaceDetailLayout.tsx`: "coming soon" 코멘트

---

## 2. 5개 하단 탭 UX 분석

### 2.1 스케줄 (`/schedule`)
**현재 구조** (9개 섹션, 위→아래):
1. D-Day 카드 / 2. Tidy Tip / 3. Premium Banner / 4. 다가오는 일정 / 5. 카테고리 진행률 /
6. 예산 미니 / 7. 타임라인 / 8. 결혼 스타일 / 9. 커플 / 10. 커플 다이어리

**문제**:
- 섹션 수가 너무 많아 스크롤 피로. 9~10개는 홈보다 많음.
- "다가오는 일정"이 D-Day 아래 깊숙이 있어, 매일 가장 먼저 봐야 할 액션이 묻힘.
- 같은 카테고리 진행률을 D-Day 카드 + 카테고리 진행률 + 타임라인 카드에서 3중 노출.

**개선** (이번 PR 적용):
- "다가오는 일정"이 한 화면에 보이도록 D-Day 카드를 컴팩트화하고 타임라인을 뒤로 이동.
- "결혼 스타일 적용 중" 카드는 마이페이지/설정에서만 노출하도록 이동 후보(이번 PR 미실행 — 사용자 합의 후).

### 2.2 예산 (`/budget`)
**현재**: 932줄, Summary Donut → Stage Guide → Wedding Info Gap → Mini Category Bar → Category List → Recent Items → 변경 히스토리 → BudgetAddSheet.

**문제**:
- 페이지 매우 무겁다. 모바일 첫 로드 시 LCP 우려.
- "잔금" 항목은 잘 작동하는데 진입 방식이 분산.

**개선**: 이번 PR에서는 코드량 큰 작업이라 보류. 백로그에 정리.

### 2.3 홈 (`/`)
**현재**: PersonaDashboard + HeroBanner(자동 회전) + CategoryGrid(8개) + Recommended + InvitationTemplate + Magazine + Community + Review.

**문제**:
- HeroBanner가 슬라이드 5개를 자동 회전(2.8초). PersonaDashboard로 충분히 가치 전달됨 → 회전을 멈춰 인지 부담 감소.
- 로그인 유저에게는 "신규가입 1달 유료혜택 안내" 슬라이드가 불필요.

**개선**: HeroBanner 자동 회전 끄기 / 로그인 상태별 슬라이드 필터링 — 후속 PR.

### 2.4 커뮤니티 (`/community`)
**현재**: 카테고리(6) + 스타일(4) 이중 필터 + 정렬(3). 검색 별도. 글쓰기 우측 상단.

**문제**:
- 스타일 자동 적용 로직(`styleAutoApplied`)이 좋지만, 사용자가 자신의 스타일이 자동 선택됐다는 사실을 모를 수 있음.
- 검색 아이콘과 글쓰기 아이콘이 동시 노출되어 시선 분산.

**개선**: 자동 스타일 적용 시 안내 토스트 1회 노출 — 후속 PR.

### 2.5 마이페이지 (`/mypage`)
**현재**: 프로필 → QuickMenu(4) → DdayCard → (관리자) → PremiumBanner → MenuSection.

**문제**:
- 튜토리얼 진입 동선이 MenuSection 깊이에 묻혀 있음.
- 게스트 마이페이지는 잘 정리됐으나 가입 후 마이페이지는 메뉴가 많아 위계가 흐릿.

**개선**: 이미 직전 PR에서 PersonaDashboard에 가이드 칩을 노출하여 부분 보완. 메뉴 위계 정리는 후속.

---

## 3. 5개 카테고리 탭 UX 분석 (홈 상단)

### 3.1 AI 플래너 (`/ai-planner`)
- 직전 PR에서 스타일 인지형 환영 카드 + 퀵 질문 적용 완료.

### 3.2 AI 스튜디오 (`/ai-studio`)
**현재**: 6개 카드 (active 1, coming_soon 3, coming_v2 1, coming_v3 1).

**버그**:
- `coming_v2`/`coming_v3`(LockedCard) 클릭 시 `handleLockedCardClick`가 `console.log`만 호출. CTA가 "출시 알림 받기 →"인데 실제로는 아무 일도 안 일어남.

**개선 (이번 PR 적용)**: `coming_soon`과 동일한 토스트 노출. 추후 사전알림 모달이 구현되면 교체.

### 3.3 꿀팁 (`/magazine`)
- 별 문제 없음. 후속에서 스타일별 필터 도입 가능.

### 3.4 이벤트 (`/deals`)
- 별 문제 없음.

### 3.5 쇼핑 (`/store`)
- 별 문제 없음.

---

## 4. 이번 PR 변경 요약

| 분류 | 변경 |
|---|---|
| 삭제 | VenueCard.tsx, NavLink.tsx, useAgent.ts, More.tsx, Reviews.tsx |
| App.tsx 라우트 | `/more`, `/reviews` 제거 + lazy import 제거 |
| AIStudio 버그 수정 | LockedCard 클릭 → 토스트 노출 |
| Schedule UX | "다가오는 일정"을 D-Day 카드 바로 아래로 이동, 타임라인 뒤로 |
| 문서 | `docs/feature-activation-audit.md` (이 문서) |

후속 PR 후보:
- Budget 페이지 슬림화
- HomeHeader/HeroBanner 로그인 상태별 분기
- AI Studio 사전알림 모달 구현
- Community 자동 스타일 적용 안내 토스트
- 모든 페이지에 일관된 페이지 헤더 컴포넌트 도입
