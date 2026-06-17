# 260616 코드리뷰 #2 — 유기성 배선 Wave 0 (퍼스널컬러·메모리 → 드레스/메이크업 추천)

> 대상: 본 브랜치(`claude/app-enhancement-brainstorm-gnsjbx`)에서 신규 구현한 **개인화
> 컨텍스트 합성 + 추천 주입** 슬라이스. 배경은 "기능은 많은데 데이터가 서로 안 통한다(유기성
> 부족)"는 진단 — 흩어진 신호(퍼스널컬러 컨설팅·AI 선호 메모리·페르소나·예산)를 단일
> `PersonalizationContext` 로 합성해 드레스·메이크업 추천에 실제로 흘려보낸다.
> 변경을 6차원 + dead-end UI + DB 정합성으로 자기 감사하고, 시뮬레이션 결과·한계를 명시한다.

## TL;DR

- **무엇**: `wedding_consulting_reports.analysis`(퍼스널컬러 시즌·언더톤·실루엣·메탈·메이크업
  색)와 `user_ai_memory(preference)`(스타일 선호) — 지금까지 **컨설팅 보드 렌더/챗봇에만 쓰이고
  추천엔 전혀 안 흐르던 죽은 데이터** — 를 합성해 ① 추천 화면 상단 칩으로 노출 ② 이미지 생성
  프롬프트에 "STYLE PREFERENCE(secondary)" 절로 주입.
- **신규 파일 4 + 편집 2**. 순수 합성 로직은 `src/lib/weddingContext.ts`(React·supabase 무의존),
  I/O 는 `useWeddingContext` 훅이 담당(관심사 분리).
- **P0/P1 없음**: 신규 인가 구멍 없음(본인 행만 read), dead-end UI 없음(칩은 실제 추천에
  반영, 데이터 없으면 렌더 안 함), 프롬프트 주입은 정체성 규칙을 덮지 않게 "secondary" 명시.
- **검증**: `npm run build` 0 error · 신규 파일 `eslint` 0 error(기존 `any` 경고만, 미변경 라인) ·
  신규 유닛 테스트 **16/16 pass** · 전체 `vitest` 466 pass / **1 사전 실패**(`aiPlannerPostprocess`,
  clean tree 에서도 실패 — git stash 로 확인, 본 변경 무관).
- **한계(정직 보고)**: 실제 gpt-image 생성 결과물과 라이브 DB 쿼리(RLS 통과·embed)는
  sandbox 에서 e2e 미확인. 합성·추출·주입 **로직은 유닛 테스트로 고정**했고, DB 컬럼 존재는
  `types.ts` 로 확인. 실환경 클릭 검증은 사용자 확인 필요(아래 §시뮬레이션 한계).

## 무엇을 만들었나 (파일)

| 파일 | 역할 |
|---|---|
| `src/lib/weddingContext.ts` (신규) | 순수 합성/추출 단일 소스. `buildPersonalizationContext`, `extractColorTone`, `extractRankedNames`, `extractStyleTagsFromMemory`, `deriveBudgetBand`, `buildDress/MakeupPromptAddendum` |
| `src/lib/weddingContext.test.ts` (신규) | 위 로직 16 테스트(엣지: 빈/부분/모호 입력, no-op 보장) |
| `src/hooks/useWeddingContext.ts` (신규) | `useWeddingProfile` + `wedding_consulting_reports`(최근 completed) + `user_ai_memory(preference)` 조합 → `PersonalizationContext` |
| `src/components/PersonalizationChips.tsx` (신규) | "내 정보가 추천에 반영돼요" 칩. 칩 0개면 null 렌더 |
| `src/pages/DressRecommend.tsx` (편집) | 훅 사용 → intro 칩 + 생성 프롬프트에 dress addendum 결합 |
| `src/pages/MakeupRecommend.tsx` (편집) | 훅 사용 → intro 칩 + 생성 프롬프트에 makeup addendum 결합 |

## 6차원 자기 감사

