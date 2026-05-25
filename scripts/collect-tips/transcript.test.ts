import { describe, it, expect, vi, beforeEach } from "vitest";

// youtube-transcript 라이브러리를 모킹 — 실제 네트워크 호출 없이 fetchTranscript
// 의 동작 (한국어 우선 + fallback + 빈 문자열 보호) 만 검증.
vi.mock("youtube-transcript", () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}));

import { YoutubeTranscript } from "youtube-transcript";
import { fetchTranscript } from "./transcript";

const mock = YoutubeTranscript.fetchTranscript as ReturnType<typeof vi.fn>;

describe("fetchTranscript", () => {
  beforeEach(() => {
    mock.mockReset();
  });

  it("returns joined transcript text when 한국어 자막 있음", async () => {
    mock.mockResolvedValueOnce([
      { text: "결혼 준비", offset: 0, duration: 1 },
      { text: "꿀팁입니다", offset: 1, duration: 1 },
    ]);
    const t = await fetchTranscript("abc123");
    expect(t).toBe("결혼 준비 꿀팁입니다");
    expect(mock).toHaveBeenCalledWith("abc123", { lang: "ko" });
  });

  it("falls back to default lang when 한국어 자막 없음", async () => {
    mock.mockRejectedValueOnce(new Error("ko not available"));
    mock.mockResolvedValueOnce([{ text: "english fallback", offset: 0, duration: 1 }]);
    const t = await fetchTranscript("abc456");
    expect(t).toBe("english fallback");
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenLastCalledWith("abc456");
  });

  it("returns empty string when no caption at all", async () => {
    mock.mockRejectedValueOnce(new Error("ko fail"));
    mock.mockRejectedValueOnce(new Error("default fail"));
    expect(await fetchTranscript("nocap")).toBe("");
  });

  it("normalizes whitespace and caps at 5000 chars", async () => {
    const longText = Array(2000).fill("결혼").join("  "); // ~12000 chars w/ doubles
    mock.mockResolvedValueOnce([{ text: longText, offset: 0, duration: 1 }]);
    const t = await fetchTranscript("long");
    expect(t.length).toBeLessThanOrEqual(5000);
    expect(t).not.toMatch(/ {2,}/); // no double space
  });

  it("handles unexpected library failure gracefully", async () => {
    mock.mockImplementationOnce(() => {
      throw new TypeError("boom");
    });
    mock.mockImplementationOnce(() => {
      throw new TypeError("boom2");
    });
    expect(await fetchTranscript("err")).toBe("");
  });
});
