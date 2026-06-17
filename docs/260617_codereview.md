# 260617 코드리뷰 — 기업회원(사업자) 기능·UX 전체 감사

> 계기: "운영자가 직접 전환한 기업회원이 업체정보 등록·수정을 못 함" + "직접 전환 시 스키마
> 연동 안 됨" + "전용 어드민(비즈니스 대시보드) 접속이 쉬워야" + "iOS/사파리 고려". 기업회원
> surface 전체를 6차원 + dead-end UI + **페르소나 UX walkthrough** 로 감사하고, 확정·저위험
> 결함을 표적 수정. 관련 PR: #320(브랜치 `claude/fix-admin-business-convert`).

## TL;DR

- **P0 (데이터 연동) — 직접 전환 미반영**: 기업회원 인식은 `user_roles('business')` + `business_profiles`(approval=approved) **둘 다** 필요한데, 운영자 직접 전환/승인 경로(`admin_review_business`)가 **역할을 안 줘서** `useUserRole`이 개인회원으로 판정 → 대시보드·업체정보·갤러리·문의 등 **전 기능 차단**. → 승인 시 역할 멱등 부여 + 기존 approved 백필(마이그레이션 `20260617010000`).
- **P1 (인가 구멍) — `/business/leads` 무게이트**: 라우트에 `BusinessGuard` 누락(App.tsx:334) → 비기업/미승인도 진입 가능. → `<BusinessGuard requireApproved>` 래핑.
- **UX (접속성)**: 비즈니스 대시보드 진입은 마이페이지 "업체 관리" 카드뿐인데 **`isBusiness`(역할)일 때만** 노출 → 직접 전환으로 역할 없는 회원은 **진입로조차 안 보임**(위 P0가 진입로도 가림). 역할 복구 시 카드 노출 회복.
- **iOS/사파리**: 인증 storage 예외(#319)·폼 입력 유실(#316) 선제 수정 머지됨 → 사업자 폼에도 적용. 잔여 watch 항목 명시(HEIC 업로드 등).
- 검증: `npm run build` 0 error. SQL 마이그레이션은 sandbox 실행 불가 → **라이브 적용 후 확인 필요**.

## 보안 · 인가 (게이트 구조)

- 2중 게이트: ① `BusinessGuard`(역할 `isBusiness`) — 대시보드 ② `BusinessGuard requireApproved`
  (역할 + `approval_status='approved'`) — 관리 기능. RPC(`upsert_my_listing`·`request_place_claim`)도
  서버측 approval 재확인(클라 우회 불가) — **양호**.
- **구멍 1건**: `/business/leads`(견적 응답)만 게이트 없이 노출 → 수정함(P1).
- 어드민 RPC(`admin_review_business` 등)는 `has_role(admin)` 체크 + SECURITY DEFINER — 양호.

## P0 — 직접 전환 미반영(스키마 연동)

근본원인: `useUserRole`은 `user_roles`에 'business'가 있어야 `business_profiles`를 읽는다
(src/hooks/useUserRole.ts). 온보딩 `verify-business`는 profile+role 둘 다 만들지만,
`admin_review_business`(구, 20260521040000)는 `approval_status`만 갱신 → **역할 누락**.

불일치 상태별 증상:
| 역할 | 프로필 | approval | 결과 |
|---|---|---|---|
| ❌ | 있음 | approved | `isBusiness=false` → 전 기능 차단(= 이 버그) |
| ✓ | 있음 | pending/rejected | 대시보드 진입·상태화면, 관리기능은 게이트 |
| ✓ | 있음 | approved | 정상 |

수정(`20260617010000_admin_review_business_grants_role.sql`): 승인 시
`INSERT user_roles(user_id,'business') ON CONFLICT DO NOTHING` + 기존 approved 백필. 클라 변경
불요(역할만 채워지면 `useUserRole` 반영). **세션 캐시**라 당사자 화면 반영은 다음 앱 로드 시.

## 기업회원 기능 인벤토리 (게이트·연동)

| 기능 | 파일 | 게이트 | 직접전환(역할무) 시 |
|---|---|---|---|
| 대시보드 | BusinessDashboard | 역할 | "/" 리다이렉트 |
| 업체정보 등록·수정 | BusinessVendorEdit | 역할+승인 | 차단("승인 후 입력") + `upsert_my_listing` not_approved |
| 갤러리/포트폴리오 | BusinessGallery | 역할+승인 | placeId null → "정보 먼저 저장" |
| 쿠폰·이벤트·상품 | BusinessCoupons/Events/Products | 역할+승인 | 동일 |
| 문의·결과물·후기 | BusinessInquiries/Deliveries/Reviews | 역할+승인 | get_my_listing placeId 의존 |
| 업체 인수 | BusinessClaim | 역할+승인 | `request_place_claim` not_approved |
| 견적 응답 | BusinessLeads | **무→수정** | (수정 전) 무게이트 노출 |

→ 역할만 복구되면(P0 수정) 위 전부 정상 흐름 진입.

## 페르소나 UX walkthrough (현재 코드 기준)

### 페르소나 A — "운영자가 직접 전환한 사업자"(이번 핵심)
1. 로그인 → 마이페이지: "업체 관리" 카드 **안 보임**(역할 무) ❌ → 진입로 부재.
2. URL 직타 `/business/dashboard` → `BusinessGuard` "기업회원 전용입니다" ❌.
3. → **P0 수정 후**: 역할 보유 → 카드 노출 ✅ → 대시보드 → (승인됨) 업체정보 입력 ✅.
   - 단, 전환 직후 **이미 로그인된 세션은 새로고침 전까지 미반영**(캐시) ⚠️ — 안내 필요.

### 페르소나 B — "정상 온보딩 후 승인 대기"
1. 마이페이지 카드 "등록 검토 중" ✅ → 대시보드 진입 → 상태화면 ✅(무한루프 없음).
2. 관리 기능은 `requireApproved`로 차단 → 대시보드로 회송 ✅(명확).

### 페르소나 C — "반려된 사업자"
1. 카드 "등록 반려됨 · 다시 신청하기" → 재신청 플로우 ✅.

### 접속성(전 페르소나 공통) — "전용 어드민 접속이 쉬워야"
- 현재 유일 진입로 = 마이페이지 메뉴 카드(상단). 발견은 되나 **탭 이동 필요** ⚠️.
- 개선 제안(후속): 승인된 사업자에게 홈/헤더에 **상시 "업체 관리" 바로가기**(또는 로그인 직후
  사업자면 대시보드 우선 노출 옵션). 본 PR 범위 밖(전역 내비 변경 — 별도 검토).

## iOS / 사파리 고려

- **인증 실패(가입 불가)**: raw localStorage 예외 → 안전 storage 어댑터로 차단(#319, 머지됨).
- **입력 유실**: 사업자 업체정보/상세 폼에 자동 draft 복원 적용(#316, 머지됨) — iOS 탭 폐기 대비.
- **sticky 헤더**: BusinessVendorEdit 등 `safe-sticky-header`(safe-area) 사용 — 양호.
- **watch 항목(후속 확인)**: BusinessGallery 사진 업로드의 iOS **HEIC/대용량** 처리, `<input type=date>`
  없는지(사업자 폼엔 날짜 입력 적음). 실기기 부재로 e2e 미확인 — 에러는 `client_error_logs`로 관측.

## dead-end UI

- 신규 placeholder/토스트-온리 CTA **없음**. 미승인 상태 화면은 상태표시+재신청 CTA로 정상.
- 유일 결함은 `/business/leads` 무게이트(인가) — 수정.

## 적용 마이그레이션·수정

| 변경 | 파일 | 상태 |
|---|---|---|
| 승인 시 business 역할 부여 + 백필 | `supabase/migrations/20260617010000_admin_review_business_grants_role.sql` | PR #320 (라이브 적용 필요) |
| `/business/leads` 게이트 추가 | `src/App.tsx:334` | 본 커밋 |

## 남은 작업 (deferred)

- **직접 전환 전용 admin UI**: 운영자가 회사 NTS 정보 입력 → profile 생성 + 승인 + 역할을
  **한 트랜잭션**으로(원자적). 현재는 수동 DB + 승인 RPC 조합이라 드리프트 여지. `business_number`
  NOT NULL UNIQUE 제약 때문에 예외 케이스용 입력폼 필요.
- **세션 캐시 반영**: 전환 직후 당사자에게 realtime 또는 "재로그인 안내" — UX 보완.
- **상시 대시보드 바로가기**(접속성): 승인 사업자 홈/헤더 진입점.
- **role↔profile 정합성 가드**: 역할만/프로필만 있는 불일치 자동 감지·복구(또는 admin 경고).