1. **정확성/견고성**: 빈배열·null·비배열·빈 객체(`{}`·`{name:""}`) 전부 우아 처리(테스트로
   고정). 신호 0건이면 addendum=`""` → 프롬프트 **무변경**(기존 동작 보존). 빈 `catch{}` 없음 —
   훅 catch 는 빈 컨텍스트로 폴백 + 주석으로 의도 명시. `await Promise.all` 누락 없음, cancelled
   가드로 unmount 후 setState 방지.
2. **보안/인가**: 신규 쓰기 경로 없음(읽기 전용 합성). 두 쿼리 모두 `.eq("user_id", user.id)` —
   본인 행만. 프롬프트 주입 텍스트는 사용자 자신의 컨설팅 결과(외부 입력 아님). 클라 노출
   문구는 한국어 라벨뿐(내부 스키마/PII 누출 없음).
3. **성능**: 추천 화면 mount 당 2쿼리(`Promise.all` 병렬, 각 `limit`/`maybeSingle`). N+1 없음.
   `useMemo` 로 컨텍스트 메모이즈(매 렌더 재계산·새 객체 deps 폭주 없음).
4. **테스트**: 분기·실패·no-op 시나리오 포함 16 테스트. 현실적 동적 목업(고정 id 조작 없음).
5. **유지보수성(DRY)**: 톤/실루엣/색 추출을 단일 소스(`weddingContext.ts`)에 모음 — 드레스·
   메이크업이 같은 합성을 재사용(복붙 없음). 라벨은 `TONE_LABEL` 상수. 매직넘버(예산대 2000/5000
   만원) 주석화. "왜"(죽은 데이터 부활) 주석 명시.
6. **아키텍처**: 계층 분리 준수 — 순수 로직(lib) ↔ I/O(hook) ↔ UI(component/page). 기존 호출부
   시그니처 **무변경**(`buildRecommendDressPrompt` 등 그대로, 결과 문자열에만 addendum 결합) →
   breaking change 없음.

## dead-end UI 점검 (필수 차원)

- `PersonalizationChips` 는 **장식 토스트가 아니다**: 같은 `context` 가 그 자리에서 생성
  프롬프트에 실제로 주입되므로 "보여주기만 하고 동작 안 함" 아님. 칩 데이터가 없으면 컴포넌트가
  `null` 을 렌더(빈 박스/"준비 중" 잔존 없음).
- no-op onClick 없음(칩은 비대화형 표시 요소). 신규 placeholder CTA 없음.

## DB 정합성

- `wedding_consulting_reports`: `analysis`(Json)·`status`·`created_at`·`user_id` — `types.ts:5764`
  로 컬럼 존재 확인. `user_ai_memory`: `fact_type`·`fact_text`·`user_id` — 기존 `aiMemory.ts`
  와 동일 컬럼. **RPC 호출 없음**(인자↔시그니처 불일치 위험 없음). 신규 마이그레이션 없음
  (기존 테이블만 read) → 배포 영향 0.

## 시뮬레이션 (페르소나 walkthrough)

- **신규 사용자(컨설팅·메모리 없음)**: 훅 → `hasData=false` → 칩 미렌더 + addendum `""` →
  드레스/메이크업 추천이 **기존과 100% 동일**(회귀 없음). ✅ (유닛 "no signal" + null 가드로 보장)
- **퍼스널컬러 컨설팅 완료(예: 가을 뮤트/웜)**: 드레스 AI 추천 진입 시 "퍼스널컬러: 가을 뮤트",
  "추천 실루엣: A라인" 칩 노출 → 생성 시 프롬프트에 silhouettes/dress_white/metal 절 결합 →
  결과가 본인 퍼스널컬러를 반영. ✅ (합성·주입 로직 유닛 검증)
- **선호 메모리만 존재("미니멀 선호")**: "선호: 미니멀" 칩 + mood 절 주입. ✅

### 시뮬레이션 한계 (작동한다 ≠ 검증됨)

- 실제 **gpt-image 생성물**이 시즌 톤을 시각적으로 반영하는지, **라이브 DB**에서 RLS 통과·
  컨설팅 행 조회가 되는지는 **sandbox 에서 e2e 미확인**. 정적 통과(빌드/타입/린트)와 유닛
  테스트는 통과했으나, 호출 경로(컨설팅 행 존재 사용자의 실제 추천 클릭)는 사용자 실환경
  확인을 권장. 프롬프트 주입은 "secondary" 로 정체성 규칙 하위에 두어 안전 마진 확보.

