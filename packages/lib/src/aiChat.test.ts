// AI 채팅 영속화 순수 헬퍼(src/lib/aiChat.ts) 회귀 테스트 —
// 제목 유도·LLM 컨텍스트 윈도우·한도 에러 분기·요금제별 한도.
import { describe, it, expect } from "vitest";
import {
  deriveSessionTitle,
  isSessionLimitError,
  messageCapFor,
  sessionLimitFor,
  windowForLLM,
  FREE_MESSAGE_CAP,
  FREE_SESSION_LIMIT,
  LLM_CONTEXT_WINDOW,
  PREMIUM_MESSAGE_CAP,
  PREMIUM_SESSION_LIMIT,
  SESSION_LIMIT_ERROR,
} from "@/lib/aiChat";

describe("deriveSessionTitle", () => {
  it("공백 정리 + 30자 컷", () => {
    expect(deriveSessionTitle("  강남   웨딩홀\n추천해줘  ")).toBe("강남 웨딩홀 추천해줘");
    const long = "가".repeat(40);
    expect(deriveSessionTitle(long)).toBe("가".repeat(30) + "…");
  });

  it("빈 입력은 기본 제목", () => {
    expect(deriveSessionTitle("   ")).toBe("새 채팅");
  });
});

describe("windowForLLM", () => {
  it("윈도우 이하면 그대로, 초과하면 최근 N개만", () => {
    const short = [1, 2, 3];
    expect(windowForLLM(short, 5)).toEqual(short);
    const long = Array.from({ length: 20 }, (_, i) => i);
    expect(windowForLLM(long, 5)).toEqual([15, 16, 17, 18, 19]);
  });

  it("기본 윈도우는 LLM_CONTEXT_WINDOW", () => {
    const long = Array.from({ length: LLM_CONTEXT_WINDOW + 4 }, (_, i) => i);
    expect(windowForLLM(long)).toHaveLength(LLM_CONTEXT_WINDOW);
  });
});

describe("isSessionLimitError", () => {
  it("DB 트리거의 고정 식별자만 한도 에러로 분기", () => {
    expect(isSessionLimitError({ message: SESSION_LIMIT_ERROR })).toBe(true);
    expect(isSessionLimitError({ message: `P0001: ${SESSION_LIMIT_ERROR}` })).toBe(true);
    expect(isSessionLimitError({ message: "permission denied" })).toBe(false);
    expect(isSessionLimitError(null)).toBe(false);
    expect(isSessionLimitError(new Error("network"))).toBe(false);
  });
});

describe("요금제별 한도 (DB 트리거와 미러 — 드리프트 회귀 방지)", () => {
  it("채팅창: 무료 1 / 프리미엄 5", () => {
    expect(sessionLimitFor(false)).toBe(FREE_SESSION_LIMIT);
    expect(sessionLimitFor(true)).toBe(PREMIUM_SESSION_LIMIT);
    expect(FREE_SESSION_LIMIT).toBe(1);
    expect(PREMIUM_SESSION_LIMIT).toBe(5);
  });

  it("보관 용량: 무료 100 / 프리미엄 500 메시지", () => {
    expect(messageCapFor(false)).toBe(FREE_MESSAGE_CAP);
    expect(messageCapFor(true)).toBe(PREMIUM_MESSAGE_CAP);
    expect(FREE_MESSAGE_CAP).toBe(100);
    expect(PREMIUM_MESSAGE_CAP).toBe(500);
  });
});
