# 앱 분리 로드맵 — 소비자 · 업체관리 · 운영/마케팅 자동화 (260624)

> 작성 배경: "업체관리랑 마케팅 자동화를 분리해서 앱으로 만들고 싶다. 기존 앱을 고도화하고
> 싶은데 계속 너무 무거워진다." + "장기적으로, 사용자 편의 기준으로." + **핵심**: "감사할 때마다
> 매번 빼먹는 게 생겨서 지금 상태로는 자동화가 현실적으로 어렵다."
>
> 이 문서는 **분석 선행**(AGENTS.md) 결과를 바탕으로 한 단계적 아키텍처 로드맵이다. 큰 기획이라
> `docs/`에 남긴다. 코드 변경은 아직 없음 — 방향 합의 후 Phase 1부터 착수.

---

## 0. TL;DR — 권장안

- **"무겁다"의 진짜 원인은 번들이 아니라 구조다.** 라우트는 이미 전부 `lazy()` 로딩이고
  vendor 청크 분할도 돼 있다(`vite.config.ts`). 진짜 문제는 **레포 1개 · `App.tsx` 1개(465줄,
  라우트 130+) · `types.ts` 1개(6,749줄) · Supabase 1개**에 소비자·기업·운영자·마케팅이 다
  섞여 있어서, **사람도 자동 감사 에이전트도 "전체"를 한 번에 못 본다**는 것. 이게 "매번 빼먹는"
  근본 원인이다.
- **권장: DB는 1개로 유지하고(분리 금지), 코드를 도메인별로 분리한 뒤 → 모노레포 + 앱별 빌드/배포로
  단계 전환.** 사용자(소비자/사업자/운영자)가 다르므로 앱은 3개로 가되, 인증·DB·디자인시스템은
  공유 패키지로 단일 소스 유지.
- **분리의 1차 목표는 "가벼움"이 아니라 "감사·자동화의 신뢰성"이다.** 표면이 앱별로 쪼개지면
  주간 감사(`weekly-audit.yml`)가 앱마다 완결적으로 돌아 "빼먹음"이 구조적으로 줄어든다.
- **위험 낮은 것부터**: Phase 1(도메인 경계, 사용자 변화 0) → Phase 2(번들 분리) →
  Phase 3(앱별 감사 자동화) → Phase 4(모노레포·별도 배포) → Phase 5(마케팅 자동화 모듈화).
  Phase 1~3만으로도 "유지보수·감사" 문제의 80%가 풀린다. Phase 4~5는 장기.

---

## 1. 현재 구조 진단 (실측)

| 항목 | 현황 | 파일 |
|---|---|---|
| 라우트 정의 | 단일 `App.tsx` 465줄에 130+ 라우트 1블록 | `src/App.tsx` |
| 페이지 | 177파일 (소비자 ~79 · `admin/` 30 · `business/` 18) | `src/pages/**` |
| 전체 src | 775파일 / hooks 80 / lib 159 | `src/**` |
| DB 타입 | 단일 생성 파일 6,749줄(소비자·기업·운영자 테이블 전부) | `src/integrations/supabase/types.ts` |
| 인증/권한 | 전역 `AuthProvider` + `useUserRole`(individual/business/admin) | `src/contexts/AuthContext.tsx` |
| 가드 | 라우트 레벨 `AdminGuard` · `BusinessGuard` (이미 잘 분리됨) | `src/components/{admin,business}/*Guard` |
| 번들 | 전 페이지 `lazy(import())` ✅ + vendor 청크(konva/charts/motion/...) ✅ | `vite.config.ts` |
| 번들 미분리 | manualChunks가 **vendor만** 분리, **도메인(business/admin)별 청크 없음** | `vite.config.ts:82-95` |
| 네이티브 | Capacitor = 소비자 앱(딥링크/safeArea/admob/IAP). `--mode capacitor` 빌드 | `src/main.tsx`, `capacitor.config.ts` |
| 마케팅 자동화 | **독립 surface 아님** — `admin/AdminInstagramPosts` + edge `instagram-*` 4종 + `content-distribution.md` + `marketing-draft` 스킬로 흩어짐 | `supabase/functions/instagram-*`, `.claude/skills/marketing-draft` |

