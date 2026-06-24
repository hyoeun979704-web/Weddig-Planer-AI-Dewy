# 앱 분리 실행계획서 — Phase 1~5 상세 (260624)

> 동반 문서: 전략·근거·경쟁사 분석은 `docs/260624_app_separation_roadmap.md`(왜·무엇을).
> 이 문서는 **어떻게**(세부 작업·산출물·PR 쪼개기·검증 기준·의존성·일정). 실제 코드 의존성
> 전수 조사(2026-06-24, grep 검증)를 반영했다.

## 분리 대상 정의 (확정)

| 도메인 | 현재 위치 | 목표 |
|---|---|---|
| consumer (소비자) | `src/pages/*.tsx`(~79) + 다수 | `src/features/consumer/` → `apps/consumer`(네이티브+웹) |
| partners (업체관리) | `src/pages/business/*`(18) + `src/components/business/*`(3) | `src/features/partners/` → `apps/partners`(네이티브+웹) |
| console (운영+마케팅) | `src/pages/admin/*`(30) | `src/features/console/` → `apps/console`(웹) |
| shared | `src/{hooks,lib,components/ui,contexts,integrations,types,stores,data}` | 유지 → Phase 4에서 `packages/*` 승격 |

**원칙(전 단계 공통)**: ① 백엔드(Supabase)는 단일 유지 ② 각 단계는 빌드·테스트·린트 녹색 +
주요 플로우 e2e 확인 후 머지 ③ 변경은 최소·표적(요구 밖 재작성 금지) ④ "정적 통과 ≠ 런타임 안전".

## 개선 이력 — 적대적 재검증 (2026-06-24)

초안을 다시 grep으로 검증해 다음을 고쳤다(추측 → 실측 교정).

| # | 발견(실측) | 계획 변경 |
|---|---|---|
| 1 | `BusinessGuard`는 **App.tsx에서만** 사용(다른 곳 0). | Phase 1 **5-PR→4-PR**. RoleGuard 제네릭화 삭제 — 라우트 모듈화하면 가드가 따라가 inbound 결합이 저절로 사라짐. |
| 2 | `AdminGuard`는 **admin 28페이지 내부에서 직접 import + 래핑**(+App.tsx 라우트 = 이중 가드). | console 후속에 "import churn 큼·AdminGuard 동반 이동" 명시 + 이중 가드를 deferred 관찰로 기록. |
| 3 | `businessGuides`(business 3곳)/`consumerGuides`(consumer 2곳)는 도메인별로 깔끔히 갈림. 유일 교차결합은 `GuideSlide` **타입**. | `data/*Guides.ts`도 도메인 폴더로 이동을 계획에 포함(데이터 단일 dumping 방지). |
| 4 | business 페이지가 consumer 페이지를 import하는 건 **0건**. | "70% 자체완결" 검증 확정 — 역오염 리스크 낮음. |
| 5 | partners 자체 네이티브 앱은 Phase 4에야 생김. | Phase 2에 "Phase 4부터 소비자 네이티브에서 partners 라우트도 제외" 연동 명시. |
| 6 | DoD가 추상적("e2e 확인")이었음. | 구체 e2e 5종(권한 분기·견적 공유·guide 렌더) + 롤백 전략 추가. |

---

## Phase 1 — 도메인 경계 확립 (in-repo) · 위험 낮음 · 사용자 변화 0

목표: 코드를 도메인 폴더로 물리 분리하고 경계를 린트로 강제. **화면·동작 변화 0.** Partners 먼저
(경계 가장 뚜렷). 의존성 실측 결과 **Partners는 ~70% 자체완결, 역방향 결합 3곳만 끊으면 분리 가능.**

### 실측 요약 (grep 검증됨)

- **Partners로 들어오는 외부 import = 3곳** (이것만 끊으면 됨):
  1. `src/App.tsx:12` — `import BusinessGuard from "@/components/business/BusinessGuard"`
  2. `src/data/consumerGuides.ts:9` — `import type { GuideSlide } from "@/pages/business/BusinessGuideView"`
  3. `src/data/businessGuides.ts:6` — 동일 `GuideSlide` 역import
