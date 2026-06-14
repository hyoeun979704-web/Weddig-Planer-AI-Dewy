# 260614 전체감사 _2 — dead-end UI 중심 + 보안·정확성 (코드리뷰)

> 계기: 사용자가 "이전 감사 때 활성화 안 되는 토스트(문의하기) 확인하라 했는데 아직 남아있다 →
> 감사 md 를 고도화해야겠다"고 지적. **전체 코드리뷰를 했는데도 '동작하는 척하는' placeholder
> CTA 가 살아남은** 구조적 누락을 규칙화하고, 그 렌즈로 재감사했다.
> 범위: ① dead-end UI/placeholder CTA(이번 핵심) ② 보안(SECURITY DEFINER RPC·엣지펑션·XSS·필터
> 인젝션) ③ 정확성/DRY(결제 멱등·silent 실패·race). 3개 도메인을 병렬 서브에이전트로 **현재 코드
> 기준** 적대적 분석 + 직접 검증(build·lint·SQL). 직전 리뷰: `260614_codereview.md`(플랫폼/출시 감사).

## TL;DR

- **규칙 고도화**: AGENTS 검증 섹션 + 전체 코드리뷰 양식에 **dead-end UI/placeholder CTA 차원**을
  정식 추가(`a40a886`). 보안·버그 중심 감사는 "에러 없이 토스트만 띄우는" placeholder 를 매번
  놓친다 — "기능 존재 ≠ 기능 완성". 회귀 전문 `docs/verification-lessons.md`(260614 사례).
- **핵심 dead-end 해소**: 미입점 업체 '문의하기'가 죽은 토스트만 띄우던 것(활성 업체 4,126곳 중
  소유자 있는 곳 극소수 = **사실상 거의 전부**)을 실연결로(`1a57bc8`). 더해 입점 업체는 사장님이
  문의 채널(인앱/URL/전화)을 직접 고르게(`45b8f43`). 챗봇이 **이미 출시된** 모바일 청첩장을 "곧
  출시"로 안내하며 무관 페이지로 보내던 것 수정(`962b6bf`).
- **보안 P1 1건 수정**: AI 쿼터 게이트 RPC 자가우회(클라가 limit 파라미터를 넘기는데 authenticated/
  anon 실행 허용 → 엣지 비용캡 무력화)를 service_role 전용으로 잠금(`8a64daa`/mig `20260614164732`).
  그 외 보안은 **P0/P1 없음**(결제·포인트·커플/가족 링크·SSRF·시크릿 전부 견고 — 2차 에이전트 확인).
- **정확성 P1 2건 수정**: 결제 승인 **중복발사**(결제/하트/구독 3경로, ref 가드) + 청첩장 발행 시
  이미지URL 저장 **silent 실패**(throw)(`8a64daa`).
- **검증**: `npm run build` OK · `npm run lint` OK · RPC revoke/URL 스킴/전화 살균 SQL 로 확인.
  ⚠️ 브라우저/실기기 e2e 미확인(샌드박스) — 결제 중복발사·문의 분기는 실환경 확인 권장.

---

## 1. dead-end UI / placeholder CTA (이번 핵심)

서브에이전트 스윕 결과 실 dead-end 4건(P0 0·P1 2·P2 2). "동작하는 척하는" 버튼만 골라 정리.

| # | 항목 | 위치 | 처리 | 커밋 |
|---|---|---|---|---|
| 1 | 미입점 '문의하기'가 죽은 토스트만 | `PlaceDetailLayout.tsx` | 온라인채널→전화→안내 폴백. 연락데이터 보유 22%(928곳) 실연결, 나머지는 정직한 입점 권유 | `1a57bc8` |
| 2 | 챗봇이 출시된 청첩장을 "곧 출시"+무관 페이지(`/ai-studio`)로 | `staticGuideHandlers.ts:53`·`intentRouter.ts:304` | '지금 만들기 `/invitation/new`'로 카피·링크 수정 | `962b6bf` |
| 3 | 상세 #태그 칩이 버튼인데 누르면 "곧 출시" 토스트 | `PlaceDetailLayout.tsx` | 태그검색 미연결 → 비대화형 `<span>`(잘못된 클릭 어포던스 제거) | `962b6bf` |
| 4 | Settings 오픈소스 라이선스/언어 row(chevron인데 토스트) | `Settings.tsx:96,162` | **deferred**(라이선스는 실제 페이지 필요 = 별도 스코프) | — |

