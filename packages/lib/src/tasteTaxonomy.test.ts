import { describe, it, expect } from "vitest";
import { MOOD_TAGS, isMoodTag, normalizeToMood, normalizeTagsToMoods } from "./tasteTaxonomy";

describe("tasteTaxonomy", () => {
  it("무드 6개 어휘를 고정한다(매칭 키 보존)", () => {
    expect(MOOD_TAGS).toEqual(["클래식", "모던", "로맨틱", "빈티지", "미니멀", "볼드"]);
  });

  it("isMoodTag — 정식 무드만 통과, 비무드/비문자열 거부", () => {
    expect(isMoodTag("모던")).toBe(true);
    expect(isMoodTag("강남웨딩홀")).toBe(false);
    expect(isMoodTag(null)).toBe(false);
    expect(isMoodTag(123)).toBe(false);
  });

  it("normalizeToMood — 정식 무드는 그대로", () => {
    expect(normalizeToMood("로맨틱")).toBe("로맨틱");
  });

  it("normalizeToMood — 동의어/영문/공백·대소문자 무시 매핑", () => {
    expect(normalizeToMood("심플")).toBe("모던");
    expect(normalizeToMood(" Modern ")).toBe("모던");
    expect(normalizeToMood("내추럴")).toBe("미니멀");
    expect(normalizeToMood("화려")).toBe("볼드");
  });

  it("normalizeToMood — 모호하면 null(무태깅이 오태깅보다 안전)", () => {
    expect(normalizeToMood("강남웨딩홀")).toBeNull();
    expect(normalizeToMood("")).toBeNull();
    expect(normalizeToMood(null)).toBeNull();
    expect(normalizeToMood(undefined)).toBeNull();
  });

  it("normalizeTagsToMoods — 중복 제거 + 순서 보존 + 실패분 폐기", () => {
    expect(normalizeTagsToMoods(["심플", "모던", "강남맛집", "로맨틱"])).toEqual([
      "모던",
      "로맨틱",
    ]);
  });
});