- **공유 유지(분리 불가) hook/lib** — 소비자·admin도 쓰므로 절대 partners로 옮기지 말 것:
  - `useUserRole`(소비자 MyPage·MenuSection·VendorDetailPage·CommunityAnnouncements + AdminGuard + business)
  - `useQuotes` + `quoteMatch`(소비자 견적 5곳 + BusinessLeads)
  - `formDraft`(소비자 `useTextDraft` 의존)
- **partners로 같이 이동(business 전용)**: `useBranches`(business 8곳만), `businessListingCompleteness`,
  `components/business/{BusinessListingDetailForm,BusinessListingContactForm,DesignListingConsentDialog}`.
- **부분 공유(admin과)**: `lib/businessCategories`(BusinessOnboard + AdminUsers) → 일단 shared 유지.

### 작업을 4개 작은 PR로 쪼갠다 (충돌·리스크 최소화)

> **개선(적대적 재검증, 2026-06-24)**: 당초 5-PR(RoleGuard 제네릭화 포함) 계획에서 **RoleGuard
> 제네릭화를 제거**했다. grep 검증 결과 `BusinessGuard`는 **오직 `App.tsx`에서만** 쓰이므로
> (다른 사용처 0), 라우트를 partners 모듈로 빼면 가드가 자연히 같이 따라가 App.tsx의 inbound
> 결합이 **저절로 사라진다**. 제네릭 가드를 새로 만들 필요가 없어 스코프·리스크가 준다.

**PR 1-a — `GuideSlide` 타입 추출 (유일한 교차결합 제거)**
- 신규 `src/types/guides.ts`에 `GuideSlide` 인터페이스 이동(현 `BusinessGuideView.tsx:14`에서).
- `BusinessGuideView.tsx`·`consumerGuides.ts(:9)`·`businessGuides.ts(:6)`가 `@/types/guides`에서 import.
- 검증: `npm run build` + grep `@/pages/business/BusinessGuideView` → consumer/businessGuides에서 0건.

**PR 1-b — Partners 폴더 이동**
- `src/pages/business/*`(18) → `src/features/partners/pages/*`.
- `src/components/business/{BusinessGuard,BusinessListingDetailForm,BusinessListingContactForm,DesignListingConsentDialog}`
  → `src/features/partners/components/*`.
- `src/hooks/useBranches.ts`(business 8곳만, 역사용 0) → `src/features/partners/hooks/`.
- `src/lib/businessListingCompleteness.ts`(BusinessVendorEdit만) → `src/features/partners/lib/`.
- `src/data/businessGuides.ts`(business 3페이지만 import) → `src/features/partners/data/`.
- `App.tsx`의 business `lazy(import(...))` 경로 + `BusinessGuard` import 경로만 수정(이번 PR엔 routes 구조 유지).
- 검증: `npm run build`·`test`·`lint` 녹색. (모든 페이지가 `@/` alias 라 outbound import 는 안 깨짐.)

**PR 1-c — 라우트 모듈 분리 (App.tsx에서 partners 완전 제거)**
- 신규 `src/features/partners/routes.tsx`: business 18개 `<Route>` + lazy import + `BusinessGuard` 래핑을 여기로.
- `App.tsx` → `<Route path="/business/*" element={<PartnersRoutes/>}/>` 한 줄. **App.tsx의 BusinessGuard
  import·partners lazy 선언 전부 삭제** → App.tsx에 partners 참조 0.
- 검증: business 18경로 직접 진입 + 권한 분기 e2e(아래 DoD).

**PR 1-d — 경계 린트 + 검증 스크립트**
- `eslint.config.js` `no-restricted-imports`(또는 `dependency-cruiser`): `features/*`가 **다른 feature**
  import 금지(shared 루트 허용), shared(`hooks/lib/...`)가 `features/*` import 금지(역의존 차단).
- `scripts/check-integrity.mjs`에 grep 가드: partners 외부에서 `features/partners` import 0,
  shared→partners 역의존 0.
- 검증: 일부러 위반 import 추가 → 린트·스크립트가 잡는지 확인.

