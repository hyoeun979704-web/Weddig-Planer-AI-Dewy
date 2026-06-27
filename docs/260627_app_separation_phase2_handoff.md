# 앱 분리 실행 핸드오프 — Phase 2 (번들·네이티브 분리) 착수용

> 작성: 2026-06-27 (마케팅 자동화 세션 말미). **합의된 결정**을 기록하고, 다음 세션이 이 문서만 보고
> **Phase 2를 PR 단위로 바로 실행**하도록 정리한다. 상위 설계는 `docs/260624_app_separation_roadmap.md`
> + `..._execution_plan.md`(Phase 1~5). 이 문서는 그 **Phase 2의 실행 체크리스트**다.

## 0. 합의된 방향 (사용자 확정)

- **"기획대로 모두 분리"** 하되, **단계별·순차로** 간다(한 세션에 다 X — Phase 4는 4~6주).
- 전략: **분리 먼저(순차) → 그 다음 도메인별 병렬 고도화.** 분리 작업 자체(특히 Phase 2)는
  공유 파일(`App.tsx`·`vite.config.ts`·`types.ts`)에 집중돼 **병렬에 안 맞다** → 순차로 한 번에.
  경계가 잡힌 *뒤* 소비자/기업/운영/마케팅을 에이전트별 병렬로 굴리는 게 진짜 병렬 이득.
- **타깃 형태(로드맵)**: 소비자 = 네이티브+웹 · 기업 = (당분간)웹, Phase 4에 네이티브 · 운영자 = **웹 only**.
- **출시 관계**: 소비자 앱 단독 출시는 분리 불필요(컴플라이언스만). **별도 앱(사장님앱) 출시 = Phase 4 필요**.

## 1. 현재 상태 (출발점)

- ✅ **Phase 1 완료**: 도메인 폴더 경계(`src/features/{consumer,partners,console}`) + eslint·check-integrity 경계 강제.
- ✅ **논리적 분리 존재**: 라우트(`/admin/*`·`/business/*`) + 가드(`AdminGuard`/`BusinessGuard`, 역할 `admin`/`business`) + RLS.
- ⬜ **물리적 분리 미착수**: 단일 빌드·단일 `dist/`. 네이티브(Capacitor) 앱에 console·partners 코드가 같이 들어감.
- **빌드 모드 감지 이미 있음**: `vite.config.ts:9` `const isCapacitor = mode === "capacitor"`. 런타임은 `import.meta.env.MODE === "capacitor"`.
- **manualChunks 현황**(`vite.config.ts` ~82–95): **vendor만** 분리, `if (!id.includes("node_modules")) return undefined;` 로 앱 코드는 미분리.
- 참고 패턴: `src/main.tsx:18` 가 `@capacitor/app` 을 **동적 import** 로 묶어 웹 번들에서 제외 — 빌드별 코드 제외의 좋은 선례.

## 2. Phase 2 — PR 단위 체크리스트 (이 순서대로)

> 공통 검증: 각 PR마다 `npm run build`·`npm run lint`·`npm run test`·`node scripts/check-integrity.mjs` **녹색** +
> **화면 변화 0**(웹). 작게 쪼개 충돌·리스크 최소화(실행계획서 가드레일).

### ~~PR 2-1 — 도메인 청크 분리~~ → **취소(superseded)**. 측정 결과 회귀 유발 → 폐기.
> ⛔ **실행 중단/취소(2026-06-27 세션).** 제안된 `manualChunks` 도메인 청크는 **소비자 성능 회귀**를
> 유발해 폐기한다. 아래는 측정 근거와 대체 검증 방식.
>
> **측정 결과(정량)**:
> - 제안대로 `if (id.includes("/src/features/console/")) return "app-console"` 추가 시, Rollup 이 그
>   시드(console 66모듈)의 **공유 의존성 374모듈(supabase client·radix·sonner·button 등)까지 같은
>   청크로 흡수** → `app-console` 826KB. **소비자 `Index` 포함 202개 청크가 이 청크를 import** →
>   소비자가 어드민 코드 ~360KB 를 매 페이지 받게 됨(코드리뷰 차원3 성능 위반).
> - 흡수 차단을 위해 공유 모듈을 `app-shared` 로 강제 청크링하면 → `app-shared` 1.25MB 단일 청크를
>   **모든 페이지가 다운로드**(다른 회귀). `experimentalMinChunkSize:0` 도 무효(병합 문제 아님).
> - **베이스라인(이 규칙 없음)이 이미 최적**: console 코드는 원래 **38개 per-page lazy 청크**로 쪼개져
>   `/admin` 방문 시에만 로드됨 — **소비자 경로에 애초에 없음**. partners 도 동일.
>
> **결론**: PR 2-1 의 목적("도메인 코드를 소비자 경로에서 분리")은 **기존 lazy 로딩으로 이미 달성**.
> 명명 청크 자체는 불필요하고 해롭다. **DoD 의 '도메인 코드 분리 정량 검증'은 sourcemap 분석으로 대체**
> (`dist/assets/*.js.map` 의 `sources` 에서 `features/console`·`features/partners` 모듈 수를 카운트 —
> chunk-name grep 보다 강한 검증). PR 2-2/2-3 가 이 sourcemap 검증을 그대로 사용한다.

