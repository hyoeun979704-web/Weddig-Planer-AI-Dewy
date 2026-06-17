# 260617 코드리뷰 #4 — 전체 감사 (보안·P0·dead-end·iOS·공통화·스키마 드리프트)

> 계기: "전체 감사 하자 뭐 하나 빼먹기만해라 — 내일 빌드한다." 5개 차원을 병렬 Explore(서브에이전트 ×5)로
> 전수 감사하고, **핵심 P0 주장은 직접 코드/마이그레이션을 열어 교차검증**(에이전트 라인번호 환각 방지 — 검증 규칙).
> 본 문서는 **진단 전용**: 픽스는 아직 적용 안 함(사용자 우선순위 지정 후 진행). 각 항목에 `file:line` 첨부.
> 범위: src 608파일 · migrations 228 · edge functions 52. 브랜치 `claude/260617-full-audit` (base `main`).

## TL;DR — 핵심 성과
- **진짜 불은 딱 2개**: ① **MergeGame iOS 사파리 크래시**(localStorage를 useState 초기화에서 raw 접근 →
  프라이빗 모드 throw → 페이지 전체 렌더 실패) ② **디자인 구매 포인트 차감 best-effort**(결제 성공 후
  `spend_points` 실패해도 경고만 → 할인은 적용됐는데 포인트는 안 깎임 = 포인트 누수). 단 디자인 마켓은
  현재 OFF라 ②는 실손해 없음 → **P1로 강등**, 켜기 전 반드시 수정.
- **보안 RLS/RPC**: 전반적으로 견고. 인가 가드(`has_role`·소유자 체크)·결제 금액 서버검증·RSVP 스팸캡·
  PostgREST escape 모두 정상. 신규 발견은 **정보노출 2건(P1/P2)** 과 **자기구매 우회(P2)** 뿐.
- **dead-end UI**: 활성 사용자 경로에서 **신규 죽은 CTA 0건**(조건부 렌더링이 잘 깔림). 단 #3 로드맵의
  '연락처 없는 업체 문의 toast'는 **여전히 미해결 백로그**(이번 감사 범위 밖, 별도 추적).
- **iOS/사파리**: 폼 draft 자동저장·safe-area는 **우수**. raw storage 접근이 게임/커뮤니티/일부 시트에
  잔존(대부분 비치명 fallback, MergeGame만 치명).
- **공통화(DRY)**: `won()`·CATEGORY_LABEL·FAVORITE_TYPE 중복 + 32곳 inline `.toLocaleString()+"원"` →
  단일 소스(`priceFormat`·`categoryLabels`) 미사용. N+1은 깨끗.
- **스키마 드리프트**: `business_coupons/events.place_id`가 **TEXT인데 places.place_id는 UUID**(FK 타입
  불일치 — 직접 확인). 중복 타임스탬프 마이그레이션 3쌍. repo↔live 적용여부 미검증 신규 3건.

---

## ❌ P0 — 실제로 깨진 것 (직접 검증 완료)

### P0-1. MergeGame iOS 사파리 프라이빗 모드 크래시 ✅직접확인
- **`src/pages/MergeGame.tsx:38`** — `useState(() => Number(localStorage.getItem('mergeGame_best') ?? 0))`.
  iOS 사파리 프라이빗/추적방지 모드는 localStorage 접근 시 **throw** → useState 초기화에서 터지면
  **페이지 전체 렌더 실패**(흰 화면). 같은 raw 접근이 `MergeGame.tsx:171,187` setItem 에도 있음.
- **영향**: iOS 프라이빗 모드 사용자는 게임에 **아예 진입 불가**. (AGENTS.md 7-① 회귀와 동일 패턴: iOS 가입 실패).
- **픽스**: `safeLocalStorage`/try-catch 래핑. `useState(() => { try { return Number(localStorage.getItem('mergeGame_best') ?? 0); } catch { return 0; } })`, setItem 도 동일.

