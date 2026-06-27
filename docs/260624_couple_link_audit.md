# 커플연동 기능 감사 — 260624

> 범위: 커플 연동(`couple_links`) 핵심 흐름 + 모든 공유/전용 surface(예산·일정·찜·일기·투표·
> 업체보드·청첩장 RSVP·챗봇)를 14차원으로 감사. 코드는 **수정하지 않고 발견만** 기록(요청=감사).
> 검증 표기: ✅직접확인(코드/마이그 read) · ⚠️서브에이전트 보고(미직접확인, 실DB 교차확인 권장).

## TL;DR

커플 연동의 **핵심 백엔드(redeem RPC·is_couple_partner RLS·언링크 정리)는 구조적으로 견고**하다.
SECURITY DEFINER로 RLS 우회 lookup을 안전하게 감쌌고, 1커플 강제·race 가드·언링크 시 error throw
검사가 모두 들어가 있다. 그러나 **오래된 테이블(couple_votes, couple_diary 사진)에 인가·생명주기
구멍**이 남아 있고, **일기 "수정" 기능이 통째로 미완(신규 생성됨)**이다.

| # | 심각도 | 영역 | 한줄 |
|---|--------|------|------|
| 1 | **P1(보안)** | couple_votes RLS | 연동 검증 없음 — 누구나 임의 사용자에게 투표 푸시·상대 보드 오염 ✅ |
| 2 | **P1(기능미완)** | 일기 수정 | `/couple-diary/edit/:id`가 빈 폼→신규 생성(중복). updateEntry 호출처 없음 ✅ |
| 3 | **P1(안정성/프라이버시)** | 일기 사진 | 7일 서명 URL을 DB에 영속 저장 → 7일 후 전원 깨진 이미지 ✅ |
| 4 | **P1(프라이버시)** | 언링크 정리 | 언링크가 couple_votes 미정리 → 헤어진 상대 투표 영구 조회/수정 ✅ |
| 5 | P2(정확성) | budget_settings | 커플 동시 최초생성 시 행 2개(orphan) — 커플 단위 유니크 없음 ⚠️ |
| 6 | P2(정확성/DRY) | useCoupleFavorites | partnerId 소스가 useCoupleLink(로컬 state) — 언링크 직후 stale 찜 노출 ⚠️ |
| 7 | P2(정확성) | 일정 템플릿 | 언링크 후 orphan/중복 시드 가능(`generateScheduleFromTemplate`) ⚠️ |
| 8 | P2(dead-end/개인화) | CoupleVote | 비연동 폴백/라우트 가드 없음 — `isLinked` import만 하고 미사용 ⚠️ |
| 9 | P2(정확성) | 챗봇/보드 | select `error`를 "데이터 없음"과 혼동 → 오답·빈화면 착시 ⚠️ |
| 10 | P2(보안) | `.or()` 보간 | `user.id` raw 보간(여러 hook) — UUID라 실위험 낮으나 패턴 회피 ⚠️ |

P0(즉시 데이터 유출·전량 실패)는 없음.

### ✅ 수정 적용 (260624)

| # | 수정 | 파일 |
|---|------|------|
| 1 | couple_votes RLS를 `is_couple_partner` 게이트로 강화 — INSERT는 실제 linked 파트너에게만, SELECT/UPDATE는 현재 연동 중일 때만(임의 주입·언링크 후 잔존 동시 차단) | `migrations/20260624000000_couple_votes_link_guard.sql` |
| 4 | (동상) 언링크 시 파트너 접근 즉시 회수 — votes도 diary와 동일하게 status='linked' 게이트 | 〃 |
| 3 | 일기 사진: 스토리지 SELECT를 커플 범위로 확장 + 조회 시점 `createSignedUrls` 재서명 → 7일 만료 깨짐 해소 | `migrations/20260624010000_couple_diary_photos_storage_couple_read.sql`, `useCoupleDiary.ts` |
| 2 | 일기 "수정"이 실제 `updateEntry` 호출 — `useParams(:id)` 편집 모드, 기존 일기 prefill, 기존 사진 표시/삭제 | `CoupleDiaryWrite.tsx` |
| 8 | CoupleVote 빈 catch 제거(로깅) + 비연동 연동 유도 배너(dead-end 방지) | `CoupleVote.tsx` |

