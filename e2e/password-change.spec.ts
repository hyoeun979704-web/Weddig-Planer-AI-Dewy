import { test, expect, type Page } from "@playwright/test";

// 비밀번호 변경 플로우 검증(인증 목킹 — 프로덕션 계정 비번을 실제로 바꾸지 않음).
//   ① /profile 에 '현재 비밀번호' + '새 비밀번호' 입력란이 렌더되는지
//   ② 잘못된 현재 비밀번호(token 400) → "현재 비밀번호가 올바르지 않아요" 차단
//   ③ 올바른 현재 비밀번호(token 200) + updateUser 200 → "비밀번호를 변경했어요"
// 출시 전 제거 대상(이 파일 + e2e/). PW_CHROME_PATH 로 사전설치 chromium 사용.

const SB_KEY = "sb-qabeywyzjsgyqpjqsvkd-auth-token";
const USER = { id: "11111111-1111-1111-1111-111111111111", email: "test@dewy.app", app_metadata: { provider: "email" }, user_metadata: {}, aud: "authenticated", role: "authenticated", identities: [{ provider: "email" }] };

async function seedSession(page: Page) {
  await page.addInitScript(([key, user]) => {
    const session = {
      access_token: "fake.jwt.token", token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "fake-refresh", user,
    };
    window.localStorage.setItem(key as string, JSON.stringify(session));
  }, [SB_KEY, USER]);
}

async function mockBackend(page: Page, opts: { tokenStatus: number }) {
  // 더 구체적인 라우트가 우선하도록, 캐치올을 먼저 등록.
  await page.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));
  await page.route("**/rest/v1/profiles*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ user_id: USER.id, display_name: "테스트", avatar_url: null, birth_year: 1997, phone: null, community_nickname: null }]) }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USER) }));
  await page.route("**/auth/v1/token**", (r) =>
    opts.tokenStatus === 200
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "fake.jwt.token", token_type: "bearer", expires_in: 3600, refresh_token: "fake-refresh", user: USER }) })
      : r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }) }),
  );
}

test("비밀번호 변경 — 현재 비밀번호 입력란 + 재인증 분기", async ({ page }) => {
  await seedSession(page);
  await mockBackend(page, { tokenStatus: 400 });
  await page.goto("/profile");

  // ① 두 입력란 렌더
  const current = page.locator("#currentPassword");
  const next = page.locator("#newPassword");
  await expect(current).toBeVisible({ timeout: 15000 });
  await expect(next).toBeVisible();
  await page.screenshot({ path: "test-results/password-form.png", fullPage: true });

  // ② 잘못된 현재 비밀번호 → 차단 토스트
  await current.fill("wrongpass");
  await next.fill("newpassword123");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByText("현재 비밀번호가 올바르지 않아요")).toBeVisible({ timeout: 10000 });
});
