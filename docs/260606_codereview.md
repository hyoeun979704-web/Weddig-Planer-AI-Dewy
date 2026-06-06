# 260606 코드리뷰·보안감사 작업 기록

> 브랜치 `claude/code-review-security-audit-tOqbk` 에서 진행한 전체 코드리뷰·보안 하드닝·
> 구조 개선 세션 기록. 시작 요청: "코드 전체 리뷰 — 열려있는 PR / 보안 구멍 / 마무리 안 된
> 작업 중점". 이후 폴더정리·공통화·규칙 정비·페르소나 20모드 재구성·비주얼 검토 harness 로 확장.
> 통계: **119 files, +2185 / −3538** (origin/main 기준). 커밋 23개.

## TL;DR — 핵심 성과

- **보안 구멍 3건 차단**: 미인증 외부데이터 덤프 함수 삭제, send-push 인가 추가, 외부 API 키 env 화.
- **P0 런타임 버그 2건**: AdminDashboard 무한루프(별 PR로 머지), kakao-pay 결제승인 TDZ(이 세션 도입→이 세션 수정).
- **공통화 단일 소스**: edge `_shared`(cors·jwt·llm·supabase), 프론트 `lib`(priceFormat·relativeTime 등).
- **페르소나 20모드 재구성**: 단일 레지스트리 + 우선순위 룰테이블, 코드↔DB 트리거 패리티, 38 테스트.
- **규칙 정비**: 6차원 코드리뷰 규칙 상시 적용, 멀티툴 단일 소스(AGENTS.md), CLAUDE.md ~35% 슬림화.
- **검증 인프라**: DB 임퍼소네이션 e2e(롤백 트랜잭션) + Playwright 비주얼 harness.

---

## 1. 보안 (가장 중점)

| 항목 | 내용 | 커밋 |
|---|---|---|
| discover-external 삭제 | **미인증** 외부 데이터 덤프 엔드포인트 — 인가 게이트 없이 외부 소스 노출. 사용처 없음 확인 후 제거 | `72ef5e1` |
| send-push 인가 | 원래 **인증 게이트 자체가 없던** 함수 → service_role 검증 추가(순수 개선) | `72ef5e1` |
| 외부 API 키 env 화 | 하드코딩/노출 가능 키들을 `Deno.env` 로 이전 | `72ef5e1` |
| service_waitlist insert 하드닝 | RLS insert 정책 강화 | `20260605170000` |
| AI 사용량 원자화 | 한도 체크-증가 race → `increment_ai_usage_if_allowed`(원자적, `WHERE message_count < p_limit`) | `574d99d` / `20260606120000` |
| tutorial alias-guard race | 중복 보상 award → 재시도 + fail-closed | `e4490ed` |

**검증 원칙 준수**: 인가(authorization)는 인증과 별개로 "이 user 가 이 리소스에 권한 있나"를
확인. 클라엔 제네릭 에러, 상세는 서버 로그(PII·스키마 비노출).

## 2. P0 런타임 버그 (정적검사 통과·런타임 실패)

- **AdminDashboard 무한루프**: `today`/`weekAgo` 를 deps 에 매 렌더 새 객체로 넣어 재요청 폭주.
  → 별도 PR #188 로 squash 머지.
- **kakao-pay 결제승인 TDZ** (이 세션 `_shared/supabase.ts` 리팩터가 도입 → 같은 세션 수정):
  `import { adminClient }` 를 `const adminClient = adminClient()` 로 섀도잉 → **TDZ
  ReferenceError → 구독·하트충전 승인 100% 불능**. build·lint·esbuild 전부 통과해 정적으로
  안 잡힘. 로컬명 `admin` 으로 rename. → `e833f32`. **회귀 기록**: `verification-lessons.md`.

## 3. 폴더정리 / 공통화 (드리프트 차단)

- **Next.js 잔재 제거**: `src/app/*`, `src/pages/_app.tsx` 등 Vite 단일화로 죽은 스텁 정리,
  `types/` → `src/types/` 이동 (`15d4360`).
- **edge `_shared` 단일화**: `cors.ts`(corsWith) · `jwt.ts`(jwtRole) · `llm.ts`(모델 문자열) ·
  `supabase.ts`(`adminClient()`). 15개 함수 마이그레이션 (`3b0a30e` `fd955a6` `b9e5465`).
  - 검증: PUT/PATCH/DELETE·비표준 Allow-Header 쓰는 함수만 예외 처리(notify-inquiry의
    `x-webhook-secret` 보존). anon↔service 키 스왑 없음 확인.
- **프론트 공통화**: `priceFormat`·`relativeTime`·`categoryLabels`·`placeMappers` 단일 소스화,
  lazy 라우트 `ErrorBoundary` 추가 (`86a341c`). 죽은 dressFilters icon 경로(404 잠복) 제거 (`f5a59c5`).
- **라벨 통일**: "신혼여행"→"허니문" 표시 라벨 통일(value 매칭은 불변 — label/value 분리 준수) (`ac640bf`).

## 4. 페르소나 20모드 재구성