**진단 요약**
- ✅ 잘 돼 있는 것: 라우트 lazy 로딩, vendor 청크 분할, 라우트 레벨 권한 가드, RLS(추정).
- ⚠️ 문제 1 (유지보수): 도메인 경계가 **물리적으로** 없다. `App.tsx`·`types.ts`가 모든 도메인의
  공유 충돌 지점. 기업 기능 고치다 소비자 빌드가 흔들린다.
- ⚠️ 문제 2 (성능): 소비자 네이티브 앱 번들에 기업/운영자 페이지 청크가 **들어가지는 않지만**
  (lazy), 공유 진입(`App.tsx`·라우터·공용 컴포넌트 그래프)이 비대해 초기 파싱·라우트 테이블이 큼.
- ⚠️ 문제 3 (제품 혼재): 한 코드베이스가 3종 사용자를 다 떠안아 UX·온보딩·정보구조가 섞임.
- 🔴 문제 4 (자동화·감사 — 사용자 핵심 통증): 감사 표면 단일 소스 `docs/audit-surface-map.md`에
  130+ surface가 한 장에 모여, 주간 감사가 fan-out 해도 한 번에 완주가 안 돼 **빠지는 표면이
  생긴다**(예: ATT 누락이 반복 통과한 회귀와 동일 구조). → 분리가 이 문제의 직접 해법.

---

## 1-A. 참고 — 타 서비스는 어떻게 분리하나 (경쟁사 분석 선행)

거의 모든 **양면(소비자↔공급자) 플랫폼은 소비자 앱과 사업자 앱을 물리적으로 분리**한다. 사용자·
워크플로우·디바이스·사용빈도가 완전히 달라서다. 운영(내부 admin)은 거의 항상 웹. 우리 결정(소비자
네이티브 + 사업자 네이티브 + 운영 웹 + 마케팅은 운영 모듈)은 이 업계 표준과 일치한다.

**국내 사례 — 소비자 ↔ 사업자 앱 분리가 표준**

| 서비스 | 소비자 앱 | 사업자(사장님) 앱 | 운영/마케팅 |
|---|---|---|---|
| 배달의민족 | 배민 | **배민사장님**(별도 네이티브) | 내부 |
| 쿠팡 / 쿠팡이츠 | 쿠팡 / 쿠팡이츠 | **쿠팡 윙** / **쿠팡이츠 스토어** | 내부 |
| 네이버 커머스 | 네이버 | **스마트스토어센터**(웹+앱) | 내부 |
| 당근 | 당근 | **당근비즈니스**(비즈프로필) | 내부 |
| 야놀자/여기어때 | 소비자 앱 | 사장님(호스트) 앱 | 내부 |

→ 공통점: **사업자 앱은 별도**. 사장님은 주문·리드·문의 관리가 일상이고 **푸시 즉시성**이 핵심이라
소비자 앱에 안 섞는다. (= 우리가 Partners를 네이티브+푸시로 가는 근거와 정확히 일치)

**해외 사례 — 소비자/공급자/(운영) 다중 앱 + 운영은 웹**

- **DoorDash**: Consumer ↔ **DoorDash Merchant**(사장님) ↔ Dasher(배달원) — 역할별 3앱.
- **Uber**: Uber ↔ **Uber Driver** ↔ Uber Eats Manager(merchant).
- **Shopify**: **Shopify**(판매자 admin 앱) + Shop(소비자) + POS + Inbox — 기능·역할별 앱군.
- **Instagram / Meta**: Instagram(소비자) ↔ **Meta Business Suite**(별도 앱 — 콘텐츠 예약·광고·
  마케팅을 한 곳에). → **마케팅 자동화를 "운영 도구 안의 모듈"로 묶는** 대표 사례.
- **Etsy**: Etsy(소비자) ↔ **Etsy Seller**. **Booking.com**: Booking ↔ **Pulse**(파트너 앱).
- **반례(통합 유지)**: **Airbnb**는 게스트/호스트를 한 앱 + 모드 전환으로 둠. 단, 이는 **소비자=공급자
  겹침이 클 때** 성립. 웨딩은 신랑신부(소비자)와 웨딩업체(사업자)가 거의 안 겹쳐 **분리가 맞다.**

**마케팅 자동화의 위치 — 별도 앱 X, 운영 도구의 모듈 O**

- 업계는 ① all-in-one 통합(HubSpot: CRM+마케팅 한 인터페이스) ② 모듈 분리(Twilio: Email API ↔
  Marketing Campaigns) 두 패턴. Meta는 Business Suite 안에 마케팅을 **모듈**로 통합.
