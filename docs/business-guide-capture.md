# 사용법 가이드 스크린샷 — 고정 생성 가이드 (business-guide-capture)

`/business/guide`(BusinessGuide) 슬라이드에 쓰는 스크린샷 11장을 **항상 같은 양식으로**
재생성하는 절차다. 생성기는 `scripts/capture-guide-shots.cjs`(Playwright), 출력은
`src/assets/business/guide/*.png`(BusinessGuide 가 import).

> **왜 이 방식인가** — 예전 `build-guide-shots.cjs` 는 풀페이지(예: 824×3256)를 3:4 로
> 욱여넣어 여러 섹션이 뭉치고 글자가 깨졌다. 지금은 **표시 프레임과 동일한 3:4 모바일
> 뷰포트로 앱을 라이브 렌더**해 "한 화면"을 찍으므로 그 문제가 근본적으로 없다.

## 양식(절대 규칙)

- **해상도/비율**: `780×1040` 고정 = **3:4**. 표시 프레임이
  `BusinessGuide.tsx` 의 `aspect-[3/4]`(모바일 `max-w-[14rem]`, 데스크톱 `w-[17rem]`,
  `object-cover`)라 그에 맞춘다. 캡처 뷰포트 = `390×520 @DPR2`.
- **폰트**: 앱 본폰트 **SUITE Variable**. cdn.jsdelivr 가 막힌 환경에선 폴백(Noto)으로
  찍히므로, 스크립트가 SUITE woff2 를 받아 `@font-face` 로 주입한다. 하이라이트 라벨도
  **같은 SUITE** 로 그린다(폰트 혼용 금지).
- **하이라이트**: 타깃 요소에 핑크(`#ec4899`) 라운드 박스 + 핑크 pill 라벨 + 삼각형.
  DOM 오버레이로 페이지 안에서 그린 뒤 캡처(이미지 후합성 아님) → 폰트·안티에일리어싱이
  화면과 동일.
- **튜토리얼 없음**: 코드에서 `AUTO_TUTORIAL_ENABLED=false` 라 코치마크/웰컴시트가 안 뜬다.
  혹시 모달이 남으면 스크립트가 닫는다(`dismissOverlays`).
- **파일명 = 시나리오 id**: 아래 표의 id 가 그대로 `<id>.png`. **BusinessGuide 의 import
  와 1:1**이므로 이름을 바꾸면 안 된다(바꾸려면 `BusinessGuide.tsx` 도 같이).

## 사전 준비 (1회)

- Playwright + Chromium (`node_modules/playwright`, `/opt/pw-browsers` 또는
  `npx playwright install chromium`).
- 네트워크: SUITE woff2 1회 다운로드(`cdn.jsdelivr` → 실패 시 `raw.githubusercontent`
  자동 폴백, `os.tmpdir()/SUITE-Variable.woff2` 캐시). 둘 다 막히면 폴백 폰트로 찍히고
  경고가 뜬다.
- **sharp/나눔폰트 불필요**(구 방식에서만 썼다).

## 실행 절차

세 프로세스를 같은 머신에서 띄운다(목 → dev 서버 → 캡처).

```bash
# 1) 목 Supabase (기업 데이터 + 가짜 인증). 승인 상태로.
MOCK_BUSINESS=1 MOCK_APPROVAL=approved node scripts/visual-review/mock-supabase.cjs &

# 2) dev 서버를 '목' 으로 향하게 (env 가 핵심 — 안 주면 실 Supabase 로 붙어 로그인/데이터 실패)
VITE_SUPABASE_URL=http://127.0.0.1:9999 \
VITE_SUPABASE_PUBLISHABLE_KEY=mock VITE_SUPABASE_ANON_KEY=mock \
  npm run dev:vite -- --host 127.0.0.1 --port 5199 &

# 3) 전체 캡처 (승인 상태 10장)
node scripts/capture-guide-shots.cjs

# 4) '승인 대기'(business-pending) 1장은 목을 pending 으로 바꿔 따로 — 포트 비우고 재기동
fuser -k 9999/tcp
MOCK_BUSINESS=1 MOCK_APPROVAL=pending node scripts/visual-review/mock-supabase.cjs &
node scripts/capture-guide-shots.cjs --only=business-pending
```

