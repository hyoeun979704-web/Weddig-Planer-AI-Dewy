# 260621 전체 코드리뷰 (보안·P0·dead-end UI·iOS/사파리)

> 전체 `src/`·`supabase/functions/`·`api/` 를 AGENTS.md 7차원 + `docs/code-review-rules.md` 기준으로
> 감사. 4개 병렬 서브감사(엣지 보안·프론트 데이터레이어·dead-end UI·iOS) + 최상위 발견 직접 재검증.
> 측정/실기기 e2e 는 sandbox 제약으로 미실시 — 수정은 코드·API 동작 근거이며 실환경 확인 권장.

## TL;DR

코드베이스는 성숙하고 과거 회귀(죽은 토스트 문의 CTA·RPC 시그니처 불일치·결제 섀도잉 TDZ·스키마
드리프트)는 대부분 해소돼 있다. 결제 무결성·인가·CORS·escape 규율은 견고. **이번에 실제로 고친
핵심은 두 가지**: ① **결제 하트 이중 발급 레이스(P1)**, ② **iOS 사파리 raw 저장소 렌더 크래시
클러스터(P1 — 화이트스크린)**. 후자는 사용자가 보고한 #5 "업체 미리보기 화이트스크린"의 유력 후보다
(해당 hook 들이 `usePageTutorial` 로 다수 페이지 렌더 경로에 올라 iOS 프라이빗 모드에서 throw).

## 보안 (인가) — 베이스라인 견고, 저심각 항목만

직접 확인한 **안전(이슈 아님)**: CORS `*` 는 토큰인증+credentials 미설정이라 안전 / 결제 리다이렉트
오리진은 `_shared/allowedOrigins.ts` 가 `URL.origin` exact-match(prefix 공격 차단) / 신원은 항상
JWT(`getClaims().sub`)에서, 요청 body 신뢰 안 함 / 결제 금액 서버 카탈로그 재검증 + 불일치 자동환불 /
admin RPC 는 SECURITY DEFINER + `has_role` 서버검증 / 사용자 입력 `.ilike/.or` 는 `postgrestEscape`.

**남은 P2 (이번 PR 범위 밖 — 별도 하드닝 PR 권장, 아래 "남은 작업"):**
- 클라 응답에 내부 에러 detail 누출: `verify-business/index.ts:215,246`, `cal-sync:48`,
  `dewy-makeup-recommend:137`/`dewy-dress-recommend:149`, `instagram-publisher`(admin-gated).
- `mirror-image/index.ts:189` admin 게이트 부재(SSRF 자체는 `assertPublicHost` 로 잘 방어됨 → 하드닝).
- ~25개 `(supabase as any).rpc` 캐스트: 현재 시그니처 일치하나 드리프트 은폐 → `types.ts` 재생성 권장.

## P0/P1 버그

**P1 (FIX) — 결제 early-bird 하트 이중 발급 레이스** — `supabase/functions/kakao-pay-approve/index.ts`
- 동시 승인 2건이 `existing` 멱등 체크(:80)를 함께 통과 → 둘 다 Kakao 승인 → 둘 다 payments insert.
  `UNIQUE(payment_key)` 패자가 **로그만 찍고 계속 진행**해 구독 upsert + `earn_hearts` 재실행 →
  early-bird 하트엔 멱등 가드가 없어 **하트 2배 지급**.
- **수정**: insert 에러가 중복(PG `23505`/"duplicate")이면 하트 지급 **전에** `alreadyProcessed` 로
  early return(sibling `kakao-pay-charge-approve:187-198` 와 동일 패턴). 비-중복 에러는 결제했는데
  미활성되는 것을 막기 위해 구독 활성화는 진행하되 명시 로깅. esbuild 번들 ✓.
- ⚠️ 실환경 동시성 재현(concurrent approve)으로 사후 확인 권장.

그 외: 빈 `catch{}`·`await` 누락·언가드 배열접근·import 섀도잉/TDZ — 엣지/프론트 전반 **없음**(확인).

## dead-end UI (필수 차원) — clean

