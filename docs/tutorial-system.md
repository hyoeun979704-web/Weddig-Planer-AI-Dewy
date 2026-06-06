# 튜토리얼(코치마크) 시스템 가이드

> 새 페이지/기능을 추가하면서 튜토리얼 레슨을 붙일 때 이 문서를 따른다.
> 코드 단일 소스: `src/data/tutorialChapters.ts`. 포인트 지급은 DB 함수
> `complete_tutorial` + 허용목록 `tutorial_tours`.

---

## 1. 전체 구조

```
TUTORIAL_CHAPTERS (챕터)
  └─ TutorialLesson (레슨 = 한 번의 코치마크 투어, 포인트 지급 단위)
       └─ TutorialLessonStep (단계 = 화면의 한 요소를 강조)
```

관련 파일:

| 파일 | 역할 |
|---|---|
| `src/data/tutorialChapters.ts` | 챕터/레슨/단계 정의 + 필터 헬퍼(단일 소스) |
| `src/hooks/useTutorial.ts` | 진행 상태 머신(start/next/prev/skip/complete) + 완료 시 포인트 적립 호출 |
| `src/hooks/usePageTutorial.ts` | 페이지 진입 시 자동 시작 / `?tutorial=<id>` 쿼리 replay |
| `src/components/TutorialOverlay.tsx` | 코치마크 렌더(스포트라이트 컷아웃 + 말풍선) |
| `src/components/tutorial/PageTutorial.tsx` | `usePageTutorial` + `TutorialOverlay` 를 묶은 페이지용 래퍼 |
| `src/pages/Tutorial.tsx` | 챕터/레슨 목록·진행률·"다시 보기" 페이지 |
| `src/hooks/useTutorialProgress.ts` | 완료 레슨 진행률(로컬 + DB) |

DB:

| 객체 | 역할 |
|---|---|
| `complete_tutorial(p_tour_id text)` | 완료 기록 + 포인트 지급(SECURITY DEFINER) |
| `tutorial_completions (user_id, tour_id)` PK | 레슨 1회성 완료 기록(중복 지급 방지) |
| `tutorial_tours (tour_id)` | **유효 tour_id 허용목록** — 여기 없는 id 는 지급 안 함 |
| `point_transactions.reason` | 적립 사유. 튜토리얼은 `feature_<레슨id>` / 마스터는 `tutorial_master` |

---

## 2. 데이터 모델 (`tutorialChapters.ts`)

```ts
interface TutorialLessonStep {
  id: string;            // 단계 식별(자유)
  title: string;
  description: string;
  targetSelector: string; // 예: "[data-tutorial='budget-summary']" — 실제 DOM 에 있어야 함
  position: "top" | "bottom" | "left" | "right"; // 말풍선 위치
}

interface TutorialLesson {
  id: string;            // ⚠️ 지급 사유 = `feature_<id>`. 허용목록과 반드시 일치
  title: string;
  description: string;
  route: string;         // 시작 전 이동할 경로
  reward: number;        // ⚠️ 표시용(레거시). 실제 지급액은 서버 고정값(아래 4절)
  requiresStyles?: WeddingStyle[];   // wedding_style 화이트리스트
  requiresPersonas?: WeddingPersonaMode[]; // persona_mode 화이트리스트
  excludePersonas?: WeddingPersonaMode[];  // persona_mode 블랙리스트
  excludeRoles?: UserRole[];               // role 블랙리스트
  placeholder?: boolean; // true 면 자동시작/클릭 차단("준비 중") — 셀렉터 미부착 레슨
  aliases?: string[];    // 과거 레슨 id(중복 award 가드용)
  steps: TutorialLessonStep[];
}
```

필터 규칙(`isLessonVisible`): `requires*` 가 있으면 해당 차원이 매칭돼야 노출(ctx 값이
null 이면 숨김), `exclude*` 매칭 시 숨김. 모두 통과해야 보인다.

---

## 3. 실행 흐름

1. **자동 시작**: 페이지가 `usePageTutorial("<레슨id>")`(또는 `<PageTutorial id="..."/>`)
   를 쓰면, 로그인 + 첫 방문 + 필터 통과 시 800ms 후 자동 시작.
2. **다시 보기**: `Tutorial.tsx` 가 `navigate("<route>?tutorial=<레슨id>")` → 대상 페이지의
   `usePageTutorial` 이 쿼리를 읽어 500ms 후 시작(이미 완료해도 replay 허용).
3. `TutorialOverlay` 가 `currentStep.targetSelector` 를 `document.querySelector` 로 찾아
   스포트라이트 + 말풍선 표시. 못 찾으면 5회(×200ms) 재시도 후 "안내를 표시할 수 없어요".
4. 타깃 위치는 scroll·resize·`ResizeObserver` + 초기 폴링으로 **계속 재측정**하므로,
   위쪽 콘텐츠가 늦게 로드돼 타깃이 밀려도 하이라이트가 따라간다.
