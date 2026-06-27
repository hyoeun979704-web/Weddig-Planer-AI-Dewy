# 청첩장 생명주기 · 평생소장 수익화 (설계)

> 상태: **설계만 완료(미구현)**. 2026-06-27 합의 — "트로피컬 그린 스크롤" 템플릿
> 등록 작업과 함께 설계만 남기고, 자동삭제 크론·결제 UX·만료 알림은 **다음 작업**.
> 스키마 초안은 `supabase/migrations/MANUAL_20260627_invitation_lifecycle_schema.sql.DO_NOT_AUTO_APPLY`
> (라이브 미적용). 구현 시 이 문서를 기준으로 진행한다.

## 배경 / 문제

발행된 청첩장은 사진(Storage)·DB row·signed URL 을 영구히 차지한다. 결혼이 끝나면
대부분 더는 안 보지만 서버 비용은 계속 든다. 무한 무료 보관은 비용이 누적된다.

## 정책 (제안)

- **무료 보관 3개월**: 발행 시각 기준 90일. 그 안엔 전부 무료(열람·RSVP·방명록·수정).
- **만료 → 자동 삭제**: 90일 경과 + 평생소장 아님 → 청첩장 row·사진·방명록·RSVP 삭제.
- **평생 소장(유료)**: 하트 결제로 `is_permanent=true` 전환 → 만료 없이 영구 보관.
- **만료 임박 알림**: 만료 7일/1일 전 알림(앱 푸시·인앱 배너)으로 평생소장 유도.
- 결제 가격(초안): 하트 N개 (정확한 값은 결제 정책에서 확정 — 첫 발행 차감과 별개).

## 스키마

`invitations` 컬럼 추가(초안 — MANUAL 마이그 파일 참조):

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `expires_at` | `timestamptz` | 무료 보관 만료 시각(발행 후 90일). `is_permanent` 면 무시. |
| `is_permanent` | `boolean` (default false) | 평생소장 전환됨. true 면 영구 보관. |

- 부분 인덱스 `idx_invitations_expires_at`(`is_permanent=false and expires_at is not null`) — 만료 배치 조회용.
- 발행 시점(`publish_invitation` RPC)에서 `expires_at = now() + interval '90 days'` 세팅 추가 필요.

## 자동 삭제 (크론)

- pg_cron 또는 Edge function + 외부 scheduler(기존 `MANUAL_*_pg_cron.sql` 패턴 참조).
- 주기: 1일 1회. `expires_at < now() and is_permanent=false` 대상:
  1. Storage 사진 삭제(`user_data` 의 cover/gallery/story + `layout.scrollPaths`, 슬롯 템플릿은 `invitation_photo_paths` RPC 로 경로 수집).
  2. `invitation_guestbook`·`invitation_rsvp` 는 FK `on delete cascade` 로 자동 정리.
  3. `invitations` row 삭제(또는 soft-delete 후 grace).
- **엣지케이스**: 이미 공유된 `/i/:slug` 링크는 만료 후 "만료된 청첩장" 안내 페이지로(현행 notFound 재사용 가능). 하드 삭제 전 soft-delete + 짧은 grace 권장(실수 복구).

## 평생소장 결제 UX

- 진입점: 청첩장 뷰어/내 청첩장/만료 임박 알림에서 "평생 소장하기" CTA.
- 흐름: 하트 잔액 확인 → 부족하면 충전(`/points`) → `spend_hearts` RPC 차감 →
  `is_permanent=true`, `expires_at=null` 업데이트(서버 RPC 로 원자적 처리, 부분 실패 방지).
- 차감 실패 시 상태 미변경(보상 불필요 — 업데이트를 차감 성공 후에).

## 구현 체크리스트 (다음 작업)

- [ ] MANUAL 마이그를 정식 타임스탬프로 적용(`expires_at`/`is_permanent`/인덱스).
- [ ] `publish_invitation` 에 `expires_at` 세팅 추가.
- [ ] 평생소장 전환 RPC(`make_invitation_permanent`) — 하트 차감 + 플래그 원자적.
- [ ] 자동삭제 크론(사진 Storage 정리 포함) + soft-delete/grace.
- [ ] 만료 임박 알림(7일/1일) + 뷰어 만료 안내 페이지.
- [ ] 내 청첩장 목록에 만료일·평생소장 배지 노출.
- [ ] e2e 검증: 발행→만료 시뮬레이션→자동삭제, 평생소장 결제→영구 유지.
