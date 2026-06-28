# Phase 4 실행 기획 — 모노레포 전환 + Partners(사장님) 네이티브 앱 (260628)

> 상위 문서: 전략·경쟁사 분석 `260624_app_separation_roadmap.md`, 단계 상세 `260624_app_separation_execution_plan.md`,
> 직전 진행 `260627_app_separation_phase2_handoff.md`. 이 문서는 그 **Phase 4를 현재 상태에 맞춰
> PR 단위로 실행**하기 위한 기획이다(코드 변경 없음 — 합의 후 착수). 백엔드는 단일 Supabase 유지(분리 금지).

## 0. 확정 사항 (사용자, 2026-06-28)

1. **방식 = B(모노레포, Turborepo/npm workspaces).** 빌드 플래그 임시방편이 아니라 정석 분리.
2. **사장님 앱 = 기업회원 전용.** 순수 partners. 소비자 기능(AI 스튜디오·청첩장·쇼핑 등)·광고(admob)·
   하트 IAP·홈 위젯 **미탑재**.
3. **출시 = 앱 2개 × (Android+iOS) = 4 바이너리.** 단, **소비자 Android는 이미 출시(라이브)** →
   기존 앱 출시 연속성(appId·서명·패키지) 보존이 **최우선 제약**.
4. **백엔드 1개 공유**(Supabase). 운영자(console) = 웹(+설치형 PWA), 네이티브 앱 아님.

> 경쟁사 표준과 일치(roadmap §1-A): 배민/쿠팡/당근/네이버 모두 소비자 앱 ↔ 사장님 앱 별도, 백엔드 1개.

## 1. 현재 상태 (실측 출발점, 2026-06-28)