5. **완료**(마지막 단계의 "완료") → `endTutorial(true)` → 포인트 적립.
   **건너뛰기/닫기/라우트 이탈** → `endTutorial(false)` → **적립 안 함**.

---

## 4. 포인트 지급 규칙 (서버 `complete_tutorial`)

- 클라가 `feature_<레슨id>` 로 호출.
- **허용목록(`tutorial_tours`)에 없으면 무시** — 완료 기록·포인트 모두 없음(가짜 id 파밍 차단).
- 허용목록에 있고 첫 완료면 **base 100P** 지급(`point_transactions.reason = feature_<id>`).
- `feature_*` 레슨 **5개 이상** 완료 시 **마스터 보너스 500P**(`reason = tutorial_master`, 1회).
- 중복 지급 방지: `tutorial_completions (user_id, tour_id)` PK + `ON CONFLICT DO NOTHING`,
  마스터는 `>= 5` + 기수령 가드.

> ⚠️ **`reward` 필드(30/40/50)는 실제 지급액이 아니다.** 서버는 base 100P 고정.
> 표시 문구를 맞추려면 UI 또는 서버 둘 중 한쪽으로 통일 필요(현재는 미정합 — TODO).

---

## 5. 새 튜토리얼 레슨 추가 체크리스트

1. **대상 페이지에 앵커 부착**: 강조할 요소에 `data-tutorial="<단계셀렉터>"` 추가.
   - 스티키 헤더는 `PageHeader` 의 `tutorialId` prop 사용(래핑하면 sticky 깨짐).
   - 조건부로 사라지는 요소는 피하고, **항상 렌더되는 요소**를 앵커로.
   - 풀스크린(`main`)만 강조하는 건 의미 없음 → placeholder 로 두거나 구체 요소 부착.
2. **페이지가 오버레이를 렌더하는지 확인**: `usePageTutorial("<레슨id>") + <TutorialOverlay/>`
   또는 `<PageTutorial id="<레슨id>"/>` 중 하나가 있어야 한다.
3. **`tutorialChapters.ts` 에 레슨 정의**: 적절한 챕터의 `lessons` 에 추가. `route`·`steps`
   (targetSelector/position)·필터(requires*/exclude*) 설정. `placeholder` 는 빼거나 false.
4. **허용목록 마이그레이션**: `supabase/migrations/*.sql` 로
   `INSERT INTO public.tutorial_tours (tour_id) VALUES ('feature_<레슨id>') ON CONFLICT DO NOTHING;`
   를 추가하고 적용. **이걸 빼먹으면 완료해도 포인트가 안 들어간다.**
   (이 저장소는 CI 가 DB 마이그레이션을 자동 적용하지 않음 → MCP/대시보드로 직접 적용)
5. **검증**: `npm run build`, 해당 페이지 첫 방문 시 코치마크가 뜨고 마지막 단계 "완료" 시
   포인트 지급, **건너뛰기 시 미지급**, 새로고침 후 재시작 안 되는지(완료 기록) 확인.

### 라우트별 페이지 오버레이 현황(참고)
`usePageTutorial + TutorialOverlay`: Index(`/`, autoStart off)·Schedule·Budget·Community·PremiumContent.
`<PageTutorial>`: MyPage·AIPlanner·AIStudio·CoupleDiary.

---

## 6. 현재 레슨 인벤토리

활성(코치마크 동작 + 지급): `home-tour`, `mypage`, `ai-planner`, `ai-studio`, `schedule`,
`budget`, `community`, `couple`, `premium`.

플레이스홀더(준비 중 — 동작/지급 X, 셀렉터 미부착): `self-diy`(/tips), `remarriage-family`(/tips),
`snap-flow`(/ai-planner), `groom-tasks`(/ai-planner). 활성화하려면 5절 체크리스트를 따른다
(특히 `/tips` 에 앵커 요소 부착 필요).

---

## 7. 흔한 함정

- **셀렉터 부재**: `targetSelector` 가 그 라우트 페이지에 없으면 "안내를 표시할 수 없어요".
  조건부 렌더 요소·다른 탭의 요소를 앵커로 쓰지 말 것.
- **허용목록 누락**: 레슨 추가 후 `tutorial_tours` 갱신을 빼먹으면 무지급(에러 없이 조용히).
- **중복 셀렉터**: 같은 `data-tutorial` 이 여러 요소에 있으면 `querySelector` 가 첫 번째만 잡음.
- **스티키 헤더 래핑**: 헤더를 div 로 감싸면 sticky 가 깨짐 → `PageHeader tutorialId` 사용.
- **placeholder 레슨**: 자동시작·`?tutorial=` 진입·클릭 모두 차단. 활성화하려면 `placeholder`
  제거 + 실제 단계/셀렉터 필요.
- **reward ≠ 실지급**: `reward` 필드는 표시용, 실제는 서버 base 100P(4절).
