# 260617 기업회원 페르소나 e2e 감사

> 기업회원(사업자) 여정을 **페르소나별 end-to-end**로 추적해 양방향 데이터 왕복(소비자↔업체)의
> 끊김·dead-end·게이트 마찰을 발굴한다. 정적 게이트 감사는 `docs/260617_codereview.md` 참조.
> 본 문서는 **동적 플로우 e2e** + 페르소나 walkthrough. sandbox 한계상 DB/RLS/푸시는 코드·
> 마이그레이션 레벨 추적(라이브 e2e 미확인은 명시).

## TL;DR
- **양방향 완전 연결 ✅**: 견적 리드(요청→매칭→리드→응답→메시지), 결과물 전송→수령,
  상품·이벤트·쿠폰 노출(DB RLS+클라 이중 필터), 인앱 문의(작성→답변→소비자 열람).
- **수정함**: 업체가 문의에 답변해도 **소비자 알림이 없던** 단방향 dead-end → 답변 시 알림 트리거
  추가(`20260617030000`).
- **남은 갭(deferred)**: ① `app_notifications`→FCM **푸시 자동화** 미확인(인앱 알림만 보증)
  ② 기존 수집 업체(`owner_user_id=null`)는 쌍방 기능 제외 — 전환은 `request_place_claim`(BusinessClaim)
  + `admin_set_member_affiliation`(#321)로 커버되나 "claim 유도" UX 빈약.
- **전제(최우선)**: 오늘 추가분(역할부여·회원유형 전환·포트폴리오 컬럼·문의 알림 트리거)은
  **라이브 DB 마이그레이션 적용**이 되어야 동작.

## 페르소나 e2e walkthrough

### P1 — 신규 입점 사업자(정상 온보딩)
1. `/business` → 온보딩 `verify-business`(NTS 검증) → `business_profiles`(pending) + `user_roles('business')` ✅
2. 마이페이지 "업체 관리" 카드 "등록 검토 중" → 대시보드(상태화면) ✅
3. 운영자 `admin_review_business` 승인 → 알림(`notify_on_business_review`) + 역할(이미 보유) ✅
4. `/business/edit` 업체정보 저장(`upsert_my_listing`, pending) → 운영자 `admin_review_listing` 승인
   → `is_active=true` 소비자 노출 ✅ (iOS: 입력 draft 자동복원 #316 ✅)
5. 포트폴리오(BusinessGallery) → place_media → 상세페이지 노출(식장·스타일·설명 #320) ✅
6. 견적 리드 수신 → 응답 → 소비자 확인 ✅ / 인앱 문의 수신 → 답변 → 소비자 열람+**알림(신규)** ✅

### P2 — 운영자 직접 전환 사업자(#321)
1. 운영자 AdminUsers "유형 변경" → 기업회원/제휴 + 업종 선택 → `admin_set_member_affiliation`
   가 역할+프로필(approved)+제휴등급 **원자적** 세팅 ✅ (이전엔 "이름만" — 수정됨)
2. 이후 P1의 4~6단계 동일 진입 가능 ✅
3. ⚠️ 당사자 **로그인 세션 캐시**라 본인 화면 반영은 다음 앱 로드 시(실시간 아님).
4. ⚠️ 자동 생성된 business_number/상호는 placeholder → 업체가 업체정보에서 보완 필요(안내 문구 있음).

### P3 — 제휴업체(partner)
- `partner_tier='friends'/'bff'` → 트리거가 `places.is_partner` 동기화 → 추천/목록 상위 노출
  (`partner_rank` 정렬) ✅. AdminUsers 제휴 배지 + 변경 가능 ✅.

### P4 — 미승인/반려 사업자
- 대시보드는 진입(상태화면), 관리기능은 `BusinessGuard requireApproved`로 차단 → 대시보드 회송 ✅
- 반려 시 알림 + "다시 신청" CTA ✅. 무한 루프 없음.

### P5 — 강등(기업→일반)
- AdminUsers 유형 변경 "일반회원" → 역할 회수 + 프로필 비공개(rejected) ✅ (트리거가 is_partner 해제)

## 양방향 플로우 매트릭스

| 플로우 | 방향 | 상태 | 비고 |
|---|---|---|---|
| 견적 요청→매칭→리드→응답→수락→메시지 | 양방향 | ✅ | approved 기업회원만 리드 수신(`owner_user_id not null`) |
| 인앱 문의→답변→소비자 열람 | 양방향 | ✅ | PlaceInquirySheet "업체 답변" 섹션에서 소비자 열람 |
| 인앱 문의 답변→**소비자 알림** | 업체→소비자 | ✅(수정) | 트리거 `20260617030000` 추가(기존 없음) |
| 결과물 전송→수령 | 업체→소비자 | ✅ | vendor_deliveries RLS(소유자·수신자) + 서명URL |
| 상품/이벤트(검토 필수)→노출 | 업체→소비자 | ✅ | moderation approved + 클라 필터 이중 |
| 쿠폰(검토 면제)→노출 | 업체→소비자 | ✅ | 클라 `approved` 필터가 강제(RLS는 느슨) |
| 포트폴리오→노출 | 업체→소비자 | ✅ | #320 메타 렌더 + 전 상세경로 re-export |
| 새 리드/문의→업체 푸시 | →업체 | ⚠️ | 인앱 app_notifications ✅ / FCM 자동 푸시 미확인 |

## dead-end / 끊김

| 항목 | 상태 | 조치 |
|---|---|---|
| 업체 답변→소비자 알림 없음 | ✅ 수정 | `notify_on_inquiry_answered` 트리거 추가 |
| app_notifications→FCM 푸시 자동화 | ⚠️ deferred | `send-push` 수동 호출만 보이며 자동 트리거 미확인. 별도 검증/구현 |
| 기존 수집 업체(owner_user_id=null) 쌍방 기능 제외 | 🟡 부분 | `request_place_claim`(BusinessClaim)로 인수 가능 + #321 회원 전환. "claim 유도" UX 보강 권장 |

## 검증
- `npm run build` 0 error · 전체 `vitest` 통과(사전 실패 1 무관) · 신규 SQL 은 sandbox 실행 불가.
- **한계**: RLS·트리거·푸시·iOS 실기기는 라이브 적용 후 관측 필요(`client_error_logs`/실사용).

## 남은 작업 (deferred)
- 🔴 **마이그레이션 라이브 적용**(오늘 전체분의 공통 전제).
- FCM 푸시 자동화(app_notifications→send-push) 검증·연결.
- 기존 업체 "내 업체 인수(claim)" 유도 UX(검색→"내 업체인가요?" CTA).
- 직접 전환 당사자 세션 즉시 반영(realtime 또는 재로그인 안내).
