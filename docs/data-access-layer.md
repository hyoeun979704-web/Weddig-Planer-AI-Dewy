# 데이터 접근 레이어 컨벤션 (Task #3)

> 페이지에 산재한 supabase `.from()/.rpc()/functions.invoke()` 호출(432개/106페이지)을
> **도메인별 데이터 레이어**로 점진 추상화한다. 도메인별 여러 PR. 이 문서가 패턴 단일 소스다.
> 첫 PoC: `src/features/partners/data/businessDashboard.ts` (+ `hooks/useBusinessDashboard.ts`).

## 왜

- 페이지에 raw supabase 가 섞이면: ① 단위 테스트 불가(렌더 없이 쿼리 검증 못 함) ② `(supabase as any).rpc`
  캐스트가 시그니처 불일치를 가림(PGRST202 런타임 실패 — verification-lessons) ③ 같은 쿼리 복붙 드리프트
  ④ 캐싱·무효화 제각각.
- 레이어를 두면 쿼리가 **테스트 가능·재사용·타입안전**해지고, React Query 키가 한곳에서 관리된다.

## 구조 (3겹)

```
src/features/<domain>/
  data/<entity>.ts          # ① 순수 데이터 함수 + 쿼리키 (React 비의존)
  hooks/use<Entity>.ts      # ② React Query 래퍼 (useQuery/useMutation)
  pages/<Page>.tsx          # ③ 훅만 import — raw supabase 금지
  data/<entity>.test.ts     # ① 데이터 함수 단위 테스트 (모킹된 supabase)
```

### ① data/ — 순수 데이터 함수
- supabase 호출을 여기로 모은다. **React import 금지**(테스트 용이).
- 쿼리키 팩토리를 export(`<domain>Keys`) — 무효화 시 재사용, 키 드리프트 차단.
- 읽기: 성공 데이터를 typed 로 반환. 쓰기(mutation): 실패 시 `throw`(호출부 toast).
- 통계처럼 **부분 실패에 관대해야 하는** 읽기는 쿼리별 0/null 폴백(화면 안 깨짐). 그 외는 throw 로
  React Query 에 위임.
- `(supabase as any)` 캐스트 지양 — 타입 에러가 나면 RPC 인자/시그니처를 실제로 맞춘다(숨기지 말 것).

### ② hooks/ — React Query 래퍼
- `useQuery({ queryKey: <domain>Keys.x(id), queryFn: () => fetchX(id), enabled: !!id })`.
- mutation 은 `useMutation` + `onSuccess` 에서 `invalidateQueries({ queryKey })`.
- 빈 신호(placeId/id 없음)는 `enabled:false` + 빈값 폴백으로 우아하게(빈 화면/dead-end 금지).

### ③ pages/ — 훅만 사용
- `import { supabase }` 제거. 파생값(예: 선택 지점에서 placeId)만 계산해 훅에 넘긴다.
- 훅은 **early return 이전, 최상단에서 무조건 호출**(React Hooks 규칙). 게이트는 `enabled`/인자 null 로.

## 적용 순서 (고가치부터)

1. **partners**(42 call-sites/12파일) — `data/` 컨벤션 검증 PoC. ✅ businessDashboard 완료.
2. **console**(154/28) — 중간 레이어 전무(raw `.from()` in useEffect), 효용 최대.
3. **consumer**(236/66) — 일부는 이미 `src/hooks/*`(usePlaceDetail 등) 패턴. 미추상화분만.

도메인 경계 준수(AGENTS.md): feature 외부에서 `@/features/<feature>/*` import 금지. 공유 쿼리는
`src/hooks/`(전역) 또는 `src/lib/`.

## 체크리스트 (PR 단위)
- [ ] 페이지에서 raw supabase 제거(`grep "supabase" 페이지` = import 없음)
- [ ] data 함수에 단위 테스트(매핑 + 에러/빈값 분기)
- [ ] 쿼리키 팩토리 사용(문자열 배열 인라인 금지)
- [ ] mutation 후 invalidate 로 즉시 갱신(수동 refetch 제거)
- [ ] `npm run build`·`lint`·`test` 통과 + 동작 동치(회귀 없음)
