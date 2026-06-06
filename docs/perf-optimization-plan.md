# 성능 최적화 진단 + 계획 (260606)

> 사용자 보고: 웹/앱 버벅임(jank). 현재 코드 진단(번들 실측 + 데이터패칭 + 렌더 핫스팟
> 3축 병렬 감사) 후 우선순위·ROI 기준 계획. 측정은 `npm run build` 청크 실측·코드 패턴
> 교차검증까지(✅=실코드 확인). **런타임 FPS/LCP 는 이 환경에서 측정 불가** → 적용 후
> 사용자 기기/Lighthouse 로 before/after 확인 필요(한계 명시).

## TL;DR — 버벅임 3대 원인

1. **렌더 스레드 블로킹**: 리스트 페이지가 매 렌더마다 `filter/sort` 를 인라인 실행
   (Community 100개 정렬, 검색 매 키스트로크). `useMemo` 부재 → 입력·스크롤 시 끊김.
2. **불필요 refetch 폭주**: react-query `queryKey` 에 객체/배열(매 렌더 새 참조) +
   `staleTime: 0` → 필터·포커스마다 재요청 → 로딩 스피너·리스트 재렌더.
3. **초기 로드 비용**: PDF 라이브러리(jspdf+html2canvas+dompurify ~159kB gz)가 Budget/
   Premium 진입만으로 eager 로드 + PWA 가 13MB 전체 프리캐시(admin·이미지 포함).

→ 대부분 **one-liner~소규모 리팩터**. 아키텍처 변경 없이 체감 개선 가능.

## 측정 베이스라인 (실측 — `npm run build`)

| 청크 | raw | gzip | 비고 |
|---|---|---|---|
| `index` (메인 엔트리) | 464 kB | 148 kB | react+router+query+앱셸. 라우트분할은 양호 — 대부분 불가피 |
| `vendor-pdf` (jspdf) | 391 kB | 129 kB | 분리됨. but eager 로드 경로 존재(아래 P1-3) |
| `useInvitationFonts` | 334 kB | 107 kB | invitation 라우트 전용(lazy). 폰트 페이로드 — 격리됨, 우선순위 낮음 |
| `AIPlanner` | 273 kB | 88 kB | lazy. 단일 라우트라 OK |
| `vendor-canvas` (html2canvas) | 202 kB | 48 kB | 분리됨 |
| `vendor-supabase` | 176 kB | 46 kB | 필수 |
| PWA precache | — | **13 MB / 357 entries** | `**/*.{js,css,html,ico,png,svg}` 전체 — admin·게임·이미지 포함 |

**라우트 코드분할은 이미 우수**(99개 라우트 전부 `React.lazy+Suspense`, konva·matter-js·
react-markdown 모두 lazy 경계 뒤). 건드리지 말 것.

---

## Phase 1 — Quick Wins (high ROI · low risk · 하루치)

> 체감 버벅임의 대부분. 전부 표적 변경, API 시그니처 불변.

### P1-1. 리스트 filter/sort 를 `useMemo` 로 ✅확인
- `src/pages/Community.tsx:228-244` — `styleFiltered`/`trendingPosts`/`filteredPosts`/
  `sortedPosts` 가 매 렌더 재계산(정렬 시 `new Date()` 매 항목). → `useMemo([posts,
  selectedCategory, effectiveStyleFilter, sortBy])`.
- `src/components/community/CommunitySearchOverlay.tsx:102-122` — 검색 결과 filter+sort
  가 매 키스트로크 동기 실행. → `useMemo`.
- `src/pages/Budget.tsx:651-671` — 카테고리 진행도 10개 map+sort 매 렌더. → `useMemo`.
- **효과**: 입력·스크롤 시 메인스레드 블로킹 제거. **위험 낮음**(순수 계산 캐싱).

### P1-2. react-query `queryKey` 안정화 ✅확인
- `src/hooks/useVenues.ts:123` — `queryKey: ["venues", filters, ...]` 의 `filters` 가
  매 렌더 새 객체 → 캐시미스·refetch. → 원시값으로 펼치기
  `["venues", region, sigungu, maxPrice, ..., hallTypes?.join(","), ..., showPartnersOnly]`.
- `src/hooks/useCategoryData.ts:388` — 배열(filterOptions1~3)이 key 에. → 펼치거나
  store selector 에서 안정 참조 반환.
- `src/pages/Community.tsx:208` — `useCommunityAuthors(posts.map(p=>p.user_id))` 매 렌더
  새 배열. → `const userIds = useMemo(()=>posts.map(p=>p.user_id),[posts])`.
- **효과**: 필터 동일 시 재요청 제거 → 스피너·리스트 재렌더 사라짐.

### P1-3. `staleTime` 부여 (포커스 refetch 차단) ✅확인(부재)
- `src/hooks/useBudget.ts`, `useFavorites.ts`, `useGuestList.ts`(및 유사 개인데이터 훅)
  — `staleTime: 0` → 탭 복귀마다 전체 refetch. → 변동 빈도에 맞춰
  `staleTime: 60_000~300_000`. (전역 기본값을 `QueryClient` 에 주는 것도 검토:
  `defaultOptions.queries.staleTime`.)
- **효과**: 재포커스 시 불필요 네트워크·재렌더 제거(특히 모바일 배터리/체감).

### P1-4. PDF 라이브러리 동적 import (eager → on-demand) ✅확인(경로)
- `src/lib/pdfGenerator.ts:1-3` 가 jspdf/html2canvas/dompurify 를 top-level import →
  이를 import 하는 `PdfPreviewModal`/`BudgetReportSheet`/`EstimateSheet`/`TimelineSheet`/
  `StaffGuideSheet` 가 속한 Budget·Premium 청크에 ~159kB(gz) 동봉.