- **우리 결론**: 마케팅 자동화는 운영자가 쓰는 도구 → **Console 앱의 한 모듈**로 통합(별도 4번째 앱은
  over-engineering). Phase 5와 일치.

**기술 패턴 — 모노레포 + 공유 패키지가 표준**

- 표준 구조: `apps/{web,admin,mobile}` + `packages/{ui,lib,types,config}`. 도구는 Turborepo/Nx + pnpm.
- **Capacitor는 WebView 기반**이라 공유 UI 패키지가 앱별 네이티브 빌드에서 그대로 동작(우리 스택 적합).
- 앱별로 자체 `capacitor.config` + 빌드 파이프라인을 둔다 → 우리 Phase 4 계획과 동일.

> **결론(경쟁사 분석 → 우리 계획 검증)**: 우리가 정한 "소비자 네이티브 + 사업자 네이티브 + 운영 웹 +
> 마케팅은 운영 모듈 + 단일 백엔드 + 모노레포 공유 패키지"는 **업계 표준 그대로**다. 새로 발명하는 게
> 아니라 검증된 패턴을 따르는 것 → 리스크 낮음. (출처: 각 사 앱스토어/공식 사이트, 모노레포 아키텍처
> 자료 — 본문 말미 참고)

---

## 2. 목표 아키텍처 — 3 제품 · 1 백엔드 · 공유 패키지

사용자가 다르므로 **앱은 3개**, 그러나 신원·데이터·디자인시스템은 **단일 소스**로 공유한다.

```
dewy/ (monorepo, npm workspaces)
├─ apps/
│  ├─ consumer/      # Dewy — 신랑·신부. 네이티브(iOS/Android) + 웹/PWA. 가볍게·개인화 핵심
│  ├─ partners/      # Dewy Partners — 웨딩 사업자. 네이티브(iOS/Android)+웹. 리스팅·리드·상품·쿠폰·문의·배송
│  └─ console/       # Dewy Console — 운영자(내부) + 마케팅 자동화. 웹 전용. 무거워도 됨
├─ packages/
│  ├─ db/            # supabase client + 생성 types.ts + RLS 정책(단일 소스, 분리 금지)
│  ├─ auth/          # AuthContext + useUserRole (역할 전환 일관)
│  ├─ ui/            # Radix 기반 공용 컴포넌트(현 src/components/ui)
│  └─ lib/           # priceFormat·relativeTime·categoryLabels·postgrestEscape 등 공용 유틸
└─ supabase/         # functions(공유) + migrations (지금 그대로, 단일 프로젝트)
```

**사용자 편의 관점 (왜 이렇게 가르나)**
- **소비자**: 결혼준비 본진. 사업자/운영 기능이 0이라 앱이 가볍고 빠르며 개인화에 집중.
- **사업자(Partners)**: 리스팅·리드·상품관리가 일상 업무. **소비자 앱 안에 끼워넣지 않고** 전용
  콘솔로 빼면, 사업자는 자기 업무 화면만 보고(인지 부하↓) 집중 관리 가능.
  **출시 형태 = 네이티브(iOS/Android) + 웹 병행으로 확정**(2026-06-24 결정). 푸시알림(신규 리드·문의
  실시간 통지)과 앱스토어 검색 노출로 사업자 유입·재방문을 잡는 게 목적. 별도 Capacitor 빌드·
  스토어 리스팅·§8 컴플라이언스(ATT/IAP/권한문구)가 따라옴(Phase 4 참조). 웹 빌드도 같이 내
  데스크톱 관리도 지원.
- **운영+마케팅(Console)**: 내부 도구. 외부 배포·스토어 심사 대상이 아니라 무게/복잡도 제약이
  거의 없음. 마케팅 자동화 대시보드를 여기로 모아 "실제 surface"로 만들면 감사·운영이 쉬워짐.

---

## 3. 핵심 결정 — Supabase는 분리하지 않는다 (중요)

분리 충동이 가장 큰 곳이 DB지만, **단일 Supabase + RLS 유지**를 강력 권장한다.

- **한 사람이 여러 역할**: 소비자가 곧 사업자일 수 있고(업체 사장도 결혼 준비), 운영자 계정도
  동일 신원. DB를 쪼개면 **단일 로그인·역할 전환이 깨지고** 신원 동기화 지옥이 된다.
