# 260613 — 기업회원(사장님) 대시보드 점검

> BusinessDashboard·관리 페이지(쿠폰/이벤트/상품/갤러리/문의/정보수정)·BusinessGuard +
> DB RLS 실측. 서브에이전트 발견을 코드·DB로 재검증 후 수정.

## TL;DR
- **수정(이 PR)**: 승인 전(pending/rejected) 업체가 URL 직접 진입으로 관리 페이지에 들어가
  노출 안 되는 초안을 만들 수 있던 갭 → BusinessGuard `requireApproved` 게이트로 차단(미승인은
  대시보드 상태 화면으로 리다이렉트). 대시보드 자체는 그대로 접근(상태 표시).
- **기각된 오보**: business_coupons moderation_status 컬럼 누락(실재 — RLS·쿼리 사용),
  업체 쓰기 RLS 미흡(실제로는 owner_user_id 정책 정상 + insert 페이로드에 owner_user_id 포함).

## 점검 결과 — 정상 확인 (보안 양호)
- **업체 쓰기 RLS 건전**: business_coupons/events/products/place_media 모두 owner(`owner_user_id=auth.uid()`)
  insert/update/delete 정책 + 공개 read 는 `moderation_status='approved'` 게이트. 클라 insert
  페이로드가 모두 `owner_user_id: user.id` 를 넣어 RLS 통과(어드민 places 의 무정책 침묵실패와 다름).
- business_profiles: 본인 read/update만(승인 변경은 admin RPC). BusinessVendorEdit 는 upsert_my_listing RPC.
- BusinessGuard: 비로그인/일반/역할조회실패(isError) 모두 처리.
- **공개 노출은 moderation 게이트로 보호** — 미승인 업체가 만든 콘텐츠는 승인 전까지 공개 안 됨(유출 아님).

## 수정 — 승인 게이트
미승인 업체가 `/business/coupons` 등 URL로 직접 진입 가능(대시보드는 링크를 숨기지만 직접 URL은 열림).
보안 유출은 아니나(공개는 moderation 차단) 무의미한 초안 생성·혼란 유발. → `BusinessGuard requireApproved`
신설: isBusiness 이지만 approval_status≠approved 면 `/business/dashboard`(상태 화면)로 보냄.
edit/gallery/coupons/events/products/inquiries 6개 라우트에 적용. 대시보드는 미적용(pending/rejected 표시 필요).

## 보고 — 권장(별도 백로그)
- rejected 상태에서 "수정 후 재신청" CTA 강화(현재 review_note만 표시, 버튼 약함).
- 삭제 확인 window.confirm → AlertDialog(전역 백로그와 동일).
- BusinessDashboard place_media 통계가 kind(photo/menu) 구분 없이 집계 — 표시 정확도(낮음).
- 문의 답변 저장 후 낙관적 갱신 없음(현재 load() 재조회 — 동작은 정상).
- 토스트 sonner/useToast 혼용(전역 백로그).
