import { test, expect } from "@playwright/test";

// F7 — 페르소나 타겟팅 end-to-end 검증.
// 로그아웃 사용자의 기본 persona 는 결정적으로 "standard_bride"(useWeddingSchedule
// DEFAULT_SETTINGS) 이므로 로그인 없이도 분기를 검증할 수 있다. prod DB 는 건드리지
// 않고 promotional_events REST 응답만 인터셉트한다.

const TARGETED_TITLE = "★페르소나 한정 이벤트★";
const EVERGREEN_TITLE = "신규 가입 1달 프리미엄 무료"; // 폴백 welcome(항상 노출)

// DB(snake_case) 행 한 건 — 훅 mapRow 가 기대하는 컬럼.
function row(overrides: Record<string, unknown>) {
  return {
    id: "row-" + Math.random().toString(36).slice(2),
    slug: "persona_test",
    title: TARGETED_TITLE,
    subtitle: "타겟 매칭 시에만 노출",
    position: 5,
    thumb_bg: "from-[#FFF1F4] to-[#FAD0DA]",
    icon: null,
    cta_label: "보기",
    cta_path: "/premium",
    status: "live",
    starts_at: null,
    ends_at: null,
    target_personas: [],
    target_styles: [],
    badge_label: null,
    badge_color: null,
    ends_label: null,
    ...overrides,
  };
}

// promotional_events REST 응답을 주어진 rows 로 고정. 교차출처(supabase.co)라
// CORS 헤더와 preflight(OPTIONS) 까지 처리해야 fetch 가 성공한다.
test.describe("페르소나 타겟팅", () => {
  test("매칭 persona(standard_bride) 에는 타겟 카드가 보인다", async ({ page }) => {
    await page.route("**/rest/v1/promotional_events*", (route) => {
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      };
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: cors });
      }
      return route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
        body: JSON.stringify([row({ target_personas: ["standard_bride"] })]),
      });
    });

    await page.goto("/events");
    await expect(page.getByText(EVERGREEN_TITLE)).toBeVisible();
    await expect(page.getByText(TARGETED_TITLE)).toBeVisible();
  });

  test("비매칭 persona 에는 타겟 카드가 숨고, evergreen 은 남는다", async ({ page }) => {
    await page.route("**/rest/v1/promotional_events*", (route) => {
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      };
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: cors });
      }
      return route.fulfill({
        status: 200,
        headers: { ...cors, "content-type": "application/json" },
        body: JSON.stringify([row({ target_personas: ["nonexistent_persona"] })]),
      });
    });

    await page.goto("/events");
    await expect(page.getByText(EVERGREEN_TITLE)).toBeVisible();
    await expect(page.getByText(TARGETED_TITLE)).toHaveCount(0);
  });
});
