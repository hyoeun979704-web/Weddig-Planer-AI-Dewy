# Dewy 에이전트 작업 규칙 (Claude·Codex·Antigravity 공용 — 단일 소스)

> 이 파일이 모든 AI 코딩 툴의 **정식 단일 소스**다. Claude Code 는 `CLAUDE.md` 가
> `@AGENTS.md` 로 import 하고, Codex·Antigravity 는 이 `AGENTS.md` 를 직접 읽는다.
> 규칙은 여기서만 고친다(툴별 사본 금지 — 드리프트 방지). 주제별 상세는 `docs/` 참조.

## 스택·명령·환경 (먼저 읽기 — 탐색 툴콜 아끼기)

- **스택**: Vite + React 18 + TS + Supabase + Capacitor(Android). 앱은 `src/main.tsx`(react-router).
- **명령**: 빌드 `npm run build`(=`vite build`) · 테스트 `npm run test`(vitest) · 린트 `npm run lint`.
- **Edge functions**(`supabase/functions/*`) = Deno. **로컬 deno 없음** → 검증은 esbuild:
  `npx esbuild supabase/functions/<fn>/index.ts --bundle --platform=neutral --external:https://* --external:npm:* --outfile=/dev/null`
  (URL/npm import 는 external). **`main` push(paths 필터) 시에만 배포** → 브랜치 작업은 배포 영향 0.
- **브랜치**: `origin/main` 이 정식(로컬 `main` 은 뒤처질 수 있음 — 팀이 main 앞서 개발). PR base = `main`.
- **재사용 먼저 검색**(중복 금지): `src/lib`(포맷/매핑/escape: priceFormat·relativeTime·placeMappers·postgrestEscape·categoryLabels),
  `supabase/functions/_shared`(cors·jwt·llm·supabase), `api/_lib`(ssr). 새로 짜기 전 grep.
- **분석 선행 — 기획·구현 전 필수**: 새 기능/비단순 변경은 ① 관련 **기존 코드·스키마·RPC 분석**
  (Explore 서브에이전트로 데이터 흐름·게이트·재사용 지점 파악) ② 해당되면 **레퍼런스/타 서비스
  패턴 조사**(경쟁사 분석 선행 — `docs/feature-simulation.md §5`; 외부 fetch 는 네트워크 정책
  허용 시, 라이선스 유의·복사 금지·패턴만) 를 **먼저** 한 뒤 기획·구현한다. "바로 코딩" 금지 —
  추측 구현이 회귀의 주원인(verification-lessons). 큰 기획은 `docs/`에 문서로 남긴다.
  DB 를 건드리면 **"DB 작업 전 — 테이블 선확인" 게이트**(검증 섹션)를 분석 단계에서 같이 수행한다.
- **병렬 작업**: fan-out 탐색은 저토큰 서브에이전트(결론만), 깊은 다단계 작업만 일반 에이전트.
  같은 파일 동시 편집 금지(작업 분할). (Claude 한정) 안전 검증·읽기 명령은 `.claude/settings.json` 에 사전 허용됨.

## 코드 작성·리뷰 규칙 — 항상 적용 (바이브코딩 안전장치)

코드를 새로 짜거나 바꿀 때마다 **반드시** 아래 6차원으로 자기 검증한다. AI 생성 코드는
"기능이 되면" 통과한 듯 보이지만 보안·안정성 결함은 **에러 없이 조용히** 깨진다(SusVibes:
기능 80%+ 통과해도 보안은 8~23%). **"작동한다 ≠ 완성"**. 톤은 should 가 아니라 **must**.
상세·Red Flags·프롬프트 템플릿: `docs/code-review-rules.md`.

변경을 "완료"로 보고하기 전 체크리스트(하나라도 걸리면 고치기 전엔 완료 아님):

