import { test, expect, type Page } from "@playwright/test";

// 상세페이지 재설계 육안 검증용 스크린샷(데이터 목킹). 출시 전 제거 대상.
// 확인: ① 첫 화면에 이름→평점·지역→가격 위계 ② 쿠폰 above-fold + 날짜 포맷(YYYY.MM.DD)
//      ③ sticky CTA 가격 동반 ④ 탭 라벨 "상세정보".

const ROW = {
  place_id: "test-1",
  name: "마토니 인천본점",
  category: "suit",
  city: "인천광역시",
  district: "남동구",
  rating: 4.8,
  review_count: 12,
  owner_user_id: "owner-1",
  moderation_status: "approved",
  data_source: "business",
  is_partner: true,
  view_count: 42,
  min_price: null,
  image_urls: ["https://placehold.co/600x450/d9d9d9/333333?text=MATTONI"],
  main_image_url: "https://placehold.co/600x450/d9d9d9/333333?text=MATTONI",
  thumbnail_url: "https://placehold.co/600x450/d9d9d9/333333?text=MATTONI",
  tags: ["인천맞춤정장", "정장대여"],
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
  await page.route("**/rpc/get_place_inquiry_stats*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ total: 5, answered: 5, recent_30d: 3, avg_response_hours: 6 }) }));
}

test("상세페이지 재설계 — 가격·쿠폰 첫 화면 노출", async ({ page }) => {
  await mock(page);
  await page.goto("/vendor/test-1");
  await expect(page.getByRole("heading", { name: "마토니 인천본점" }).first()).toBeVisible({ timeout: 15000 });
  // 탭 라벨 상세정보
  await expect(page.getByText("상세정보", { exact: true })).toBeVisible();
  // 쿠폰 above-fold + 날짜 포맷(2026.12.31) — 핵심 검증
  await expect(page.getByText("듀이 신규 고객 할인")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("2026.12.31까지")).toBeVisible();
  await page.screenshot({ path: "test-results/detail-redesign.png", fullPage: true });
});