- **이미 격리돼 있음**: 권한은 `user_roles` + RLS로 행 수준 격리. 클라 코드를 분리해도 백엔드는
  하나로 충분하다. (분리 시 마이그레이션·타입 생성·시크릿이 3배가 되고 드리프트 위험↑)
- **타입 단일 소스 유지**: `types.ts`는 `packages/db`에 두고 3앱이 import. 생성 1회 → 3앱 반영.
- **대신** 도메인별 타입 *뷰*(re-export)로 ergonomics만 개선: `packages/db/business.ts`가 기업
  관련 테이블만 골라 re-export → 각 앱이 6,749줄 전체가 아니라 자기 도메인 표면만 본다.

> 즉 **"앱(프론트)은 3개, 백엔드(DB/Auth/Functions)는 1개"**. 분리의 이득(가벼움·감사
> 신뢰성·UX)은 프론트 분리만으로 대부분 얻고, DB 분리의 비용·위험은 피한다.

### 공유 vs 분리 — 레이어별 정확히 (오해 방지)

"완전히 분리"는 **프론트(앱)** 한정이다. 백엔드는 **완전 분리가 아니라 하나를 공유**한다("관련된 것만
접근"은 맞지만 "각자 따로 백엔드"는 아님).

| 레이어 | 분리 정도 |
|---|---|
| 앱 코드(features/) · 빌드 · 배포 · 도메인 · 네이티브 앱 | **완전 분리** ✅ |
| DB · Auth · Edge Functions(Supabase) | **공유 1개** — 테이블은 한 DB, 접근만 RLS·역할로 가름 ⚠️ |

**왜 백엔드는 완전 분리하면 안 되나(마켓플레이스라서)** — 소비자↔사업자가 데이터를 주고받는다:
- 견적: 소비자 `/quote/new` 작성 → 사업자 `/business/leads` 수신(**같은 테이블**, `useQuotes` 공유 — 검증됨).
- 업체정보: 사업자 `BusinessVendorEdit` 수정 → 소비자 `VendorDetailPage` 조회.
- 리뷰·쿠폰·문의: 한쪽이 쓰고 다른 쪽이 읽음. + 단일 신원(한 사람이 소비자이자 사업자) → Auth 1개.

**데이터 3분류(물리 분리 X, 접근 분리 O — 모두 같은 DB)**:
1. 공유(마켓플레이스): 견적·업체·리뷰·쿠폰·문의 — 소비자↔사업자 오감
2. Partners 전용: 지점·배송·상품관리 — 사업자만
3. Console 전용: 운영로그·에이전트출력·모더레이션 — 운영자만

→ 전용 테이블을 다른 DB로 떼면 비용·복잡도·드리프트만 3배. RLS·역할로 접근만 가르는 게 정답
(배민·쿠팡·당근 등 양면 플랫폼 표준: 사장님 앱은 따로, 데이터는 한 백엔드).

### 회원·계정 모델 + 기존 기업회원 이전 (실측 2026-06-24)

**현황(실 DB 조회)**: 기업회원 = 일반 계정으로 가입 후 사업자 정보를 얹는 구조(`BusinessOnboard`는
로그인 전제). 프로필 **데이터는 이미 분리**돼 있다.
- `profiles`(일반) ↔ `business_profiles`(기업) — 별도 테이블, 둘 다 `user_id`(=auth) 참조.
- 실측: `business_profiles` **19행**(승인 17·검토중 2), 전부 auth 계정 연결, 고유 사용자 19,
  `user_roles` business **19행** → **1계정 : 1역할 : 1기업프로필 완벽 정렬, 고아·중복 0**.

**무엇이 공유/분리인가**: 공유 = 로그인 계정(auth.users) + 역할(user_roles). 분리(이미) = 프로필 데이터.

**권장: 로그인 계정은 분리하지 않는다.** "분리된 앱" 경험은 *별도 Partners 앱 + 역할 게이트*로
달성되지, 계정 분리로 달성되는 게 아니다. 데이터 격리는 RLS·역할이 이미 책임. 계정을 쪼개면
"기존 업체 관리권한 인수" 흐름·단일 SSO가 깨지고 마이그레이션 비용만 든다.

**기존 19명 이전 방식**:
- **권장 모델(계정 공유)**: **데이터 이전 0.** 19명이 같은 계정으로 Partners 앱(같은 Supabase)에
  로그인 → 역할 게이트 통과 → 그대로 사용. "이전" = 새 앱 다운로드 안내일 뿐.
- **(원할 경우) 계정 분리 모델**: 대상 19명뿐이라 부담 작음. ① 기업 전용 계정 생성/전환 ②
  `business_profiles.user_id` 재연결 ③ 19명 비번 재설정·안내. 가능하나 이득 적어 비권장.

**앱별 회원 테이블 소유(정리 대상)**: Partners=`business_profiles`, 소비자 앱=`profiles`,
Console=양쪽 조회·모더레이션. (스키마는 이미 갈려 있어 코드 소유만 정리)

---

## 3-A. 플랫폼 · 도메인 전략 (2026-06-24 결정)

**지원 플랫폼**

| 플랫폼 | 방식 | 비용/작업 |
|---|---|---|
| 웹 | 모든 앱(consumer·partners·console) 웹 빌드 | 기본 |
| Android | consumer·partners 네이티브(Capacitor) | 스토어 계정 기존 커버, 0원 |
| iOS | consumer·partners 네이티브(Capacitor) | 스토어 계정 기존 커버, 0원 |
| **Mac** | **브라우저 웹으로 지원**(별도 데스크톱 앱 X) | **추가 0** — 웹이 곧 Mac 지원. Capacitor는 macOS 데스크톱 미지원이라 네이티브 빌드 안 함 |

- console(운영+마케팅)은 웹 전용. consumer·partners만 네이티브(iOS/Android) + 웹.
- Mac 데스크톱 앱(Tauri/Electron)은 **만들지 않는다** — 브라우저 웹으로 충분(결정). 추후 OS레벨
  기능이 필요해지면 재검토.

**도메인 — 단일 루트 도메인 + 서브도메인**

```
dewy.app            # 소비자(consumer) 웹 + iOS/Android 딥링크 기준
partners.dewy.app   # Partners 웹 + iOS/Android 딥링크 기준
console.dewy.app    # Console 웹 전용(내부)
```

- 같은 루트 도메인 패밀리로 **브랜드 통일**, 서브도메인으로 **앱별 독립 배포·딥링크 스코프 분리**.
  (`/partners` 경로로 한 도메인에 합치면 별도 네이티브 빌드의 딥링크 association 스코프가 꼬임.)
- 네이티브 딥링크용 association 파일을 **각 (서브)도메인에 호스팅**:
  - iOS/Mac(Safari): `https://<도메인>/.well-known/apple-app-site-association`
  - Android: `https://<도메인>/.well-known/assetlinks.json`
- OAuth/소셜로그인 콜백 redirect URL도 각 (서브)도메인 기준으로 Supabase Auth에 등록.
- **현 상태 확인 필요(추후)**: 실제 운영 도메인·기존 딥링크 설정(`capacitor.config.ts`,
  `src/lib/native/deepLink`)을 Phase 4에서 점검해 서브도메인 구조로 정리.

---

## 4. 단계별 로드맵

위험 낮고 가치 높은 것부터. 각 단계는 독립적으로 멈출 수 있다(중단해도 회귀 없음).

### Phase 1 — 도메인 경계 확립 (in-repo) · 위험 낮음 · 가치 높음
**목표**: 코드를 도메인별로 물리 분리하고 경계를 린트로 강제. 사용자 화면 변화 0.
- `src/features/{consumer,partners,console,shared}/` 또는 `src/domains/*` 로 페이지·hooks·components
  재배치. 우선 `pages/business/*`, `pages/admin/*`를 각 도메인 폴더로 이동(import 경로만 변경).
- `App.tsx`를 도메인별 라우트 모듈로 쪼갬: `routes/consumer.tsx`·`routes/partners.tsx`·
  `routes/console.tsx` → `App.tsx`는 조립만. (465줄 → 얇아짐)
- **import 경계 린트**: `eslint no-restricted-imports` 또는 `dependency-cruiser`로
  "consumer가 console/partners를 import 금지", "도메인끼리 직접 의존 금지(공유는 shared 경유)"
  규칙 추가. → 경계가 코드로 강제되어 드리프트 차단.
- **산출물**: 도메인 폴더 구조 + 경계 린트 통과. 빌드/테스트 그대로 녹색.
- **효과**: 유지보수 통증 대부분 해소. 이후 모노레포 전환의 90%가 여기서 끝남(폴더만 옮기면 됨).

### Phase 2 — 번들 도메인 분리 · 위험 낮음 · 가치 중
**목표**: 소비자(특히 네이티브) 번들에서 기업/운영 코드를 완전히 떼어낸다.
- `vite.config.ts` manualChunks에 도메인 청크 추가:
  ```ts
  if (id.includes("/features/partners/")) return "app-partners";
  if (id.includes("/features/console/"))  return "app-console";
  ```
- 네이티브(`--mode capacitor`) 빌드에서 console/partners 라우트를 **빌드 타임 제외**(소비자 앱은
  운영/마케팅 화면이 필요 없음) — 라우트 모듈을 mode로 분기. 번들·라우트 테이블 축소.
- **산출물**: 빌드 후 청크 리포트로 소비자 초기 청크 크기 before/after 비교(수치로 검증).

### Phase 3 — 앱별 감사 자동화 재편 · 위험 낮음 · 가치 **최상** (사용자 핵심 니즈)
**목표**: "감사할 때마다 빼먹는" 문제를 구조로 해결.
- `docs/audit-surface-map.md`를 **앱별로 분할**: `audit-surface-consumer.md` ·
  `-partners.md` · `-console.md`. 각 맵은 표면 수가 작아 한 에이전트가 14차원 완주 가능.
- `weekly-audit.yml`을 **앱별 매트릭스 job**으로 재편(consumer/partners/console 병렬). 각 job이
  자기 앱 표면만 책임지므로 커버리지 표가 앱별로 완결 → 빠진 곳이 그 앱 안에서 가시화.
- Phase 1의 도메인 폴더가 있으면 "이 PR이 어느 앱을 건드렸나"가 명확 → **변경 앱만 타깃 감사**도
  가능(diff→도메인 매핑). 자동화가 비로소 "현실적"이 됨.
- **효과**: 사용자가 말한 "지금 상태로 자동화 불가" → "앱별로 작게 쪼개져 자동화 신뢰 가능"으로 전환.

### Phase 4 — 모노레포 전환 + 별도 배포 · 위험 중 · 가치 높음(장기)
**목표**: 진짜 "별도 앱". 각자 독립 빌드·배포.
- `npm workspaces`(또는 pnpm)로 `apps/*` + `packages/*` 구조 확정. Phase 1 폴더를 워크스페이스로 승격.
- 빌드 분리: `apps/consumer`(네이티브+웹), `apps/partners`(웹/PWA), `apps/console`(웹). 배포도 각각
  (예: `partners.dewy...`, 내부 `console.dewy...`). `vercel.json`·CI 파이프라인 앱별로.
- **단일 Supabase 유지**(§3). `packages/db` 1곳에서 타입 생성 → 3앱 공유.
- **네이티브 패키징(Partners)** — 출시 형태 네이티브 확정(2026-06-24). 작업:
  - 별도 Capacitor 앱: 자체 `appId`/`appName`/아이콘/스플래시(소비자 앱과 번들 ID 분리),
    `partners`용 `vite build --mode capacitor` + `cap sync` 파이프라인.
  - **스토어 비용 추가 0원**(기존 Apple $99/년·Google $25 계정이 앱 무제한 커버). 변동비(IAP
    수수료)는 사업자 대상이라 인앱 디지털결제가 없으면 미적용 — 사업자 요금은 B2B 외부청구 권장.
  - **§8 출시적합성 컴플라이언스(앱별 반복)**: 권한 사용설명 문자열(카메라/사진 — 갤러리 업로드),
    푸시알림 권한, 회원탈퇴 인앱 경로, 개인정보 양식↔실수집 일치. 광고/추적 안 붙이면 ATT 불필요,
    인앱 디지털결제 없으면 IAP 강제 불필요(부담 최소화 가능). 단일 소스 `docs/260622_appstore_submission_runbook.md §11`.
  - 푸시알림: 신규 리드·문의 실시간 통지 채널 설계(APNs/FCM, 비용 0).
- **주의**: consumer 네이티브의 admob·하트 IAP·위젯은 partners에 그대로 끌고 오지 말 것(사업자엔
  불필요). partners 네이티브는 "관리 업무 + 푸시"에 필요한 플러그인만 선별 탑재.

### Phase 5 — 마케팅 자동화 독립 모듈화 · 위험 낮음 · 가치 높음
**목표**: 흩어진 마케팅 자동화를 console 앱의 **실제 대시보드 surface**로 통합.
- 통합 대상: edge `instagram-draft-generator`·`-publisher`·`-collect-reels`·`-card-renderer`,
  `admin/AdminInstagramPosts(+Edit)`, `docs/content-distribution.md` 스펙, `marketing-draft` 스킬.
- console 앱에 `마케팅 자동화` 섹션: 주제→채널별 초안 생성(6채널: 쓰레드·인스타·네이버블로그·
  워드프레스·유튜브숏폼·카페) → 검수 → 발행/노션 적재 파이프라인을 한 화면 흐름으로.
- surface가 명시되면 audit-surface-console 맵에 등재 → 자동 감사 대상이 됨(현재는 감사 사각지대).
- **효과**: 마케팅 자동화가 "코드 흩어진 기능"에서 "관리·측정·감사되는 제품 모듈"로 승격.

---

## 5. 단계별 비용·효과 요약

| Phase | 작업 | 위험 | 사용자 영향 | 핵심 효과 | 예상 규모 |
|---|---|---|---|---|---|
| 1 | 도메인 폴더 + 경계 린트 | 낮음 | 없음 | 유지보수·드리프트 차단 | 중 (1~2주) |
| 2 | 도메인 번들 청크 + 네이티브 제외 | 낮음 | 소비자 앱 가벼워짐 | 성능 | 소 (수일~1주) |
| 3 | 앱별 감사 맵 + weekly-audit 매트릭스 | 낮음 | 없음(내부) | **자동화 신뢰성** | 소~중 (1주) |
| 4 | 모노레포 + 별도 배포 | 중 | 사업자 전용 콘솔 분리 | 제품 분리 완성 | 대 (4~6주) |
| 5 | 마케팅 자동화 모듈 통합 | 낮음 | 운영 효율 | 마케팅 자동화 제품화 | 중 (2~3주) |

> Phase 1~3 (저위험)만으로 "유지보수·성능·자동화" 통증 대부분 해소. Phase 4~5는 제품 분리의
> 완성형으로 장기 진행. **순서대로 가되 각 단계에서 멈출 수 있음.**

---

## 6. 리스크 · 주의 (AGENTS.md 14차원 연계)

- **회귀 방지**: 대규모 이동은 import 경로 변경이 광범위 → 단계마다 `npm run build`·`npm run test`·
  `npm run lint` 녹색 + 주요 플로우(결제·인증·예약) e2e 확인 후 머지. "정적 통과 ≠ 런타임 안전"(검증 섹션).
- **공유 충돌 지점**: `App.tsx`·`types.ts`가 최대 머지 충돌원. Phase 1을 **한 번에 큰 PR**보다
  도메인별 작은 PR로 쪼개 진행.
- **Capacitor/네이티브**: 딥링크·safeArea·admob·IAP·위젯이 consumer 전제(`src/main.tsx`). partners도
  네이티브로 출시 확정 → 권한문구·푸시권한·회원탈퇴·개인정보 컴플라이언스가 **partners 앱에도 별도로**
  필요(§8 출시적합성). 단, 광고·하트 IAP를 안 붙이면 ATT·IAP 강제는 회피 가능 → 컴플라이언스 부담을
  "권한문구+탈퇴+푸시"로 최소화한다. native 빌드는 consumer/partners **각각** 심사·유지보수 대상이 됨.
- **RLS 의존**: 프론트 분리는 보안을 강화하지 않는다. 인가는 끝까지 **DB RLS**가 책임(클라 가드는 UX용).
- **마케팅 자동화 비용/쿼터**(§11): 채널 초안 생성은 LLM·외부 API 호출 = 돈. 모듈화 시 캐싱·상한·
  백오프를 같이 설계.

---

## 7. 다음 행동 (제안)

1. **이 로드맵 합의** → 2. **Phase 1 착수**: 먼저 `pages/business/*`를 `features/partners/`로,
   `pages/admin/*`를 `features/console/`로 이동 + `App.tsx`를 라우트 모듈로 분할 + 경계 린트 추가.
   (사용자 화면 변화 0, 빌드·테스트 녹색 유지가 완료 기준)
3. Phase 1 검증 후 Phase 2·3 연속 진행(저위험·고가치).

> 합의되면 Phase 1을 작은 PR 단위로 시작한다. 어느 도메인부터(partners 먼저 권장 — 경계가
> 가장 뚜렷하고 사용자 분리 의도와 직결) 시작할지만 정하면 된다.
