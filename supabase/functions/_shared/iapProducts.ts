// IAP 상품 정의 — **서버 진실원천**(클라가 보낸 금액·하트수 불신, productId 만 받아 서버가 매핑).
// ⚠️ 클라 `src/lib/payments/products.ts`·`src/lib/heartPackages.ts` 와 값이 일치해야 한다(드리프트 주의).
// Deno 엣지는 클라 TS 를 import 할 수 없어 별도 사본을 둔다. 설계: docs/260620_payment_compliance_plan.md §2-3.

export const SUBSCRIPTION_PRODUCT_ID = "dewy_premium";

// Google 상품ID → 하트 packageId·지급 하트수.
export const HEART_BY_PRODUCT: Record<string, { packageId: string; hearts: number }> = {
  hearts_starter: { packageId: "starter", hearts: 10 },
  hearts_basic: { packageId: "basic", hearts: 30 },
  hearts_popular: { packageId: "popular", hearts: 70 },
  hearts_value: { packageId: "value", hearts: 100 },
  hearts_premium: { packageId: "premium", hearts: 150 },
};

// base plan ID → 구독 plan·웹가(정산 참고)·기간(개월).
export const SUB_PLANS: Record<string, { plan: "monthly" | "yearly"; webPrice: number; months: number }> = {
  monthly: { plan: "monthly", webPrice: 4900, months: 1 },
  yearly: { plan: "yearly", webPrice: 39000, months: 12 },
};

// 초기 이용자 보너스 하트(구독) — kakao-pay-approve 와 동일 규칙(early_bird).
export const EARLY_BIRD_END = new Date("2026-08-01T00:00:00+09:00").getTime();
export const SUB_EARLY_BIRD: Record<string, { amount: number; reason: string }> = {
  monthly: { amount: 10, reason: "early_bird_monthly" },
  yearly: { amount: 180, reason: "early_bird_yearly" },
};

// Apple App Store 구독 상품ID → plan(서버 진실원천). Google 의 base plan 대신 상품ID 자체가 기간이다.
// ⚠️ 클라 `src/lib/payments/products.ts` APPLE_SUBSCRIPTION_PRODUCT_IDS 와 1:1 일치해야 한다.
export const APPLE_SUB_BY_PRODUCT: Record<string, { plan: "monthly" | "yearly"; webPrice: number; months: number }> = {
  dewy_premium_monthly: SUB_PLANS.monthly,
  dewy_premium_yearly: SUB_PLANS.yearly,
};

// Apple 구독 상품ID → early-bird 보너스(plan 기준 동일 규칙).
export const APPLE_SUB_EARLY_BIRD: Record<string, { amount: number; reason: string }> = {
  dewy_premium_monthly: SUB_EARLY_BIRD.monthly,
  dewy_premium_yearly: SUB_EARLY_BIRD.yearly,
};