**판정상 dead-end 아님(정상)**: AIStudio "준비중" 카드(실제 WaitlistSheet 동작) · 전화문의 버튼
(tel 폴백) · ValueTagChipRow(W1 데이터 가드) · BusinessReviews 권한요청(→/business/claim) ·
admin ComingSoon · 각종 검증/성공 토스트.

## 2. 보안 (SECURITY DEFINER RPC · 엣지펑션 · XSS · 필터 인젝션)

### P1 (수정) — AI 쿼터 자가우회
- `increment_ai_usage_gated` / `increment_ai_usage_if_allowed` 가 **limit 을 클라 파라미터로 받는데**
  authenticated·anon 에 EXECUTE 가 열려 있었다. 엣지펑션(ai-planner·vendor-web-search, service_role
  로 호출하며 limit 을 프리미엄 여부로 서버 산정)을 우회해 RPC 직접 호출 시 비용캡 무력화. `auth.uid()`
  가드는 '남의 카운터 증가'만 막지 '내 캡 우회'는 못 막음. → **service_role 전용 revoke**
  (`8a64daa`, mig `20260614164732`). 호출부 src 직접호출 0 확인 → 엣지 경로 무영향.

### P2 (일부 수정 / 일부 deferred)
| # | 항목 | 위치 | 처리 |
|---|---|---|---|
| 1 | AdminPlaces 검색 PostgREST 필터 인젝션(raw ilike 보간) | `AdminPlaces.tsx` | 공용 `escapeLikePattern`+`quoteForOr` 적용 (`8a64daa`) |
| 2 | 공지 배너 링크 `javascript:`/`data:` 미검증 | `AnnouncementBanner.tsx` | http(s) 스킴 검증 추가 (`8a64daa`) |
| 3 | `increment_post_views`/`increment_place_views` anon 무제한 증가(카운터 어뷰징) | mig | **deferred**(dedup 테이블/엣지 throttle 필요) |
| 4 | RSVP anon insert(캡 트리거는 있으나 IP 제한 불가) | mig | **deferred**(엣지 rate-limit/캡차) |
| 5 | `is_premium_member(p_user_id)` 임의 user 프리미엄 여부 노출 | mig | **deferred**(RLS 정책 의존 — 영향분석 후 auth.uid() 전환) |
| 6 | admin RPC 4종 PUBLIC EXECUTE(내부 has_role 가드로 노출 없음) | mig `20260612090000` | **deferred**(defense-in-depth, REVOKE 추가) |
| 7 | 엣지펑션 raw `error.message` 클라 반환(스키마 누출) | migrate-data·verify-business 등 | **deferred**(엣지 = main 배포 시 처리) |

> 2차 보안 에이전트 종합: **P0/P1 없음**. 결제(kakao-pay-*) JWT sub 권위·서버 가격·금액검증·자동환불·
> 멱등, 포인트/하트 lockdown, 커플/가족/민감설정 auth.uid() 원자성, SSRF safeFetch, 시크릿 0,
> search_path 전 함수 고정 — 모두 견고. 위 P2 는 어뷰징/저영향.

## 3. 정확성 / 버그 (P1)

