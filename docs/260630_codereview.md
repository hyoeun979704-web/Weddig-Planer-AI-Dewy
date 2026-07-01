# 기업(사장님) 빌드 전체 감사 — 14차원 (260630)

> 범위: **기업(partners) 빌드** = `apps/partners/**` + `src/features/partners/**` + 이번 세션 신규 코드(PartnerAuth·가이드 위저드·액션큐·완성도 게이지·무드 피커·취향 부스트·견적 템플릿). 병렬 리뷰 서브에이전트 3개(보안·정확성 / UX·dead-end·a11y·개인화 / 빌드·출시적합성·iOS·복원력) + 운영자(나)의 DB ground-truth(RLS·스키마 실조회) 교차.
> 결과: **P0 없음.** 인가/보안 클린(RLS 실측 확인), dead-end CTA 0. P1 3건·P2 다수 → 아래 적용/이월.

## TL;DR (핵심 성과)
- **보안/인가 — 무결**: 신규 count 훅(`useBusinessActionItems`·`useListingExtras`)이 전부 `eq(place_id, 본인place)` + RLS owner-scope → **교차 업체 누출 0**(RLS 실측: place_inquiries owner-scope, reviews/media/albums public-read이나 본인 placeId 필터로 차단, business_events owner-scope, funnel은 SECURITY DEFINER 내부 owner-scope). self-UPDATE 권한상승(과거 P0급) 없음 — 저장은 SECURITY DEFINER RPC(`update_my_branch` v_owner=v_uid 강제).
- **출시 적합성 — 클린**: partners 앱 마운트 그래프에 admob/IAP/PWA 0(트리셰이크 확인), Apple 로그인 포함(4.8), OAuth 네이티브/웹 분기 정상, 권한 문구 존재.
- **dead-end — 0**: 모든 주요 CTA(저장·업로드·견적발송·인수·소셜로그인) end-to-end 동작. 위저드 토글 데이터유실 없음·step4 게이팅 정상.

## 영역별

### 1. 보안·인가 (✅ P0/P1 없음)
- RLS·RPC 시그니처·storage 경로 전수 SAFE(상기). `inquiryUrl` `^https?://` 검증으로 open-redirect 차단. quoteTemplates localStorage 파싱 검증·MAX 8. 문자열연결 SQL·시크릿·PII 누출 없음.

### 2. 정확성/견고성 — **적용**
- **P2 events count(내 신규 훅)**: `business_events.starts_at`=DATE인데 ISO datetime(`toISOString()`)과 `gte` 비교 → '오늘 시작' 이벤트가 자정 후 카운트서 누락. **수정**: `today=…slice(0,10)` 날짜 비교 + `moderation_status='approved'` 필터(pending/rejected 를 '할 일'로 세던 것 정정). `useBusinessActionItems.ts`
- **P2 min_price NaN**: `parseInt` NaN을 RPC int로 보내 저장 전체 실패 가능. **수정**: `Number.isFinite` 가드. `BusinessVendorEdit.tsx`

### 3. dead-end / 에러위장 — **적용**
- **P1 fetch 실패→빈상태 위장**: `BusinessCoupons·Events·Products`가 `catch{ setItems([]) }`로 로드 실패를 "없어요"로 표시(재발행·데이터소실 오인). **수정**: `loadError` 상태 + "다시 시도" 재시도 경로(BusinessLeads 패턴 복제). 3파일.

### 4. iOS/사파리(웹) — **적용**
- **P1 BusinessOnboard draft 없음**: 가장 긴 폼(사업자번호·상호·대표·개업일·카테고리)이 raw useState만 → iOS 탭 폐기 시 입력 전소실(`formDraft`가 막으려던 회귀). **수정**: `formDraft`(draftKey user별·hydrate 가드·성공 시 clear) 배선. `BusinessOnboard.tsx`
- ✅ 그 외 스토리지(quoteTemplates·formDraft·tasteTaxonomy·AuthContext) 전부 try/catch throw-safe.

