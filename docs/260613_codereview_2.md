# 260613 코드리뷰 #2 — 전 페이지 고도화 분석

> 범위: `src/pages/**` 143개 페이지(약 45,800줄) 전수. 목적은 버그 사냥이 아니라 **고도화**
> (UX·성능·접근성·일관성/재사용·로딩·빈/에러 상태·아키텍처). 방법: 6개 도메인 그룹으로 나눠
> 병렬 서브에이전트가 **현재 코드 기준** 분석(stale 스냅샷 불신). **이 문서는 분석 결과이며 코드
> 변경은 포함하지 않는다**(실행 시 항목별 커밋/PR을 추후 이 표에 추가). 직전 리뷰는
> `260613_codereview.md`(에이전트 오피스 + 세션 앱 변경).

## TL;DR

- **결제 경로 P1 2건이 최우선** — `PaymentSuccess.tsx`/`HeartChargeSuccess.tsx`의 `JSON.parse`
  무가드(손상 세션 → 영구 로딩/흰 화면)와 effect 재실행에 의한 **중복 승인** 위험. 돈이 오가므로 1순위.
- **고도화의 본질은 "공통화"** — 같은 로직이 여러 페이지에 복붙되며 **이미 드리프트가 발생**.
  최대 레버리지 4개: ① `formatPrice`(8+곳) ② 지역 목록(4곳, 라벨 이미 갈라짐) ③ 비즈니스
  `get_my_listing`(8곳) ④ 어드민 카탈로그 CRUD(Dress/Makeup/Hair ~600줄 클론).
- **데이터 패칭 패턴 분열** — react-query는 일부(Favorites·Tips·커뮤니티·일부 어드민)만 사용,
  나머지는 수동 `useState+useEffect`(캐시·중복요청 방지·로딩상태 없음). 수렴하면 성능·UX 일괄 개선.
- **파괴적 어드민 작업 다수가 확인 없음** — 자동수집 소스 삭제·회원 등급 변경 등이 무확인.
  **공용 `confirm()` 다이얼로그가 이미 존재**(13개 페이지가 아직 raw `window.confirm`) → 저비용 고효율.
- **거대 파일 4개** — InvitationStudio(3743)·Flow(2128)·Canvas(1715)·AdminInvitationTemplates(1647).
  분할 + 메모이제이션이 유지보수성·성능 동시 레버리지.
- 인가(authz)는 양호 — 모든 `/admin/*` 라우트가 `App.tsx`에서 `<AdminGuard>`로 보호됨(직접 확인).

---

## 0. P1 핫스팟 (먼저 고칠 것)

| # | 항목 | 위치 | 위험 |
|---|---|---|---|
| 1 | 결제 승인 멱등 가드 부재 | `PaymentSuccess.tsx:20-66` | effect deps `user` 변경 시 재실행 → 중복 승인. `useRef` 1회 가드 필요 |
| 2 | 세션 `JSON.parse` 무가드 | `PaymentSuccess.tsx:31`, `HeartChargeSuccess.tsx:30` | 손상 세션 → 영구 로딩/렌더 크래시(흰 화면). try/catch 안으로 |
| 3 | 추천 결제 경로 알림 누락 + 라우팅 버그 | `DressRecommend.tsx:160`, `MakeupRecommend.tsx:152` | `fittingId` 가드·`addPendingJob` 누락 → `/result/undefined` + 완료 알림 미발생 |
| 4 | 자동수집 소스 삭제 무확인 | `AdminTipInstagrams.tsx:140-143` | 오클릭 한 번에 큐레이션 소스 삭제 |
| 5 | 회원 등급 변경 무확인 | `AdminUsers.tsx:99-118` | `<select onChange>` 즉시 발동 — 오클릭에 등급 부여/회수 |
| 6 | 업체 소유권 이전 승인 무확인 | `AdminPlaceClaims.tsx:37-51` | 고위험 인가 변경이 단일 클릭 |
| 7 | 강제삭제 비원자 2-step 쓰기 | `AdminReports.tsx:121-137` | delete 성공·상태 update 실패 시 부분쓰기. RPC 트랜잭션화 |
| 8 | ProductDetail 무한 로딩 | `ProductDetail.tsx:46-58` | `.single()` + catch 없음 → 없는 id면 스피너 영구. `.maybeSingle()`+try/catch |
| 9 | Checkout 렌더 중 navigate | `Checkout.tsx:49-52` | side-effect in render(React 경고). 라우터/effect 가드로 |
| 10 | Flow↔Studio 발행 직렬화 드리프트 | `InvitationStudio.tsx:1342-1379` ↔ `InvitationFlow.tsx:1057-1098` | 두 곳이 다른 shape로 발행 layout 생성 → 발행본 손상 경로 |

