import { describe, it, expect } from "vitest";
import { computeListingCompleteness, type ListingFields } from "./businessListingCompleteness";

const base: ListingFields = {
  name: "", description: "", city: "", district: "", imageUrl: "",
  minPrice: "", tags: "", inquiryChannel: "chat", inquiryUrl: "", inquiryPhone: "",
};

describe("computeListingCompleteness", () => {
  it("empty form: only inquiry(chat) done → 1/7", () => {
    const c = computeListingCompleteness(base);
    expect(c.total).toBe(7);
    expect(c.doneCount).toBe(1); // chat 은 항상 설정됨
    expect(c.percent).toBe(Math.round((1 / 7) * 100));
    expect(c.missing.map((m) => m.key)).toContain("name");
  });

  it("full form → 100%", () => {
    const c = computeListingCompleteness({
      ...base,
      name: "그랜드웨딩홀", description: "소개", city: "서울특별시", district: "강남구",
      imageUrl: "https://x/y.jpg", minPrice: "500000", tags: "강남, 가성비",
    });
    expect(c.percent).toBe(100);
    expect(c.missing).toHaveLength(0);
  });

  it("region done by city OR district", () => {
    expect(computeListingCompleteness({ ...base, city: "서울특별시" }).items.find((i) => i.key === "region")!.done).toBe(true);
    expect(computeListingCompleteness({ ...base, district: "강남구" }).items.find((i) => i.key === "region")!.done).toBe(true);
  });

  it("inquiry url needs http(s); phone needs value", () => {
    expect(computeListingCompleteness({ ...base, inquiryChannel: "url", inquiryUrl: "예약" }).items.find((i) => i.key === "inquiry")!.done).toBe(false);
    expect(computeListingCompleteness({ ...base, inquiryChannel: "url", inquiryUrl: "https://o.kr" }).items.find((i) => i.key === "inquiry")!.done).toBe(true);
    expect(computeListingCompleteness({ ...base, inquiryChannel: "phone", inquiryPhone: "" }).items.find((i) => i.key === "inquiry")!.done).toBe(false);
    expect(computeListingCompleteness({ ...base, inquiryChannel: "phone", inquiryPhone: "010-1-2" }).items.find((i) => i.key === "inquiry")!.done).toBe(true);
  });

  it("tags ignores empty/whitespace entries", () => {
    expect(computeListingCompleteness({ ...base, tags: " , ," }).items.find((i) => i.key === "tags")!.done).toBe(false);
    expect(computeListingCompleteness({ ...base, tags: "강남" }).items.find((i) => i.key === "tags")!.done).toBe(true);
  });
});
