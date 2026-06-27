# 260627 전체감사 — iOS 배포 브랜치 → main 머지 전 통합 감사 (Dewy)

> `claude/ios-app-store-deploy`(iOS App Store 배포 작업 11커밋)를 `origin/main`(그새 172커밋
> 앞섬)에 병합한 뒤, **main에 새로 얹는 delta**(`git diff origin/main HEAD` = 37파일/+1239줄)를
> 5차원 병렬 서브에이전트로 감사했다. 방식: 보안·인가 / 정확성·P0·iOS네이티브 / dead-end·출시컴플라이언스 /
> DRY·성능·유지보수 + 머지 시맨틱충돌. 모든 발견은 **실제 코드·types.ts·마이그레이션 교차확인** 기반
> (서브에이전트 오탐은 메인이 재검증). **한계: sandbox라 실DB·런타임 e2e 미수행** — RPC/RLS는 소스+types 정합으로만.

## TL;DR
- **머지 차단 P0 없음.** 빌드(`npm run build` tsc+vite) 통과, 충돌마커 0, place-enrich 번들 OK.
- 병합 충돌은 **감사문서 2건뿐**(adService.ts·config.toml은 자동병합 성공) → 양쪽 보존(_N 접미사).
- **수정 1건(P1, 머지 전 처리 완료)**: Premium "무료 체험 시작하기" 버튼 게이팅 누락 → 게이팅 추가.
- **1.0.1 체크리스트 2건(빌드4 무영향)**: ATT Info.plist 키 + App Privacy "추적" 갱신.
- 나머지(토큰 상수시간 비교, has_image 인덱스)는 deferred 관찰 항목.

## 보안·인가 (이상 없음)
- `supabase/functions/place-enrich/index.ts`: x-admin-token 게이트(토큰 누락→401), SQL 전부
  PostgREST 파라미터화(인젝션 없음), service-role·Naver 키는 `Deno.env`에서만(노출 없음),
  `verify_jwt=false`지만 유일가드 admin-token이 RLS-정책없음 테이블(`geocode_admin`)에서만 읽혀 충분.
  에러 본문은 admin 통과자에게만 도달. → **신규 보안 결함 없음.**
- migration DROP(`20260624130100`)은 8인자 stale만 제거, 9인자(p_image_paths) 생존 — 호출부
  `useQuotes.ts`·types.ts와 9필드 일치(PGRST202 위험 없음).
- payments 게이팅은 **클라 UI 노출 게이트**일 뿐 — 결제 승인/지급은 서버 영수증검증(`iap-verify-*`)에서만.
- (P2, 선택) place-enrich/geocode-backfill 토큰 비교 `===`는 상수시간 아님 — 64자 고엔트로피라 실효성 낮음,
  공통 상수시간 헬퍼 도입은 백로그.

## P0 버그·정확성·견고성 (이상 없음)
- `.order("has_image")`(useVendors·useCategoryData·usePlaceRecommendations 3곳): `has_image`는
  생성컬럼(`main_image_url is not null`)이라 null 불가 → nullsFirst 무관. partner_rank 1차 정렬 뒤
  삽입이라 기존 정렬 안 깨짐.
- `PlaceMap.tsx` 좌표 길찾기: 호출부(`PlaceDetailLayout` hasCoords 가드)에서 좌표 null이면 미렌더 → fallback 불필요.
- payments 분기(web/ios/android/default) 완전. 숨긴 CTA의 목적지(`HeartCharge`·`SubscriptionCheckout`)도
  자체 `provider==='unavailable'` 가드 보유 → 딥링크 직접진입도 dead-end 안전.
- iOS 네이티브: `TARGETED_DEVICE_FAMILY="1"`(Debug/Release 일관), `CURRENT_PROJECT_VERSION=4`,
  Info.plist(ITSAppUsesNonExemptEncryption=false·GAD ID·NSLocationWhenInUse) 유효.
- **머지 시맨틱충돌 없음**: 의존 컬럼(partner_rank·has_image·data_completeness·avg_rating)·payment 심볼이
  types.ts·호출부와 일치. 빌드 통과로 교차확인.

## dead-end UI / placeholder CTA
- **[수정완료 P1] `src/features/consumer/pages/Premium.tsx`**: "구독하기"는 `isPaymentEntryVisible()`로
  게이팅했으나 같은 페이지 "무료 체험 시작하기"(handleStartTrial)는 누락 → iOS에서 누르면 "준비 중"
  체크아웃 도달(dead-end). **버튼만 게이팅 추가**(혜택 안내 카드는 유지). 커밋: (이 커밋).
- Points "하트충전"은 같은 row에 "게임으로 적립" 잔존 → 빈 공백 없음. 적립 경로(게임·커뮤니티·초대) 충분.
- 결제 진입점 전수 grep: iOS에서 **실제 결제가 실행되는 노출 버튼 없음** → 심사 반려(P0) 위험 없음.

## iOS/사파리(웹) 차원 — ATT ↔ App Privacy (1.0.1 체크리스트, 빌드4 무영향)
- 팀이 머지로 `adService.ts`에 ATT(`requestTrackingAuthorization`) 도입. **제출 빌드4는 머지 전
  아카이브라 ATT 미포함** → 현재 "추적 전부 아니요" 신고는 **빌드4엔 정확**.
- **[P1·1.0.1] Info.plist에 `NSUserTrackingUsageDescription`+`SKAdNetworkItems` 없음** →
  ATT 프롬프트 무동작(no-op). ATT를 실제 켜는 빌드 전 추가 필요(`adService.ts:99` 주석이 명시).
- **[P1·1.0.1] App Privacy 갱신**: ATT 활성 빌드부터 ASC App Privacy를 "식별자(IDFA)-제3자광고-추적함"으로
  갱신해야 메타데이터 반려 회피. F2(plist)+F3(신고)는 **반드시 동시 처리**.

## 공통화·성능 (이상 없음 / deferred 1)
- adService 광고유닛 맵·payments 플래그·hook 정렬 모두 DRY/계층/주석 양호.
- **[P2·deferred] `places.has_image` 정렬 컬럼 인덱스 없음** — boolean 1컬럼 추가라 회귀 위험 낮음.
  출시 후 카테고리 리스트 지연 관측되면 복합 인덱스 `places(category, partner_rank desc, has_image desc, …)` 검토.

## 병합 처리 (충돌 해소)
| 파일 | 처리 |
|---|---|
| `docs/260623_codereview.md` | 팀(14차원)=정식, 내것(iOS점검)→`_2` |
| `docs/260624_codereview.md` | 팀(14차원)=정식, 내것(5차원)→`_3` (`_2`는 기존 내 감사) |
| `src/lib/ads/adService.ts` | 자동병합(내 iOS유닛 + 팀 ATT 둘다 보존) |
| `supabase/config.toml` | 자동병합(place-enrich 유지) |

## 남은 작업 (deferred)
- (P2) 토큰 상수시간 비교 헬퍼 공통화 / has_image 복합 인덱스 — 출시 후 관측 기반.
- **(1.0.1 필수)** ATT 활성화 시 Info.plist ATT 키 + ASC App Privacy "추적" 동시 갱신.
- **(별건·진행)** IAP 오픈: 코드 완비, ASC 상품등록·시크릿·샌드박스 e2e 남음(`docs/260622_apple_iap_setup.md`).