---

## 1. 전 페이지 공통 패턴 (cross-cutting — 최대 가치)

이 6가지가 여러 그룹에 걸쳐 반복된다. 페이지별 수정보다 **패턴을 한 번에 잡는 것**이 고도화의 핵심.

1. **`formatPrice`(`toLocaleString()+"원"`) 로컬 재정의** — Store/ProductDetail/Checkout/Favorites/
   Cart/Orders 등 8+곳. `src/lib/priceFormat.ts` 인프라가 있는데도 미사용. 게다가 VendorDetailPage는
   로컬 `won()`이 `formatManwon`과 **의도적으로 다른 억 단위 표기**를 써서 같은 화면 안에서도 가격
   표기가 갈림 → priceFormat이 없애려던 바로 그 드리프트가 부활.
2. **지역 목록(17개) 중복** — Profile/DealFilterSheet/SearchOverlay/WeddingInfoSetupModal 4곳.
   **이미 "서울특별시" full name vs 축약으로 라벨 드리프트 발생**. `src/lib/regions.ts`로 단일화.
3. **상대시간 표기 3원화** — Community=`relativeTime`(lib), CommunityPostDetail=`date-fns`,
   business=`toLocaleString`. 전부 `relativeTime`으로.
4. **데이터 패칭 패턴 분열** — business 디렉터리 전체 + Store/Profile/WeddingConsulting 등이 수동
   `useState+useEffect`(캐시·중복요청 방지 없음, `exhaustive-deps` disable 다수). react-query로 수렴.
5. **로딩/빈/에러 상태 비일관** — 일부는 풀스크린 스피너, 일부는 부분, **Budget/BudgetHistory/
   Tutorial/AdminDashboard는 로딩 가드 자체가 없어 "잘못된 빈 상태"가 깜빡임**. `Skeleton` 컴포넌트는
   있으나 거의 미사용. 공통 `<PageLoading>`/스켈레톤 도입.
6. **A11y 시맨틱 누락** — 정렬/필터/세그먼트 컨트롤이 거의 전부 `<button>`만(`role=tab/radio`,
   `aria-pressed/selected` 부재). 아이콘 전용 버튼 `aria-label` 누락(Auth 뒤로가기, 수량 ±, 업로드).
   캔버스/도넛/진행률 등 순수 시각 정보에 `aria-label` 없음. raw `<button>` vs shadcn `<Button>` 혼용.

---

## 2. 영역별 발견 (요약)