1. **정확성/견고성**: 엣지케이스(빈배열·null·경계값) 우아한 실패, **빈 `catch{}` 금지**,
   `await` 누락 없음, race/트랜잭션 원자성(부분쓰기·중복발급 방지).
2. **보안**: 외부입력 검증·살균, 매개변수화 쿼리(문자열병합 SQL 금지),
   **인증이 아니라 인가 확인**(이 user 가 이 리소스에 권한 있나), 시크릿 하드코딩 금지,
   로그·에러 응답에 PII·내부스키마 누출 금지(클라엔 제네릭, 상세는 서버 로그).
3. **성능**: N+1 쿼리 제거(벌크), 캐싱/페이지네이션, 렌더 폭주(매 렌더 새 객체를 deps 에) 금지.
4. **테스트**: 분기·실패 시나리오 테스트, `npm run test` 통과, 현실적 동적 목업(id=1 조작 금지).
5. **유지보수성**: 기존 컨벤션·명명, **DRY**(같은 매핑/포맷/라벨 복붙→단일 소스, 드리프트 차단),
   매직넘버 상수화, "왜"를 주석으로.
6. **아키텍처**: 계층(hooks/lib/components) 준수·도메인↔UI 분리, API 시그니처 일관성,
   breaking change 시 버저닝/피처플래그.
7. **iOS/사파리(웹) — 모바일 웹이 주 사용처라 항상 본다**(상세 `docs/code-review-rules.md`):
   ① **localStorage throw**(프라이빗·추적방지·용량초과) → raw 접근 금지, 안전 어댑터/try-catch
   (회귀: iOS 가입 실패 — `safeLocalStorage`). ② **탭 폐기→상태 유실** → 긴 입력폼은 draft
   자동저장(`useTextDraft`/`formDraft`). ③ **네트워크 에러 문구 다름**("Load failed" vs
   "Failed to fetch") → 에러 매핑·로깅. ④ `<input type=date>`/HEIC 업로드/safe-area
   (`safe-sticky-header`) 확인. ⑤ 실기기 e2e 불가 시 `client_error_logs`(user_agent)로 관측.

변경은 **최소·표적화**(요구 범위 밖 전체 재작성·호출부 시그니처 변경 금지). 짠 뒤
**적대적 시점으로 자기 재검증**.

**전체 코드리뷰 기록**: "전체 코드리뷰"(코드 전체 리뷰/보안 감사 등 광범위) 요청을 받으면
결과를 **반드시** `docs/YYMMDD_codereview.md` 로 남긴다(예: `docs/260606_codereview.md`).
양식은 그 파일을 템플릿으로 따른다: TL;DR(핵심 성과) → 영역별 섹션(보안·P0버그·**dead-end
UI/placeholder CTA**·**iOS/사파리(웹) 차원**·공통화·도메인 변경·규칙/문서·검증 인프라) → 적용
마이그레이션 표 → 남은 작업(deferred). 각 항목에 **커밋 해시·파일명**을 달아 추적 가능하게. 같은 날 여러 건이면
`_2` 등 suffix. **dead-end UI 섹션은 필수**: 보안·버그만 보면 "동작하는 척하는" placeholder
(toast/안내만 띄우는 CTA, no-op onClick, "준비 중" 영구 잔존)를 매번 놓친다(검증 섹션 참조).

**정기 자동화**: 전체 감사는 **주 1회**(`.github/workflows/weekly-audit.yml`), e2e 전체
시뮬레이션은 **월 1회**(`monthly-e2e-simulation.yml`) 개발 에이전트가 자동 수행한다(둘 다
`ANTHROPIC_API_KEY` 시크릿 필요, 없으면 skip). 시뮬레이션은 **경쟁사 분석 선행** 원칙을 따른다
(상세 `docs/feature-simulation.md` §5).

