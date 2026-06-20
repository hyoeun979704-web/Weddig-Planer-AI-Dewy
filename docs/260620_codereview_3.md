# 260620 전체 코드 감사 #3 — PR #374 (전후비교·추천인·IAP·프롬프트 DB편집·스튜디오 카드)

> 같은 날 3번째 감사(오전 `_codereview.md`·`_2.md` 와 별건). 머지된 PR #374(48파일) 대상 + 출시 가능 판정.

## TL;DR (핵심 성과)
- **머지된 PR #374(48파일, +1773/-119)를 6차원 + dead-end + iOS 차원으로 전면 감사**(병렬 3개 심층 에이전트).
- **결제(IAP) 머니패스에서 P0 3건·P1 3건 발견 → 즉시 수정.** 가장 치명적: `play-rtdn` 가 `config.toml` 누락으로
  `verify_jwt` 기본값(true)을 상속 → Google Pub/Sub push 가 **401 로 전량 차단** → 환불·취소·만료가 **영영 미처리**
  (환불 사용자가 프리미엄·하트 영구 보유). 그 외 원장-지급 비원자성(결제됐는데 미지급 + 재시도 불능) 등.
- **UI 회귀 P1 1건 수정**: 옛 프리뷰 webp 삭제로 `promptCatalog.ts` 15개 `exampleImage` 가 404 → `banner-*.webp` 로 교정.
- **비결제 기능(스튜디오 카드·전후비교·추천인·신고·프롬프트 DB편집)은 모두 PASS** — 출시 가능.
- **결제(IAP)는 수정 후에도 실기기 e2e 전엔 "완료" 아님**(컨테이너 검증 불가, 룰 준수). 콘솔 세팅 + 라이선스 테스터 필수.

## 출시 판정 (바로 출시 가능한가?)
| 묶음 | 판정 | 근거 |
|---|---|---|
| 스튜디오 카드 배너 리뉴얼 | ✅ 출시 가능 | object-cover 풀블리드 + 텍스트 오버레이, 폴백 그라디언트·onError 정상. 잘림/충돌 없음 |
| 전후비교(Dress·Makeup) | ✅ 출시 가능 | result·source 둘 다 있을 때만 토글, 기본=결과, signed URL 누락 graceful |
| 추천인 `?ref` 자동적용 | ✅ 출시 가능 | self/중복 RPC+UNIQUE 차단, 24h 만료, try/catch(iOS 안전) |
| AI 결과물 신고 | ✅ 출시 가능 | 실제 `community_reports` insert(placeholder 아님), 6페이지 targetId 정상 |
| AI 프롬프트 DB 실시간 편집 | ✅ 출시 가능 | DB 우선·하드코딩 폴백(빈 프롬프트 불가), RLS admin 전용, 마이그 유효 |
| **안드로이드 인앱결제(IAP)** | ⚠️ **수정 후 실기기 e2e 필요** | 아래 P0/P1 수정 완료. 단 콘솔 등록·서비스계정·Pub/Sub·라이선스 테스터 실결제 검증 전엔 노출 금지 |

**결론**: 비결제 기능은 즉시 출시 가능. **IAP 는 코드 결함 수정은 끝났으나, 운영 세팅 + 실기기 결제 e2e 가 끝나야 사용자 노출** 가능(머니패스 룰).

## 보안 (인가·시크릿·웹훅)
| 심각도 | 위치 | 이슈 | 조치 |
|---|---|---|---|
| **P0** | `supabase/config.toml` (play-rtdn 누락) | RTDN 함수가 `verify_jwt=true` 상속 → Pub/Sub 401 → 환불·취소·만료 영구 미처리 | **수정**: `[functions.play-rtdn] verify_jwt=false` 추가 |
| **P0** | `supabase/config.toml` (iap-verify-google 누락) | 머니패스 함수가 암묵 기본값 의존(취약) | **수정**: `verify_jwt=true` 명시 |
| **P0** | `play-rtdn/index.ts:16` | verify_jwt=false 인데 `RTDN_VERIFY_TOKEN` 미설정 시 토큰검사 skip → **누구나 위조 환불/취소 POST 가능** | **수정**: fail-closed — 토큰 미설정이면 전량 403 |
| P1 | `iap-verify-google/index.ts:57,84` | obfuscatedExternalAccountId 가 있을 때만 user 대조. Google 이 누락 시 **타 user 토큰 교차 사용** 여지 | **deferred** — 실기기에서 바인딩 항상 채워지는지 확인 후 강제. 현재 멱등·서버검증으로 1차 방어 |
| Good | `_shared/googlePlay.ts` | SA JWT(RS256/pkcs8/1h) 서명 정확, 키는 env·미로깅·클라 미노출 | — |
| Good | `migration 20260620060000` | `iap_transactions` RLS: SELECT=본인, INSERT/UPDATE 정책 없음(service-role 만 기록), `(platform,store_txn_id)` UNIQUE 멱등 | — |
| Good | `payments/index.ts` | anti-steering: web=kakao / android=IAP / iOS=unavailable(결제 UI 은닉) | — |
| P2 | `invitation-text-suggest/index.ts:132` | client `role`/`tone` 무살균 주입(자기 범위 한정 prompt-injection) | deferred — enum allowlist 권장. 권한·데이터 경계 안 넘어 저위험 |

