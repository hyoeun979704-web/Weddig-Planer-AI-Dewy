import { describe, it, expect } from "vitest";
import {
  ensureAdDisclosure,
  withDisclosureHashtags,
  withDisclosureCaption,
  requiresAdDisclosure,
  applyDisclosure,
  AD_DISCLOSURE_NOTICE,
  AD_DISCLOSURE_LABEL,
} from "./adDisclosure";

describe("withDisclosureHashtags", () => {
  it("빈 입력이면 광고 표기 태그를 추가한다", () => {
    expect(withDisclosureHashtags()).toEqual(["#광고", "#제휴"]);
  });

  it("광고 표기 태그를 맨 앞에 배치한다", () => {
    expect(withDisclosureHashtags(["#웨딩", "#스튜디오"])).toEqual([
      "#광고",
      "#제휴",
      "#웨딩",
      "#스튜디오",
    ]);
  });

  it("이미 있는 광고 태그는 중복 추가하지 않는다(대소문자·# 정규화)", () => {
    expect(withDisclosureHashtags(["광고", "#웨딩"])).toEqual(["#제휴", "#광고", "#웨딩"]);
  });

  it("# 없는 태그와 공백을 정규화한다", () => {
    expect(withDisclosureHashtags(["  웨딩 ", "##드레스"])).toEqual([
      "#광고",
      "#제휴",
      "#웨딩",
      "#드레스",
    ]);
  });

  it("빈 문자열 태그는 제거한다", () => {
    expect(withDisclosureHashtags(["", "  ", "#홀"])).toEqual(["#광고", "#제휴", "#홀"]);
  });
});

describe("withDisclosureCaption", () => {
  it("고지가 없으면 광고 문구를 덧붙인다", () => {
    const out = withDisclosureCaption("예쁜 드레스샵 소개");
    expect(out).toContain("예쁜 드레스샵 소개");
    expect(out).toContain(AD_DISCLOSURE_NOTICE);
  });

  it("빈 캡션이면 광고 문구만 반환한다", () => {
    expect(withDisclosureCaption("")).toBe(AD_DISCLOSURE_NOTICE);
  });

  it("이미 '광고' 고지가 있으면 중복 추가하지 않는다", () => {
    const caption = "이 글은 광고입니다. 좋은 곳이에요";
    expect(withDisclosureCaption(caption)).toBe(caption);
  });

  it("'협찬' 표기가 있어도 중복 추가하지 않는다", () => {
    const caption = "협찬 받았어요";
    expect(withDisclosureCaption(caption)).toBe(caption);
  });
});

describe("ensureAdDisclosure", () => {
  it("캡션·해시태그·라벨에 광고 표기를 강제한다", () => {
    const r = ensureAdDisclosure({ caption: "추천 업체", hashtags: ["#웨딩"] });
    expect(r.caption).toContain(AD_DISCLOSURE_NOTICE);
    expect(r.hashtags).toEqual(["#광고", "#제휴", "#웨딩"]);
    expect(r.label).toBe(AD_DISCLOSURE_LABEL);
  });

  it("입력이 비어도 광고 표기를 보장한다", () => {
    const r = ensureAdDisclosure({});
    expect(r.caption).toBe(AD_DISCLOSURE_NOTICE);
    expect(r.hashtags).toEqual(["#광고", "#제휴"]);
    expect(r.label).toBe(AD_DISCLOSURE_LABEL);
  });
});

describe("requiresAdDisclosure", () => {
  it("단독 업체 광고만 표기 필요", () => {
    expect(requiresAdDisclosure("vendor_ad")).toBe(true);
    expect(requiresAdDisclosure("editorial")).toBe(false);
  });
});

describe("applyDisclosure", () => {
  it("vendor_ad: 광고 표기를 강제한다", () => {
    const r = applyDisclosure("vendor_ad", { caption: "추천 업체", hashtags: ["#웨딩"] });
    expect(r.caption).toContain(AD_DISCLOSURE_NOTICE);
    expect(r.hashtags).toEqual(["#광고", "#제휴", "#웨딩"]);
    expect(r.label).toBe(AD_DISCLOSURE_LABEL);
  });

  it("editorial: 광고 표기를 하지 않고 원본을 유지한다", () => {
    const r = applyDisclosure("editorial", { caption: "예식장 고르는 팁", hashtags: ["#웨딩"] });
    expect(r.caption).toBe("예식장 고르는 팁");
    expect(r.hashtags).toEqual(["#웨딩"]);
    expect(r.label).toBeNull();
  });

  it("editorial: 빈 입력도 안전하게 처리한다", () => {
    const r = applyDisclosure("editorial", {});
    expect(r.caption).toBe("");
    expect(r.hashtags).toEqual([]);
    expect(r.label).toBeNull();
  });
});