### 5. 완성도 정의 드리프트 — **적용**
- **P1**: 대시보드 게이지(REQUIRED_FIELDS: city AND district, 가격/문의 없음)와 위저드(`computeListingCompleteness`: city OR district, 가격·문의 포함)가 같은 업체에 **다른 %·다른 미입력 목록** → "채우면 노출↑" 넛지 혼란. **수정**: 대시보드 게이지를 위저드와 **동일 `computeListingCompleteness` 기반**으로 단일화(+ 개인화 연료 포폴·무드만 확장). REQUIRED_FIELDS는 제휴 신청 게이트 전용으로 분리 유지. `BusinessDashboard.tsx`

### 6. 접근성(a11y) — 일부 적용·일부 이월
- **적용**: BusinessOnboard 제휴 토글 `aria-pressed`.
- **이월(deferred)**: Label↔control `htmlFor/id` 미연결(VendorEdit Field·Gallery select), 아이콘전용 버튼 `aria-label`(Coupons/Events 삭제·X), BusinessReviews 정렬·필터 칩 터치타깃 <44px, 일부 `img alt=""`. 저위험·다파일 → 별도 a11y 배치 PR 권장.

### 7. 출시 적합성(스토어) — ✅ 클린
- partners 앱: admob/IAP/PWA 미포함(마운트 그래프 트리셰이크 확인), Apple 로그인 有(4.8), OAuth 네이티브 분기(`signInWithOAuthNative`)·웹 origin 분기 정상, Info.plist 권한 문구(카메라·사진·ATT) 존재(공유 네이티브 빌드).
- **이월/주의**: partners **네이티브 패키징 미구축**(Phase 4-B2) → 그때 딥링크 스킴·appUrlOpen 배선 + `isNativeApp()` true 보장 필요(아니면 소셜로그인 WebView dead-end). 지금은 웹 전용이라 무해.

### 8. 초개인화(차원14) — 강점 1·기회 다수
- ✅ **강점**: 가이드 위저드가 `service_category`로 소개 골격·좋은예/나쁜예·키워드 칩을 업종별 분기(getListingGuide, DEFAULT 폴백). 무드 피커→취향 정렬→완성도 무드 신호까지 루프 실연결.
- **기회(이월)**: 위저드 **step 구조·필드 스키마는 전 업종 동일**(스냅도 '지역·매장' 단계). 대시보드·Coupons/Events/Products는 `service_category`가 메뉴/사진 문구만 바꿈(one-size). 견적 템플릿도 업종 시드 없음. → step 분기·업종별 헬퍼·템플릿 시드 여지.

### 9. 복원력 — ✅ 양호, 1 이월
- ErrorBoundary·Suspense·ConfirmDialogHost 배선. **이월(P2)**: `getSession()` 부팅 워치독 없음 → Supabase 세션 hang 시 스피너 무한(흰화면은 아님). 저확률.

## 적용 마이그레이션 표
| 차원 | 항목 | 파일 | 상태 |
|---|---|---|---|
| 정확성 | events count DATE비교+moderation 필터 | useBusinessActionItems.ts | ✅ |
| 정확성 | min_price NaN 가드 | BusinessVendorEdit.tsx | ✅ |
| dead-end | fetch실패 재시도(에러위장 제거)×3 | BusinessCoupons/Events/Products.tsx | ✅ |
| iOS | onboard draft 자동저장 | BusinessOnboard.tsx | ✅ |
| 완성도 | 게이지 단일소스화(드리프트 제거) | BusinessDashboard.tsx | ✅ |
| a11y | 제휴 토글 aria-pressed | BusinessOnboard.tsx | ✅ |

## 남은 작업 (deferred)
- **a11y 배치**: Label htmlFor·아이콘 aria-label·터치타깃 44px·img alt — 별도 PR.
- **개인화 고도화**: 위저드 step 업종 분기 / 대시보드·프로모션 surface 개인화 / 견적 템플릿 업종 시드.
- **복원력**: 부팅 getSession 워치독.
- **partners 네이티브 패키징(Phase 4-B2)**: 딥링크·OAuth 네이티브 경로(배포 시).

---
*감사 P0 0·P1 5 적용·P2 일부 적용. 인가/보안/출시적합성 무결 확인(RLS 실측). 커밋: 본 PR.*
