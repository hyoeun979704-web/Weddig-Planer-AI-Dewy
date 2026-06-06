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

변경은 **최소·표적화**(요구 범위 밖 전체 재작성·호출부 시그니처 변경 금지). 짠 뒤
**적대적 시점으로 자기 재검증**.

**전체 코드리뷰 기록**: "전체 코드리뷰"(코드 전체 리뷰/보안 감사 등 광범위) 요청을 받으면
결과를 **반드시** `docs/YYMMDD_codereview.md` 로 남긴다(예: `docs/260606_codereview.md`).
양식은 그 파일을 템플릿으로 따른다: TL;DR(핵심 성과) → 영역별 섹션(보안·P0버그·공통화·
도메인 변경·규칙/문서·검증 인프라) → 적용 마이그레이션 표 → 남은 작업(deferred). 각 항목에
**커밋 해시·파일명**을 달아 추적 가능하게. 같은 날 여러 건이면 `_2` 등 suffix.

## 검증 — "작동한다 ≠ 검증됨"

SQL row count·타입체크·unit test 통과만으로 "정상 작동" 보고 **금지**. 실제 사용자 시점의
end-to-end 동작을 직접 확인(DB 변경→client query 로 row 반환 검증, UI→실제 페이지 클릭,
API→호출 경로 시뮬레이션). e2e 불가(sandbox 차단 등) 시 "검증함" 보고 금지 — 한계를
명시("SQL 레벨만 확인, 클라 e2e 미확인")하고 사용자에게 실환경 확인 요청.

- **label(표시) vs value(매칭) 분리**: 사용자 표시 문구 변경 ≠ 백엔드 검색 키워드 변경.
  (회귀: "충남"으로 통일했더니 `ILIKE '%충남%'` 가 "충청남도" 비연속글자 매칭 실패로 0건)
- **DB 스키마 정합성**: 코드가 참조하는 컬럼/RPC/view 가 **실제 DB 에 있는지** `list_tables`/
  `information_schema` 로 먼저 확인. 마이그레이션 파일 존재 ≠ DB 적용. (회귀: 없는 컬럼 15개
  SELECT → PostgREST 422 → 전체 쿼리 실패) `schema_migrations` 적용 history ≠ repo 파일 수면 경고.
- **정적 통과 ≠ 런타임 안전**: 빌드·린트·esbuild 통과는 타입/문법 검증일 뿐. 결제·인증 등
  호출 경로를 직접 안 밟는 코드는 "정적 통과"만으로 완료 보고 금지. import 심볼을 동명 지역
  변수로 재선언 금지(섀도잉=TDZ). (회귀: `const adminClient = adminClient()` → 결제승인 100% 불능)
- 회귀 사례 전문: `docs/verification-lessons.md`.

## 페르소나 UX 검토 (해당 작업만 — 상세 `docs/persona-ux-review-rules.md`)

페르소나 작업의 핵심은 **사용자 친화적 UX 검토**다. 분류 엔진(`src/lib/weddingPersona.ts`,
20모드 단일 레지스트리)은 그 UX 분기를 가능케 하는 수단. 검토는 **현재 코드 기준**으로
각 페르소나를 surface 별 walkthrough → 마찰(friction) 발굴(✅/⚠️/❌). stale 스냅샷 불신.

## 청첩장 템플릿 작업 (해당 작업만 — 상세 `docs/invitation-template-rules.md`)

좌표는 **그리드 수치 측정**(눈대중 금지) + 실제 Konva 렌더로 레퍼런스와 나란히 비교.
종이 템플릿은 `page.print{wMm,hMm,bleedMm,safeMarginMm}` 필수(비율=캔버스 비율, 300dpi).