### P0(강등→P1)-2. 디자인 구매 포인트 차감 누락 가능 ✅직접확인
- **`supabase/functions/design-purchase-approve/index.ts:81-86`** — 결제 승인·payments insert·orders=paid
  확정 **후** `spend_points` 호출이 실패하면 `console.error` 만(주석: "실패해도 결제는 유효 → best-effort").
  → 사용자가 포인트 할인은 받았는데 포인트는 안 깎임 = 누적 포인트 누수.
- **현실 영향**: **디자인 마켓 현재 OFF** → 호출경로 미가동 → 실손해 0. 그래서 **P1**(켜기 전 필수 수정).
- **픽스 옵션**: ① spErr 시 critical 로그 + 운영 알림(수동 보정) ② 차감을 결제 확정 **전**으로 옮기고
  실패 시 카카오 취소 호출(금액불일치 환불 경로 `index.ts:60-67` 재사용). 멱등성 주의(이중차감 방지).

---

## 🔐 보안 / RLS / RPC (에이전트 a605241 + 검증)

긍정(이상 없음): RLS per-user 정책·admin RPC `has_role` 가드·PostgREST escape(`escapeLikePattern`/`quoteForOr`)·
스토리지 admin-write 제한·결제 origin allowlist·RSVP 캡(500/버스트30)·`increment_ai_usage_if_allowed` service_role·
couple/family invite 자기상환 차단 — 모두 정상.

| SEV | file:line | 이슈 | 픽스 |
|-----|-----------|------|------|
| ⚠️P1 | `supabase/migrations/20260615015619_place_inquiry_stats_rpc.sql:18` | `get_place_inquiry_stats` 가 소유자 검증 없이 **임의 place_id 의 영업지표**(문의수·응답률·평균응답시간) 반환 → 경쟁사 정찰 가능. 현재 호출은 `claimed=true`일 때만이라 실노출 제한적. | RPC 내부에 `owner_user_id=auth.uid() OR has_role(...,'admin')` 가드 추가. |
| ⚠️P1 | `supabase/migrations/20260515030311_quote_messages_thread.sql` (`send_quote_message`) | 인가는 `v_is_req OR v_is_owner`로 OK지만 **레이트리밋 없음** → 매칭된 업체가 닫힌 요청에 후속/벌크 스팸 가능. | requester-vendor 쌍당 버스트 제한(예: 10분 5건). |
| 🟡P2 | `supabase/functions/design-purchase-ready/index.ts:44-48` | 작가가 **자기 디자인 자가구매** 거부 체크가 edge function 에만 있음 → RPC 직접 호출 시 우회. 금액검증은 남아 사기는 불가, intent 기록만 오염. | 소유자 체크를 SECURITY DEFINER RPC 내부로 이동. |
| 🟡P2 | `supabase/migrations/20260524080000_sensitive_preference_rpc_v3.sql:77` | `NULLIF(v_value_text,'')::boolean` 캐스트는 EXCEPTION 으로 감쌌으나 자기설명적이지 않은 footgun(현재는 안전). | CHECK 제약 또는 클라 사전검증 고려(LOW). |

> 에이전트가 P0로 든 `earn_points/earn_hearts anon 노출`은 `20260606193000_points_economy_lockdown.sql`에서
> 이미 service_role 전용으로 revoke 완료(✅FIXED). 프로덕션 적용여부만 introspection 으로 확인 권장.

---

## 🟠 dead-end UI / placeholder CTA (필수 섹션 — 에이전트 a0647a4)

**활성 사용자 경로 신규 죽은 CTA: 0건.** 조건부 렌더링이 체계적으로 깔려 있음:
- `AIStudio.tsx:182-193` "준비중" 잠금카드 → waitlist 시트로 정상 게이트(죽은 네비 아님)
- `BusinessDashboard.tsx:489` "준비중" 메뉴 비활성 + nav 가드
- `Premium.tsx:64-72` trial/subscribe CTA user 체크 후 네비
- `PlaceDetailLayout.tsx:273-324` 문의 CTA 연락처 가용성 게이트
- `InvitationMarket.tsx:54-75` 구매 흐름 세션·결제준비 검증