### 완료 기준(Definition of Done)
- `npm run build`·`test`·`lint` 녹색 + 경계 린트가 위반을 잡음 + **화면 변화 0**(시각 회귀 없음).
- **권한/공유 e2e(구체)**: ① 비사업자 `/business/dashboard` → 온보딩 리다이렉트 ② 미승인 사업자
  `/business/edit`(requireApproved) 차단 ③ 승인 사업자 정상 진입 ④ **소비자 견적→사업자 수신**:
  `/quote/new` 작성 → `/business/leads` 노출(공유 `useQuotes` 정상) ⑤ guide 렌더(`/business/guides`·`/help`
  — `GuideSlide` 이동 후 양쪽 정상).
- **롤백**: 각 PR이 독립적으로 작고 `git revert` 가능(폴더 이동/타입 추출은 순수 리팩토링). 한 PR 문제 시 그
  PR만 되돌리면 됨.
- 예상: **합산 1~2주**(실작업 ~6~7h + PR 리뷰·검증 여유). RoleGuard 제거로 당초 7~8h보다 소폭 단축.

### 이어서: consumer/console도 같은 패턴 (Phase 1 후속)
partners 검증 후 `pages/admin/*`(30) → `features/console/`, 나머지 소비자 페이지 → `features/consumer/`,
`data/consumerGuides.ts` → `features/consumer/data/` 동일 절차.
- **console은 inbound 결합이 admin 내부에 갇혀 있어 본질은 더 단순**(소비자→admin import 0건 — grep 확인).
- **단, import churn은 더 큼(주의)**: `AdminGuard`는 BusinessGuard와 달리 **각 admin 페이지(28개) 내부에서
  직접 import + `<AdminGuard>` 래핑**한다(+ App.tsx 라우트에서도 wrap = **이중 가드**). 따라서 폴더 이동 시
  `@/components/admin/AdminGuard` import 경로가 28+곳에서 바뀐다 → 기계적이지만 PR이 큼. **AdminGuard도
  `features/console/components/`로 같이 이동**(전 사용처가 console 내부라 경계 위반 없음).
- **부수 관찰(deferred, 이번 범위 밖)**: admin의 라우트레벨+컴포넌트레벨 이중 가드는 기존 중복. 분리와 별개로
  추후 한쪽으로 정리하면 좋음(지금은 동작 보존 위해 그대로 옮김).

---

## Phase 2 — 번들 도메인 분리 · 위험 낮음 · 소비자 앱 경량화

목표: 소비자(특히 네이티브) 번들에서 partners/console 코드 완전 제거.

- **작업 1**: `vite.config.ts` manualChunks에 도메인 청크 추가
  ```ts
  if (id.includes("/features/partners/")) return "app-partners";
  if (id.includes("/features/console/"))  return "app-console";
  ```
- **작업 2**: 네이티브(`--mode capacitor`) 빌드에서 console 라우트 제외(소비자 네이티브는 운영화면 불필요).
  라우트 모듈을 mode 분기 — `if (!isCapacitor) routes.push(consoleRoutes)`. partners는 자체 네이티브
  빌드가 따로 생기는 Phase 4 전까지는 소비자 웹에 동거 가능(청크만 분리).
- **작업 2-b(Phase 4 연동)**: partners 전용 네이티브 앱이 생기는 Phase 4-C 시점에는 **소비자 네이티브
  빌드에서 partners 라우트도 제외**(소비자 앱에 사업자 화면 불필요). 그 전까지는 소비자 **웹**에만 동거 +
  별도 청크로 lazy 로드되어 초기 번들엔 영향 없음.
- **검증**: `vite build` 후 청크 리포트로 소비자 초기 청크 크기 **before/after 수치 비교**(정량). 번들에
  `features/console` 코드가 안 들어갔는지 `dist` 분석.
- 의존성: **Phase 1 완료 필수**(폴더 경로 기반 청크라). 예상: **수일~1주**.

---

## Phase 3 — 앱별 감사 자동화 재편 · 위험 낮음 · 가치 최상 (핵심 통증 해결)

목표: "감사할 때마다 빼먹는" 문제를 구조로 해결. 표면을 앱별로 쪼개 각 감사가 완결되게.

