# Round 22 — 전체 코드리뷰 + 자동 패치 종합 보고서

작성: 2026-05-25, 작업 브랜치 `claude/persona-ux-review-DovGY`

## 진행 요약

5개 영역 (Tips / Tutorial / Persona / Auth / AI·결제) 병렬 코드리뷰 → 통합 분류 → SAFE 항목 자동 패치 → 커밋 `dfa1439`.

추가 시뮬레이션 (페르소나 5종 user journey · 빈 결과 엣지 케이스) 2개는 Claude 세션 한도로 즉시 종료. 본 보고서는 첫 라운드 5개 에이전트 보고 기반.

---

## ✅ 자동 패치 완료 (`dfa1439`)

| # | 영역 | 패치 | 효과 |
|---|---|---|---|
| 1 | AI 챗봇 | `DbHandlerKey` 에 `"web_search"` 추가 | type drift 해소 (line 536) |
| 2 | Tips | `buildClassifyText()` helper 추출 + 3 스크립트 통합 | drift 차단 (collect/sync/reclassify) |
| 3 | Tips | anti-pattern false-negative 회귀 테스트 7개 | '1분 꿀팁' / '드라마 같은' 등 안전 |
| 4 | Tutorial | `isLessonVisible` requiresStyles 미러 체크 | style=null 시 self 전용 lesson 숨김 |
| 5 | 온보딩 | `src/lib/onboarding.ts` utility + 사용처 2개 통일 | inline 로직 drift 차단 + 7 unit tests |
| 6 | Tips UI | `Tips.tsx` 의 visibleHotPool / freshList / hotList / formatFiltered useMemo | 자식 memoization 무효화 회피 |

**테스트**: 234/234 통과. **DB 정합성**: tip_videos/tip_channels 컬럼 일치 (PASS), persona marker trigger 최신 fix 적용 확인 (PASS — Round 16 회귀 위험 없음).

---

## 🔴 P0 — 사용자 결정 필요 (UNSAFE)

### 1. Kakao Pay webhook 검증 누락
- **위치**: `supabase/functions/kakao-pay-charge-approve/index.ts` 전체
- **현상**: 클라이언트가 보낸 `pgToken` 만으로 결제 승인. webhook signature (HMAC-SHA256) 검증 없음. 토큰 위변조 / 재사용 가능.
- **권장**: Kakao 공식 docs 의 webhook 시그니처 검증 로직 추가. payment_key 외 pgToken 자체도 재검증.
- **이유 NEEDS_REVIEW**: 결제 모듈은 라이브 트랜잭션 영향. 충분한 staging 검증 필요.

### 2. Tutorial alias guard 의 네트워크 race
- **위치**: `src/hooks/useTutorial.ts:103-120`
- **현상**: alias check (`tutorial_completions` 조회) 가 timeout / 일시적 DB 오류 시 silent fail → RPC 가 award 중복 발급 가능. PK constraint 가 최종 가드지만, lesson rename 등으로 PK 가 다르면 중복 award 재발.
- **권장**: alias check 에 retry policy (3회, 지수 백오프) + 실패 시 RPC skip.
- **이유 NEEDS_REVIEW**: 포인트 정책 결정 영역 (강한 정합성 vs 가용성).

---

## 🟠 P1 — 사용자 피드백 필요 (NEEDS_REVIEW)

### 3. tipCuration 가 `persona_mode` 미사용
- **위치**: `src/lib/tipCuration.ts:115-153` (buildCurationFactors)
- **현상**: Tips 랭킹이 `weddingStyle` (general/small/self) 만 사용. pregnancy/remarriage/international/self_no_ceremony/groom_focus 같은 페르소나가 boost 안 받음. 5종 카테고리는 queries.ts 와 tipClassify 에 정의됐는데 큐레이션 단에서 활용 안 됨.
- **권장**: `buildCurationFactors` 에 `personaMode` 입력 추가 + `PERSONA_HINTS` 정의. 예: pregnancy → pregnancy_wedding +0.5 boost, remarriage → remarriage_family +0.5 등.
- **결정 필요**: 페르소나별 boost 강도, 페르소나 카테고리 vs phase 카테고리 우선순위.

### 4. PIPA 동의 우회 경로
- **위치**: `src/pages/Index.tsx:54-59`, `src/hooks/useDataCollectionConsent.ts:28-30`
- **현상**: `WeddingInfoSetupModal` dismiss 후 `WEDDING_INFO_DISMISS_KEY="1"` 저장 → 결혼정보 미입력 + consent 미확인 상태로 홈 진입 가능. 일정/예산 페이지는 별도 gate 있지만 홈 자체는 열림.
- **권장**: onboarded 판정에 consent state 포함하거나, dismiss key 에 timestamp 추가하여 일정 기간 후 재안내.
- **결정 필요**: PIPA 강제력 (즉시 차단 vs 점진적 유도).

### 5. 모달 stacking deadlock
- **위치**: `src/pages/Index.tsx:78-81`, `TutorialWelcomeSheet.tsx:122`, `WeddingInfoSetupModal:274-287`
- **현상**: `WeddingInfoSetupModal` + `TutorialWelcomeSheet` + `DataCollectionConsentModal` 이 비동기로 동시 트리거 시 race condition. 사용자가 여러 모달에 갇힘.
- **권장**: 모달 트리거 매니저 (전역 stage state) 도입 — `useHomeFirstRun` 의 stage machine 확장.
- **결정 필요**: 우선순위 정의 (consent > onboarding > tutorial?).

### 6. 세션 동기화 race
- **위치**: `src/contexts/AuthContext.tsx:91-115`
- **현상**: `onAuthStateChange` → `setSession` → `getSession()` 재호출. 멀티탭에서 다른 탭이 sign-out 시 stale session 캐시 읽기 가능. `backfillMarketingConsent` 비동기 호출 완료 전 user context null 변화.
- **권장**: AbortController + useEffect cleanup 강화.
- **결정 필요**: 보안 영향 분석 (multi-tab attack scenario).