## 남은 작업 (deferred — 유기성 배선 로드맵)

본 슬라이스는 **Wave 0 백본 + B그룹 대표 와이어(B1)**. 전체 배선 맵 기준 후속:

- **A그룹(행동→자동기록)**: 드레스/스드메 선택 → 예산·일정 자동 항목, 청첩장 주문 → 예산.
  *DB 쓰기 동반 → 라이브 검증 필요해 본 PR 범위서 제외.*
- **B그룹 잔여**: 퍼스널컬러 → 헤어 추천(`HairPreview`)·청첩장 팔레트 시드, 예산 상한 → 업체 추천 필터.
- **C그룹(양방향)**: 게스트 RSVP 수 → 예산 식대 추정·예식장 수용인원 필터, 일정 완료율 → 홈 readiness.
- **D그룹(능동화)**: 컨텍스트 종합 → "다음 액션 N개", 실납부 익명 집계 → 가격 벤치마크.
- **추가 검토**: 컨설팅 결과를 `user_ai_memory(preference)` 로도 승격하면 본 합성이 보드 미생성
  사용자(메모리만 있는 케이스)까지 더 촘촘히 커버.

---

## 2차 증분 — D2(크로스-피처 다음 액션) + C1(하객→식대 추정)

> 같은 PR 후속. 홈 "다음 액션"이 **일정 항목만** 보여주고 전부 `/my-schedule` 로만 보내던
> 한계(섬 안 순환)를, 기능 간 빈틈을 감지해 **각 기능으로 딥링크**하는 "스마트 제안"으로 확장.

### 무엇을 만들었나 (2차)

| 파일 | 역할 |
|---|---|
| `src/lib/smartSuggestions.ts` (신규) | 순수 제안 엔진. `deriveSmartSuggestions`(빈틈→우선순위 랭킹), `estimateCateringCost`(C1 하객×1인식대), `formatManwon` |
| `src/lib/smartSuggestions.test.ts` (신규) | 10 테스트(우선순위·딥링크·임박조건·limit·빈틈 없음) |
| `src/hooks/useSmartSuggestions.ts` (신규) | `usePersonaInsights`+`useWeddingContext`+`useBudget` 조합(읽기 전용) |
| `src/components/home/PersonaDashboard.tsx` (편집) | "스마트 제안" 블록 — 빈틈 있을 때만 렌더, 각 제안 딥링크 |

### 감지하는 빈틈(딥링크)
- 예산 **초과**(지출>총예산) → `/budget` (priority 95, 식대 초과액 표시)
- D-90 이내 + 진척 70% 미만 → `/my-schedule` 체크리스트 (85)
- 예산 **미설정** → `/budget` (80, "하객 N명 기준 식대 약 N만원" C1 동기부여)
- 퍼스널컬러 컨설팅 **미실시** → `/wedding-consulting` (55, Wave 0 추천 시너지로 연결)

### 6차원 (2차 델타)
- **정확성**: 빈틈 0이면 빈 배열 → 카드 미렌더(잡음 없음). `d>=0 && d<=90` 등 경계값 테스트로 고정.
  early-return 전 훅 호출(React 규칙 준수).
- **dead-end UI**: 모든 제안이 **실제 기능 라우트로 딥링크**(toast/no-op 아님). 일정 "다음 액션"과
  **중복 아님** — 그쪽은 일정 항목, 이쪽은 surface 간 빈틈(역할 분리).
- **DRY/아키텍처**: `useWeddingContext`(Wave 0) 재사용, 순수 랭킹은 lib, I/O 는 훅. 계층 유지.
- **성능**: `useBudget`는 react-query 캐시 공유(중복 쿼리 없음), `useMemo` 메모이즈.

### 검증 (2차)
- 신규 유닛 **10/10 pass**(누적 26/26) · `npm run build` 0 error · 신규 파일 lint 0 error
  (PersonaDashboard 의 기존 `supabase as any` 경고 1건은 미변경 라인) · 전체 `vitest`
  **476 pass / 1 사전 실패**(동일·무관).
