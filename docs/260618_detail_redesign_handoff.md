# 작업 핸드오프 — 업체 상세페이지 재설계 + 기업 온보딩 가이드 (2026.06.18)

> 다음 세션이 **맥락 없이 그대로 이어받기** 위한 기록. 무엇을·왜·어디까지 했고, 남은 건 무엇인지.

## TL;DR

- **브랜치**: `claude/detail-redesign` · **PR**: #358 (draft, base `main`)
- **한 일**: ① 업체 상세페이지(`PlaceDetailLayout.tsx`) "풀 재설계" ② 풀스크린 갤러리 추가
  ③ 기업회원 온보딩 가이드(`docs/business-onboarding-guide.md`)를 개편 내용에 맞춰 업데이트
- **검증**: `tsc --noEmit` · `npm run build` · `npm run test`(510 통과) · Playwright 렌더 단언 모두 통과
- **남은 일**: 사용자가 Vercel 프리뷰 육안 확인 → OK면 #358 머지. (아래 "남은 작업" 참고)

## 배경 — 왜 했나

사용자 요청: 업체 상세페이지를 네이버/에어비앤비 등 **레퍼런스 공통 위계**로 재설계.
핵심 문제의식 = "첫 화면에서 고객이 *무엇·평판·어디·얼마·혜택*을 바로 판단 못 한다."
사용자가 "풀 재설계" 범위를 선택 → 버그픽스 + 정보 위계 + 혜택 above-fold + 추천카드 이미지우위 + 풀스크린 갤러리.

## 한 일 (커밋별)

### 1. `714f11c2` — 상세페이지 재설계
- **가격 첫화면화**: 이름 → (평점·카테고리·지역) → **`최저 OOO만원~`** → 설명 순. 하단 고정 CTA에도 가격 동반.
  - ⚠️ 대표 가격 출처 = `pkgPriceSummary(place.price_packages)` (= **상품/패키지의 최저 `price_min`**).
    `min_price` 필드가 아님. 패키지 없으면 `가격은 문의로 안내해드려요`. (`PlaceDetailLayout.tsx:99-106, 542-551, 274-284`)
- **혜택(쿠폰) above-fold**: `couponsSection` 을 첫 화면 혜택군에 주입.
- **쿠폰 날짜 포맷** 버그픽스: `2026.12.31` 형태로.
- **탭 라벨**: "디테일정보" → **"상세정보"**.
- **신뢰 칩**: 제목 옆 분홍 텍스트 제거 → `vendorAuthored` 시 **`✓ 업체가 직접 작성·검수`** 배지(`:552-556`).
  - 출처: `data_source=business` 정보가 운영자 검토 통과 시 true (`:114-115, 148`).
- **추천 카드 이미지 우위**: 빈 공간 제거, 이미지 지배 레이아웃.

### 2. `1231c71a` — 풀스크린 갤러리 (재설계 마지막 조각)
- 히어로 사진 **탭** 또는 우하단 **`전체 N장`**(Expand 아이콘) → 풀스크린 스와이프 뷰어.
- 뷰어: prev/next·닫기(X)·카운터, `--safe-top` 적용. `fullscreen` state (`BasicTab`).
- 가드: `fullscreen && gallery.length > 0`. `gallery = image_urls || [thumbnail_url]`.
- lucide `X`, `Expand` import 추가.

### 3. (이 세션) 기업 온보딩 가이드 업데이트 — `docs/business-onboarding-guide.md`
개편으로 **사장님 입력 → 고객 화면 매핑**이 바뀌어 가이드 갱신:
- §③ 표: 대표이미지(풀스크린 안내), 최소가격(=검색·필터용임을 명확화).
- **신규 §③-1 "내가 입력한 정보, 상세페이지에 이렇게 보입니다"**: 입력↔노출 매핑 표 +
  💰 첫화면 가격은 **상품/패키지 가격**에서 나온다는 핵심 안내 + 🏅 `✓ 직접 작성·검수` 배지 조건.
- §4-3: 쿠폰 above-fold 노출·전환 기여, 상품/패키지 가격 노출, 사진 풀스크린 추가.
- FAQ: "첫 화면 가격이 문의로만 떠요", "직접 작성·검수 배지가 안 붙어요" 2건 추가.

### 4. (이 세션) 가이드 스크린샷 — 개편 상세페이지 캡처 추가
- 기존 가이드 스크린샷 9장은 전부 **기업 대시보드/온보딩** 화면 → #358(소비자 상세페이지) 재설계로
  **stale 아님**(재캡처 불필요). 검증 완료.
- 빠져 있던 **§③-1 상세페이지 캡처**를 신규 생성: `docs/assets/business-guide/business-detail-redesign.png`.
- **생성기**: `e2e/business-guide-detail-shot.spec.ts` (mock 데이터, data-URI 히어로 사진,
  splash 끔). 재생성: `PW_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test business-guide-detail-shot`.
  - 함정 기록: ⓐ 평점은 매퍼가 `avg_rating` 읽음(`rating` 아님, `usePlaceDetail.ts:537`).
    ⓑ 외부 이미지(placehold.co) 샌드박스 차단 → data-URI SVG 사용. ⓒ `WeddingBlessingSplash`
    (`z-[9999]`, 2.6s)가 첫 화면 가림 → `sessionStorage.dewy.splash_shown=1` 선주입으로 끔.