검증: `npm run build` ✅ · `vitest`(useCoupleLink·PartnerLinkCard 16/16) ✅ · `eslint` 0 errors.
DB 마이그레이션은 정적 작성만 — **실 DB 적용·2계정 e2e는 미수행**(`main` 머지 시 배포). 실환경 확인 권장.
P2 #5(budget orphan)·#6(favorites stale)·#7(일정 템플릿)·a11y·개인화는 deferred(§7).

---

## 1. 핵심 백엔드 — 양호 (✅ 확인)

- **`redeem_couple_invite(p_code)`**(`...516180000`→`...521010000`→`...606192000`): SECURITY DEFINER로
  RLS 우회 lookup, `status='pending'` WHERE 가드로 동시 redeem race 차단, **1커플 강제**(redeemer/
  inviter 기존 linked 거부), 본인 잔여 pending 정리, 양쪽 `user_wedding_settings.partner_user_id`
  동기화까지 원자 처리. PUBLIC revoke + authenticated grant로 anon 브루트포스 차단. 클라 인자
  `{p_code}` ↔ 시그니처 1인자 일치(✅ RPC 인자 불일치 없음).
- **`is_couple_partner(_other)`**(`...606190000`): `status='linked'` 게이트 → **언링크 즉시 RLS 차단**.
  budget_items/settings·schedule_items·wedding_settings·profiles·vendor_board·invitations/RSVP가
  이 헬퍼로 일관 공유. INSERT는 본인 한정 유지(소유 오염 방지) — 모델 올바름.
- **`unlinkCouple`**(`useCoupleLink.ts:222`): supabase-js `{error}`를 throw로 검사(RLS 거부·네트워크
  실패를 성공으로 오인 안 함), 양쪽 settings `partner_user_id=null`, `invalidateCoupleShared()`로
  캐시 즉시 복귀. 주석에 "프라이버시: linked 잔존 시 헤어진 상대에 노출" 근거 명시 — 의식적 설계.
- **반쪽 연동 자가복구**: `settingsSynced` 추적 + `resync_couple_settings` RPC(자동+수동) — 옛 연동
  (sync 추가 이전) graceful 복구. UI에 재동기화 배너까지. 견고.

---

## 2. 보안/인가

### [P1] couple_votes RLS에 커플 연동 검증이 전혀 없음 ✅
- `supabase/migrations/20260223140410_...sql:22-36` (이후 강화 마이그 **없음** — grep 전수 확인)
- INSERT는 `WITH CHECK (auth.uid() = user_id)`만, SELECT/UPDATE는 행의 `user_id OR partner_user_id`
  컬럼만 본다. **couple_links 연동 여부를 RLS가 검증하지 않는다.** 따라서:
  - 공격자가 `user_id=self, partner_user_id=<임의 victim UID>`로 투표를 INSERT하면, victim은
    SELECT 정책(`auth.uid()=partner_user_id`)으로 **자기 투표 보드에 그 투표를 보게 되고**, UPDATE
    정책상 `partner_pick/partner_reason`을 채우게 된다. **연동과 무관하게 누구나** 타인 보드에 콘텐츠
    주입(스팸·하라스먼트 벡터)이 가능.
  - 대조: `couple_diary`는 `is_couple_member(uid, link_id)`(`status='linked'` 요구)로 게이트됨.
    votes만 비대칭으로 뚫림.
- 권고: couple_votes에 `couple_link_id` 도입 + `is_couple_member` 게이트로 통일하거나, 최소한 INSERT
  WITH CHECK / SELECT·UPDATE USING에 `is_couple_partner(partner_user_id)` 검증 추가. 클라(`CoupleVote.tsx`)
  도 link 기반으로 작성하도록 정렬.

### [P2] PostgREST `.or()` 문자열 보간 ⚠️
- `useCoupleLink.ts:45`, `useCouplePartnerId.ts:35`, `coupleHandlers.ts:25/50/114`, `CoupleVote.tsx:38`
- `.or(\`user_id.eq.${user.id},partner_user_id.eq.${user.id}\`)`. `user.id`는 인증 UUID라 실위험은
  낮고 RLS가 2차 방어이나, 값에 쉼표/괄호가 끼면 필터 파싱이 깨지는 패턴. 기존 escape 유틸 미사용.