## P0/P1 버그 (정확성·원자성)
| 심각도 | 위치 | 이슈 | 조치 |
|---|---|---|---|
| **P1** | `iap-verify-google/index.ts` (hearts·sub insert) | insert 에러를 **전부** "이미 처리"로 간주 → 23505 외 DB 오류 시 **결제됐는데 미지급**을 성공으로 가림 | **수정**: `code==='23505'` 만 already-processed, 그 외 500 |
| **P1** | `iap-verify-google/index.ts` (earn_hearts·sub upsert) | 원장 insert 후 지급 실패 시 console.error 만 하고 success 반환 → **결제·미지급 + 멱등가드로 재시도 불능** | **수정**: 지급 실패 시 원장 row 삭제(롤백) + 500 → 재시도 가능 |
| **P1** | `src/data/promptCatalog.ts` | 삭제된 옛 webp 15개 `exampleImage` → `/admin/ai-prompts` 404 | **수정**: `banner-*.webp` 교정 + `AdminAIPrompts.tsx` onError 폴백 |
| P2 | `src/lib/payments/iap.ts:119` | finished 가 검증결과 없을 때 `{ok:true}` 기본 → 거짓 성공 토스트 | **수정**: `lastVerified.set` 을 `finish()` 앞으로 이동 + 기본 `{ok:false}`(정상경로 유지) |

## dead-end UI / placeholder CTA
- 변경 파일에 신규 no-op/토스트-only CTA **없음**. 전후비교 토스트=실제 실패 피드백, 잠금 카드=실제 `WaitlistSignupSheet`,
  "준비중" 배지=정상 상태 라벨(작동 대기열 CTA 동반). AI 신고=실제 insert. ✅

## iOS / 사파리(웹)
- 변경 파일에 raw localStorage·date input·HEIC·safe-area 신규 이슈 **없음**. 카드 `object-cover` Safari 안전.
- 추천인 localStorage 는 raw 접근이나 **전부 try/catch 래핑**(iOS throw graceful — 가입 차단 안 함). ✅
  (P2 nit: `createSafeStorage` 어댑터 통일 권장 — deferred)

## 공통화 / 도메인 변경
- `_shared/prompts.ts getPrompt()` 신설 — 프롬프트 DB로드 단일 진입점(드리프트 방지).
- 옛 프리뷰 webp 12개 제거 + `banner-*.webp` 6개 단일화. precache 축소.

## 규칙 / 문서
- 본 감사 기록(`docs/260620_codereview_3.md`) — AGENTS.md "전체 코드리뷰" 룰 준수(같은날 3건째 → `_3`).
- IAP 등록 절차: `docs/260620_google_iap_setup.md`. **신규 시크릿 `RTDN_VERIFY_TOKEN` 필수**(fail-closed).

## 검증 인프라
- `npm run build` ✓ · `npm run test` 531 ✓ · 결제 테스트 7 ✓ · 엣지 esbuild(iap-verify-google·play-rtdn·ai-planner·invitation-text-suggest) ✓ · 변경파일 eslint 0 error.
- ⚠️ **실결제·구독갱신·RTDN·환불·복원은 실기기 + Play 라이선스 테스터 + 내부테스트 트랙에서만 검증 가능** → e2e 전엔 IAP "완료" 아님.

## 적용 마이그레이션
| 파일 | 내용 | 상태 |
|---|---|---|
| `20260620060000_iap_transactions.sql` | IAP 멱등 원장(RLS service-role write, UNIQUE) | 이미 머지·적용 |
| `20260620070000_ai_prompts.sql` | 프롬프트 DB편집 테이블 + RLS(admin) + 시드 | 이미 머지·적용 |
| (이번 감사 수정은 코드/config 만 — 신규 마이그 없음) | — | — |

## 남은 작업 (deferred — IAP 정식 노출 전 처리)
1. **계정 바인딩 강제(P1)**: 실기기에서 `obfuscatedExternalAccountId` 항상 채워지는지 확인 후, 누락 시 거부(또는 토큰당 단일 user 보장).
2. **환불 시 하트 회수(P2)**: `play-rtdn` voided 가 구독만 만료, 소비성 하트 미회수. 사용분 정책 결정 후 원장 기반 회수.
3. **RTDN 토큰→user 역조회를 원장 기준으로(P2)**: 현재 `subscriptions.payment_id` → 하트 환불·upsert 실패 누락. `iap_transactions.store_txn_id` 진실원천화.
4. **basePlanId 폴백 제거(P2)**: 누락 시 `monthly` 기본 대신 거부+로깅(요금 오기록 방지).
5. **role/tone enum allowlist(P2)** · **localStorage safe 어댑터 통일(P2)**.
6. **실기기 결제 e2e 전반**: 하트구매→원장·적립 / 구독→active / 해지·환불→RTDN 반영 / 복원.
