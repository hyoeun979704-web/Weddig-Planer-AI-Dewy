import { test, type Page } from "@playwright/test";

// 기업 온보딩 가이드(docs/business-onboarding-guide.md §③-1)용 캡처 생성기.
// 개편된 상세페이지(이름→평점·지역→가격→직접작성 배지→쿠폰)를 mock 데이터로 렌더해
// docs/assets/business-guide/business-detail-redesign.png 로 저장한다.
// 출시 전 제거 대상(e2e/ 일괄). 산출물 PNG 만 저장소에 남는다.
//
// 샌드박스는 외부 이미지(placehold.co 등)를 막으므로 히어로 사진은 data-URI(SVG)로 인라인.
// 평점은 매퍼가 avg_rating 을 읽으므로(usePlaceDetail.ts) avg_rating 으로 준다.

const photo = (label: string, c1: string, c2: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
      `<rect width='600' height='450' fill='url(#g)'/>` +
      `<text x='300' y='240' font-family='sans-serif' font-size='34' fill='white' text-anchor='middle' opacity='0.92'>${label}</text>` +
      `</svg>`,
  ).toString("base64")}`;

const IMAGES = [photo("스튜디오 전경", "#f6a5c0", "#ec7fa6"), photo("촬영 샘플", "#c9a8e0", "#a87fd0")];

const ROW = {
  place_id: "guide-1",
  name: "마토니 인천본점",
  category: "suit",
  city: "인천광역시",
  district: "남동구",
  avg_rating: 4.8,
  review_count: 24,
  owner_user_id: "owner-1",
  moderation_status: "approved",
  data_source: "business",
  is_partner: true,
  view_count: 128,
  min_price: null,
  image_urls: IMAGES,
  main_image_url: IMAGES[0],
  thumbnail_url: IMAGES[0],
  tags: ["인천맞춤정장", "정장대여", "주차가능"],
  recommended_for: ["체형 고려 스타일링", "합리적 가격대"],
  advantages: [{ title: "신규 고객 혜택", content: "다양한 촬영용 렌탈수트 보유" }],
  description: "신랑님과의 신뢰를 쌓아가는 웨딩파트너. 피부톤·체형을 고려한 스타일 디렉팅.",
  inquiry_channel: "chat",
  inquiry_url: null,
  inquiry_phone: null,
  place_details: {
    price_packages: [
      { name: "기본 패키지", price_min: 1190000, price_max: 1890000, currency: "KRW", unit: "per_package", includes: ["정장 대여", "스타일링"], notes: null },
    ],
  },
};

const COUPON = [{ id: "c1", title: "듀이 신규 고객 할인", discount_text: "10%", min_order_won: 1190000, expires_at: "2026-12-31T00:00:00+00:00", is_active: true, moderation_status: "approved" }];

async function mock(page: Page) {
  await page.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));
  await page.route("**/rest/v1/places*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([ROW]) }));
  await page.route("**/rest/v1/business_coupons*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(COUPON) }));
  await page.route("**/rpc/get_place_inquiry_stats*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ total: 18, answered: 17, recent_30d: 6, avg_response_hours: 4 }) }));
}

test("가이드 캡처 — 개편된 상세페이지 첫 화면", async ({ page }) => {
  await mock(page);
  // 로딩 스플래시(WeddingBlessingSplash)가 첫 화면을 가리지 않도록 미리 끔(세션당 1회 노출 키).
  await page.addInitScript(() => { try { sessionStorage.setItem("dewy.splash_shown", "1"); } catch { /* ignore */ } });
  await page.goto("/vendor/guide-1");
  await page.getByRole("heading", { name: "마토니 인천본점" }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200); // 이미지 디코드·레이아웃 안정화
  await page.screenshot({ path: "docs/assets/business-guide/business-detail-redesign.png" });
});
