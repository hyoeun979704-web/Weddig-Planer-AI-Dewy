import { describe, it, expect } from "vitest";
import { mergeCoupleSchedule } from "./useWeddingSchedule";

const row = (over: Partial<Record<string, unknown>> & { id: string; user_id: string }) => ({
  title: "웨딩홀 계약",
  scheduled_date: "2026-07-01",
  completed: false,
  notes: null,
  category: "general",
  source: "template" as const,
  ...over,
});

describe("mergeCoupleSchedule", () => {
  it("같은 (제목,날짜) 항목은 하나로 합친다 (템플릿 중복 제거)", () => {
    const rows = [
      row({ id: "mine", user_id: "me" }),
      row({ id: "partner", user_id: "you" }),
    ] as any;
    const merged = mergeCoupleSchedule(rows, "me");
    expect(merged).toHaveLength(1);
  });

  it("완료 상태는 OR — 한쪽이라도 완료면 완료로 본다", () => {
    const rows = [
      row({ id: "mine", user_id: "me", completed: false }),
      row({ id: "partner", user_id: "you", completed: true }),
    ] as any;
    expect(mergeCoupleSchedule(rows, "me")[0].completed).toBe(true);
  });

  it("대표행은 내 행을 우선한다 (파트너 행이 먼저 와도)", () => {
    const rows = [
      row({ id: "partner", user_id: "you", notes: "파트너메모" }),
      row({ id: "mine", user_id: "me", notes: "내메모" }),
    ] as any;
    const merged = mergeCoupleSchedule(rows, "me");
    expect(merged[0].id).toBe("mine");
    expect(merged[0].notes).toBe("내메모");
  });

  it("서로 다른 항목은 날짜순으로 모두 유지한다", () => {
    const rows = [
      row({ id: "a", user_id: "me", title: "B", scheduled_date: "2026-08-01" }),
      row({ id: "b", user_id: "you", title: "A", scheduled_date: "2026-07-01" }),
    ] as any;
    const merged = mergeCoupleSchedule(rows, "me");
    expect(merged.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("파트너 단독 항목도 포함한다 (대표=파트너 행)", () => {
    const rows = [row({ id: "partner", user_id: "you" })] as any;
    const merged = mergeCoupleSchedule(rows, "me");
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("partner");
  });
});