**추천/관련 섹션 — 항상 큐레이션 필터링(원천 덤프 금지)**: "추천·관련·이런 것도" 류 섹션은
**반드시** 큐레이션 게이트를 거친다 — ① 활성/승인 게이트(`is_active`·`moderation_status`·
진행중 등 유효성) ② **제휴 등급(`partner_rank`) 우선** 등 품질 정렬(기존 `usePlaceRecommendations`
패턴 재사용) ③ 현재 항목 제외·다양성. 미가공 전체 나열 금지. **결과 0건이면 섹션 자체를 숨김**
(빈 영역·dead-end 방지).

## 검증 — "작동한다 ≠ 검증됨"

SQL row count·타입체크·unit test 통과만으로 "정상 작동" 보고 **금지**. 실제 사용자 시점의
end-to-end 동작을 직접 확인(DB 변경→client query 로 row 반환 검증, UI→실제 페이지 클릭,
API→호출 경로 시뮬레이션). e2e 불가(sandbox 차단 등) 시 "검증함" 보고 금지 — 한계를
명시("SQL 레벨만 확인, 클라 e2e 미확인")하고 사용자에게 실환경 확인 요청.

- **label(표시) vs value(매칭) 분리**: 사용자 표시 문구 변경 ≠ 백엔드 검색 키워드 변경.
  (회귀: "충남"으로 통일했더니 `ILIKE '%충남%'` 가 "충청남도" 비연속글자 매칭 실패로 0건)
- **DB 작업 전 — 테이블 선확인(필수 게이트, 추측 코딩 금지)**: DB 를 건드리는 코드(쿼리·hook·RPC·
  마이그레이션)를 짜기 **전에** 반드시 ① **이미 그 테이블/뷰가 있나** ② **어떤 피처·컬럼으로
  구성됐나**(기존 hook/RPC 가 무엇을 읽고 쓰나 — 재사용, 중복 생성 금지) ③ **내가 쓰려는 컬럼·
  데이터가 실제로 존재·채워져 있나**(빈 컬럼/미적용 마이그 아님) 를 확인하고 진행한다. "있겠지" 로
  바로 코딩하면 백엔드에 구멍이 난다.
  - **실제 DB 의 진짜 소스 = `src/integrations/supabase/types.ts`**(실 DB 에서 생성된 타입). 테이블·
    컬럼·뷰 존재 확인은 **여기를 먼저** 본다. 그다음 `supabase/migrations/**`(히스토리)와 기존
    `.from()`/hook 사용처를 grep.
  - **양쪽 모두 불완전할 수 있다(드리프트)**: 마이그 파일 존재 ≠ DB 적용이고, types.ts 도 stale 일 수
    있다(핵심 `places`·`place_*` 는 마이그에 CREATE 없음; 최신 테이블은 types.ts 누락). 의심되면
    실 DB 조회(`information_schema`/`pg_stat_user_tables`)로 교차 확인 — 한쪽만 믿지 말 것.
  - 상세 분석법·드리프트 현황: `docs/260618_schema_audit.md`. (회귀: 없는 컬럼 15개 SELECT →
    PostgREST 422 → 전체 쿼리 실패. `schema_migrations` 적용 history ≠ repo 파일 수면 경고.)
- **RPC 인자 ↔ 함수 시그니처 교차 확인**: `.rpc("name", {…})` 호출 인자 집합이 DB 함수 파라미터와
  **정확히** 일치해야 한다. PostgREST 는 named-arg 매칭이라 빠진/남는 인자 하나면 함수 미발견
  (PGRST202)으로 **호출 전량 실패**한다. `(supabase as any).rpc` 캐스트가 이 불일치를 숨기므로
  빌드·린트가 통과해도 런타임 100% 실패. (회귀: 승인 RPC 2인자에 클라가 p_note 3인자 → 승인 불능.)
