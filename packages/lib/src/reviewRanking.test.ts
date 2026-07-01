import { describe, it, expect } from "vitest";
import { tierRank, regionMatches, rankReviews, type RankableReview } from "./reviewRanking";

describe("tierRank", () => {
  it("계약 < 상담 < 없음", () => {
    expect(tierRank("contract")).toBe(0);
    expect(tierRank("consult")).toBe(1);
    expect(tierRank(null)).toBe(2);
    expect(tierRank(undefined)).toBe(2);
  });
});

describe("regionMatches", () => {
  it("같은 지역(trim)만 true", () => {
    expect(regionMatches("서울특별시", "서울특별시")).toBe(true);
    expect(regionMatches(" 서울특별시 ", "서울특별시")).toBe(true);
    expect(regionMatches("서울특별시", "충청남도")).toBe(false);
  });
  it("한쪽이라도 비면 false", () => {
    expect(regionMatches(null, "서울특별시")).toBe(false);
    expect(regionMatches("서울특별시", null)).toBe(false);
    expect(regionMatches(null, null)).toBe(false);
  });
});

describe("rankReviews", () => {
  const mk = (over: Partial<RankableReview & { id: string }>): RankableReview & { id: string } => ({
    id: over.id ?? "x",
    verification_tier: over.verification_tier ?? null,
    author_region: over.author_region ?? null,
    review_date: over.review_date ?? null,
  });

  it("인증 등급이 최우선 — 계약 > 상담 > 없음", () => {
    const out = rankReviews(
      [
        mk({ id: "none" }),
        mk({ id: "consult", verification_tier: "consult" }),
        mk({ id: "contract", verification_tier: "contract" }),
      ],
      null,
    );
    expect(out.map((r) => r.id)).toEqual(["contract", "consult", "none"]);
  });

  it("같은 등급이면 같은 지역 후기를 위로", () => {
    const out = rankReviews(
      [
        mk({ id: "other", author_region: "부산광역시" }),
        mk({ id: "mine", author_region: "서울특별시" }),
      ],
      "서울특별시",
    );
    expect(out.map((r) => r.id)).toEqual(["mine", "other"]);
  });

  it("등급·지역 같으면 최신순", () => {
    const out = rankReviews(
      [
        mk({ id: "old", review_date: "2026-01-01" }),
        mk({ id: "new", review_date: "2026-06-01" }),
      ],
      null,
    );
    expect(out.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("인증이 지역보다 우선 — 타지역 계약인증이 같은지역 미인증보다 위", () => {
    const out = rankReviews(
      [
        mk({ id: "local_none", author_region: "서울특별시" }),
        mk({ id: "far_contract", verification_tier: "contract", author_region: "제주특별자치도" }),
      ],
      "서울특별시",
    );
    expect(out.map((r) => r.id)).toEqual(["far_contract", "local_none"]);
  });

  it("원본 배열 불변", () => {
    const input = [mk({ id: "a" }), mk({ id: "b", verification_tier: "contract" })];
    const copy = [...input];
    rankReviews(input, null);
    expect(input).toEqual(copy);
  });
});