- **한계**: 실데이터(예산 설정 유무·컨설팅 행)에 따른 실제 노출은 라이브 확인 권장(로직은
  유닛으로 고정). 홈 클릭 e2e 는 sandbox 미확인.

## 남은 작업 (갱신 — deferred 사유 명시)

- **A그룹(행동→자동 DB 기록)**: 의도적으로 보류. ① 추천 플로우는 *프리뷰 생성*이지 "이 드레스로
  확정" 결정점이 없어 예산 자동 항목의 트리거가 부재 ② 청첩장/결제→예산은 KakaoPay edge
  경로라 **중복발급·부분쓰기 방지(멱등성)** 가 라이브 e2e 없이는 위험. 결정점 UX 설계 후 별도 PR.
- **C그룹 잔여**: RSVP 실집계→예식장 수용인원 필터, 일정 완료율→readiness 정식 스코어.
- **D그룹 잔여**: 실납부 익명 집계→가격 벤치마크(오라클), 자율 에이전트 실행(승인/거부 루프).

---

## 3차 증분 — 홈→서비스 전환율 (퍼널 계측 + 단일 다음 한 걸음)

> 홈 전환율 개선. 진단: 홈에 서비스 진입 CTA 15개+가 동등 무게(선택 과부하)인데 **전환
> 측정이 0**(GA/PostHog 없음). 단, `user_events` 테이블 + `trackEvent` 헬퍼는 **이미 존재**
> (페르소나 v2) — 홈 내비게이션에 안 불릴 뿐. → 새 테이블 만들지 않고 **재사용**.

| 파일 | 역할 |
|---|---|
| `src/lib/track.ts` (편집) | `trackHomeNav(source,target,extra)` + 순수 `buildHomeNavProps` 추가 (기존 trackEvent/user_events 재사용, 새 테이블·마이그레이션 없음) |
| `src/lib/track.test.ts` (신규) | `buildHomeNavProps` 3 테스트 |
| `src/components/home/HomeQuickLinks.tsx` (편집) | 클릭 시 `trackHomeNav("quick_links", href)` |
| `src/components/home/PersonaDashboard.tsx` (편집) | 스마트 제안을 **단일 primary CTA + 보조 칩**으로 재구성(선택 과부하 해소), 모든 클릭 trackHomeNav |

### 6차원 (3차 델타)
- **DRY/재사용**: 새 `nav_events` 테이블을 만들 뻔했으나 grep 으로 기존 `user_events`+`track.ts`
  발견 → 재사용(중복·마이그레이션 회피). event_name `home_nav_click`, snake_case 컨벤션 준수.
- **dead-end UI**: primary CTA·보조 칩 모두 실제 라우트 딥링크. 측정은 fire-and-forget(UX 무영향,
  실패는 콘솔만, 미인증 시 RLS 로 조용히 패스).
- **정확성**: 빈틈 0이면 블록 미렌더. `buildHomeNavProps` 순수·테스트.

### 검증 (3차)
- 신규 유닛 **3/3 pass**(누적 29) · `npm run build` 0 error · 신규 파일 lint 0 error(기존 `any`
  경고는 미변경 라인) · 전체 `vitest` **479 pass / 1 사전 실패**(동일·무관).
- **한계**: 측정 데이터는 라이브 사용자 트래픽이 쌓여야 의미 — 본 PR 은 "계측을 깐다"까지.
  실제 퍼널 수치·이탈 지점은 운영 후 `user_events` 집계로 확인(admin service_role).

### 남은 전환율 레버 (deferred — 라이브 확인/도메인 조사 필요)
- **미로그인 마찰 / 게스트 프리뷰**: HomeQuickLinks·카테고리 타일이 게스트에게 protected route 로
  silent 리다이렉트되는지 **실동작 확인 후** 게이트/프리뷰 설계(추측 금지 — verification-lessons).
- **기업회원 업체 상세정보 관리 부재 → 큐레이션 저하**: 사업자가 자기 업체 상세를 못 채워
  추천/비교 품질 하락. business 페이지·vendor 스키마 도메인 조사 후 별도 트랙(아래 보고 참조).

---

## 4차 증분 — 게스트 전환: 로그인 후 복귀(return-to)