과거 "문의하기" 죽은 토스트 회귀는 **해소·검증됨**(`PlaceDetailLayout.tsx:301-354` — 실제 인앱 문의/
오너 채널/외부 링크-tel, 연락처 없으면 죽은 토스트가 아니라 **비활성 "연락처 미등록" 버튼**).
- **(FIX) dead code 삭제**: `src/components/home/CategoryGrid.tsx` — `onClick:()=>{}` no-op 카드 2개를
  가진 **중복/미사용 파일**(라이브는 전부 `@/components/CategoryGrid` import, 직접 grep 확인). 향후
  잘못 배선될 위험 제거 위해 삭제.

## iOS / 사파리(웹) — 이번 PR의 핵심 (화이트스크린 클러스터 FIX)

iOS 사파리는 프라이빗/추적방지/용량초과 시 `localStorage`·`sessionStorage` 접근에서 **throw**. 앱엔
안전 어댑터(`createSafeStorage`)가 있으나 일부 raw 접근이 **렌더 경로**(hook 본문·`useState` 초기화·
effect)에 남아 iOS 에서 화이트스크린(가입실패 회귀와 동일 클래스).

- **공통화(FIX)**: `src/lib/safeLocalStorage.ts` 싱글톤 신설(기존 `safeSessionStorage` 패턴 미러).
- **렌더 경로 raw 접근 제거(FIX)** — 전부 safe 어댑터 경유:
  - `src/hooks/useTutorial.ts:51`(hook 본문, 매 렌더) + setItem/getItem 4곳.
  - `src/hooks/useTutorialProgress.ts:load()` — 첫 getItem 만 try/catch 였고 legacy 마이그레이션
    getItem 이 catch 밖에서 **재throw**(false safety)하던 것 제거.
  - `src/pages/Schedule.tsx`(useState init), `src/components/budget/BudgetAddSheet.tsx`(:125 setItem 이
    예산 저장을 abort), `src/components/VenueCrossLink.tsx`(useState init).
  - 고트래픽 검색 오버레이 `SearchOverlay.tsx`·`CommunitySearchOverlay.tsx`(+ `JSON.parse` try/catch).
  - sessionStorage: `Suit.tsx`·`Community.tsx`(→ `safeSessionStorage`), `CommunityWrite.tsx`(draft).
- ⚠️ 실제 iOS 프라이빗 모드 재현으로 #5 화이트스크린 해소 여부 사후 확인 권장.

## 검증 인프라
- `npm run build` ✓ · `npm run test` **531 passed** ✓ · 변경 파일 `eslint` 0 error ·
  `npx esbuild kakao-pay-approve` 번들 ✓.

## 적용 변경 (이 PR)

| 영역 | 파일 | 변경 |
|---|---|---|
| 결제 P1 | `supabase/functions/kakao-pay-approve/index.ts` | 중복 insert 시 하트 지급 전 early return |
| iOS 공통화 | `src/lib/safeLocalStorage.ts` (신규) | throw 없는 localStorage 싱글톤 |
| iOS 렌더크래시 | useTutorial·useTutorialProgress·Schedule·BudgetAddSheet·VenueCrossLink·SearchOverlay·CommunitySearchOverlay·Suit·Community·CommunityWrite | safe 어댑터 경유 + parse 가드 |
| dead code | `src/components/home/CategoryGrid.tsx` | 삭제(미사용 no-op 카드) |

## 남은 작업 (deferred — 별도 PR 권장, 추적용)

1. **엣지 함수 에러 detail 스트립**(P2 보안): `verify-business:215,246`·`cal-sync:48`·
   `dewy-*-recommend`·`instagram-publisher` — 클라 응답에서 `.message`/`detail` 제거(서버 로그만).
   각 Deno 함수 esbuild 재검증 필요 → 묶어서 별도 PR.
2. **`mirror-image` admin 게이트**(P2): instagram 함수들의 `has_role("admin")` 패턴 적용.
3. **`types.ts` 재생성 + `as any` rpc 캐스트 제거**(P2, 드리프트 예방 — 최고가치 예방책): 라이브 DB
   기준 재생성 필요.
4. **draft 자동저장 부재**(P2): `PlaceReviewWriteSheet.tsx`(최대1000자 리뷰)·`CommunityEdit.tsx` —
   `useTextDraft`/`formDraft` 도입(iOS 탭 폐기 데이터 유실 방지).
