import { test, expect, type Page } from "@playwright/test";

// 기업 온보딩 가이드를 "직접 따라가며" 검증 — 공개 단계(랜딩→회원가입)는 실제 클릭.
// 백엔드(Supabase) 게이트 단계는 샌드박스에서 불가 → 코드 검증으로 보완(별도).
// 산출 스크린샷은 test-results/(gitignore) — 검증용, 저장소 미포함.

async function quiet(page: Page) {
  // splash 끄고, supabase 호출은 빈 응답으로(차단 환경에서 셸 렌더 안정화).
  await page.addInitScript(() => { try { sessionStorage.setItem("dewy.splash_shown", "1"); } catch { /* */ } });
  await page.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));
  await page.route("**/auth/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
}

test("가이드 §1-1 — /business 랜딩에 입점 CTA가 있다", async ({ page }) => {
  await quiet(page);
  await page.goto("/business");
  await expect(page.getByRole("button", { name: /기업회원 가입하고 입점하기|기업회원 전환 신청하기/ }).first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: "test-results/wt-1-landing.png", fullPage: true });
});

test("가이드 §1-2 — 랜딩 버튼이 /auth?type=business 로 보내고 기업 가입폼이 뜬다", async ({ page }) => {
  await quiet(page);
  // 가이드 실제 흐름: 랜딩의 ?type=business 진입 → 자동 회원가입 모드 + 기업카드 선택.
  await page.goto("/auth?type=business");
  await expect(page.getByText("개인회원", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("기업회원", { exact: true })).toBeVisible();
  await expect(page.getByText("웨딩 업체", { exact: true })).toBeVisible();
  // 기업 선택 상태이므로 가입 버튼 라벨이 '기업회원 가입'(가이드 §1-2)
  await expect(page.getByRole("button", { name: "기업회원 가입" })).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: "test-results/wt-2-auth-business.png", fullPage: true });
});
