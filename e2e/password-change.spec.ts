import { test, expect, type Page } from "@playwright/test";

// 비밀번호 변경 플로우 검증(인증 목킹 — 프로덕션 계정 비번을 실제로 바꾸지 않음).
// Supabase "Secure password change" = ON 이라 이메일 OTP(reauthenticate→nonce) 플로우다.
//   ① /profile 에 '새 비밀번호' 입력란 + '본인 확인 코드 받기' 버튼이 렌더되는지
//   ② 코드 받기(reauthenticate 200) → "가입 이메일로 인증 코드를 보냈어요" + 코드 입력란 노출
//   ③ 틀린 코드(updateUser 422 nonce) → "인증 코드가 올바르지 않거나 만료됐어요…"
//   ④ 올바른 코드(updateUser 200) → "비밀번호를 변경했어요"
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

// updateUser(PUT /auth/v1/user) 는 nonce 검증을 흉내 — "654321" 만 성공.
async function mockBackend(page: Page) {
  await page.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));
  await page.route("**/rest/v1/profiles*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ user_id: USER.id, display_name: "테스트", avatar_url: null, birth_year: 1997, phone: null, community_nickname: null }]) }));
  // reauthenticate() — 코드 발송 성공.
  await page.route("**/auth/v1/reauthenticate**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route("**/auth/v1/user**", (r) => {
    if (r.request().method() === "PUT") {
      const body = JSON.parse(r.request().postData() || "{}");
      if (body.nonce === "654321") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USER) });
      return r.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ code: 422, msg: "Nonce has expired or is invalid", error_code: "reauthentication_needed" }) });
    }
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USER) });
  });
}

test("비밀번호 변경 — 이메일 OTP 재인증 플로우", async ({ page }) => {
  await seedSession(page);
  await mockBackend(page);
  await page.goto("/profile");

  // ① 새 비번 입력란 + 코드 받기 버튼 렌더(코드 입력란은 아직 없음)
  const next = page.locator("#newPassword");
  await expect(next).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#reauthCode")).toHaveCount(0);

  // ② 새 비번 입력 후 코드 받기 → 안내 토스트 + 코드 입력란 노출
  await next.fill("newpassword123");
  await page.getByRole("button", { name: "본인 확인 코드 받기" }).click();
  await expect(page.getByText("가입 이메일로 인증 코드를 보냈어요")).toBeVisible({ timeout: 10000 });
  const code = page.locator("#reauthCode");
  await expect(code).toBeVisible();
  await page.screenshot({ path: "test-results/password-form.png", fullPage: true });

  // ③ 틀린 코드 → 차단 토스트
  await code.fill("000000");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByText(/인증 코드가 올바르지 않거나 만료/)).toBeVisible({ timeout: 10000 });

  // ④ 올바른 코드 → 성공
  await code.fill("654321");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByText("비밀번호를 변경했어요")).toBeVisible({ timeout: 10000 });
});
