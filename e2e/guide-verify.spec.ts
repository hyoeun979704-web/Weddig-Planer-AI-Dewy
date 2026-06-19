import { test, expect, type Page } from "@playwright/test";

// 온보딩 가이드 "따라 했을 때 설명대로 작동·표시되나" 검증.
// 공개 단계(§1·§2)는 실제 클릭, §8(상세페이지 개편)은 mock 렌더로 가이드 문구를 항목별 단언.
// 로그인 게이트 단계(§3~7,9~11)는 샌드박스 Supabase 차단으로 라이브 불가 → 코드 검증으로 보완.

async function quiet(page: Page) {
  await page.addInitScript(() => { try { sessionStorage.setItem("dewy.splash_shown", "1"); } catch { /* */ } });
}

// ── §1: 입점 안내 페이지에 가입 CTA가 있다 ──────────────────────────────
test("§1 /business 에 '기업회원 가입하고 입점하기' CTA", async ({ page }) => {
  await quiet(page);
  await page.goto("/business");
  await expect(page.getByRole("button", { name: /기업회원 가입하고 입점하기|기업회원 전환 신청하기/ }).first())
    .toBeVisible({ timeout: 15000 });
});

// ── §2: 랜딩 → /auth?type=business → 개인/기업 카드 + '기업회원 가입' ────
test("§2 회원가입에 개인/기업(웨딩 업체) 카드와 '기업회원 가입' 버튼", async ({ page }) => {
  await quiet(page);
  await page.goto("/auth?type=business");
  await expect(page.getByText("개인회원", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("기업회원", { exact: true })).toBeVisible();
  await expect(page.getByText("웨딩 업체", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "기업회원 가입" })).toBeVisible();
});

// ── §8: 개편된 상세페이지가 가이드 문구대로 보이고 작동하나 ──────────────
const photo = (label: string, c1: string, c2: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='600' height='450' fill='url(#g)'/><text x='300' y='240' font-family='sans-serif' font-size='34' fill='white' text-anchor='middle'>${label}</text></svg>`,
  ).toString("base64")}`;
const IMAGES = [photo("스튜디오 전경", "#f6a5c0", "#ec7fa6"), photo("촬영 샘플", "#c9a8e0", "#a87fd0")];

const ROW = {
  place_id: "verify-1", name: "마토니 인천본점", category: "suit", city: "인천광역시", district: "남동구",
  avg_rating: 4.8, review_count: 24, owner_user_id: "owner-1", moderation_status: "approved",
  data_source: "business", is_partner: true, view_count: 128, min_price: null,
  image_urls: IMAGES, main_image_url: IMAGES[0], thumbnail_url: IMAGES[0],
  tags: ["인천맞춤정장", "정장대여"], recommended_for: ["체형 고려"], advantages: [],
  description: "신랑님과의 신뢰를 쌓아가는 웨딩파트너.", inquiry_channel: "chat", inquiry_url: null, inquiry_phone: null,
  // 갤러리는 place_details.image_urls 에서 읽힌다(usePlaceDetail) → 풀스크린(전체 N장) 조건(>1).
  place_details: { image_urls: IMAGES, price_packages: [{ name: "기본", price_min: 1190000, price_max: 1890000, currency: "KRW", unit: "per_package", includes: [], notes: null }] },
};
const COUPON = [{ id: "c1", title: "듀이 신규 고객 할인", discount_text: "10%", min_order_won: 1190000, expires_at: "2026-12-31T00:00:00+00:00", is_active: true, moderation_status: "approved" }];

async function mockDetail(page: Page) {
  await page.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));
  await page.route("**/rest/v1/places*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([ROW]) }));
  await page.route("**/rest/v1/business_coupons*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(COUPON) }));
  await page.route("**/rpc/get_place_inquiry_stats*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ total: 18, answered: 17, recent_30d: 6, avg_response_hours: 4 }) }));
}

test("§8 상세페이지 — 가격 첫화면·평점·직접작성 배지·쿠폰 above-fold·탭", async ({ page }) => {
  await quiet(page);
  await mockDetail(page);
  await page.goto("/vendor/verify-1");
  await expect(page.getByRole("heading", { name: "마토니 인천본점" }).first()).toBeVisible({ timeout: 15000 });
  // 가이드: "이름 → 평점·지역 → 최저 OOO만원~"
  await expect(page.getByText("4.8").first()).toBeVisible();
  await expect(page.getByText("119만원").first()).toBeVisible();           // 첫화면 대표가(상품 패키지)
  // 가이드: "✓ 업체가 직접 작성·검수 신뢰 배지"
  await expect(page.getByText("업체가 직접 작성·검수")).toBeVisible();
  // 가이드: 탭 라벨 '상세정보'
  await expect(page.getByText("상세정보", { exact: true })).toBeVisible();
  // 가이드: "쿠폰은 첫 화면 혜택군에 바로 노출" + 날짜 포맷
  await expect(page.getByText("듀이 신규 고객 할인")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("2026.12.31까지")).toBeVisible();
});

test("§8 상세페이지 — 사진 탭하면 풀스크린으로 크게 보인다", async ({ page }) => {
  await quiet(page);
  await mockDetail(page);
  await page.goto("/vendor/verify-1");
  await expect(page.getByRole("heading", { name: "마토니 인천본점" }).first()).toBeVisible({ timeout: 15000 });
  // 가이드: "사진은 탭하면 풀스크린으로 크게 보여요" — '전체 N장' 버튼 → 풀스크린 뷰어
  const fsBtn = page.getByRole("button", { name: /전체 \d+장/ });
  await expect(fsBtn).toBeVisible();
  await fsBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible();          // 풀스크린 오버레이
  await expect(page.getByText("1 / 2")).toBeVisible();           // 카운터
  await expect(page.getByRole("button", { name: "닫기" })).toBeVisible();
});