**단, 추적 중인 미해결 백로그(이번 감사 신규 아님, codereview_3 P1-#4)**: 연락처 없는 미입점 업체의
'전화 문의'/'문의하기'가 toast만 뜨는 dead-end(`PlaceDetailLayout`·`VendorDetailPage`) — 4천여 업체 다수.
AGENTS.md 회귀사례로 명시된 항목이며 **여전히 미해결**. 다음 스프린트 우선.

---

## 📱 iOS / 사파리 (웹) (에이전트 a9164fcb + a0647a4)

**우수**: 폼 draft 자동저장(`useTextDraft`/`formDraft` 전면 적용) · safe-area(`.safe-sticky-header` 광범위
사용, 100vh 미사용) · 대부분 storage 접근은 이미 `safeLocalStorage`/`createSafeStorage` 래핑됨.

| SEV | file:line | 이슈 | 픽스 |
|-----|-----------|------|------|
| ❌P0 | `MergeGame.tsx:38,171,187` | (위 P0-1) raw localStorage → 프라이빗 모드 크래시 | safe 래핑 |
| ⚠️LOW | `Suit.tsx:34,36` · `Community.tsx:149,151,165,174` · `WeddingBlessingSplash.tsx:25,36` | raw sessionStorage(가드 안내/스플래시 1회) — `typeof window` 가드는 throw 못막음 | try-catch 또는 safe 어댑터(비치명, 상태유실만) |
| ⚠️LOW | `VenueCrossLink.tsx:23` · `BudgetAddSheet.tsx:52,125` · `Schedule.tsx`(tidy-tip dismissed) | raw localStorage(팁 dismissed/링크) | safe 래핑 |
| 🟡LOW | HEIC 업로드 명시적 처리 없음(이미지 업로더 전반) | iOS 카메라 HEIC → 일부 브라우저 미리보기 깨짐 | 변환/안내(낮은 우선순위) |

> `mapAuthError` 가 iOS "Load failed" vs Chrome "Failed to fetch" 둘 다 커버하는지 확인 권장(AGENTS.md 7-③).

---

## ♻️ 공통화 / 성능 (DRY) (에이전트 DRY/perf)

| SEV | file:line | 이슈 | 픽스 |
|-----|-----------|------|------|
| HIGH | `src/pages/QuoteDetail.tsx:13` | 지역 `won()` 포매터가 `priceFormat`의 formatManwon 중복 | `src/lib/priceFormat` 사용 |
| HIGH | `VendorDetailPage.tsx:22-44` · `AdminPlaceEdit.tsx:49-60` | CATEGORY_LABEL·FAVORITE_TYPE 매핑 2중 복붙 → 드리프트 위험 | `src/lib/categoryLabels.ts` 단일 소스 |
| MED | 32+ 곳 inline `.toLocaleString()+"원"` | 가격표시 비표준(앱 전역) | `formatWon`/`formatManwon` 통일 |
| LOW | 매직넘버(포인트 step 50, 할인 cap 등) | 상수화 안 됨 | 상수 추출 + 주석 |

긍정: **N+1 쿼리 없음**(벌크 쿼리 잘 됨), dead code 경미, `AdminDashboard startOfToday` 무한루프는 이미 수정됨.

---

## 🗄️ 스키마 정합성 / 드리프트 (에이전트 a588495 + 직접 검증)

| SEV | file:line | 이슈 | 픽스 |
|-----|-----------|------|------|
| HIGH ✅확인 | `20260521080000_business_coupons.sql:7` · `20260521090000_business_events.sql:6` | `place_id TEXT NOT NULL REFERENCES places(place_id)` 인데 **places.place_id 는 UUID** → FK 타입 불일치(암묵캐스트·조인 위험). 형제 테이블 place_media/business_products/place_inquiries 는 UUID(정상). | `place_id TEXT → UUID` 마이그레이션(데이터 캐스트 동반). live 적용상태 introspection 선확인. |
| HIGH ✅확인 | 중복 타임스탬프 3쌍: `20260513150000`(daily_attendance·wedding_style_options) · `20260525060000`(family_invites_owner_check·persona_mode_overridden_marker) · `20260616000000`(quote_responses_place_fk·vendor_board_couple_sharing) | CLI 적용순서 모호 → 누락 위험. 모두 additive(IF NOT EXISTS)라 재실행 안전. | 각 쌍 중 하나를 `...0100` 으로 리네임. |
| MED | `src/pages/admin/AdminAIJobs.tsx:43` `admin_ai_job_stats` · `PersonaDashboard.tsx:191` `claim_mission_bonus` | 프론트가 호출하나 **repo 마이그레이션에 CREATE FUNCTION 없음**(live에만 존재 추정) | live 정의 introspect 후 마이그레이션으로 커밋(repo↔live 동기화). |
| MED | `20260617070000_place_media_albums.sql` · `_080000_business_event_banner.sql` · `_090000_multibranch_geo_dedup.sql` | 신규 — live 적용여부 미검증. 특히 multibranch geo(has_offline_store/road_address/lat/lng + find_duplicate_place RPC + get_my_listings)는 멀티지점 기능 핵심. 미적용 시 422. | `docs/260617_consistency_audit.md §③` introspection 으로 적용 확인 후 진행. |
| MED | 초기 마이그레이션 다수(`20260117…`·`20260122…`·`20260125…`·`20260203…`·`20260223…`·user_consents·instagram_post_drafts) | CREATE TABLE/INDEX/POLICY 에 `IF NOT EXISTS`/`OR REPLACE` 없음 → 재실행 실패 위험(~100+ CREATE) | 점진적 idempotent 가드 추가. |
| ✅FIXED | `admin_review_listing(p_place_id TEXT)` | TEXT 파라미터 vs UUID 컬럼 — 이미 `20260521050000:110` 에서 `p_place_id::uuid` 캐스트 적용됨(직접확인). | live 적용 확인만. |

> 근본원인: CI 가 edge function 만 배포하고 **`supabase db push` 없음** → 마이그레이션 수동적용 → repo↔live 드리프트.
> 권장: CI 에 introspection 검증 단계 + 마이그레이션 네이밍 규칙(중복 타임스탬프 금지, IF NOT EXISTS 필수) 문서화.

---

## 적용 마이그레이션 (이번 감사)

**0건.** 본 문서는 **진단 전용**. 사용자가 "내일 빌드"·우선순위 지정 후 픽스 착수 예정.
픽스 적용 시 각 항목에 커밋해시를 본 표에 추가.

| # | 항목 | file | 커밋 | 상태 |
|---|------|------|------|------|
| — | (픽스 미적용) | — | — | 진단만 |

---

## 남은 작업 (deferred — 우선순위 제안)

### 🔴 즉시 (켜기/빌드 전 필수)
1. **MergeGame raw localStorage → safe 래핑** (`MergeGame.tsx:38,171,187`) — iOS 크래시. **빌드 전 1순위.**
2. **design-purchase-approve spend_points 실패 처리** — 디자인 마켓 ON 하기 전 필수(현재 OFF라 비긴급).

### 🟠 이번 스프린트
3. business_coupons/events `place_id TEXT→UUID` (live introspection 선확인).
4. 중복 타임스탬프 마이그레이션 3쌍 리네임.
5. `get_place_inquiry_stats` 소유자 가드 / `send_quote_message` 레이트리밋.
6. **연락처 없는 업체 문의 toast dead-end**(codereview_3 P1-#4 — 미해결 잔존).

### ⚠️ 부채 정리
7. DRY: `won()`·CATEGORY_LABEL·FAVORITE_TYPE·inline `.toLocaleString()+"원"` → 단일 소스.
8. `admin_ai_job_stats`·`claim_mission_bonus` 정의 repo 동기화.
9. 초기 마이그레이션 idempotent 가드 + 신규 3건 live 적용 검증.
10. 잔여 raw storage(Suit/Community/WeddingBlessingSplash/VenueCrossLink/BudgetAddSheet/Schedule) safe 래핑.

### 운영 TODO (사용자측, 비코드)
- live DB introspection(`docs/260617_consistency_audit.md §③`)로 신규 마이그레이션 3건 적용 확인.
- Android `cap:build`(safe-area density).
- 카카오페이 회신.