### 2-1. 핵심 사용자 플로우 (Auth·MyPage·Profile·Store·ProductDetail·Checkout·Payment·Favorites)
- **P1**: 결제 멱등/parse 가드(§0 #1·#2), ProductDetail 무한 로딩(#8), Checkout 렌더 중 navigate(#9),
  Profile 아바타 카메라 버튼이 `onClick` 없는 죽은 UI(`Profile.tsx:187`).
- **P2**: Store 메인쿼리 `useEffect` deps에 객체 `filters` → 과도 재fetch·검색 무디바운스
  (`Store.tsx:65-100`); Profile 프로필/세팅 순차 await → `Promise.all`(`:47-58`), read-then-write
  대신 `upsert`(`:111-128`); Favorites `handleHeartClick` if/else가 동일 분기(죽은 코드, `:340`).
- **Arch**: Profile/Store/Favorites 도메인 로직이 컴포넌트에 인라인 → hook + react-query 확대.

### 2-2. 결혼준비 도구 (Budget·BudgetHistory·Schedule·MySchedule·Guests·AIPlanner·WeddingConsulting·Tutorial)
- **P1**: Budget/BudgetHistory `isLoading` 미사용 → 빈 상태 깜빡임; Budget `upcomingBalances`/
  `recentItems` 무메모(`:124-130`), BudgetHistory 필터 파이프라인 무메모(`:48-85`); WeddingConsulting
  수동 쿼리 2개·로딩 없음·processing 폴링 없음(`:56-80`).
- **P2**: MySchedule/Guests 삭제가 확인 없이 즉시(`MySchedule.tsx:428`, `Guests.tsx:293`) — Budget은
  AlertDialog 보호라 그룹 내 비일관; AIPlanner 무조건 하단 스크롤(`:402`), 페르소나 데이터 200줄 상주.
- **DRY**: D-day urgency 배지가 `lib/schedule.getTaskUrgency` 있는데 3곳 인라인 삼항 재구현.

### 2-3. AI 피팅/생성 (DressFitting·DressRecommend·MakeupFitting·MakeupRecommend·PhotoFix·HairPreview·AIStudio·HeartCharge)
- **핵심**: Dress/Makeup Fitting·Recommend 4종이 거의 동일 복붙, PhotoFix/HairPreview는 또 다른 복붙 쌍.
  공용 hook 0건.
- **P1**: 추천 경로 알림/라우팅 버그(§0 #3); HeartChargeSuccess parse 크래시(§0 #2);
  PhotoFix/HairPreview jobs 폴링 부재 → "보정 중"이 영영 고정(`PhotoFix.tsx:79`, `HairPreview.tsx:89`).
- **P2**: 업로드 진행 무표시(6개 페이지), Recommend가 sceneCode raw 노출(`STUDIO_GARDEN` 등),
  하트차감 확인 UX 두 갈래(`confirm()` vs review 단계), `error.message` 그대로 toast 노출(PII 우려).
- **공통화**: `useHearts()`·`useFittingUpload(bucket)`·`useFittingGenerate()`·`parseEdgeError()` 부재가
  핵심. 에러코드 파싱이 두 갈래(`err.message.includes` vs `error.context.json()`)라 회귀 발생 중.

### 2-4. 청첩장 (InvitationStudio·Flow·Viewer·Canvas·Gallery·RsvpDashboard)
- **P1 Arch**: 거대 파일 4개 + `StudioView` 60-prop 드릴. lib 계층은 양호하나 페이지/컴포넌트 계층이 god-file.
- **P1 DRY(최우선)**: Flow↔Studio가 `Template` 정의·발행 직렬화(§0 #10)·이미지 업로드·PDF export를
  평행 구현 → 조용히 갈라지면 발행본 손상.
- **P1 Perf**: Canvas 단일 `<Layer>`에 전부 → 키 입력마다 전면 redraw; `InvitationCanvas` `React.memo`
  미적용; slot 배열/override 객체 매 렌더 재생성.
- **Arch 위반**: Canvas가 `slot.id.includes(...)`로 polaroid 패드·spring delay 분기 →
  invitation-template-rules의 "눈대중 금지, 그리드 수치/타입 필드" 위반. 타입 슬롯 필드로 승격.
- **A11y**: Viewer 손수 모달 3종 포커스 트랩/Esc 없음, 갤러리 `alt=""`.

### 2-5. 커뮤니티 + 벤더/비즈니스 (Community 4종·Tips·VendorDetailPage·business/*)
- **P1 정합성**: 커뮤니티 카테고리가 3곳 불일치(Community 13 / Write 12 / **Edit 5**) → 페르소나
  카테고리 글을 Edit하면 **카테고리 유실**(`CommunityEdit.tsx:14`). CommunityEdit엔 `wedding_style`
  필드 자체가 없어 스타일 변경 불가(기능 비대칭).
- **P1 DRY**: 비즈니스 `get_my_listing`→`placeId` 패턴이 8개 파일 복붙(`useMyListing()` 부재);
  CRUD 4종(Coupons/Products/Events/Gallery) 구조·STATUS맵 복붙.
- **P1 UX**: 비즈니스 이미지가 전부 **URL 직접 입력**(파일 업로더 없음) → 일반 사장 사실상 사용 불가.
- **P1 Perf**: Community 작성자 조회가 보이지 않는 85개까지 over-fetch(`:215`); PostDetail 좋아요
  낙관적 업데이트 없음(`:148-178`).
- **Arch**: VendorDetailPage(1053줄) 11개 `*Extras` 인라인 → 분리 + `lazy()`.

### 2-6. 어드민 (admin/* 27개)
- **P1 Safety**: 파괴적 작업 다수 무확인/`window.confirm`(§0 #4·#5·#6·#7, 점검표는 §5).
- **P1 DRY**: Dress/Makeup/Hair 샘플 = 사실상 클론(~600 중복 라인); 스토리지 업로드 손코딩 분산.
- **P1 Perf**: 다수 페이지 무페이지네이션 `select("*")` + 매 mutation 전체 refetch; AdminDashboard
  freshness가 `places` 카테고리별 8개 풀테이블 SELECT(N+1, `:232-256`).
- **공유 버그**: `ImageUploader.tsx:119` `handleClear`가 `onUploaded("","")` 미호출 → "제거" 후에도
  이전 image_url 영속(세 카탈로그 전부 영향).
- **모범 사례(레퍼런스)**: AdminInstagramPostEdit(낙관적+롤백+dirty+notFound), AdminFeaturedProducts
  (서버 페이지네이션+낙관적), AdminInquiries(react-query+lib 재사용).

---

## 3. 공통화 제안 Top (DRY 레버리지 순)

1. **`src/lib` 프리미티브 단일화** — `formatWon`(priceFormat 확장)·`regions.ts`·`relativeTime` 전면
   적용. 이미 인프라 일부 존재. 가장 기계적이고 드리프트 차단 효과 큼.
2. **피팅 공용 hook** — `useHearts`·`useFittingUpload(bucket)`·`useFittingGenerate`·`parseEdgeError`.
   Dress/Makeup/Recommend 4종 + PhotoFix/HairPreview의 중복·회귀 동시 해소.
3. **`useMyListing()` + `useBusinessCrud` + `BusinessModerationCard`** — 비즈니스 8파일 복붙 제거 +
   react-query 캐싱. 비즈니스 이미지 업로더(커뮤니티 업로더 재사용)도 동반.
4. **`useSampleCrud<TRow,TForm>` + `<AdminSampleCatalog>`** — 어드민 Dress/Makeup/Hair를 config
   파일로 축소(~600줄→~150줄). 페이지네이션·낙관적 토글·확인 다이얼로그·lazy 이미지를 한 곳에서 상속.
5. **공용 `confirm()` 전면 적용** — 이미 있는 `src/components/ui/confirm-dialog.tsx`로 13개 어드민
   페이지의 raw `window.confirm` 교체(§5 점검표).
6. **`src/lib/invitation` 공유 추출** — `types.Template`·`buildViewerLayout`·`uploadInvitationImage`·
   `collectPdfPages`·`dateFormat`·`textBinding`·`slotFont` + 상수(`SIGNED_URL_TTL_S`·`MAX_UPLOAD_BYTES`·
   `MAP_RATIO`). Flow↔Studio 드리프트 차단.
7. **공통 CRUD 컴포넌트** — 삭제 AlertDialog(Budget↔BudgetHistory 복붙), `<ProductCard>`,
   `<PostCard>`, `<AppFooter>`, `<AuthGate>`(비로그인 가드 + redirect 규약 통일).

---

## 4. Quick Wins (저비용·고효율 종합)

1. 결제 멱등 가드 + `JSON.parse` try/catch (§0 #1·#2) — 돈 관련 P1을 작은 변경으로.
2. raw `window.confirm` → 기존 `confirm()` 교체(13개) — 특히 무확인 2건(TipInstagrams·Users) 우선.
3. `formatPrice`/지역목록 lib 단일화 — 드리프트 차단 + import 한 줄.
4. 그리드 `<img>`에 `loading="lazy"`(어드민 카탈로그·Assets·Templates 등) — 한 줄씩.
5. `ImageUploader.handleClear` 버그 수정(`:119`) — 삭제 이미지 영속 버그(3페이지 영향).
6. Community 작성자 조회를 visible 범위로 축소(`:215`) — 85개 over-fetch 제거, 한 줄.
7. 좋아요/북마크 낙관적 업데이트(PostDetail) — 모바일 체감 즉시 반영.
8. ProductDetail 메인 이미지 → 기존 `ProductThumb` 재사용(lazy+fallback).
9. `InvitationCanvas` `React.memo` 래핑 + Viewer 인라인 fallback `useMemo`.
10. Budget/BudgetHistory 로딩 스켈레톤 + 무메모 파생값 `useMemo` 래핑.

---

## 5. 파괴적 어드민 작업 안전장치 점검표

| 작업 | 위치 | 현재 | 권장 |
|---|---|---|---|
| 자동수집 소스 삭제 | AdminTipInstagrams:140 | **확인 없음** | confirm (최우선) |
| 회원 등급 변경 | AdminUsers:99 | **확인 없음**(select 즉시) | confirm(특히 다운그레이드) |
| 산출물 승인/거절 | AdminAgentOutputs:61 | 확인·in-flight 없음 | reject confirm + pending 가드 |
| 업체 소유권 이전 승인 | AdminPlaceClaims:37 | 단일 클릭 | confirm + 신청자 표시 |
| tier/업체/콘텐츠 승인(라이브 노출) | BusinessReview:108, ContentReview:106 | 단일 클릭 | 라이브 승인 confirm |
| 게시물/댓글 강제삭제 | AdminReports:121 | `window.confirm` + 비원자 2-step | AlertDialog + RPC 트랜잭션 |
| 대기열 일괄 알림 | ServiceWaitlist:81 | `window.confirm`(전체 update) | 건수 보여주는 AlertDialog |
| 상품 blocklist 삭제 | ProductCuration:304 | `window.confirm` | AlertDialog |
| 템플릿/에셋/폰트/샘플/공지/팁 삭제 | 각 파일 | `window.confirm` | 공용 `confirm()` |
| 오류로그 정리 삭제 | ErrorLogs:130 | `confirm()` ✅(유일 모범) | 삭제 전 건수 미리보기 |

---

## 6. 거대 파일 분할 (시급순)

1. **InvitationStudio.tsx(3743)** — 서브컴포넌트 파일화 + `useInvitationEditor/Media/Publish` 훅 +
   `StudioView` 60-prop을 `editorActions`/context로. 목표 컨테이너 ~300줄.
2. **InvitationCanvas.tsx(1715)** — 순수 로직 lib화 + 타입별 SlotBody 분리 + **3-레이어 분리 +
   `SlotNode` memo**(per-keystroke redraw 해소, 최대 성능 레버리지).
3. **AdminInvitationTemplates.tsx(1647)** — 레이아웃/검증 헬퍼 lib화 + `TemplateFormDialog`/
   `BulkUploadSection`/`TemplateCard` 추출.
4. **InvitationFlow.tsx(2128) / VendorDetailPage.tsx(1053) / AdminProductCuration.tsx(1015)** — 단,
   Flow는 분할보다 **Studio와의 공유 lib 추출이 우선**.

---

## 7. 적용 마이그레이션 (실행 시 갱신)

| 항목 | 파일 | 커밋/PR |
|---|---|---|
| (분석 단계 — 변경 없음) | — | — |

---

## 8. 남은 작업 / 검증 한계 (deferred)

- **이 문서는 정적 코드 분석 결과**다. 다음은 실환경 e2e 확인이 필요한 "미확정" 항목:
  - 결제 중복 승인 실제 재현(서버 멱등 의존 여부) — `PaymentSuccess`/`HeartChargeSuccess`.
  - MySchedule 날짜 입력 타임존 off-by-one — `useWeddingSchedule` 저장 포맷(`YYYY-MM-DD` 여부) 확인 필요.
  - Flow/Studio 발행 직렬화 round-trip·가격 일치 — 실제 발행본으로 확인.
  - 어드민 RPC 비원자 쓰기·RLS 서버측 강제 — DB e2e 미확인.
- **실행 우선순위 제안**: ① §0 P1(특히 결제) → ② §3 공통화 1~5(드리프트·중복 차단) →
  ③ §5 파괴적 작업 confirm → ④ §6 거대 파일 분할.
- 본 리뷰는 surface 별 walkthrough가 아닌 코드 정독 기준 — 페르소나별 UX walkthrough가 필요하면
  `docs/persona-ux-review-rules.md` 절차로 별도 수행.