### [P1/프라이버시] 청첩장 RSVP 커플 공유 — 하객(제3자) PII 자동 공유 ⚠️
- `20260622030000_invitation_rsvp_couple_share.sql:14-37`
- 파트너가 `invitation_rsvp`(하객 이름·연락처·참석) SELECT/DELETE. 도메인상 합리적이나 **하객은
  "신랑·신부 양쪽에 공개됨" 고지를 못 받음**, 보존기간·언링크 후 처리 정책 없음. 또한 같은 파일
  주석은 "UPDATE/발행은 소유자 전용"이라 하나 이 마이그는 SELECT만 추가 → **기존 `invitations`
  UPDATE 정책이 `auth.uid()=user_id`로 좁혀졌는지 실DB 교차확인 필요**(검증 게이트 미충족).

---

## 3. 기능 미완 / dead-end UI

### [P1] 일기 "수정"이 신규 생성됨 ✅
- 라우트 `App.tsx:307` `/couple-diary/edit/:id` → `CoupleDiaryWrite`, 진입은 `CoupleDiary.tsx:192`
  "수정" 버튼. 그러나 `CoupleDiaryWrite.tsx`는 `useParams`로 id를 **읽지 않고**, 기존 일기를
  prefill하지 않으며, `handleSave`가 **항상 `createEntry`**(`:77`)를 호출한다. `useCoupleDiary`에
  `updateEntry`가 구현돼 있으나 **호출처가 없다**. → "수정"을 누르면 빈 폼이 뜨고, 저장 시 **중복
  일기가 새로 생성**된다. 명백한 기능 미완.
- 권고: `CoupleDiaryWrite`에서 `useParams().id`로 편집 모드 분기 → 기존 entry fetch·prefill →
  `updateEntry` 호출. 또는 임시로 edit 라우트/버튼 숨김.

### [P2] CoupleVote 비연동 폴백·가드 부재 ⚠️
- `CoupleVote.tsx`: `isLinked`를 import(`:27`)만 하고 **사용하지 않음**. 비연동 사용자가 `/couple-vote`
  직접 진입 시 연동 유도 화면 없이 빈 보드, "+" FAB로 `partner_user_id=null` 반쪽 투표 생성 가능.
  대조: `CoupleDiary`는 `!isLinked` 폴백(스케줄 이동 CTA) 있음. votes도 동일 폴백 필요.
- `CoupleVote.tsx:68` 빈 `catch { /* ignore */ }` — partner 조회 실패를 삼켜 반쪽 투표 생성(빈 catch 금지 위반).

---

## 4. 안정성(복원력) / 정확성

### [P1] 일기 사진 — 7일 서명 URL을 DB에 영속 저장 ✅
- `useCoupleDiary.ts:103-114`: 업로드 후 `createSignedUrl(path, 7일)`의 **만료 URL을
  `couple_diary_photos.photo_url`에 그대로 저장**해 렌더한다. → **7일 뒤 모든 일기 사진이 깨진
  이미지**가 된다(파트너·본인 모두). 또한 URL이 새는 7일 동안은 폴더 RLS를 우회한 접근 가능.
- 권고: `storage_path`만 저장하고 **조회 시점에 서명 URL 재발급**(또는 버킷 public + RLS). 이미
  `storage_path`를 저장 중이라 전환 비용 낮음.

### [P1/프라이버시] 언링크가 couple_votes를 정리하지 않음 ✅
- `unlinkCouple`(`useCoupleLink.ts:222-243`)은 `couple_links`+`user_wedding_settings`만 정리. couple_votes는
  자체 `user_id/partner_user_id` 컬럼으로 RLS를 거므로(§2-1), **언링크 후에도 양쪽이 과거 투표·이유를
  계속 조회·수정**한다. (couple_diary는 `is_couple_member`의 `status='linked'`로 즉시 차단 — 비대칭.)
- 권고: 언링크 시 해당 커플 couple_votes를 정리(soft-delete 또는 partner_user_id null) 또는 votes도
  `is_couple_member` 게이트로 전환.