| 항목 | 현황 |
|---|---|
| Phase 1 | ✅ 완료 — `src/features/{consumer,partners,console}` 도메인 폴더 + 경계 린트 강제 |
| Phase 2 | ✅ 완료(이번 세션, PR #501) — 소비자 **네이티브**에서 console·partners 트리셰이크 제외(sourcemap 0), `/business*`→웹 안내 폴백 |
| 레포 | 단일(`package.json` name `dewy`, **workspaces 없음**), 단일 `vite/tailwind/eslint/tsconfig` |
| 네이티브 | 단일 `capacitor.config.ts`(`appId: app.dewy`, `appName: Dewy`, `webDir: dist`). **`android/`·`ios/` 프로젝트 커밋됨**(소비자). 소비자 Android **라이브 출시됨** |
| 네이티브 init | `src/main.tsx` 가 `isNativeApp()` 게이트로 deepLink·safeArea·resume 로드. admob·IAP(`cordova-plugin-purchase`)·위젯은 소비자 전제 |
| DB 타입 | 단일 `src/integrations/supabase/types.ts`(6,749줄) |
| 도메인 | (로드맵 결정) `dewy.app`(소비자)·`partners.dewy.app`·`console.dewy.app`. **현 운영 도메인/딥링크 실설정은 4-0에서 점검** |

**핵심 함의**: Phase 1·2가 끝나 `features/*` 경계가 이미 서 있다 → 모노레포 전환의 대부분은
**"폴더를 워크스페이스로 승격 + 앱별 빌드/네이티브 구성 추가"** 이고, 새 로직 작성은 적다. 가장 큰
리스크는 코드가 아니라 **라이브 소비자 Android 앱의 출시 연속성**(appId/서명/패키지 경로)이다.

## 2. 목표 구조

```
dewy/ (monorepo)
├─ apps/
│  ├─ consumer/   # Dewy(소비자) — 웹 + iOS + Android. appId app.dewy (★기존 라이브 — 연속성 유지)
│  │   ├─ src/ (features/consumer + App·main)   ├─ android/  ├─ ios/  ├─ vite.config.ts  ├─ capacitor.config.ts
│  ├─ partners/   # Dewy 파트너(사장님) — 웹 + iOS + Android. appId app.dewy.partners (신규, 기업회원 전용)
│  │   ├─ src/ (features/partners + 자체 App·main)  ├─ android/  ├─ ios/  ├─ vite.config.ts  ├─ capacitor.config.ts
│  └─ console/    # Dewy 콘솔(운영) — 웹 + 설치형 PWA. 네이티브 빌드 없음
├─ packages/
│  ├─ db/     # @supabase/supabase-js client + 생성 types.ts(단일 소스) + 도메인별 re-export 뷰
│  ├─ auth/   # AuthContext + useUserRole(공유 — 단일 신원/역할)
│  ├─ ui/     # components/ui(Radix) + 공용 컴포넌트(guides·ImageUploader 등)
│  └─ lib/    # priceFormat·categoryLabels·platform·native/* 등 공용 유틸 + 공유 hooks
└─ supabase/  # functions + migrations (단일 프로젝트, 그대로)
```

- **공유 vs 분리(roadmap §3 재확인)**: 앱(프론트)·빌드·배포·네이티브 = **완전 분리**. DB·Auth·Functions =
  **공유 1개**(RLS·역할로 접근만 가름). 마켓플레이스라 견적·업체·리뷰·쿠폰·문의가 소비자↔사장님 오감 → 분리 불가.
- **계정 미분리**(roadmap §3 회원모델): 기존 기업회원 19명은 **데이터 이전 0** — 같은 계정으로 사장님 앱
  로그인 → 역할 게이트 통과. "이전"=새 앱 다운로드 안내일 뿐.

## 3. 사장님 앱 범위 (기업회원 전용)

**포함**
- partners 라우트 전부(`features/partners/routes`)를 **앱 루트로** 마운트(`/` = 대시보드/랜딩, 현 `/business/*` 상대경로 재배치).
- `BusinessGuard` + 공유 인증(`AuthContext`)·`useUserRole`·`useQuotes`(견적 공유 — packages/auth·lib).
- **푸시알림**(신규 리드·문의 실시간) — APNs/FCM. 사장님 앱의 핵심 가치(경쟁사 표준).
- 컴플라이언스 필수 공용 화면: 설정·**회원탈퇴 인앱 경로**·1:1 문의·알림설정·약관/개인정보·사용 가이드(`features/partners` 가이드).

**제외(소비자 전용 — 미탑재)**
- 소비자 화면 전부(홈·검색·AI 플래너/스튜디오·청첩장·쇼핑·커뮤니티·예산/일정·마이페이지 등).
- **admob 광고**, **하트 IAP**(`cordova-plugin-purchase`), **홈 위젯**(`widgetBridge`), 소비자 딥링크 스킴.

**컴플라이언스 이득(범위에서 파생)**: 광고 없음 → **ATT/IDFA 불필요**. 인앱 디지털재화 판매 없음(사장님 요금은
B2B 외부청구) → **IAP 강제 불필요**. → iOS 반려 3대 사유(ATT·IAP·권한문구) 중 둘이 구조적으로 회피, 남는 건
권한문구(카메라/사진/푸시)+탈퇴+개인정보 일치. (runbook §11 / `ios-packaging.md`)

## 4. 단계별 실행 (PR 단위) — 출시 연속성 우선·작게 쪼갬

> 원칙: 각 PR 단위 build/test/lint/integrity 녹색 + 소비자 앱 **회귀 0**(이미 라이브). "정적 통과 ≠ 런타임 안전".

### PR 4-0 — 사전 점검·동결 (코드 변경 없음, 문서 산출)
- 라이브 소비자 Android **release 연속성 인벤토리**: appId(`app.dewy`)·서명키(keystore)·`versionCode/Name`·
  패키지 경로·등록된 딥링크(`apple-app-site-association`/`assetlinks.json`)·OAuth redirect URL·플러그인 목록.
- 소비자 **iOS 출시 상태 확인**(미출시면 신규 제출, 출시면 연속성 대상). → 출시 매트릭스(§5) 확정.
- 산출물: 연속성 체크리스트 + "이 값들은 마이그레이션 후에도 동일해야 함" 고정표.

### PR 4-A1 — 모노레포 골격 (빈 워크스페이스)
- 루트 `package.json`에 `workspaces: ["apps/*","packages/*"]` + **Turborepo**(`turbo.json`: build/lint/test/typecheck 파이프라인·캐시). 의존성 호이스팅 정리.
- 아직 `src/` **이동 없음** — 골격만. 기존 `npm run build/test/lint` 그대로 녹색(루트 위임).

### PR 4-A2 — shared → `packages/*` 승격
- `src/{lib,hooks,components/ui,components/<공용>,contexts,integrations,types,data/<공용>}` → `packages/{lib,ui,db,auth}`.
- `@/` alias → 패키지 import(`@dewy/lib`·`@dewy/ui`·`@dewy/db`·`@dewy/auth`)로 치환(tsconfig paths·eslint 경계 갱신).
- `packages/db`: client + `types.ts` **단일 소스** + 도메인별 re-export(`db/partners.ts`·`db/consumer.ts`)로 ergonomics만 개선.
- 검증: 전체 build/test 녹색(순수 이동, 동작 변화 0).

### PR 4-A3 — consumer 앱 워크스페이스화 (★연속성 핵심)
- `src/features/consumer` + 소비자 `App`/`main`/config → `apps/consumer/`.
- **기존 `android/`·`ios/` 를 `apps/consumer/` 아래로 이동**(appId `app.dewy`·서명·패키지 **그대로**). `capacitor.config.ts`(소비자) 이동, `webDir` 경로 재설정.
- 앱별 `vite.config.ts`(현 PWA·manualChunks·capacitor 분기 그대로)·`tailwind`·`index.html`.
- 검증: 소비자 **web 빌드 산출물 diff 최소**, **native release 빌드 appId·서명 동일**(4-0 고정표 대조), 캡처 회귀 0.

### PR 4-A4 — console 앱 워크스페이스화 (웹/PWA)
- `src/features/console` → `apps/console/`. 웹+설치형 PWA 빌드. 네이티브 없음.
- 소비자 앱에서 console은 이미 제외돼 있음(Phase 2) → 이동만.

### PR 4-B1 — partners 앱 스캐폴드 (웹 먼저)
- `apps/partners/` 생성: 자체 `main.tsx`(네이티브 init = **푸시·딥링크·safeArea만**, admob/IAP/widget 제외),
  자체 `App.tsx`(partners 라우트를 **루트**로: `/`=대시보드, 로그인=공유 auth, `BusinessGuard`).
- `features/partners`를 이 앱이 소유(이미 분리돼 있어 이동 단순). 공유는 `packages/*` import.
- 자체 `vite.config.ts`(IAP/admob 청크 없음). **웹 빌드 먼저 녹색 + 캡처 시뮬레이션**.

### PR 4-B2 — partners 네이티브 프로젝트
- `apps/partners/capacitor.config.ts`: `appId: app.dewy.partners`, `appName: "Dewy 파트너"`, 자체 아이콘/스플래시.
- `cap add android/ios` → `apps/partners/{android,ios}` 신규. 권한 사용설명 문자열(카메라·사진·**푸시**) Info.plist/AndroidManifest.
- 딥링크 association = `partners.dewy.app`. OAuth redirect(partners 스킴/도메인) Supabase Auth 등록.
- 검증: 에뮬레이터 스모크(로그인→대시보드→리드/문의), 빌드 녹색.

### PR 4-B3 — partners 푸시알림
- 신규 리드(`/quote`→leads)·문의 발생 시 푸시. 트리거 = 공유 supabase function(역할=business 대상),
  토큰 테이블에 `app`(consumer/partners)·`platform` 컬럼으로 구분 발송. 비용 0(APNs/FCM).

### PR 4-C — 배포·도메인·CI
- `dewy.app`(consumer)·`partners.dewy.app`·`console.dewy.app`. `vercel.json`·CI **앱별 분리**(Turborepo 영향 그래프로 변경 앱만 빌드).
- 각 (서브)도메인에 association 파일 호스팅. OAuth redirect 도메인별 등록.

### PR 4-D — 감사·경계·문서
- 경계 린트/`check-integrity`를 워크스페이스 기준으로 갱신(`packages` 역의존 차단 유지).
- `audit-surface-*` 앱별 분할(Phase 3와 합류) + `weekly-audit` 매트릭스에 partners 앱 추가.
- 핸드오프·로드맵 진행상태 갱신.

## 5. 출시 매트릭스

| 앱 | 플랫폼 | appId | 상태 | 비고 |
|---|---|---|---|---|
| 소비자 | Android | `app.dewy` | **라이브(유지)** | 연속성 보존 — 서명/버전 승계 |
| 소비자 | iOS | `app.dewy` | 4-0에서 확인 | 미출시면 신규 제출 |
| 사장님 | Android | `app.dewy.partners` | **신규** | Phase 4-B |
| 사장님 | iOS | `app.dewy.partners` | **신규** | Phase 4-B |
| 콘솔 | 웹/PWA | — | 웹 | 네이티브 없음 |

- **스토어 비용 추가 0원**: 기존 Apple($99/년)·Google($25) 계정이 앱 무제한 커버.
- 사장님 앱은 광고·IAP 미탑재 → 변동비 0, 심사 부담 최소.

## 6. 백엔드 공유 처리 (단일 Supabase)
- `packages/db` 1곳에서 타입 생성 → 3앱 공유. 마이그레이션·시크릿 단일(3배 비용 회피).
- 인가는 **RLS**가 끝까지 책임(클라 가드는 UX). 프론트 분리는 보안 강화 아님.
- 푸시 토큰 테이블에 앱/플랫폼/역할 구분 컬럼(사장님 앱만 리드·문의 푸시 수신).
- OAuth redirect는 도메인별 등록(소비자/파트너 콜백 분리).

## 7. 리스크 · 가드레일 (AGENTS 14차원 연계)
1. **🔴 출시 연속성(최대 리스크)** — 라이브 소비자 Android. 모노레포 이동이 appId/서명/패키지/딥링크를
   바꾸면 "신규 앱"으로 갈라져 기존 사용자 업데이트가 끊긴다. → 4-0 고정표 대조, native release 빌드로 appId·서명 동일 검증 후에만 머지.
2. **대규모 import 이동(4-A2)** — 작은 PR + 단계마다 build/test/lint/e2e. 순수 이동은 `git revert` 가능.
3. **공유 hook 오분류 금지** — `useUserRole`·`useQuotes`·`formDraft`는 packages 공유(소비자·partners 양쪽 사용). partners로 독점 이동 금지.
4. **네이티브 init 분기** — `main.tsx`가 앱별로 다름(소비자=admob/IAP/widget, 사장님=푸시만). 플러그인 의존성도 앱별 `package.json`.
5. **types 단일 소스 유지** — `packages/db` 1곳 생성. 앱별 복제 금지(드리프트).
6. **컴플라이언스 앱별 반복** — 사장님 앱도 소비자와 **별개 심사**: 권한문구·탈퇴·개인정보 일치(runbook §11).
7. **RLS 의존** — 데이터 격리는 DB가 책임. 사장님 앱이 소비자 테이블에 RLS로 못 닿는지 재확인.

## 8. 검증 (각 단계 공통)
- 양 앱 web+native build 녹색 + lint/test/integrity 0 error.
- **소비자 앱 회귀 0**: 캡처 시뮬레이션(브라우저 구동) + native release appId/서명 동일.
- sourcemap 도메인 격리: 소비자 번들 partners/console 0(유지), 사장님 번들 소비자 0.
- e2e: 권한 분기(비사업자 차단)·견적 공유(소비자 작성→사장님 수신)·푸시 수신.

## 9. 일정 (러프 — execution_plan Phase 4 = 4~6주)
| 마일스톤 | 포함 | 비고 |
|---|---|---|
| M1 골격·shared | 4-0·4-A1·4-A2 | 위험 낮음(순수 이동) |
| M2 앱 분리 | 4-A3·4-A4·4-B1 | 소비자 연속성 검증 게이트 |
| M3 사장님 네이티브 | 4-B2·4-B3 | 신규 스토어 제출 준비 |
| M4 배포·감사 | 4-C·4-D | 도메인·CI·감사 매트릭스 |

## 10. 착수 전 확인 1건 (나머지는 md에서 확정)
- **소비자 iOS 현재 출시 상태**(라이브 / 미출시) — §5 매트릭스와 4-A3 연속성 범위에 영향. (Android는 라이브 확정)
- 그 외(모노레포·appId `app.dewy.partners`·partners=기업회원 전용·백엔드 공유·푸시)는 본 문서/상위 md로 **확정**.

---
*문서 끝. 합의 시 PR 4-0(연속성 인벤토리)부터 착수. 각 PR 녹색·소비자 회귀 0 확인 후 다음 단계.*
