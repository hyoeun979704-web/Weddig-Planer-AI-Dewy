# 260606 코드리뷰 #2 — 포인트/하트 경제(지급·차감) 보안 감사

## TL;DR (핵심 성과)
- 🔴 **CRITICAL 차단**: `earn_points`·`earn_hearts`·`spend_points`·`spend_hearts` 가 `anon`+`authenticated`
  에게 EXECUTE 부여 + 소유권 검사 부재 → **누구나(로그아웃 포함) 임의 계정에 무제한
  포인트·하트 발급/타인 잔액 차감** 가능했음. 하트는 카카오페이 유료 충전 재화라 금전 직결.
  → 내부/서버 전용으로 회수 + `spend_hearts` 소유권 가드 추가. (마이그레이션
  `20260606193000_points_economy_lockdown`, 적용 완료·검증)
- 🟠 **HIGH (deferred)**: `add_game_points` 가 클라이언트가 보낸 `p_score` 를 그대로 신뢰 →
  점수 위조로 자가 포인트 파밍 가능. 상한/일일 한도 필요(값은 제품 결정).
- 🟡 **MEDIUM (deferred)**: `claim_daily_attendance`(+스트릭 보너스) TOCTOU 경합 →
  동시 호출 시 하루 출석 포인트 중복 지급 가능.
- ✅ 양호: 멱등 인덱스(`mission_bonus_daily_unique`, `point_transactions_one_shot_reasons`),
  `referrals.referee_user_id` UNIQUE, 잔액 테이블 RLS 활성(직접 쓰기 차단), 자기추천 차단.

---

## 1. 보안 (인가/권한) — 🔴 CRITICAL [적용 완료]

| 함수 | 문제 | 실제 호출처 | 조치 |
|---|---|---|---|
| `earn_points` | anon/authenticated EXECUTE + 인가 검사 없음 → 무제한 포인트 발급 | 내부 SECURITY DEFINER 만 | anon/authenticated/public **REVOKE** |
| `earn_hearts` | 〃 → 무제한 **유료 하트** 발급 | edge(service_role) 만 | 〃 |
| `spend_points` | anon/타인 호출로 잔액 차감(griefing) | edge(service_role) 만 | 〃 |
| `spend_hearts` | 〃 + **클라가 직접 호출**(청첩장 발행)이라 회수 불가 | client(authenticated)+edge | anon REVOKE + **소유권 가드**(`auth.uid() IS NOT NULL AND p_user_id <> auth.uid()` 면 거부; service_role 은 `auth.uid()` NULL 이라 대행 허용) |

- 내부 정의자(postgres) 호출과 service_role(edge) 호출은 권한 회수의 영향을 받지 않음 → 정상 흐름 무중단(검증).
- `earn_points` 내부에 `p_user_id = auth.uid()` 가드를 넣을 수 **없음**: `redeem_referral_code` 가
  추천인(=auth.uid 아님)에게 지급하므로. → 올바른 통제는 "직접 호출 권한 회수"(내부 전용 헬퍼화).

## 2. 무결성/멱등성 — ✅ 양호
- `mission_bonus_daily_unique` (user_id, KST date) WHERE reason='mission_bonus' → 일 1회 보장.
  `claim_mission_bonus` 가 unique_violation 캐치. 정상.
- `point_transactions_one_shot_reasons` (user_id, reason) WHERE reason IN (signup_bonus,
  first_post/like/comment, tutorial_master, referral_redeemed, place_review_first) → 1회성 보상 중복 차단.
- `redeem_referral_code`: `referrals.referee_user_id` UNIQUE + EXISTS 선검사 + 자기추천 차단 →
  중복 지급 없음(경합 시 두번째는 unique_violation 으로 롤백).
- 잔액 테이블(user_points/point_transactions/user_hearts/user_attendance) **RLS 활성, INSERT/UPDATE
  정책 없음** → 클라이언트 직접 잔액 조작 불가(SECURITY DEFINER 함수 경유 강제).

## 3. P0/경합 버그

### 3-1. `add_game_points` — 클라 점수 신뢰 (🟠 HIGH, deferred)
```
v_earned := GREATEST(1, p_score / 20);  -- p_score 는 클라가 보낸 값
```
- 소유권 검사(`p_user_id <> auth.uid()`)는 있으나 **점수 자체가 클라이언트 제공** → 위조 시 무제한 포인트.
- 권장: 회당 상한(`LEAST(v_earned, <cap>)`) + 일일 게임 보상 한도(예: point_transactions 의
  merge_game 합계/횟수 제한). 게임 특성상 정당한 고득점 범위를 고려해 **상한값은 제품 결정 필요**.