### 5. (이 세션) 온보딩 가이드 "직접 따라하기" 워크스루 검증
가이드를 단계별로 앱과 대조(공개 단계는 Playwright 실제 클릭, 게이트 단계는 코드 추적):
- **공개 단계 라이브 통과**: §1-1 `/business` 입점 CTA, §1-2 `/auth?type=business` → 개인/기업 카드·
  "기업회원 가입" 버튼(`e2e/business-guide-walkthrough.spec.ts`, 스샷 `test-results/wt-*`).
- **게이트 단계 코드 일치 확인**: §1-3/1-4 온보딩 3스텝·필드, §1-5 진행단계 문구(가입승인→정보등록→
  검토후노출), §② 제휴 6필수항목 게이트(name·category·city·district·description·main_image_url),
  §③ 편집 필드, §④ 메뉴 — 모두 일치. 인용 문구 15개 중 14개 코드 존재(나머지 1개 `기업회원(웨딩 업체)`는
  실제 2줄 카드 "기업회원/웨딩 업체"의 정확한 묘사).
- **발견·수정한 불일치(#358 개편 드리프트)**:
  - 🐞 **편집폼 가격 도움말 오류**: `BusinessVendorEdit.tsx:415` 가 "최소가·시작가 = 상세페이지 최저가~
    표기용"이라 안내했으나, 개편 후 상세 첫화면 가격은 **`price_packages`(상품 관리)** 에서 나옴.
    `min_price` 는 실제로 **목록/추천 카드** 미리보기(`placeMappers.cardPricePreview`)+검색/필터에만 쓰임.
    → 도움말을 실제 동작에 맞게 수정. 가이드 §③/§③-1/FAQ 도 "가격 칸 두 곳·노출 위치 다름"으로 정정.
  - 가이드 §④ 에 빠졌던 "결과물 보내기" 메뉴 + 카테고리별 메뉴 차이 보강.
- **남은 한계**: 로그인 필요한 대시보드/온보딩 실제 화면은 샌드박스 Supabase 차단으로 라이브 미실행 →
  코드 일치까지만 확인(실기기 e2e 권장).

## 검증 (이번 변경 기준)

- `npx tsc --noEmit`: PlaceDetailLayout 에러 없음
- `npm run build`: 성공 (exit 0)
- `npm run test`: 510 통과 (exit 0)
- Playwright 렌더 단언 통과
- Vercel 프리뷰: DEPLOYED (커밋마다 자동 갱신) — 링크는 PR #358 vercel[bot] 코멘트

## 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/components/detail/PlaceDetailLayout.tsx` | 상세페이지 렌더 (재설계 본체 · 풀스크린 갤러리 `BasicTab`) |
| `docs/business-onboarding-guide.md` | 사장님 온보딩 가이드 (이번에 §③-1 신설) |
| `src/components/business/BusinessListingDetailForm.tsx` | 카테고리별 동적 입력 폼 (DETAIL_SCHEMA) |
| `src/lib/businessListingCompleteness.ts` | 완성도 7필드 체크 |
| `src/pages/business/BusinessOnboard.tsx` / `BusinessLanding.tsx` | 온보딩 스텝 · 입점 랜딩 |

## 남은 작업 (deferred)

- [ ] **사용자 육안 확인** — Vercel 프리뷰에서 첫화면 위계·풀스크린 갤러리·쿠폰 above-fold 확인 후 #358 머지.
- [x] ~~온보딩 가이드 §③-1 캡처 이미지 보강~~ → 완료(`business-detail-redesign.png`, 위 §4).
- [ ] (선택) §③-1 캡처에 **쿠폰 카드(above-fold)** 까지 프레임에 넣기 — 현재 첫 화면 캡처는 가격·배지까지.
  쿠폰은 그 아래에 렌더되어 한 뷰포트에 안 들어옴. 별도 캡처 또는 더 긴 뷰포트 고려.
- [ ] (선택) 풀스크린 갤러리 스와이프 제스처(터치 드래그) — 현재는 좌우 화살표 버튼만. 모바일 UX 보강 여지.
- [ ] CI(verify·e2e) green 확인 — 실패 시 PR #358 웹훅으로 대응.

## 이어가는 법 (다음 세션)

1. `git fetch origin claude/detail-redesign && git checkout claude/detail-redesign`
2. PR #358 상태 확인 (머지됐으면 `main` 기준으로 후속 작업, 아니면 위 deferred 진행).
3. 가격 출처 혼동 주의: **첫화면 큰 가격 = `price_packages`**, `min_price` 아님 (회귀 방지).
