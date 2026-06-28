export interface HeartPackage {
  id: string;
  price: number;
  hearts: number;
  label: string;
  description: string;
  firstOnly?: boolean;
  highlight?: boolean;
}

export const HEART_PACKAGES: HeartPackage[] = [
  { id: "starter", price: 1900, hearts: 10, label: "첫 충전 특전", description: "신규 사용자 1회 한정", firstOnly: true },
  { id: "basic", price: 4900, hearts: 30, label: "베이직", description: "피팅 6회 가능" },
  { id: "popular", price: 9900, hearts: 70, label: "인기", description: "피팅 14회 가능", highlight: true },
  { id: "value", price: 13900, hearts: 100, label: "실속", description: "피팅 20회 가능" },
  { id: "premium", price: 19900, hearts: 150, label: "프리미엄", description: "피팅 30회 · 최대 할인" },
];

export const POINT_TO_KRW = 0.2; // 1P = 0.2원
export const POINT_DISCOUNT_MAX = 0.5; // 결제액의 50% 한도

export const krwForPoints = (points: number): number => Math.floor(points * POINT_TO_KRW);

export const pointsForKrw = (krw: number): number => Math.ceil(krw / POINT_TO_KRW);

export const maxPointsForPackage = (packagePrice: number, balance: number): number => {
  const maxKrwDiscount = Math.floor(packagePrice * POINT_DISCOUNT_MAX);
  const maxPointsByLimit = pointsForKrw(maxKrwDiscount);
  return Math.min(maxPointsByLimit, balance);
};

// ── 인앱결제(IAP) 단가 ────────────────────────────────────────────────
// 웹(카카오페이) 원화가가 원천. 네이티브(Google Play·App Store) IAP 는 스토어 수수료를
// 흡수하기 위해 **웹가 +10%**. 파생 계산이라 웹가만 고치면 IAP 가도 따라감(드리프트 방지).
// ⚠️ 스토어 가격포인트에 맞춰 추가 반올림이 필요할 수 있음(특히 Apple). 최종 등록가는
// Play Console / App Store Connect 상품가와 일치시켜야 한다.
export const IAP_FEE_RATE = 0.10;

/** 웹 원화가 → 네이티브 IAP 원화가(+10%, 1원 단위 반올림). */
export const iapPriceForKrw = (webPrice: number): number =>
  Math.round(webPrice * (1 + IAP_FEE_RATE));