### PR 2-2 — 네이티브 빌드에서 console(/admin) 제외 ★보안 1순위
> 운영자 어드민이 앱 바이너리에 들어가 직접 URL 누수되는 위험 제거(로드맵 문제 지적). 운영자는 앱 안 씀.
- `src/App.tsx`:
  - 상단에 `const IS_NATIVE = import.meta.env.MODE === "capacitor";` (Vite가 빌드시 정적 치환 → dead-code 제거 가능).
  - `ConsoleRoutes`의 lazy import + `/admin/*` 라우트를 **`!IS_NATIVE` 일 때만** 참조하도록 구조 변경.
    ⚠️ 핵심: `const ConsoleRoutes = lazy(() => import("@/features/console/routes"))` 가 **top-level** 이면
    capacitor 번들에 그대로 포함된다. 동적 import 가 `!IS_NATIVE` 분기 **안에서만** 참조되게 해야 Rollup 이
    capacitor 빌드에서 console 청크를 **트리셰이크로 제외**한다. (예: 라우트 배열을 조건부로 구성하거나,
    `IS_NATIVE` 면 `/admin/*` 자리에 `NotFound` 만 두고 ConsoleRoutes import 자체를 분기 뒤로.)
- 검증: ① **웹 빌드**(`npm run build`) → `/admin` 정상. ② **네이티브 빌드**(`vite build --mode capacitor`) →
  `dist/assets`에 `app-console` 청크가 **참조 안 됨**(grep dist 또는 청크 그래프 확인) + 앱에서 `/admin` 직접 진입 시 NotFound.
- 위험: 낮음(운영자 비대상).

### PR 2-3 — 네이티브 빌드에서 partners(/business) 제외 (앱=소비자 전용)
> 결과: 네이티브 앱 = 소비자 전용, 기업은 **웹**(`/business`). 실행계획서는 이를 Phase 4-C로 미뤘으나,
> 사용자 요구(기업=웹 분리)에 따라 **앞당겨 실행**. 기업은 원래 웹 위주라 위험 낮음.
- `src/App.tsx`: PR 2-2와 동일 패턴으로 `/business/*`(partners routes) 를 `!IS_NATIVE` 분기.
- ⚠️ 확인: 현재 네이티브 앱으로 `/business` 를 쓰는 기업 사용자가 있는지(있으면 웹 안내 공지 필요).
- 검증: 네이티브 빌드 dist 에 `app-partners` 청크 미참조 + 앱에서 `/business` NotFound. 웹은 정상.

### Phase 2 완료 기준(DoD) — ✅ 달성(2026-06-27)
- ✅ 웹·capacitor **양쪽 빌드 녹색** + lint(0 error)·test(1210 pass)·integrity(0 error) 녹색.
- ✅ capacitor 빌드 `dist` 에 `features/console`·`features/partners` 코드 **미포함** — sourcemap 정량
  확인: capacitor `console=0·partners=0` 모듈(웹은 각각 `66·37` 유지), `AdminGuard`/`BusinessGuard`/
  `features/console`/`features/partners` 문자열 0건.
- ✅ 웹: `/admin`·`/business` 정상(per-page lazy) / 네이티브: 둘 다 미등록 → catch-all NotFound. 소비자 화면 변화 0.

**구현 요약**: PR 2-1(도메인 청크)은 회귀로 취소(위 참조). 분리는 `src/App.tsx` 에 `IS_NATIVE =
import.meta.env.MODE === "capacitor"` 게이트를 두고 `ConsoleRoutes`/`PartnersRoutes` 동적 import 를
`!IS_NATIVE` 분기 안에서만 참조 → Rollup 이 capacitor 빌드에서 트리셰이크. 커밋: PR 2-2 `console`,
PR 2-3 `partners`.

## 3. Phase 2 *이후* — 여기서부터 병렬 (도메인별 동시 작업 안전)

경계가 잡히면 충돌 없이 병렬 가능. worktree 격리 서브에이전트로 도메인별 fan-out:
- **소비자** 고도화 / **기업** 고도화 / **운영·마케팅**(Console 모듈) 고도화 — 서로 다른 `features/*` 라 안전.
- 여전히 **공유 충돌점**: `src/App.tsx`(라우트 마운트)·`src/integrations/supabase/types.ts`(단일 DB 타입).
  → 이 둘 건드리는 작업만 직렬. 완전 격리는 **Phase 4(모노레포·앱별 엔트리·타입 분할)**에서.

## 4. 다음 단계 포인터(요약 — 상세는 실행계획서)
- **Phase 3**(~1주): `docs/audit-surface-map.md` → consumer/partners/console 3분할 + `weekly-audit.yml` 앱별 매트릭스 job. (감사 "빼먹음" 구조적 해결)
- **Phase 4**(4~6주): 모노레포(Turborepo) + 앱별 빌드·배포 + **Partners 네이티브 패키징**(진짜 사장님앱). 네이티브 컴플라이언스 별도 심사.
- **Phase 5**: 마케팅 자동화를 Console 모듈로(이번 세션 블로그/인스타 파이프라인이 그 씨앗 — `docs/260627_cardnews_marketing_handoff.md`).

## 5. 착수 프롬프트(다음 세션 복붙용)
```
앱 분리 Phase 2 진행하자. 핸드오프 docs/260627_app_separation_phase2_handoff.md §2 체크리스트대로.
PR 2-1(도메인 청크) → PR 2-2(네이티브 console 제외, 보안 1순위) → PR 2-3(네이티브 partners 제외) 순서로,
각 PR마다 web·capacitor 양쪽 build + lint/test/integrity 녹색 + dist 정량 검증. 작은 PR로.
```

---
**진행 상태(2026-06-27)**: ✅ **Phase 2 완료** — PR 2-1 취소(회귀), PR 2-2(console 네이티브 제외)·
PR 2-3(partners 네이티브 제외) 머지 대기(draft PR). 다음은 §3(도메인별 병렬 고도화) 또는 Phase 3(감사 3분할).

*문서 끝. 분리 진행 시 각 Phase 완료를 여기에 체크 표시로 갱신.*
