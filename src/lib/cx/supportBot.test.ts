// CX 고객센터 챗봇 룰 기반 두뇌 회귀 테스트 — 가이드 우선·FAQ 폴백·미매칭 null
// (null = 담당자 연결 에스컬레이션 분기).
import { describe, it, expect } from "vitest";
import {
  answerSupportQuery,
  buildEscalationContent,
  deriveEscalationTitle,
} from "@/lib/cx/supportBot";

describe("answerSupportQuery", () => {
  it("오류 호소 → 트러블슈팅 가이드(문제 상황 우선)", () => {
    const r = answerSupportQuery("앱에서 오류가 발생했어요");
    expect(r?.source).toBe("guide");
    expect(r?.text).toContain("새로고침");
  });

  it("결제 문제 → 결제 가이드", () => {
    const r = answerSupportQuery("결제가 안 돼요");
    expect(r?.source).toBe("guide");
    expect(r?.text).toContain("결제");
  });

  it("로그인 문제 → 로그인 가이드", () => {
    const r = answerSupportQuery("로그인이 안 돼요");
    expect(r?.source).toBe("guide");
  });

  it("기능 질문은 FAQ 폴백으로 답변", () => {
    const r = answerSupportQuery("프리미엄 구독은 얼마인가요?");
    expect(r?.source).toBe("faq");
    expect(r?.text).toContain("4,900");
  });

  it("매칭 불가(생뚱맞은 입력) → null(담당자 연결 제안)", () => {
    expect(answerSupportQuery("zzz")).toBeNull();
    expect(answerSupportQuery("ㅁㄴㅇㄹ")).toBeNull();
  });
});

describe("에스컬레이션 헬퍼", () => {
  const transcript = [
    { role: "assistant" as const, content: "무엇을 도와드릴까요?" },
    { role: "user" as const, content: "결제했는데 프리미엄이 적용이 안 돼요" },
    { role: "assistant" as const, content: "이렇게 해보세요..." },
  ];

  it("접수 본문에 대화 전사와 컨텍스트 포함", () => {
    const c = buildEscalationContent(transcript, "/premium 화면");
    expect(c).toContain("에스컬레이션");
    expect(c).toContain("/premium 화면");
    expect(c).toContain("사용자: 결제했는데");
    expect(c).toContain("듀이봇:");
  });

  it("컨텍스트 없으면 해당 줄 생략 + 4000자 컷", () => {
    const long = [{ role: "user" as const, content: "가".repeat(5000) }];
    const c = buildEscalationContent(long, null);
    expect(c).not.toContain("발생 위치");
    expect(c.length).toBeLessThanOrEqual(4000);
  });

  it("제목은 첫 사용자 메시지에서 유도(40자 컷)", () => {
    expect(deriveEscalationTitle(transcript)).toBe("결제했는데 프리미엄이 적용이 안 돼요");
    expect(deriveEscalationTitle([{ role: "user", content: "가".repeat(50) }])).toBe("가".repeat(40) + "…");
    expect(deriveEscalationTitle([])).toBe("고객센터 챗봇 문의");
  });
});
