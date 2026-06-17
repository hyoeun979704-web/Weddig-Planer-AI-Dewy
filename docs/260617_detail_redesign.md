# 260617 업체 상세페이지 재설계 (경쟁사 조사 기반)

> 계기: 사용자 지적 — 상세페이지가 조잡함 + "UI/UX는 타 앱 전수조사 필수" 규칙 환기.
> 경쟁사 전수조사(네이버 플레이스·카카오맵·에어비앤비·웨딩북, 네트워크 403 → 지식 기반·표시) 후 재설계.
> 대상: `src/components/detail/PlaceDetailLayout.tsx`, `src/pages/VendorDetailPage.tsx`,
> `src/components/place/PlaceCoupons.tsx`, 추천: `PlaceRecommendations`·`VendorMediaCard`.

## 조사 결론 — 레퍼런스 5개 공통 원칙
1. 사진 직후 **이름→평점·지역→가격·핵심배지** 를 첫 화면 3줄에 압축(스크롤 전 판단).
2. **가격은 항상 노출**(sticky CTA 동반). "문의"로 숨기면 전환·신뢰↓.
3. 주 CTA 1개만 색 강조 + 보조는 아이콘/아웃라인.
4. 혜택(쿠폰/이벤트)은 above-the-fold 또는 CTA 직상단.
5. 추천 카드는 **이미지 우위**.

## 현행 위반 (코드 확인)
- 가격(`place.price_packages`)이 **"디테일정보" 탭 안**에만(`PlaceDetailLayout.tsx:696`) → 첫 화면·sticky 에 없음. (원칙 1·2 위반)
- 쿠폰/포트폴리오가 `extraSection` 으로 **디테일 탭**에 묶임(`VendorDetailPage.tsx:118-119`, 탭 렌더 `:749`). 혜택이 깊이 숨음. (원칙 4 위반)
- 쿠폰 만료일 raw ISO `2026-12-31T00:00:00+00:00까지`(`PlaceCoupons.tsx:77`). **버그**.
- 탭 라벨 "디테일정보" 콩글리시(`:203`).
- 제목 옆 분홍 "직접 작성" 텍스트가 우측에 끼어 위계 깨짐(`:463-468`).
- 추천 카드 이미지<텍스트(`VendorMediaCard` 140×195, 이미지 100px). (원칙 5 위반)

## 변경안 (이번 PR)
1. **가격 첫 화면화**: 모듈 헬퍼 `pkgPriceSummary(packages)` — 최저가 패키지 → "최저 OOO만원~", 가격 없으면 null.
   - BasicTab 타이틀 블록: 이름(크게) → 메타줄(평점·카테고리·지역·진행수) → **가격줄** → 설명. "직접 작성"은 이름 아래 작은 신뢰 칩으로 이동.
   - **sticky CTA 좌측에 가격 동반**("최저 OOO~" / "견적 문의"), 우측 예약 문의.
2. **혜택 above-fold**: `couponsSection` prop 신설 → BasicTab 혜택군(장점·이벤트 근처)에서 렌더. `VendorDetailPage` 는 쿠폰을 extraSection 에서 빼고 `couponsSection` 으로 전달(중복 방지). 포트폴리오·관리도구·커뮤니티는 디테일 탭 유지.
3. **쿠폰 날짜 포맷**: ISO → `YYYY.MM.DD까지`.
4. **탭 라벨**: 디테일정보 → **상세정보**.
5. **추천 카드 이미지 우위**(후속 커밋, 동일 브랜치): 상세 하단 추천에서 이미지 비중↑·텍스트 1~2줄.

## 검증
- `tsc --noEmit`(미선언/타입), `npm run build`, `npm run test`.
- Playwright 로 실제 렌더 스크린샷(가격·쿠폰 첫 화면 노출 육안 확인).
- 한계: 실데이터 e2e 는 목업 — 실기기 육안 확인 별도 권장.