### [P2] budget_settings 커플 동시 최초생성 시 orphan 행 ⚠️
- `useBudget.ts`(saveSettings INSERT own-only) + `...606190000.sql:86`. 커플 양쪽이 거의 동시에 예산
  설정을 처음 만들면 각자 user_id로 **행 2개** 생성(커플 단위 유니크 없음). 이후 `linkOwnerId` 기준
  한쪽만 정식 사용·다른 행 orphan. 합산엔 영향 없으나 드리프트/혼란.

### [P2] useCoupleFavorites partnerId 소스 불일치(DRY) → 언링크 직후 stale ⚠️
- 예산·일정은 경량 `useCouplePartnerId`(React Query 단일 소스, invalidate로 즉시 복귀)를 쓰는데,
  찜만 무거운 `useCoupleLink`(hook-local `useState`)에서 partnerId를 계산. 언링크를 수행한 인스턴스가
  아니면 cross-instance 동기화가 안 돼 **헤어진 상대 찜이 잠깐 계속 노출**. favorites도
  `useCouplePartnerId`로 통일하면 해소.

### [P2] 일정 템플릿 언링크 orphan/중복 ⚠️
- `useWeddingSchedule.ts` `generateScheduleFromTemplate`의 멱등 가드가 `.in("user_id",[me,partner])`
  count 기반 → 연동 중 한쪽만 시드 후 언링크 시 빈 일정 잔존 또는 재시드 중복 가능(주석도 인지만).

### [P2] select error를 데이터 없음과 혼동 ⚠️
- `coupleHandlers.ts:29-31`(챗봇 `couple_status`): `if (error || !data)` → DB 에러를 "아직 연결 안
  됨" **오답**으로 확정(이미 연동된 사용자에게도). `useVendorBoard.ts:44-47/139`: select `error`
  미구조분해 → RLS 거부·네트워크 실패를 빈 보드로 렌더(데이터 유실 착시). `client_error_logs` 관측 없음.

---

## 5. 접근성(a11y) ⚠️

- `CoupleDiary.tsx`: 일기 카드 전체가 `div onClick`(키보드 포커스 불가), 사진 `alt=""`.
- `CoupleDiaryWrite.tsx`: mood 버튼 이모지에 `aria-label` 없음(이모지 자체도 비어 있음 — `:14-19`).
- `PartnerLinkCard`는 양호(주요 버튼 `aria-label` 부착 확인 ✅).

---

## 6. 초개인화(개인화 기회 매트릭스) — 차원 14

| surface | 가용 신호 | 현재 깊이 | 목표 |
|---------|-----------|-----------|------|
| PartnerLinkCard | 연동상태·variant(mypage/budget/schedule) | ④ 카피/CTA 변형 | 유지(양호) |
| CoupleVote | D-day·예산·진행단계 **미사용** | ① 없음 | ③ 주제 큐레이션(단계별 "지금 정할 것") |
| CoupleDiary | mood·D-day **미사용** | ① 없음 | ③ mood 트렌드·기념일 회고 큐레이션 |
| 공유 예산/일정 | partner 신호 활용(공유) | ② 공유 | ③ 분담 추천 등 |

CoupleVote/Diary는 비연동 폴백이 핵심(votes는 폴백 자체 없음 — §3). 연동 후엔 페르소나·D-day
신호를 **전혀 안 써** 전원 동일 화면. 큐레이션(③) 한 단계 상향 여지 큼.

---

## 7. 남은 작업 (deferred / 실DB 교차확인 필요)

- ⬜ 기존 `invitations` UPDATE 정책이 `auth.uid()=user_id`로 좁혀졌는지 실DB 확인(§2 RSVP).
- ⬜ couple_votes·couple_diary가 언링크/재연동 시 옛 데이터 노출 막는지 실DB e2e(현재 SQL 레벨만 확인).
- ⬜ budget_settings 동시생성 orphan 실재 여부(실DB row 조회).
- 본 감사는 **코드/마이그레이션 정적 분석** 기준. 클라 e2e(실제 2계정 연동→공유→해제)는 미수행 —
  실환경 확인 권장.

## 검증 표기 요약
- ✅ 직접 확인: #1(couple_votes RLS 전수 grep), #2(라우트+컴포넌트 read), #3(서명URL read),
  #4(unlink 핸들러 read), 핵심 RPC 3종·is_couple_partner·언링크.
- ⚠️ 서브에이전트 보고(미직접확인): #5~#10 및 RSVP/보드 세부 — 실DB·e2e 교차확인 권장.
