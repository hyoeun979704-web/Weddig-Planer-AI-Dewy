import { describe, it, expect } from "vitest";
import { scoreTaste, TASTE_QUIZ } from "./tasteQuiz";

describe("scoreTaste", () => {
  it("빈도 높은 무드를 앞으로 정렬", () => {
    // vibe_simple(미니멀,모던) + color_white(미니멀,모던) + detail_clean(미니멀,모던)
    const tags = scoreTaste(["vibe_simple", "color_white", "detail_clean"]);
    expect(tags[0]).toBe("미니멀");
    expect(tags).toContain("모던");
  });

  it("동점은 첫 등장 순서 유지(결정적)", () => {
    // vibe_elegant(클래식) + color_pastel(로맨틱) → 각 1회, 클래식이 먼저
    expect(scoreTaste(["vibe_elegant", "color_pastel"])).toEqual(["클래식", "로맨틱"]);
  });

  it("잘못된 id 는 무시", () => {
    expect(scoreTaste(["nope", "vibe_grand"])).toEqual(["볼드", "클래식"]);
  });

  it("답 없으면 빈 배열(회귀 없음)", () => {
    expect(scoreTaste([])).toEqual([]);
  });

  it("모든 옵션 id 가 유일", () => {
    const ids = TASTE_QUIZ.flatMap((q) => q.options.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
