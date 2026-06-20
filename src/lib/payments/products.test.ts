import { describe, it, expect } from "vitest";
import {
  HEART_PRODUCT_IDS,
  SUBSCRIPTION_PRODUCT_ID,
  basePlanForType,
  heartIapPrice,
  subscriptionIapPrice,
  allProductIds,
  heartPackageIdForProduct,
  heartPackageById,
} from "./products";
import { HEART_PACKAGES, iapPriceForKrw } from "@/lib/heartPackages";

describe("payments/products", () => {
  it("모든 하트 패키지에 Google 상품ID 매핑이 있다", () => {
    for (const pkg of HEART_PACKAGES) {
      expect(HEART_PRODUCT_IDS[pkg.id]).toBeTruthy();
    }
  });

  it("하트 IAP 가는 웹가 +10% (단일 소스 iapPriceForKrw)", () => {
    for (const pkg of HEART_PACKAGES) {
      expect(heartIapPrice(pkg.id)).toBe(iapPriceForKrw(pkg.price));
      expect(heartIapPrice(pkg.id)).toBeGreaterThan(pkg.price);
    }
  });

  it("알 수 없는 패키지 가격은 0", () => {
    expect(heartIapPrice("nope")).toBe(0);
    expect(heartPackageById("nope")).toBeNull();
  });

  it("구독 IAP 가: 월=5390, 년=42900, trial=0", () => {
    expect(subscriptionIapPrice("monthly")).toBe(5390);
    expect(subscriptionIapPrice("yearly")).toBe(42900);
    expect(subscriptionIapPrice("trial")).toBe(0);
  });

  it("trial 은 월간 base plan 으로 매핑", () => {
    expect(basePlanForType("trial")).toBe("monthly");
    expect(basePlanForType("monthly")).toBe("monthly");
    expect(basePlanForType("yearly")).toBe("yearly");
  });

  it("allProductIds = 하트5 + 구독1, 중복 없음", () => {
    const ids = allProductIds();
    expect(ids).toContain(SUBSCRIPTION_PRODUCT_ID);
    expect(ids.length).toBe(HEART_PACKAGES.length + 1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("상품ID ↔ packageId 역매핑이 왕복 일치", () => {
    for (const [packageId, productId] of Object.entries(HEART_PRODUCT_IDS)) {
      expect(heartPackageIdForProduct(productId)).toBe(packageId);
    }
    expect(heartPackageIdForProduct("dewy_premium")).toBeNull();
  });
});
