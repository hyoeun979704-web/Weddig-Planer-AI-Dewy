# 260621 성능 최적화 (전체 코드 기준)

> 전체 `src/` + `supabase/functions/` 쿼리 패턴을 스캔해 검증된 성능 이슈만 표적 수정.
> 측정 e2e 는 sandbox 제약으로 미실시 — 모든 항목은 현재 코드 직접 확인 기준이며, 실환경
> 체감/측정은 배포 후 확인 권장(작동≠검증).

## TL;DR — 적용한 수정 (이 PR)

| # | 위치 | 문제 | 수정 | 영향 |
|---|---|---|---|---|
| 1 | `src/App.tsx:201` | 전역 QueryClient 가 기본값(`staleTime:0` + `refetchOnWindowFocus:true`) → 모바일 웹에서 **탭 전환마다 모든 useQuery 재요청** | `defaultOptions.queries`= `staleTime 60s` · `gcTime 5m` · `refetchOnWindowFocus:false` | 앱 전역. 탭 포커스 중복 라운드트립 제거(최고 레버리지) |
| 2 | `src/hooks/useCategoryData.ts` | 모든 업체 브라우즈 리스트의 핵심 쿼리가 `places`를 `select('*')`(33컬럼) — 카드·정렬엔 14개만 사용 | `*` → 명시 14컬럼(`place_id,name,city,district,min_price,avg_rating,review_count,is_partner,main_image_url,lat,lng,tags,partner_rank,data_completeness`) | 가장 빈번한 쿼리의 과다 페치(~20컬럼×카드×페이지) 제거 |
| 3 | `src/pages/ProductDetailPage.tsx:41` | 업체정보·관련포트폴리오(둘 다 route id 에만 의존)를 **순차 await** | `Promise.all` 로 병렬화 | 상품 상세 진입 시 라운드트립 1회 절약 |
| 4 | `src/components/place/PlaceBusinessSections.tsx:84` | 포트폴리오 그룹핑/필터옵션 Map·Set 파생을 **매 렌더** 재계산(라이트박스·필터 state 변경마다) | `useMemo([products,media,albums])` 로 고정 | 업체 상세 포트폴리오 렌더 폭주 제거 |

검증: `npm run build` ✓ · `npm run test` 531 passed ✓ · 변경 파일 `eslint` 0 error.
(주의: `useMemo` 는 조기 `return null` 보다 위에서 무조건 호출 — rules-of-hooks 준수.)

## 검토했으나 보류 (불필요한 churn/리스크 회피 — AGENTS.md "최소·표적화")

- **`AuthContext` provider value `useMemo`**: `AuthProvider` 는 앱 루트에 있어 **auth state 변경 시에만**
  재렌더(드묾) → value identity churn 의 실제 영향이 작고, 제대로 하려면 6개 함수 `useCallback`
  래핑(인증 민감 코드)이 필요해 비용 대비 효용 낮음. 보류.
- **konva(~1.9MB) lazy-load**: 공개 뷰어(`InvitationViewer`)는 화면 목적 자체가 캔버스라 konva 가
  즉시 필요 → lazy 의 이득은 셸 우선 페인트뿐인데 mapped 렌더에 Suspense 경계를 잘못 넣으면
  공개 경로가 깨질 위험. 무인 작업에서 리스크 과다 → 보류(에디터/스튜디오/플로우 4개 경로 묶어
  별도 검증 PR 권장).
- **Community 서버 페이지네이션**: 현재 `.select('*').limit(100)` 후 클라 슬라이스. `select` 축소+
  `.range()` 전환은 "load more" 동작 변경(아키텍처) → 별도 PR 로 분리.
- **리스트 가상화(react-virtual)**: 의존성 추가 + 리스트 렌더 리라이트(아키텍처). 사용자 결정/별도 PR.
- 마이너 render-memo(CategoryGrid 배열, PlaceRecommendations 정렬·memo-defeat onClick): 소형 배열·
  희소 재렌더라 체감 미미 + 일부는 자식 시그니처 변경 필요 → 보류.

## 남은 권고 (후속)
- `select('*')` 광범위 사용처(드리프트 방어 주석이 있는 `ProductDetailPage` 등은 의도적 유지) 중
  넓은 테이블 리스트 쿼리는 점진적으로 컬럼 명시.
- 측정: 배포 후 React Query devtools 로 포커스 재요청 감소 / Network 페이로드 감소 확인.