### 3-2. `claim_daily_attendance` 출석 중복 지급 (🟡 MEDIUM, deferred)
- `SELECT last_date ... ; IF last_date = today THEN return` → SELECT~INSERT 사이 경합(더블탭/병렬)
  시 두 호출 모두 통과 → `daily_attendance`(+스트릭 보너스) 포인트 **중복 지급**.
- 'daily_attendance' reason 에는 멱등 유니크 인덱스가 없음.
- 권장(택1): (a) `SELECT ... FROM user_attendance WHERE user_id=v_user_id FOR UPDATE`(기존 행 경합 차단)
  + 최초 1회 경합까지 막으려면 (b) `point_transactions(user_id, KST date) WHERE reason='daily_attendance'`
  부분 유니크 인덱스 추가(`mission_bonus` 패턴과 동일) 후 unique_violation 처리.

## 4. 사소/관찰
- `spend_points`: `WHERE user_id=p_user_id` 후 차감→음수면 RAISE(롤백). 동작은 맞으나
  `spend_hearts` 처럼 `AND balance >= p_amount` 단일 UPDATE 가 더 명확.
- `reward_first_community_action`: EXISTS 선검사+earn_points 가 원자적이지 않음(동시 첫 글 2건 →
  중복 가능, 희박). one_shot 유니크 인덱스가 first_post 등은 막아주므로 실피해는 차단됨.
- `earn_hearts`/`spend_hearts` 본문 들여쓰기가 깨져 있음(가독성). 기능 무관.

---

## 5. 튜토리얼 포인트 적립 검토 (추가)
- ✅ 중복지급 방지 양호: `tutorial_completions` PK `(user_id, tour_id)` + `ON CONFLICT DO NOTHING`,
  마스터 보너스 EXISTS+one-shot 인덱스.
- 🔴 **임의 tour_id 파밍**: `complete_tutorial` 이 클라 제공 `p_tour_id` 무검증 → `feature_<아무거나>`
  마다 100P. 가짜 id 무한 생성으로 무제한 적립(포인트=상품권/쇼핑 사용 가능). 
  → **허용목록 테이블 `tutorial_tours`** 도입(유효 14개 시드) + 목록에 없는 id 무시(완료기록도 X).
  마스터 조건 `=5`→`>=5` 견고화. (마이그레이션 `20260606195000`)
- 드리프트 가드: `tutorialChapters.ts` 에 "레슨 추가 시 tutorial_tours 갱신" 주석 추가.

## 6. 포인트 내역 한글 통일 (추가)
- `usePoints.labelForReason` 단일 소스에 실제 사용 사유 전부 한글 매핑 + 동적 `feature_*` →
  "튜토리얼 완료" 접두사 통일 + 미정의 사유 영문노출 방지(한글 폴백). reason 키(매칭값)는 불변.

## 적용 마이그레이션
| 마이그레이션 | 내용 | 상태 |
|---|---|---|
| `20260606193000_points_economy_lockdown` | earn_points·earn_hearts·spend_points anon/authenticated 회수, spend_hearts anon 회수+소유권 가드 | ✅ DB 적용·검증 완료 |
| `20260606194000_points_farming_guards` | add_game_points 게임 보상 일일 한도(500P/일, KST) + claim_daily_attendance FOR UPDATE 잠금 + daily_attendance 일자 부분 유니크 인덱스 | ✅ DB 적용·검증 완료 |
| `20260606195000_tutorial_tour_allowlist` | tutorial_tours 허용목록 + complete_tutorial 검증(가짜 id 차단)·마스터 >=5 | ✅ DB 적용·검증 완료 |

## 남은 작업 (deferred)
- [x] `add_game_points` 점수 신뢰 → 게임 보상 일일 한도 500P/일 적용(값 조정 가능). — 완료
- [x] `claim_daily_attendance` 경합 방지(FOR UPDATE + daily 부분 유니크 인덱스). — 완료
- [ ] (선택) `add_game_points` 외 클라 직접 호출 함수 전반의 입력 신뢰 점검 — 추후
- [ ] (관찰) `earn_hearts`/`spend_hearts` 본문 들여쓰기 정리(기능 무관)