- **작업 1**: `docs/audit-surface-map.md`(130+ 단일맵) → `audit-surface-consumer.md` ·
  `-partners.md` · `-console.md` 분할. 각 맵에 14차원 커버리지 표(✅/⚠️/⬜).
- **작업 2**: `.github/workflows/weekly-audit.yml`을 **앱별 매트릭스 job**으로 재편
  (`strategy.matrix.app: [consumer, partners, console]`). 각 job이 자기 앱 표면만 14차원 감사 →
  커버리지가 앱 단위로 완결, ⬜가 그 앱 안에서 가시화.
- **작업 3**: diff→도메인 매핑(Phase 1 폴더 기반)으로 "변경 앱만 타깃 감사" 옵션 추가(PR 단위 경량 감사).
- **검증**: 분할된 맵으로 1회 수동 감사 돌려 각 앱 커버리지표가 빠짐없이 채워지는지 확인.
- 의존성: **Phase 1 완료 권장**(도메인 폴더가 있어야 표면·diff 매핑이 깔끔). 예상: **1주**.

> 이 단계가 사용자가 말한 "지금 상태로 자동화 비현실적" → "앱별로 작아 자동화 신뢰 가능"의 전환점.

---

## Phase 4 — 모노레포 + 별도 배포 + Partners 네이티브 패키징 · 위험 중 · 장기

목표: 진짜 "별도 앱". 독립 빌드·배포 + Partners 네이티브 출시.

### 4-A 모노레포 전환
- `npm`(또는 pnpm) workspaces: `apps/{consumer,partners,console}` + `packages/{db,auth,ui,lib}`.
- Phase 1의 `src/features/*` → `apps/*`로 승격, `src/{hooks,lib,components/ui,...}` shared → `packages/*`.
- `packages/db`에 `supabase/client` + 생성 `types.ts`(단일 소스) + 도메인별 타입 re-export 뷰.
- 빌드 도구: Turborepo/Nx 도입(캐시·태스크 그래프). 각 앱 독립 `vite build`.

### 4-B 별도 배포 + 도메인
- `dewy.app`(consumer) / `partners.dewy.app` / `console.dewy.app`. `vercel.json`·CI 앱별 분리.
- 각 (서브)도메인에 딥링크 association(`apple-app-site-association`·`assetlinks.json`) 호스팅.
- OAuth/소셜로그인 콜백 redirect를 각 도메인 기준으로 Supabase Auth에 등록.

### 4-C Partners 네이티브 패키징 (출시 형태 네이티브 — 확정)
- 별도 Capacitor 앱: 자체 `appId`/`appName`/아이콘/스플래시(소비자와 번들 ID 분리), `partners`용
  `vite build --mode capacitor` + `cap sync` 파이프라인.
- 필요한 플러그인만 선별(관리업무 + **푸시알림**). consumer의 admob·하트 IAP·위젯은 **안** 가져옴.
- **§8 출시적합성(앱별 반복)**: 권한 사용설명 문자열(카메라/사진), 푸시권한, 회원탈퇴 인앱 경로,
  개인정보 양식↔실수집 일치. 광고·IAP 미탑재 → ATT/IAP 강제 회피로 부담 최소화.
  단일 소스 `docs/260622_appstore_submission_runbook.md §11`.
- 푸시: 신규 리드·문의 실시간 통지(APNs/FCM, 비용 0).
- **스토어 비용 추가 0원**(기존 Apple $99/년·Google $25 계정이 앱 무제한 커버).
- **선행 점검**: 현 `capacitor.config.ts`·`src/lib/native/deepLink`·`src/main.tsx` 네이티브 init을
  partners용으로 분기·정리.
- 의존성: **Phase 1 필수, Phase 2 권장**. 예상: **4~6주**.

---

## Phase 5 — 마케팅 자동화 모듈화 (Console 내) · 위험 낮음 · 가치 높음

목표: 흩어진 마케팅 자동화를 console 앱의 **실제 대시보드 surface**로 통합(별도 앱 X — Meta Business
Suite 패턴).

- **통합 대상**: edge `instagram-draft-generator`·`-publisher`·`-collect-reels`·`-card-renderer`,
  `features/console`(구 admin)의 `AdminInstagramPosts(+Edit)`, `docs/content-distribution.md` 스펙,
  `marketing-draft` 스킬.