| # | 항목 | 위치 | 처리 | 커밋 |
|---|---|---|---|---|
| 1 | **결제 승인 중복발사**(user 지연+StrictMode → sessionStorage 가 승인 후 비워져 같은 tid 2회 승인, 이중 하트적립) | `PaymentSuccess.tsx`·`HeartChargeSuccess.tsx`·`SubscriptionPaymentSuccess.tsx` | 검증 통과 후 소비하는 동기 `approvedRef` 가드 | `8a64daa` |
| 2 | 청첩장 발행 시 뷰어 이미지URL 저장(update) **silent 실패** → 이미지 깨진 청첩장 발행 | `InvitationFlow.tsx` | `{ error }` 확인 후 throw 로 publish 중단 | `8a64daa` |
| 3 | 커플다이어리 삭제 DB error 미확인 → UI만 제거되는 drift | `useCoupleDiary.ts` | delete error throw | `8a64daa` |
| 4 | 검색 디바운스 경쟁상태(느린 이전 응답이 덮어씀) | `CommunitySearchOverlay.tsx` | `cancelled` 가드 | `8a64daa` |
| 5 | partner_deals view_count fire-and-forget unhandled rejection | `usePartnerDeals.ts` | reject 핸들러 | `8a64daa` |

> React 훅 위생은 서브에이전트 다중 스윕 결과 **무한루프·stale-closure·cleanup 누락 0**(functional
> setState·ref·cancelled 플래그 일관 사용). 결제 중복발사만 실 결함이었다.

## 4. 공통화(DRY) · 도메인 변경

- **DRY**: AdminPlaces 검색이 공용 `postgrestEscape` 헬퍼를 안 쓰고 raw 보간하던 drift 제거(§2-P2-1).
  CommunitySearchOverlay 는 이미 헬퍼 사용 — 동일 패턴으로 정렬.
- **도메인 변경(신규 기능)**: 입점 업체 문의 채널 선택(`45b8f43`). `places.inquiry_channel`
  ('chat'|'url'|'phone', CHECK)+`inquiry_url`/`inquiry_phone`, `upsert_my_listing` 파라미터 확장
  (url=^https?:// 만, phone 안전문자 살균, 값 없으면 chat 강등), 사장님 폼 3-세그먼트 UI,
  상세 분기, types.ts 반영. 인앱 채팅은 기존 PlaceInquirySheet 그대로.

## 5. 규칙 / 문서

- `AGENTS.md` 검증 섹션: **placeholder CTA(죽은 토스트) 금지** + dead-end UI 차원 규칙 (`a40a886`).
- `AGENTS.md` 전체 코드리뷰 양식: **dead-end UI/placeholder CTA 필수 섹션** 명시 (`a40a886`).
- `docs/verification-lessons.md`: 260614 회귀 전문(미입점 문의 죽은 토스트 — 전체 감사가 놓친 이유·
  뿌리는 제품/데이터 결정 부재) (`a40a886`).

## 적용 마이그레이션

| version | 파일 | 내용 |
|---|---|---|
| `20260614163431` | `add_listing_inquiry_channel.sql` | places.inquiry_channel/url/phone + CHECK, upsert_my_listing 확장(살균) |
| `20260614164732` | `lockdown_ai_usage_rpc_to_service_role.sql` | AI 쿼터 RPC 2종 service_role 전용 revoke |

> 둘 다 remote DB 적용 완료(MCP) + repo 파일화(drift 방지). list_migrations 로 적용 확인.

## 남은 작업 (deferred)

- **dead-end**: Settings 오픈소스 라이선스 정적 페이지 신설(현재 토스트), 언어 row chevron 제거.
- **보안 P2**: post/place view 카운터 dedup, RSVP anon rate-limit, is_premium_member auth.uid() 전환,
  admin RPC PUBLIC→authenticated REVOKE(defense-in-depth), 엣지펑션 error.message 일반화(main 배포 시).
- **기능 확장**: 상세 #태그 → 실제 태그 검색(useVenues/useCategoryData 에 `?tag=` 연결) 후 칩 재활성화.
- **데이터 공백(코드 아님)**: 미입점 4,126곳 중 78%가 연락처 데이터 없음 → 문의 폴백이 안내로 끝남.
  수집 데이터 보강 또는 입점 유도 필요(별도 트랙).
- **e2e**: 결제 3경로 중복발사 가드·문의 채널 분기·청첩장 발행은 실기기/브라우저 확인 권장(샌드박스 한계).