- **구조**: `src/lib/weddingPersona.ts` → `PERSONA_REGISTRY`(20모드, 배열 순서 = 우선순위) +
  `derivePersonaMode` 순회. `PERSONA_HEADER`/`LABEL`/`describePersonaForAI` 파생 (`ff79c5d` `74397db`).
- **신규 신호·모드**: `has_children`·`planning_style` 수집 → 4개 신규 모드 활성화 (`47b2899`).
  - UI: `SensitivePreferencesCard`(재혼 시 has_children 토글), `WeddingInfoSetupModal`(planning_style 4칩).
- **dead branch 수정**: `remote_overseas`(해외거주·한국식)가 international 조건에 가려지던 버그 →
  `isInternational: weddingCountry !== "KR"` 로 수정 (client + DB 트리거) (`74397db` / `20260606140000`).
- **코드↔DB 패리티**: 레지스트리 20모드 = 트리거 20 distinct return, 우선순위 line-by-line 일치.
- **e2e 발견 버그**: DB 임퍼소네이션(롤백 트랜잭션) 테스트가 `persona_mode` CHECK 가
  `remarriage_with_children` 를 안 받는 production-breaking 버그 포착 → CHECK 20모드로 확장
  (`4c88fa7` / `20260606180000`). build·lint·unit 이 못 잡은 걸 e2e 가 잡은 사례.
- **테스트**: `weddingPersona.test.ts` 38 테스트(coverage/reachability/priority/parity).

## 5. 규칙·문서 정비 (멀티툴 단일 소스)

- **6차원 코드리뷰 규칙 상시 적용**: AI 바이브코딩 PDF 분석 → 정확성/보안/성능/테스트/
  유지보수성/아키텍처. `docs/code-review-rules.md` (`21a00a9`).
- **AGENTS.md 단일 소스**: Claude(`CLAUDE.md` → `@AGENTS.md`)·Codex·Antigravity 공용.
  툴별 사본 금지(드리프트 방지). 페르소나 UX 검토 규칙 추가 (`57ea448`).
- **CLAUDE.md 슬림화**: 병렬작업 토큰 효율 ~35% 감축 + 환경 치트시트 (`12b1ddd`).
- **god-file 분리 계획**: InvitationStudio/Flow 단계별·리스크별 (`69a641e`, 실행은 보류).
- **검증 회귀 기록**: `verification-lessons.md` 에 섀도잉→TDZ 사례 추가 (`08e6aad`).
- **병렬 설정**: `.claude/settings.json` 검증 명령 allowlist + 서브에이전트 라우팅 (`1b753e9`).

## 6. 검증 인프라

- **DB e2e 임퍼소네이션**: `SET request.jwt.claims` + 롤백 트랜잭션, `jsonb_populate_record`
  로 read-only 트리거 테스트. → persona CHECK 버그 포착.
- **Playwright 비주얼 harness**: `scripts/visual-review/screenshot.cjs` + `mock-supabase.cjs`,
  문서 `docs/visual-review.md` (`10a89c6` `fd4ba4c` `c1a4dcb`).
  - TLS 검증 무력화는 `INSECURE_TLS=1` opt-in(프록시 전용, 실네트워크 금지).
  - 사전설치 chromium fallback, throwaway 테스트계정만, 자격증명 env-only.
  - **한계**: 샌드박스 allowlist 가 `*.supabase.co` 차단 → 로그인·데이터 의존 화면은
    네트워크 열린 환경에서만 캡처 가능(셸 UI 는 어디서나).

## 7. 적용된 마이그레이션 (PROD)

| 파일 | 내용 |
|---|---|
| `20260605170000` | service_waitlist insert 하드닝 |
| `20260606120000` | `increment_ai_usage_if_allowed` (AI 한도 원자화) |
| `20260606140000` | persona `remote_overseas` 트리거 수정 |
| `20260606150000` | persona 신규 신호 컬럼(has_children, planning_style) |
| `20260606160000` | persona 트리거 신규 모드(20 distinct return) |
| `20260606170000` | `set_sensitive_preference` has_children 분기 |
| `20260606180000` | `persona_mode` CHECK 20모드 확장 |

---

## 남은 작업 (deferred)

- **god-file 분리 실행**: 계획만 작성됨(`docs/god-file-split-plan.md`). InvitationStudio/Flow.
- **풀 비주얼 e2e**: 네트워크 allowlist 에 `*.supabase.co` 추가 시 로그인 플로우 캡처 가능
  (환경 설정 → Network access → Custom → include defaults).
- **priceStats.ts:97 단일소스 흡수**: 두 번째 `formatManwon`(≥1억 미처리)이 `priceFormat.ts`
  단일소스를 잠식 — 후속 정리 대상.
- **ErrorBoundary chunk-reload 플래그**: 성공 로드 시 미초기화(경미).

## 비회원(로그아웃) UX 검토 요약

- 🔴 커뮤니티 **읽기가 로그인 게이팅** / AI플래너·일정·예산·마이페이지 게이팅.
- 🟢 홈·팁·스토어·베뉴는 오픈.
- 권장: 커뮤니티 읽기 개방, 홈 가입모달 지연, 로그아웃 시 fallback 추천, 게이트에 "맛보기" 프리뷰.