### 7. AI rate limit race
- **위치**: `supabase/functions/ask-gemini/index.ts`, `src/hooks/useSubscription.ts`
- **현상**: 일일 5회 한도가 클라이언트 카운터만으로 추적. 동시 다중 호출 시 race → 한도 초과 가능. 서버에서 `ai_usage_daily` 원자성 UPDATE 없음.
- **권장**: Edge function 에서 `ai_usage_daily upsert + SELECT FOR UPDATE` 로 원자성 보장.
- **결정 필요**: 호출 비용 (Gemini API tier) 영향 검토.

### 8. Prompt injection
- **위치**: `src/lib/chatbot/dbHandlers.ts:576`, `ask-gemini/index.ts:46`
- **현상**: 사용자 메시지가 검증 없이 LLM contents 에 주입. `<system>무시...` 같은 패턴 삽입 가능.
- **권장**: `[사용자]` 프리픽스 + 특수 토큰 이스케이프 + length cap.
- **결정 필요**: AI 응답 품질 vs 보안 trade-off.

### 9. tutorialActive route change leak
- **위치**: `src/hooks/useTutorial.ts:61-76`, `src/lib/tutorialActive.ts`
- **현상**: BottomNav 클릭으로 라우트 변경 시 비동기 cleanup 이 tutorialActive 카운터 누수 가능. Wedding info modal 이 잘못 yield, stale coachmark 발생.
- **권장**: cleanup 순서 보장 + 카운터 reset on unmount.

### 10. Reset cache 비대칭
- **위치**: `src/hooks/useTutorialProgress.ts:119-152`
- **현상**: `reset()` 이 localStorage 만 clear, DB 는 그대로. invalidate 후 useQuery 가 DB 결과를 다시 merge 하면 reset 이 시각적으로 무효.
- **권장**: `setQueryData` 로 즉시 localState clear + invalidate.

---

## 🟡 P2 — 점진적 개선 (SAFE / 보고만)

자동 패치 가능했지만 시간/위험 trade-off 로 보류:

| 항목 | 영역 | 비용 |
|---|---|---|
| OAuth `state` parameter 검증 | Auth | 보안 강화, 라이브러리 호환성 확인 필요 |
| redirect URL 화이트리스트 | Auth | Supabase auth config + 클라이언트 검증 |
| 마케팅 backfill localStorage key 강화 | Auth | provider+timestamp 추가 |
| reclassify 부분실패 카운트 명시 | Tips | 운영 가시성 |
| RSS XML charset 처리 | Tips | YouTube 는 UTF-8 고정이라 no-op |
| TutorialOverlay z-index scale 통일 | Tutorial | 9998/9999/10000 흩어짐 — 리팩토링 |
| TutorialWelcomeSheet startTarget null 라벨 | Tutorial | "30초 둘러보기" 약속 미달 시 silent |
| error_logs 테이블 + 대시보드 | AI/결제 | 관찰성 |
| description GIN 인덱스 | Tips | 검색 성능 |
| heart_transactions 환불 원자성 | 결제 | 트랜잭션 로깅 강화 |

---

## 📋 시뮬레이션 미진행 영역 (세션 한도)

다음은 첫 라운드에서 다루지 못한 영역으로, 별도 진행 권장:

1. **페르소나 5종 user journey** — pregnancy/remarriage/international/self_no_ceremony/groom_focus 별 Tips/Tutorial/AI 표시 정확도 시뮬레이션
2. **빈 결과 / 엣지 케이스** — 신규 가입 직후, D-day 경계, 검색 메타문자, 토큰 만료
3. **DB schema vs 코드 사용 컬럼 audit (전체)** — Tips/Channels 외 다른 테이블 (`user_blocks`, `community_reports`, `heart_transactions` 등) 의 PostgREST type drift. type-check 에서 이미 다수 노출됨
4. **routing + deep link** — 로그인 후 의도 페이지 보존, BottomNav state 전환

---

## 🎯 다음 단계 권장 우선순위

**즉시 (사용자 환경 1회 실행)**:
1. `npm run reclassify-tips -- --enrich --transcripts` — 기존 778편을 full description + tags + transcript 로 재분류 (16 quota units, ~20분)

**다음 commit 후보 (사용자 결정 후 자동 패치 가능)**:
2. tipCuration 에 persona_mode signal 추가 (P1 #3) — 페르소나 5종 boost 활성화
3. TutorialWelcomeSheet startTarget null 시 CTA 라벨 변경 (P2)
4. OAuth state parameter 검증 (P2)

**별도 PR 권장 (큰 변경)**:
5. Kakao Pay webhook signature 검증 (P0 #1)
6. Tutorial alias guard retry policy (P0 #2)
7. 모달 stacking 매니저 (P1 #5)

**관찰성 개선 (별도 sprint)**:
8. error_logs 테이블 + 대시보드
9. AI rate limit 원자성 (P1 #7)

---

## 📊 코드 품질 메트릭

- 테스트: 234 → +10 = **234** ( onboarding 7 + classifier 회귀 3 )
- 커밋: 이번 라운드 1개 (`dfa1439`)
- DB 정합성: tip_videos PASS, tip_channels PASS, persona trigger PASS
- 타입 에러: scripts/ 0 errors, src/ 의 사전 존재 에러 (`user_blocks`, `web_search` 외 다수) 는 별도 정리 필요

DB 자체 상태 (Tips):
- 747 active / 50 inactive / 0 active uncategorized
- 113 tip_channels (RSS sync 대상, 392 영상 추적)