> 조사로 가정 정정(추측 금지): `/board`·`/compare`·`/quote` 는 **공개 + 비파괴 LoginRequiredOverlay**,
> AI 기능도 게스트 맛보기 허용 → ④게스트프리뷰는 사실상 이미 됨. **진짜 누수**는 오버레이가
> `/auth` 로 보낼 때 **목적지를 안 넘겨** 로그인 후 홈으로만 떨어지던 것(return-to 부재).

| 파일 | 역할 |
|---|---|
| `src/lib/redirect.ts` (신규) | `safeInternalPath`(오픈 리다이렉트 방지) + `authLinkWithRedirect` |
| `src/lib/redirect.test.ts` (신규) | 5 테스트(외부URL·//host·scheme·상대경로 거부, 인코딩) |
| `src/components/LoginRequiredOverlay.tsx` (편집) | 현재 경로를 `/auth?redirect=` 로 전달 |
| `src/pages/Auth.tsx` (편집) | redirect 파라미터 sanitize 후 로그인 성공 시 복귀 |

### 6차원 (4차 델타)
- **보안**: 오픈 리다이렉트 차단 — 내부 경로(단일 `/` 시작)만 허용, `//host`·`/\`·`scheme://`
  전부 fallback. 테스트로 고정.
- **정확성**: business/onboard 플로우는 보존, 개인회원만 redirectTo. effect+명시 navigate 둘 다
  redirectTo 로 통일(홈 플래시 제거).
- 검증: 신규 유닛 **5/5**(누적 34) · build 0 error · 신규 파일 lint **0 issue** · 전체 **484 pass / 1 사전 실패**.
- **한계**: 실제 로그인→복귀 클릭은 sandbox e2e 미확인(로직·sanitize 는 유닛 고정).

## 기업회원 업체 상세관리 → 큐레이션 (조사 결과 + 계획, 미구현)

조사(`BusinessVendorEdit`·`upsert_my_listing` RPC·`places` 스키마):
- 사업자 편집 가능: name·description·city·district·main_image·min_price·tags·문의채널.
- **큐레이션이 필요로 하나 사업자가 못 채우는 필드**(품질 병목):
  1. **포트폴리오 위치 태깅**(`place_media.venue_place_id/name`) — `venueMatch` 최강 신호인데
     사업자는 사진만 올리고 어느 식장인지 태깅 불가(admin 전용) → "같은 식장 추천" 무력.
  2. **lat/lng** — admin 전용 → 사업자 업체 지도·거리필터 미노출.
  3. **카테고리별 상세(`BusinessListingDetailForm`)** — Phase 2b 스켈톤만, 미구현.
- **별도 트랙 필요(이 PR 범위 밖)**: 전부 RPC/소유권·admin 권한 모델 변경 + **라이브 DB 검증**
  동반 → sandbox e2e 불가라 무리 구현 금지. 우선순위: ①포트폴리오 위치 태깅(큐레이션 영향 최대,
  upsert RPC 에 owner 가 자기 media 의 venue 태그를 셀프 식장에 한해 set 허용) → ②지오코딩
  자동화(주소→lat/lng, 기존 `place-geocode-backfill` 함수 재사용) → ③상세폼.

---

## 5차 증분 — 버그수정: 사업자 정보 입력 유실(iOS 웹)

> 실사용 사업자 피드백: "페이지를 나갔다 들어오면 기재해둔 내역이 계속 사라져요 / 캐시저장이
> 안 되는 것 같아요 / iOS 웹". **근본 원인**: `BusinessVendorEdit`·`BusinessListingDetailForm`
> 이 입력을 React state 에만 보관 → iOS Safari 가 앱 전환·메모리 압박 시 백그라운드 페이지를
> 폐기 → 복귀 시 SPA 전체 리로드 → state 가 ""로 초기화, 서버엔 '저장' 눌러야만 남으므로 복원 불가.

| 파일 | 역할 |
|---|---|
| `src/lib/formDraft.ts` (신규) | 재사용 draft 유틸: `draftKey`(user 격리)·load/save/clear(try/catch)·`shallowEqual`·`jsonEqual` (+10 테스트) |
| `src/pages/business/BusinessVendorEdit.tsx` (편집) | 변경마다 draft 자동저장 → 복귀 시 복원 → 저장 성공 시 제거 |
| `src/components/business/BusinessListingDetailForm.tsx` (편집) | 동일(중첩 값은 jsonEqual) |

### 설계 핵심(회귀 방지)
- **hydrate 가드**: 초기 로드값이 draft 로 덮어써지지 않게 `hydratedRef` 전엔 autosave no-op.
- **서버 스냅샷 비교**: draft 가 서버값과 같으면 저장 안 함/제거 → "미저장 변경 있을 때만" draft 존재.
- **매 입력 동기 저장**: debounce 없이 매 변경 즉시 localStorage → iOS 탭 폐기 타이밍에도 최신 보존.
- **저장 성공 시 제거**: snapshot 갱신 + clearDraft → 다음 진입에 stale 복원 안 함.
- **best-effort**: 프라이빗 모드/용량초과 setItem throw 를 try/catch(앱 흐름 무영향).

### 6차원 (5차 델타)
- **정확성**: 빈/손상 JSON·없음 모두 우아 처리(테스트). user 격리 키(공유기기 누출 방지).
- **DRY**: 두 폼이 동일 유틸 재사용. **dead-end 없음**: 실제 입력 복원(토스트만 아님).
- 검증: 신규 유닛 **10/10**(누적 44) · build 0 error · 신규 파일 lint 0 error · 전체 **494 pass / 1 사전 실패**.
- **한계**: 실제 iOS Safari 탭 폐기→복귀 복원은 sandbox e2e 불가 — 로직은 유닛 고정, **실기기
  확인 권장**(사업자에게 재현 요청). localStorage 복원은 동일 브라우저 내 한정(cross-device 아님).

---

## 6차 증분 — 입력 유실 전수 점검: 위험 폼 4종에 draft 확대

> "저장 문제를 끝까지" — 같은 미저장 유실 패턴을 전 폼 조사 후 위험 4종에 적용. 재사용
> 훅 `useTextDraft` 로 추출(formDraft 위에 hydrate/autosave/clear 캡슐화), 폼별 변경 최소화.

| 파일 | 적용 |
|---|---|
| `src/hooks/useTextDraft.ts` (신규) | 공통 draft 라이프사이클 훅(hydrate 가드·hasContent·ref 최신화) |
| `src/pages/QuoteNew.tsx` (편집) | 견적 요청(장문+이미지 path). 프리필(카테고리·지역) 제외한 hasContent |
| `src/pages/CoupleDiaryWrite.tsx` (편집) | 부부일기(텍스트만, 사진 File 제외) |
| `src/pages/Contact.tsx` (편집) | 1:1 문의 |
| `src/components/place/PlaceInquirySheet.tsx` (편집) | 업체 문의(시트, placeId 별 격리) |

### 안전 판정(작업 불필요, 조사 근거)
- `CommunityWrite`: 이미 draft 구현됨. `InvitationFlow/Studio`: 저장→invitationId 서버 영속(편집 모드 복귀).
  `BudgetSetupSheet/AddSheet`·`WeddingInfoSetupModal`: props prefill 로 재오픈 복구. `*Survey`: 빠른 제출 사이클.

### 6차원 (6차 델타)
- **DRY/아키텍처**: 6개 폼이 단일 `formDraft`+`useTextDraft` 재사용(복붙 0). 계층(lib→hook→page) 유지.
- **정확성**: hasContent 로 프리필만의 빈 draft·오인 토스트 차단. File 객체 제외(직렬화 불가).
  hydrate 가드로 초기값 보존. enabled(미인증/시트닫힘) no-op.
- **보안**: user별 키 격리(공유기기 누출 방지). best-effort try/catch(iOS 프라이빗 모드).
- 검증: build 0 error · 변경 파일 lint 0 error(기존 `any` 경고만) · 전체 `vitest` **494 pass / 1 사전 실패**.
- **한계**: 실기기 iOS e2e 미확인(로직·formDraft 유닛 44개로 고정). cross-device 아님.

이로써 **입력 유실(저장) 문제는 위험 폼 전반에 해소**. 기획·고도화는 후속 새 PR 에서 진행.
