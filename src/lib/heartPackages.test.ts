import { describe, it, expect } from "vitest";
import {
  HEART_PACKAGES,
  POINT_TO_KRW,
  krwForPoints,
  pointsForKrw,
  maxPointsForPackage,
} from "./heartPackages";

describe("heartPackages 포인트 환산", () => {
  it("krwForPoints: 1P=0.2원 (내림)", () => {
    expect(krwForPoints(100)).toBe(20);
    expect(krwForPoints(7)).toBe(1); // 1.4 → 1
    expect(krwForPoints(0)).toBe(0);
  });

  it("pointsForKrw: 원→포인트 (올림)", () => {
    expect(pointsForKrw(20)).toBe(100);
    expect(pointsForKrw(1)).toBe(5); // 1/0.2=5
    expect(pointsForKrw(3)).toBe(15);
  });

  it("POINT_TO_KRW 상수", () => {
    expect(POINT_TO_KRW).toBe(0.2);
  });
});

describe("maxPointsForPackage (결제 50% 한도)", () => {
  it("잔액이 한도보다 적으면 잔액까지만", () => {
    // 9900원 × 50% = 4950원 = 24750P 한도, 잔액 1000 → 1000
    expect(maxPointsForPackage(9900, 1000)).toBe(1000);
  });

  it("잔액이 충분하면 결제액 50% 한도까지", () => {
    // 9900 × 50% = 4950원 → 24750P, 잔액 100000 → 24750
    expect(maxPointsForPackage(9900, 100_000)).toBe(24_750);
  });

  it("한도(50%)를 절대 넘지 않는다", () => {
    const price = 4900;
    const huge = 10_000_000;
    const used = maxPointsForPackage(price, huge);
    // 사용 포인트의 원 환산이 결제액의 50% 이하
    expect(krwForPoints(used)).toBeLessThanOrEqual(Math.floor(price * 0.5));
  });

  it("잔액 0이면 0", () => {
    expect(maxPointsForPackage(9900, 0)).toBe(0);
  });
});

describe("HEART_PACKAGES 데이터 정합성", () => {
  it("첫 충전 특전만 firstOnly", () => {
    const firstOnly = HEART_PACKAGES.filter((p) => p.firstOnly);
    expect(firstOnly).toHaveLength(1);
    expect(firstOnly[0].id).toBe("starter");
  });

  it("id 중복 없음, price/hearts 양수", () => {
    const ids = new Set(HEART_PACKAGES.map((p) => p.id));
    expect(ids.size).toBe(HEART_PACKAGES.length);
    for (const p of HEART_PACKAGES) {
      expect(p.price).toBeGreaterThan(0);
      expect(p.hearts).toBeGreaterThan(0);
    }
  });
});