- **정적 통과 ≠ 런타임 안전**: 빌드·린트·esbuild 통과는 타입/문법 검증일 뿐. 결제·인증 등
  호출 경로를 직접 안 밟는 코드는 "정적 통과"만으로 완료 보고 금지. import 심볼을 동명 지역
  변수로 재선언 금지(섀도잉=TDZ). (회귀: `const adminClient = adminClient()` → 결제승인 100% 불능)
- **placeholder CTA(죽은 토스트) 금지**: 주요 액션 버튼(문의·예약·구매·공유 등)이 실제
  동작 대신 `toast`/안내만 띄우면 = **미완**(에러가 안 나서 보안·버그 중심 감사가 잘 놓침 —
  "동작함"으로 통과해버림). 전체 감사·리뷰 시 **dead-end UI 차원**을 별도로 본다: no-op
  onClick, "준비 중"/"아직 ~안 함" 안내가 영구 잔존, 비활성처럼 보이는 버튼. 각 CTA 를
  페르소나 walkthrough 로 "눌렀을 때 기대 동작을 **끝까지** 수행하나" 확인.
  (회귀: 미입점 '문의하기' 가 토스트만 — 4천여 업체 거의 전부, 전체 감사 후에도 잔존.)
- 회귀 사례 전문: `docs/verification-lessons.md`.

## 페르소나 UX 검토 (해당 작업만 — 상세 `docs/persona-ux-review-rules.md`)

페르소나 작업의 핵심은 **사용자 친화적 UX 검토**다. 분류 엔진(`src/lib/weddingPersona.ts`,
20모드 단일 레지스트리)은 그 UX 분기를 가능케 하는 수단. 검토는 **현재 코드 기준**으로
각 페르소나를 surface 별 walkthrough → 마찰(friction) 발굴(✅/⚠️/❌). stale 스냅샷 불신.

## 청첩장 템플릿 작업 (해당 작업만 — 상세 `docs/invitation-template-rules.md`)

좌표는 **그리드 수치 측정**(눈대중 금지) + 실제 Konva 렌더로 레퍼런스와 나란히 비교.
종이 템플릿은 `page.print{wMm,hMm,bleedMm,safeMarginMm}` 필수(비율=캔버스 비율, 300dpi).

## 튜토리얼(코치마크) 작업 (해당 작업만 — 상세 `docs/tutorial-system.md`)

레슨 단일 소스는 `src/data/tutorialChapters.ts`. 새 레슨 추가 시 **반드시**: ① 대상 페이지에
`data-tutorial` 앵커(스티키 헤더는 `PageHeader tutorialId` prop) ② 페이지가 오버레이 렌더
(`usePageTutorial`+`TutorialOverlay` 또는 `<PageTutorial>`) ③ **`tutorial_tours` 허용목록에
`feature_<레슨id>` INSERT 마이그레이션**(빠지면 에러 없이 무지급) ④ 건너뛰기는 미지급.
상세·체크리스트·함정은 위 문서 참조.
- **현재 자동 진입 비활성**: `AUTO_TUTORIAL_ENABLED=false`(`tutorialChapters.ts`) — 첫방문
  코치마크·홈 투어·웰컴 시트만 차단(개편 예정). 온보딩·수동경로(/tutorial·`?tutorial=`)는
  유지. 재가동하려면 이 플래그를 true 로.

## 사용법 가이드 스크린샷 작업 (해당 작업만 — 상세 `docs/business-guide-capture.md`)

`/business/guide` 슬라이드 11장은 **`scripts/capture-guide-shots.cjs`** 로만 재생성한다
(표시 프레임과 동일한 **3:4 라이브 캡처** + 앱 본폰트 **SUITE 주입** + DOM 하이라이트).
게이트된 업체 페이지는 `mock-supabase.cjs`(`MOCK_BUSINESS=1`)로 실계정 없이 렌더한다.
풀페이지를 크롭하던 구 `build-guide-shots.cjs` 방식 금지(글자 뭉개짐). 절차·시나리오 표·
SHOTS 추가법·트러블슈팅은 위 문서 참조.