부분 재생성: `node scripts/capture-guide-shots.cjs --only=business-coupons,business-edit`

타깃 설계용(오버레이 없이 풀페이지 덤프 → `/tmp/shots/disc-*.png`):
`DISCOVER=1 node scripts/capture-guide-shots.cjs`

## 11장 시나리오 (id ↔ 라우트 ↔ 타깃)

| # | id (=파일명) | 라우트 | 로그인 | 하이라이트 타깃 | 라벨 |
|---|---|---|---|---|---|
| 1 | `business-landing` | `/business` | ✗ | "기업회원 가입하고 입점하기" CTA | 여기를 눌러 시작 |
| 2 | `auth-business` | `/auth?type=business` | ✗(로그아웃) | 기업회원 카드 | 이 카드를 선택 |
| 3 | `business-onboard` | `/business/onboard` | ✗ | 사업자등록번호 입력 | 등록증과 똑같이 입력 |
| 4 | `business-onboard-step2` | `/business/onboard` | ✗ | 서비스 카테고리(step1) | 카테고리 → 등록 신청 |
| 5 | `business-pending` | `/business/dashboard` | ✓ + `MOCK_APPROVAL=pending` | "등록을 검토하고 있어요" | 진행 단계 확인 |
| 6 | `business-dashboard` | `/business/dashboard` | ✓ | 관리 메뉴 | 관리 메뉴 = 모든 기능 |
| 7 | `business-edit` | `/business/edit` | ✓ | 최소가·시작가 | 최소가·시작가 입력 |
| 8 | `business-detail-redesign` | `/vendor/<PLACE_ID>` | ✗ | 파트너(신뢰) 배지 | 신뢰 배지 노출 |
| 9 | `business-gallery` | `/business/gallery` | ✓ | "사진 추가" 버튼 | 업로드 = 즉시 노출 |
| 10 | `business-products` | `/business/products` | ✓ | 가격(원) 입력 | 가격 입력 필수 |
| 11 | `business-coupons` | `/business/coupons` | ✓ | "쿠폰 발행" 버튼 | 입력하고 쿠폰 발행 |

`PLACE_ID` 는 `mock-supabase.cjs` 와 `capture-guide-shots.cjs` 양쪽에 동일하게 박혀 있다
(`00000000-…-b1`).

## 주제별 상세 가이드 (5종)

개요 가이드(`/business/guide`) 외에, 기능별 상세 가이드가 `/business/guide/:guideId` 로 있다.
정의는 `src/data/businessGuides.ts`(단일 소스), 렌더는 `BusinessGuideDetail` → `BusinessGuideView`
공유. 진입은 **기업 대시보드 "기능별 상세 가이드"** 섹션.

| guideId | 제목 | 슬라이드(SHOTS id) | 캡처 라우트 |
|---|---|---|---|
| `vendor-edit` | 업체 정보 수정 | `g1-basic` `g1-inquiry` `g1-save` | /business/edit |
| `products` | 상품 등록 | `g2-form` `g2-submit` `g2-list` | /business/products |
| `portfolio` | 포트폴리오 관리 | `g3-album` `g3-add` `g3-list` | /business/gallery |
| `promotions` | 쿠폰·이벤트 | `g4-coupon-form` `g4-coupon-list` `g4-event-form` `g4-event-banner` | /business/coupons·events |
| `customers` | 견적·문의·소통 | `g5-leads` `g5-reply` `g5-chat` `g5-inquiry` `g5-delivery` | /business/leads·inquiries·deliveries + /quote/.../thread/... |

`g5-inquiry`·`g5-delivery` 는 첫 문의 카드를 펼쳐(`expandFirstInquiry` pre) 답변·전달 폼을
노출시킨다. `g5-chat` 은 `/quote/qr2/thread/<PLACE_ID>`(목 quote_messages). 모두 `MOCK_BUSINESS=1`
승인 상태에서 캡처. 슬라이드 문구를 바꾸려면 `businessGuides.ts`, 사진을 다시 찍으려면 해당
SHOTS id 로 `--only` 재실행.

## 시나리오(SHOTS) 추가·수정법

`scripts/capture-guide-shots.cjs` 의 `SHOTS` 배열 항목:

