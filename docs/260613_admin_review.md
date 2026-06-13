# 260613 — 운영자 어드민 대시보드/페이지 e2e 검토

> 7앵글 코드 검토(대시보드·가드·레이아웃 / 관리 페이지들) + DB RLS·RPC 실측 검증.
> 서브에이전트 발견을 코드·DB로 재검증해 오보 제거 후 수정.

## TL;DR
- **확정 버그 수정(이 PR)**: ① `places` 어드민 쓰기 RLS 정책 누락(어드민 업체 수정이 조용히 실패) ② AdminGuard 가 역할 조회 실패(isError)를 "권한 없음"으로 오인 거부 ③ 사이드바에 실제 라우트 다수 누락.
- **기각된 오보**: AdminUsers `display_name`(실제 존재), dress_samples 어드민 정책 누락(실제 존재), AdminPlaces 필터(의도된 기본 활성 필터).

## 확정 버그 — 수정 완료

### 1. `places` 어드민 쓰기 정책 0건 → 어드민 업체 수정 무효 (높음)
`AdminPlaceEdit`가 anon JWT로 `places`를 직접 `update`하는데 places엔 public read(`using true`) 2개뿐 **쓰기 정책이 하나도 없었음**. PostgREST는 RLS로 매칭 0행이 돼도 에러를 안 내므로 → 운영자는 "저장됨"을 보지만 **실제 반영 0**. 마이그레이션 `20260613030000_places_admin_write.sql`로 admin 전체 쓰기 정책 추가(실 DB 적용 완료).

### 2. AdminGuard isError 미처리 (중)
`useUserRole().isError`(역할 조회 일시 실패)를 무시 → admin도 `isAdmin=false`가 되어 "접근 권한 없습니다"로 오인 거부. BusinessGuard와 동일하게 isError 분기(새로고침 안내) 추가.

### 3. 어드민 사이드바 라우트 누락 (낮음)
실제 존재하는 라우트인데 nav에 없던 항목 추가: 업체 정보 관리(/admin/places), 콘텐츠 검토(/admin/content-review), 기업회원 검토(/admin/business-review), 신고 처리(/admin/reports), AI 생성 현황(/admin/ai-jobs), 헤어 카탈로그(/admin/hair-samples). (직전 PR에서 1:1 문의·커뮤니티 공지도 추가.)

## 검증으로 기각(오보)
- **AdminUsers `display_name`**: `profiles.display_name`은 `handle_new_user` 트리거가 채우는 실재 컬럼 — 버그 아님.
- **dress_samples 어드민 정책 누락**: 실제로는 insert/update/delete admin 정책 + public read 모두 존재 — 정상.
- **AdminPlaces 필터 "전체 조회 불가"**: 기본 활성 카탈로그 관리 의도. 비활성 토글로 전환 가능 — 설계 선택.

## 보고 — 권장(별도 작업)
- **AdminBusinessReview `review()` 후 단일 섹션만 제거** → 승인 시 다른 섹션(파트너 등급 등) stale. 변이 후 `load()` 전체 재조회 권장(낙관적 제거 대신).
- **AdminCommunityAnnouncements `toggleActive` 낙관적 갱신**: React Query invalidate에 의존하므로 즉시 반영됨(현 구조 OK), 단 실패 시 토스트 외 롤백 표시는 없음.
- **대시보드 stats**: `Promise.all`의 개별 쿼리 에러는 `{data,error}`라 reject 안 됨(graceful "-"). try/catch는 네트워크 throw만 대비 — 우선순위 낮음.
- **어드민 모바일 반응형**: 데이터 신선도 표 가로 오버플로우, z-index 체계 — 어드민은 데스크탑 가정이라 낮음.
- **토스트 sonner/useToast 혼용**: 어드민 내에서도 혼재(전역 백로그와 동일).
- **로그아웃 에러 미처리**(AdminLayout): signOut 실패해도 navigate — 낮음.

## 정상 확인
- AdminGuard: 비로그인 → /auth, 일반사용자 → 안내, 로딩 스피너. 클라 가드 + 서버 RLS(admin 역할) 이중.
- AdminBusinessReview: 승인/반려/등급/상품검토 모두 `admin_*` SECURITY DEFINER RPC 경유(클라 직접 쓰기 아님) — 안전.
- AdminTipInstagrams 삭제, AdminCommunityAnnouncements 삭제: window.confirm 확인 절차 있음.
</content>