- **신규 surface**: console에 `마케팅 자동화` 섹션 — 주제→6채널(쓰레드·인스타·네이버블로그·워드프레스·
  유튜브숏폼·카페) 초안 생성 → 검수 → 발행/노션 적재를 한 화면 흐름으로.
- **업체 마케팅(제휴 브랜드 학습 + 페르소나 소개형 광고)**: 제휴업체의 Drive 폴더 자료를 학습(기존
  `drive-*` 함수) → 페르소나 보이스 유지한 추천형 콘텐츠를 **광고 표기 강제**(§10)로 생성. 상세 설계·
  재사용 인프라·신규 테이블(`vendor_brand_profiles`)은 `260624_console_structure_analysis.md §3-A`.
- **Console 대시보드 재편(솔로+폰)**: admin 30페이지 → 6개 전용 대시보드 + 모바일 우선. `adminNav.ts`
  단일 소스에 `group` 추가로 고도화 쉬운 구조. 상세 `260624_console_structure_analysis.md §2·4·5`.
- **감사 등재**: `audit-surface-console.md`에 신규 섹션 등재 → 자동 감사 대상화(현재 사각지대 해소).
- **비용/쿼터(§11)**: 채널 초안 생성은 LLM·외부 API = 돈. 캐싱·사용량 상한·실패 백오프 같이 설계.
- 의존성: **Phase 1(console 폴더), Phase 3(console 감사맵) 권장**. 예상: **2~3주**.

---

## Phase 간 의존성 · 순서

```
Phase 1 (도메인 경계) ─┬─► Phase 2 (번들 분리)
                       ├─► Phase 3 (감사 자동화)  ◄─ 핵심 통증, Phase 1 직후 권장
                       └─► Phase 4 (모노레포+네이티브) ─► Phase 5 (마케팅 모듈)
```

- **Phase 1이 모든 것의 전제.** 2·3은 1 직후 병렬 가능(서로 독립).
- 사용자 핵심 통증(자동화 신뢰성)은 **1→3**으로 가장 빨리 해소 → 1 다음 3을 우선 권장.
- 4·5는 장기. 4(모노레포·네이티브)가 5(마케팅 모듈)보다 먼저.

## 전체 일정(러프 마일스톤)

| 마일스톤 | 포함 | 누적 |
|---|---|---|
| M1: 경계 선다 | Phase 1 (partners→consumer→console) | ~2~3주 |
| M2: 가볍고 감사된다 | Phase 2 + Phase 3 | +2주 |
| M3: 진짜 별도 앱 | Phase 4 (모노레포+Partners 네이티브) | +4~6주 |
| M4: 마케팅 제품화 | Phase 5 | +2~3주 |

> M1~M2(저위험)만으로 유지보수·성능·자동화 통증 대부분 해소. M3~M4는 제품 분리 완성형.

## 리스크 · 가드레일

- **대규모 import 이동**(Phase 1·4): 작은 PR 단위 + 단계마다 build/test/lint 녹색 + 결제·인증·예약
  e2e. "정적 통과 ≠ 런타임 안전"(검증 섹션).
- **공유 hook 오분류 금지**: `useUserRole`·`useQuotes`·`formDraft`는 **절대 partners로 이동 금지**
  (소비자/admin 의존 — grep 검증됨). 이동 후보는 grep으로 "타 도메인 사용 0" 확인 후에만.
- **역의존 재발 방지**: Phase 1-e 경계 린트가 상시 가드. 새 feature 추가 시 규칙도 갱신.
- **네이티브 컴플라이언스**(Phase 4): partners 앱도 consumer와 **별개로** 심사·권한문구·탈퇴 필요.
- **RLS 의존**: 프론트 분리는 보안 강화 아님 — 인가는 끝까지 DB RLS 책임(클라 가드는 UX용).
- **마케팅 자동화 비용**(Phase 5): 외부 호출 폭주 방지(캐싱·상한·백오프) 동반 설계.

## 다음 행동
이 실행계획서 합의 후 **Phase 1-a(타입 추출)**부터 작은 PR로 착수. 1-a→1-e 순서대로, 각 PR 녹색 확인 후 다음.