```js
{ id: "business-xxx",            // 출력 파일명 (BusinessGuide import 와 맞출 것)
  route: "/business/xxx",
  auth: true,                    // 로그인 필요하면 true (목 로그인 자동)
  label: "여기를 눌러요",          // pill 문구 (앱 SUITE 폰트로 렌더)
  below: false,                  // 라벨을 박스 아래로 강제(위 공간 없을 때)
  pad: 10,                       // 하이라이트 박스 여백(px, 뷰포트 기준)
  pre: async (page) => { ... },  // 캡처 전 상호작용(폼 채우기·다음 단계 등) — 선택
  target: { sel: '...' }         // CSS/텍스트 셀렉터  또는  { pick: (p)=>Locator }
}
```

- **셀렉터 주의**: `text=A, text=B` 같은 **콤마 OR 은 안 된다**(유효 CSS 아님 → 미발견).
  하나로 좁히거나 `button:has-text("…")`, 또는 `pick` 으로 Locator 를 직접 반환.
- 타깃은 3:4 창 상단 ~40% 로 자동 스크롤된 뒤 측정·하이라이트된다.
- 타깃을 못 찾으면 **오버레이 없이 저장**하고 `⚠ target 미발견` 을 출력한다(조용히 안 넘어감).

## 목(mock) 데이터 — 무엇을 위조하나

`scripts/visual-review/mock-supabase.cjs` (env 게이트, 페르소나 검토용과 공용):

- `MOCK_BUSINESS=1` 일 때만 기업 데이터 활성: `user_roles`(business)·`business_profiles`·
  `places`·`place_media`·`place_media_albums`·`business_products`·`business_coupons`·
  `place_reviews`·`partnership_applications`, RPC(`get_my_listing(s)`·`get_place_detail`·
  `get_my_coupon_download_count`), 그리고 `count=exact`(HEAD) 통계.
- `MOCK_APPROVAL=approved|pending|rejected` 로 승인 상태 토글(대시보드 분기 캡처용).
- 썸네일은 외부 네트워크 없이 보이도록 **data-URI SVG**(그라데이션+라벨)로 생성.
- 화면이 새 테이블/RPC 를 읽어 빈 화면이 나오면 → `ROWS`/`RPC` 에 케이스를 추가한다.
- 로그인은 목이 `/auth/v1/token` 에 가짜 세션을 돌려주므로 **아무 이메일/비번**이면 된다
  (스크립트는 `preview@mock.local` 사용).

## 트러블슈팅

- **전부 폴백 폰트로 찍힘** → SUITE 다운로드 실패. 콘솔의 `⚠ SUITE 폰트를 받지 못함` 확인,
  네트워크 허용 후 재실행(캐시 지우려면 `os.tmpdir()/SUITE-Variable.woff2` 삭제).
- **로그인 화면에서 더 안 넘어감 / 게이트 페이지가 /auth 로 튕김** → dev 서버 env 누락.
  반드시 `VITE_SUPABASE_URL=http://127.0.0.1:9999` 로 띄웠는지 확인.
- **`auth-business` 가 onboard 로 리다이렉트** → 로그인 상태로 `/auth` 진입한 것.
  스크립트는 비-auth 샷을 먼저 찍고 첫 auth 샷 직전에 로그인하므로, 단독 실행 시
  `--only=auth-business` 로 (로그아웃 상태에서) 따로 찍는다.
- **포트 9999/5199 already in use** → `fuser -k 9999/tcp` / `fuser -k 5199/tcp` 후 재기동.
- **상세(`business-detail-redesign`)가 "업체를 찾을 수 없어요"** → 목에 `places` 행 없음.
  `MOCK_BUSINESS=1` 인지, `PLACE_ROW` 가 채워졌는지 확인.

## 검수 체크리스트(완료 전)

- [ ] 11장 모두 `780×1040`(3:4)인가 (`node -e "..."` 로 메타 확인)
- [ ] 글자가 **SUITE** 로 또렷한가(폴백 Noto 아님)
- [ ] 코치마크/웰컴 모달이 안 들어갔는가
- [ ] 하이라이트가 의도한 타깃을 감싸고, 라벨이 **핵심 텍스트를 가리지 않는가**
- [ ] 게이트 페이지에 의미 있는 목 데이터가 보이는가(빈 화면 아님)
- [ ] `npm run build` 통과(이미지 import 정상)
