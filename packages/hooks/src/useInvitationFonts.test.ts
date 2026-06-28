import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ── Supabase 모킹 ─────────────────────────────────────────────
// invitation_fonts SELECT 가 활성 폰트 2개를 반환하도록 체인을 구성.
const FONTS = [
  {
    id: "f1",
    name: "노토 세리프 KR",
    family: "Noto Serif KR",
    file_url: "https://cdn.example.com/noto-serif-kr-400.woff2",
    category: "SERIF",
    weight: "400",
    style: "normal",
  },
  {
    id: "f2",
    name: "나눔손글씨 펜",
    family: "Nanum Pen Script",
    file_url: "https://cdn.example.com/nanum-pen-400.woff2",
    category: "HANDWRITING",
    weight: "400",
    style: "normal",
  },
];

const makeBuilder = () => {
  const result = Promise.resolve({ data: FONTS, error: null });
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => result, // 체인 종단 — await 시 폰트 목록 반환
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => makeBuilder() },
}));

import { useInvitationFonts } from "./useInvitationFonts";

const STYLE_ID = "invitation-fontfaces";

describe("useInvitationFonts", () => {
  beforeEach(() => {
    document.getElementById(STYLE_ID)?.remove();
  });

  it("활성 폰트를 @font-face 로 문서에 주입하고 fontsReady 를 true 로 만든다", async () => {
    const { result } = renderHook(() => useInvitationFonts());

    await waitFor(() => expect(result.current.fontsReady).toBe(true));

    // 폰트 목록이 hook 상태에 반영됨
    expect(result.current.fonts.map((f) => f.family)).toEqual([
      "Noto Serif KR",
      "Nanum Pen Script",
    ]);

    // <style> 엘리먼트가 주입되고 각 폰트의 @font-face 가 들어있음
    const styleEl = document.getElementById(STYLE_ID);
    expect(styleEl).not.toBeNull();
    const css = styleEl!.textContent ?? "";
    expect(css).toContain("@font-face");
    expect(css).toContain("font-family:'Noto Serif KR'");
    expect(css).toContain(
      "src:url('https://cdn.example.com/noto-serif-kr-400.woff2')",
    );
    expect(css).toContain("font-family:'Nanum Pen Script'");
    expect(css).toContain("font-display:swap");
  });

  it("재호출해도 @font-face <style> 를 중복 주입하지 않는다 (멱등)", async () => {
    const { result } = renderHook(() => useInvitationFonts());
    await waitFor(() => expect(result.current.fontsReady).toBe(true));
    // 두 번째 마운트
    const { result: r2 } = renderHook(() => useInvitationFonts());
    await waitFor(() => expect(r2.current.fontsReady).toBe(true));

    expect(document.querySelectorAll(`#${STYLE_ID}`).length).toBe(1);
  });
});
