# 260606 코드리뷰 #3 — 전체 DB 보안·RLS 감사

> 포인트 감사(#2)에서 치명적 구멍이 나와 **전 도메인으로 확장 감사**. 모든 public 테이블의
> RLS 상태 + SECURITY DEFINER 함수의 anon/authenticated 실행 권한을 전수 점검.

## TL;DR
- 🔴 **`geocode_backfill_log` RLS 비활성** → 완전 노출(누구나 read/write)이었음. **활성화(deny-all)**.
- 🔴 **cron/edge 전용 SECURITY DEFINER 함수 7개가 anon/authenticated 실행 가능** →
  타 사용자 정보 노출(업로드/청첩장 storage 경로, 구독 PII)·경제 abuse(강제 환불·보드 마감).
  **회수**(service_role 유지).
- ✅ 잔액·결제 테이블(user_points/hearts/payments/orders/subscriptions)은 SELECT 본인만 +
  쓰기 정책 없음 → 클라 직접 조작 불가(정상). 카탈로그(places/venues/tip_*)는 공개 read(정상).
- ✅ RLS 활성 + 정책 0개 테이블(collection_logs·geocode_admin·naver_search_cache·
  place_exclusions·tutorial_tours)은 의도된 deny-all(내부/캐시)로 정상.

## 적용 마이그레이션
| 마이그레이션 | 내용 | 상태 |
|---|---|---|
| `20260606198000_security_audit_lockdown` | geocode_backfill_log RLS 활성 + cron 함수 7개 실행권한 회수 | ✅ DB 적용·검증 |

### 회수한 함수와 위험
| 함수 | 위험 | 호출처(정상) |
|---|---|---|
| `list_expired_ai_uploads(int)` | 전 사용자 dress 업로드/결과 storage 경로 노출 | edge `cleanup-ai-uploads` |
| `list_expired_invitation_drafts(int)` | 전 사용자 청첩장 draft id·사진 경로 노출 | edge `cleanup-ai-uploads` |
| `list_expired_invitation_published(int,int)` | 전 사용자 발행 청첩장 사진 경로 노출 | edge `cleanup-ai-uploads` |
| `subscriptions_due_for_renewal_notification(int)` | 전 사용자 구독 PII(plan/price/billing) 노출 | pg_cron/edge |
| `cleanup_inactive_tips()` | 팁 대량 DELETE | pg_cron |
| `reap_stuck_generation_jobs()` | 잡 강제 실패 + 강제 환불(earn_hearts) | pg_cron |
| `consulting_board_done(uuid,text,text)` | 타 사용자 컨설팅 리포트 마감·강제 환불(경제 abuse) | edge `wedding-consulting` |

## 점검했고 정상(조치 없음)
- `earn_points`/`earn_hearts`/`spend_points`/`spend_hearts`/`add_game_points` — #2 에서 잠금 완료.
- `has_role`/`is_couple_member` — read-only boolean 헬퍼(RLS 용), 노출 무해.
- `increment_place_views`/`increment_post_views` — 조회수 카운터(클라 호출, 의도된 open).
  남용 시 카운트 인플레만 — 영향 경미(추후 rate-limit 고려, deferred).
- 트리거 함수(handle_new_user·notify_*·sync_*·reward_first_community_action) — NEW 의존이라
  직접 호출 불가(트리거 컨텍스트 전용). 무해.

## 남은 작업(deferred)
- [ ] `increment_*_views` 남용 rate-limit(낮음).
- [ ] Supabase security advisor 전체 lint(140k 출력 — 별도 세션에서 function search_path
      경고 등 검토 권장). 본 감사는 RLS 노출·함수 인가에 집중.
- [ ] 결제/구독 edge function(kakao-pay-*) 호출 경로 런타임 e2e(정적만 확인).
