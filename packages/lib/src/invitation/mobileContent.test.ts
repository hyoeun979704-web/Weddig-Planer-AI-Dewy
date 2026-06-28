import { describe, it, expect } from "vitest";
import { extractMobileContent } from "./mobileContent";

describe("extractMobileContent", () => {
  it("빈 row 는 안전한 기본값으로 정규화한다", () => {
    const c = extractMobileContent({});
    expect(c.groomName).toBe("신랑");
    expect(c.brideName).toBe("신부");
    expect(c.gallery).toEqual([]);
    expect(c.accounts).toEqual([]);
    expect(c.weddingDate).toBeNull();
    expect(c.tone).toBe("warm_letter");
  });

  it("user_data 필드를 콘텐츠로 매핑한다", () => {
    const c = extractMobileContent({
      user_data: {
        groom_name: "홍길동",
        bride_name: "김영희",
        venue_name: "OO웨딩홀",
        venue_address: "서울시 강남구",
        intro_text: "초대합니다",
        account_groom: "OO은행 123",
        account_bride: "XX은행 456",
      },
      invitation_templates: { tone: "modern_minimal" },
    });
    expect(c.groomName).toBe("홍길동");
    expect(c.brideName).toBe("김영희");
    expect(c.venueName).toBe("OO웨딩홀");
    expect(c.greeting).toBe("초대합니다");
    expect(c.tone).toBe("modern_minimal");
    expect(c.accounts).toEqual([
      { side: "groom", label: "신랑측", value: "OO은행 123" },
      { side: "bride", label: "신부측", value: "XX은행 456" },
    ]);
  });

  it("메인 사진은 갤러리에서 제외하고 키 순서로 정렬한다", () => {
    const c = extractMobileContent({
      layout: {
        imageUrlsForViewer: {
          gallery_2: "u2",
          main_photo: "hero",
          gallery_1: "u1",
          gallery_10: "u10",
        },
      },
    });
    expect(c.heroImage).toBe("hero");
    expect(c.gallery).toEqual(["u1", "u2", "u10"]);
  });

  it("textOverrides 가 user_data 보다 우선한다", () => {
    const c = extractMobileContent({
      user_data: { intro_text: "원본" },
      layout: { textOverrides: { intro_text: "수정본" } },
    });
    expect(c.greeting).toBe("수정본");
  });

  it("계좌가 한쪽만 있으면 그 한 건만 포함한다", () => {
    const c = extractMobileContent({ user_data: { account_groom: "OO은행 123" } });
    expect(c.accounts).toHaveLength(1);
    expect(c.accounts[0].side).toBe("groom");
  });
});
