import { describe, it, expect } from "vitest";
import { classifyTipCategories } from "./tipClassify";
import { normalizeTipCategories } from "./tipNormalize";

const ORDER = [
  "family_meeting",
  "newlywed_home",
  "wedding_gifts",
  "legal_paperwork",
  "bridal_care",
  "ceremony",
  "wedding_hall",
  "studio",
  "dress_shop",
  "makeup_shop",
  "hanbok",
  "tailor_shop",
  "honeymoon",
  "appliance",
  "invitation_venue",
  "general",
];

describe("classifyTipCategories", () => {
  it("returns [] when no topic matches (off-topic video)", () => {
    expect(classifyTipCategories("김계란 몸이 좋은지 몰랐던 여자", ORDER)).toEqual([]);
  });

  it("classifies 공기청정기 as appliance (not wedding_hall)", () => {
    // Regression: this used to land in wedding_hall because it surfaced from
    // the '음식 시연 후기' seed query.
    expect(
      classifyTipCategories("해외에서 난리난 한국 공기청정기 클라스", ORDER),
    ).toEqual(["appliance"]);
  });

  it("classifies generic 여행지 as honeymoon", () => {
    expect(
      classifyTipCategories("곽튜브가 추천한 최고의 여행지?!", ORDER),
    ).toEqual(["honeymoon"]);
  });

  it("classifies generic 정장 as tailor_shop", () => {
    expect(classifyTipCategories("변호사의 맞춤 정장", ORDER)).toEqual([
      "tailor_shop",
    ]);
  });

  it("classifies generic 다이어트 as bridal_care", () => {
    expect(
      classifyTipCategories("예비신부의 주 3일 전신운동 루틴", ORDER),
    ).toEqual(["bridal_care"]);
  });

  it("classifies 신부관리 / 바디관리 phrasing as bridal_care", () => {
    expect(
      classifyTipCategories("비용 절감 갓성비 신부관리 총정리", ORDER),
    ).toEqual(["bridal_care"]);
    expect(
      classifyTipCategories("예비신부 바디관리 후기", ORDER),
    ).toEqual(["bridal_care"]);
  });

  it("returns multiple categories for multi-topic videos", () => {
    const cats = classifyTipCategories(
      "혼주 한복 + 결혼식 식순 가이드",
      ORDER,
    );
    expect(cats).toContain("hanbok");
    expect(cats).toContain("ceremony");
  });

  it("orders matches by the given order array", () => {
    // 결혼식(ceremony) precedes 한복(hanbok) in ORDER → ceremony first.
    expect(
      classifyTipCategories("결혼식 한복 추천", ORDER),
    ).toEqual(["ceremony", "hanbok"]);
  });

  it("composes with normalizeTipCategories: drops general when specifics match", () => {
    // "결혼 준비 + 한복" — general matches the planning phrase, hanbok matches
    // the specific topic. normalize drops general.
    const cats = classifyTipCategories("결혼 준비 한복 가이드", ORDER);
    expect(cats).toEqual(["hanbok", "general"]);
    expect(normalizeTipCategories(cats)).toEqual(["hanbok"]);
  });

  it("keeps general when it is the only match", () => {
    const cats = classifyTipCategories("결혼 준비 꿀팁 모음", ORDER);
    expect(cats).toEqual(["general"]);
    expect(normalizeTipCategories(cats)).toEqual(["general"]);
  });
});
