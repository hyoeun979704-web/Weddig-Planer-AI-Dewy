import { describe, it, expect } from "vitest";
import { widgetUrlToPath } from "./widgetNav";

describe("widgetNav/widgetUrlToPath", () => {
  it("위젯 딥링크를 앱 경로로 매핑", () => {
    expect(widgetUrlToPath("app.dewy://schedule")).toBe("/schedule");
    expect(widgetUrlToPath("app.dewy://schedule/new")).toBe("/schedule?add=1");
    expect(widgetUrlToPath("app.dewy://vendor-board")).toBe("/vendor-board");
    expect(widgetUrlToPath("app.dewy://budget")).toBe("/budget");
    expect(widgetUrlToPath("app.dewy://budget/new")).toBe("/budget?add=1");
  });

  it("뒤따르는 슬래시/쿼리/해시를 무시", () => {
    expect(widgetUrlToPath("app.dewy://schedule/")).toBe("/schedule");
    expect(widgetUrlToPath("app.dewy://budget?foo=bar")).toBe("/budget");
    expect(widgetUrlToPath("app.dewy://budget#x")).toBe("/budget");
  });

  it("auth 콜백·미지원 스킴·알 수 없는 host 는 null(딥링크 처리 위임/무시)", () => {
    expect(widgetUrlToPath("app.dewy://auth/callback")).toBeNull();
    expect(widgetUrlToPath("https://dewy-wedding.com/schedule")).toBeNull();
    expect(widgetUrlToPath("app.dewy://unknown")).toBeNull();
  });
});