- 수정: 다운로드 **버튼 핸들러 내부**에서 `const { downloadPdf } = await import("@/lib/pdfGenerator")`.
- **효과**: Budget/Premium 진입 즉시 로드량 −159kB(gz). PDF 실제 생성 시에만 로드.
- **위험 낮음**(첫 PDF 생성에 ~200ms 지연 — 로딩 표시로 흡수).

### P1-5. 인라인 핸들러/카드 메모 (리스트 스크롤 jank)
- `src/components/home/VendorMediaCard.tsx` — `export default React.memo(VendorMediaCard)`.
- `src/components/VenueGrid.tsx:161` — `onClick={()=>onVenueClick?.(venue)}` 인라인 →
  `useCallback` + 카드에 memo 적용 시 12개 카드 재렌더 차단.
- `src/components/wedding-planner/VenueSurvey.tsx:137` — `disabled={d=>d<new Date()}` 가
  달력 날짜마다 `new Date()`. → `const today = useMemo(()=>new Date(),[])`.

## Phase 2 — 데이터 효율 (medium · 반나절~하루)

### P2-1. N+1·워터폴 제거
- `src/hooks/useCommentLikes.ts:14` — 댓글 조회→좋아요 조회 2단 순차. → 단일 RPC 또는
  `community_comments` 에 like_count 집계 join(서버 1왕복).
- `src/hooks/useCoupleLink.ts:30` — `useState+useEffect` 로 4쿼리 순차 + 컴포넌트마다
  중복 호출. → `useQuery(["couple-link", user?.id])` 로 전환(자동 dedup).

### P2-2. 과다 fetch 축소
- `src/hooks/usePlaceDetail.ts:350` — 10개 카테고리 상세 테이블을 **항상** join. →
  `place.category` 기준 해당 테이블만 select(조건부 select 문자열).
- 다수 훅 `select("*")` (`useFavorites:28`·`useBudget:56,71`·`useGuestList:25` 등) →
  UI 사용 컬럼만. raw_response/jsonb·이미지 등 무거운 컬럼 제외.

### P2-3. 무한 select 에 경계
- `src/hooks/useVendors.ts:71` — limit/range 없음. → 기본 `.limit(50)` + 페이지네이션.
- `src/hooks/useCommentLikes.ts:28` — 댓글 전체. → 가시 댓글만/페이지네이션.

### P2-4. 클라 연산 → 서버
- `src/hooks/usePlaceRecommendations.ts:89` — 150곳 Haversine 거리계산+정렬 클라에서. →
  RPC/PostGIS 로 서버 정렬(차후, RPC 추가 필요).

## Phase 3 — 구조·인프라 (높은 효과, 신중 / 별도 작업)

### P3-1. PWA 프리캐시 범위 축소
- `vite.config.ts:44-46` `globPatterns` 가 13MB 전체 프리캐시(admin·게임·이미지 포함).
  → 핵심 셸만 precache + 비핵심은 runtime caching(`workbox.runtimeCaching`)으로.
  admin/게임 청크·대형 이미지 제외. **효과**: 첫 설치 시 백그라운드 다운로드·저장 급감.
- **위험 중**: SW 캐시 전략 변경은 오프라인 동작 회귀 가능 → 충분히 검증.

### P3-2. 죽은 무거운 컴포넌트 정리(선택)
- `src/components/ui/chart.tsx`(recharts 52kB)·`carousel.tsx`(embla 14kB) — 라우트에서
  미사용. 사용처 0 재확인 후 제거. (미사용이면 청크에 안 들어가므로 런타임 효과는 작고,
  의존성·유지보수 정리 차원.)

### P3-3. framer-motion 경량화(선택)
- wedding-planner 내 단순 fade/slide 6곳은 Tailwind `animate-in` 으로 대체 가능.
  복잡한 건 유지. (전부 lazy AIPlanner 경계 뒤라 초기로드 영향은 없음 — 우선순위 낮음.)

### P3-4. `useInvitationFonts` 폰트 페이로드(334kB) 점검(선택)
- invitation 라우트 전용(lazy)이라 일반 체감엔 영향 없음. 청첩장 에디터 진입이 느리면
  폰트를 on-demand(사용 폰트만) 로드하도록 분할 검토.

---

## 적용 순서 권장
**Phase 1 전체 먼저**(체감 즉효·저위험) → 측정 → Phase 2 데이터 → Phase 3 인프라(신중).
각 변경은 AGENTS.md 6차원 자기검증 + `npm run test`·`npm run build` 통과. queryKey/메모
변경은 **기능 회귀(필터 안 먹음·stale 데이터) 주의** — 적용 후 해당 화면 실제 클릭 검증.

## 검증 방법 (이 환경 한계 포함)
- ✅ 가능: 빌드 청크 크기 before/after, `npm run test`, 코드 패턴 확인.
- ⚠️ 불가(이 샌드박스): 실 FPS·LCP·INP. → 사용자 기기 Chrome DevTools Performance /
  Lighthouse / React Profiler 로 before/after 측정 요청. 특히 Community 스크롤·검색 입력,
  Venue 필터, Budget 진입을 핵심 시나리오로.

## 건드리지 말 것 (이미 양호)
- 라우트 lazy 분할(99 라우트), konva/matter-js/react-markdown lazy 경계, main.tsx 비동기
  init, App.tsx 프로바이더 셋업, lucide 트리셰이킹, manualChunks(supabase/pdf/canvas).
