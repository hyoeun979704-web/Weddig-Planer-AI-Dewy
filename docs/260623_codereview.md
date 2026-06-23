# 260623 iOS 출시 전 점검 (Dewy 1.0 App Store 제출 대비)

iOS(Capacitor/WKWebView) 첫 App Store 제출 준비 중 발견한 출시 차단/위험 요소.
4개 차원 병렬 감사: 권한·네이티브 API / safe-area / dead-end·결제 / 스토리지·인증·IAP.
빌드 1.0(1) 업로드·처리 완료, 메타데이터·연령등급(4+) 작성 완료. 아래 처리 후 제출.

상태 범례: ✅ 완료 · 🛠 진행 중(사용자) · ⏳ 미착수 · 🔎 실기기/콘솔 검증 필요

## 처리 우선순위

| # | 이슈 | 심각도 | 상태 | 위치 |
|---|---|---|---|---|
| A1 | Apple 로그인만 실패(Google/Kakao 정상) — 4.8 위반=반려 | 🔴 반려 | 🛠 | Supabase 콘솔 Apple provider 설정 |
| A2 | iOS IAP 실구매 — ASC 상품 미등록 시 구매 실패/반려 | 🔴 반려 | 🔎 ⏳ | ASC 상품 등록 + `src/lib/payments/iap.ts` |
| B1 | 토스트가 노치/상태표시줄에 가림 | 🟠 UX | 🛠 | `src/components/ui/sonner.tsx:12` |
| B2 | 바텀시트/드로어 하단이 홈인디케이터에 가림 | 🟠 UX | ⏳ | `ui/drawer.tsx:34`, `place/PlaceInquirySheet.tsx`, `onboarding/StyleSwipeSheet.tsx`, `invitation/AISuggestSheet.tsx:83` |
| B3 | 위치 권한 키 누락 → "근처 식장 추천" 동작 안 함 | 🟠 기능 | ⏳ | `ios/App/App/Info.plist` ↔ `persona/LocationJITCard.tsx:121` |
| B4 | raw localStorage(try-catch 없음) → 프라이빗 모드 흰 화면 | 🟠 안정성 | ⏳ | `persona/LocationJITCard.tsx:106,167` |
| C1 | "앱 받기"가 Play스토어 하드코딩(iOS 부적절·anti-steering) | 🟡 정책 | ⏳ | `src/pages/MergeGame.tsx:103-106` |
| C2 | 스플래시 하단 텍스트·일부 전체화면 오버레이 safe-area 미반영 | 🟡 경미 | ⏳ | `WeddingBlessingSplash.tsx:73`, `TutorialOverlay.tsx`, `invitation/native/MobileInvitationSections.tsx:244` |

## 상세

### A. 심사 반려 위험 (제출 전 필수)
**A1 — Apple 로그인**: 앱이 Google·Kakao 소셜 로그인을 제공 → Guideline 4.8상 Sign in with Apple도 **작동 필수**. 현재 Apple만 `provider is not enabled`. 코드 경로는 google/kakao와 동일(`contexts/AuthContext.tsx:252-265`→`lib/native/oauth.ts`) → 원인은 **Supabase 콘솔 Apple provider(Service ID·Key) 설정 누락** 추정. 🛠 사용자 수정 중.

**A2 — IAP**: 구조 완성 — `cordova-plugin-purchase@13.17.2` 설치(cap sync 확인), `lib/payments/products.ts`(Apple 구독·하트 상품 ID), `lib/payments/iap.ts`(StoreKit + `iap-verify-apple` 검증). **단, ASC에 상품이 등록·"제출 준비" 상태가 아니면 iOS 구매 실패** → provider unavailable이면 `HeartCharge.tsx:247`·`SubscriptionCheckout.tsx:191`이 "준비 중" 텍스트만(dead-end). 심사관이 구매를 시도하므로 🔎 **sandbox 실구매 검증 필수**. v1.0에서 결제를 안 쓸 거면 진입점 숨김 결정.

### B. 기능/UX (출시 전 권장)
- **B1**: `sonner.tsx`가 `position="top-center"` + safe-area-inset-top 미반영. → top offset 추가 또는 `bottom`. 🛠
- **B2**: `drawer.tsx`·예약/온보딩/AI추천 시트가 `fixed bottom-0`인데 `pb-[var(--safe-bottom)]` 없음 → 하단 버튼 가림.
- **B3**: `NSLocationWhenInUseUsageDescription` 추가해야 `getCurrentPosition` 동작. 사진 기능 대비 `NSPhotoLibraryUsageDescription`·`NSCameraUsageDescription`도 권장(현재 `<input type=file>`는 PHPicker라 동작).
- **B4**: `LocationJITCard.tsx:106,167` raw 접근 → 기존 `lib/safeLocalStorage.ts`로 교체.

### C. 경미·정책
- **C1**: `MergeGame.nudgeToApp()`가 `play.google.com` 하드코딩 → iOS는 App Store 또는 숨김.
- **C2**: 스플래시 "탭하여 시작" 텍스트 등 일부 오버레이 safe-area 미반영(경미).

## ✅ 이상 없음(확인됨)
파일/사진 업로드(PHPicker·HEIC), Web Share+클립보드 폴백, `safeLocalStorage` 어댑터, `<input type=date>`, deep link(`app.dewy://`) 스킴·리스너, viewport-fit=cover.

## 검증 한계
Explore 감사는 코드 발췌 기반. A1·A2·B 시리즈는 **실기기/실제 콘솔 e2e 확인 필요**(🔎). 본 문서는 "확인·처리할 지점" 목록이며 일부 미검증.

## 변경 이력
- 2026-06-23 최초 작성 + 상태 컬럼/명료화 갱신.
