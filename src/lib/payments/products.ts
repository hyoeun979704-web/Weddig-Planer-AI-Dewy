import { HEART_PACKAGES, iapPriceForKrw, type HeartPackage } from "@/lib/heartPackages";

// ── Google Play 인앱상품(IAP) 상품ID 매핑 — 단일 소스 ─────────────────────────
// ⚠️ 상품ID는 Play Console 등록 후 **변경 불가**. 코드와 콘솔을 1:1로 고정한다.
// 가격은 웹가 +10%(`iapPriceForKrw`, 스토어 수수료 흡수) — 표시·검증용이고 실제 청구가는
// 콘솔 등록가다. 등록 절차: docs/260620_google_iap_setup.md. 설계: 260620_payment_compliance_plan §2-3.

export const ANDROID_PACKAGE_NAME = "app.dewy"; // capacitor.config appId 와 동일.

// 하트 = 소비성(consumable). 웹 packageId(starter…) ↔ Google 상품ID.
export const HEART_PRODUCT_IDS: Record<string, string> = {
  starter: "hearts_starter",
  basic: "hearts_basic",
  popular: "hearts_popular",
  value: "hearts_value",
  premium: "hearts_premium",
};

// 구독 = 자동갱신(auto-renewable). 단일 구독 상품 + 기본요금제(base plan)로 월/년 구분.
// 무료체험(trial)은 별도 상품이 아니라 월간 base plan 의 스토어 네이티브 무료체험 offer 사용.
export const SUBSCRIPTION_PRODUCT_ID = "dewy_premium";
export const SUBSCRIPTION_BASE_PLANS = {
  monthly: "monthly",
  yearly: "yearly",
} as const;
export type SubscriptionType = "trial" | "monthly" | "yearly";

/** 구독 type → Google base plan ID. trial 은 월간 base plan(무료체험 offer)으로 매핑. */
export const basePlanForType = (type: SubscriptionType): string =>
  type === "yearly" ? SUBSCRIPTION_BASE_PLANS.yearly : SUBSCRIPTION_BASE_PLANS.monthly;

// ── Apple App Store 구독 상품ID ──────────────────────────────────────────────
// Apple 은 Google 의 'base plan' 개념이 없어 기간별로 **별도 자동갱신 상품**을 둔다
// (한 구독 그룹 'dewy_premium' 안에 월/년 두 상품). 하트(소비성)는 양 스토어 동일 ID(`hearts_*`) 재사용.
// ⚠️ App Store Connect 등록 후 변경 불가 — 서버 `_shared/iapProducts.ts` APPLE_SUB_BY_PRODUCT 와 1:1.
export const APPLE_SUBSCRIPTION_PRODUCT_IDS = {
  monthly: "dewy_premium_monthly",
  yearly: "dewy_premium_yearly",
} as const;

/** 구독 type → Apple 상품ID. trial 은 월간 상품(스토어 네이티브 무료체험 intro offer)으로 매핑. */
export const appleSubscriptionProductId = (type: SubscriptionType): string =>
  type === "yearly" ? APPLE_SUBSCRIPTION_PRODUCT_IDS.yearly : APPLE_SUBSCRIPTION_PRODUCT_IDS.monthly;

/** Apple store.register 용 — 하트 5 + 구독 2(월/년). */
export const allAppleProductIds = (): string[] => [
  ...Object.values(HEART_PRODUCT_IDS),
  ...Object.values(APPLE_SUBSCRIPTION_PRODUCT_IDS),
];

const APPLE_SUB_ID_SET = new Set<string>(Object.values(APPLE_SUBSCRIPTION_PRODUCT_IDS));

/** 상품ID 가 구독 상품인지(양 스토어 공통 판별). */
export const isSubscriptionProductId = (productId: string): boolean =>
  productId === SUBSCRIPTION_PRODUCT_ID || APPLE_SUB_ID_SET.has(productId);

/** 하트 packageId 로 HeartPackage 조회. 없으면 null. */
export const heartPackageById = (packageId: string): HeartPackage | null =>
  HEART_PACKAGES.find((p) => p.id === packageId) ?? null;

/** 하트 packageId 의 IAP 표시가(웹가 +10%). 알 수 없는 id 는 0. */
export const heartIapPrice = (packageId: string): number => {
  const pkg = heartPackageById(packageId);
  return pkg ? iapPriceForKrw(pkg.price) : 0;
};

/** 구독 type 의 IAP 표시가(웹가 +10%). trial 은 0(무료체험). */
export const subscriptionIapPrice = (type: SubscriptionType): number => {
  if (type === "trial") return 0;
  const webPrice = type === "yearly" ? 39000 : 4900;
  return iapPriceForKrw(webPrice);
};

/** store.register 용 — 모든 IAP 상품ID(하트 5 + 구독 1). */
export const allProductIds = (): string[] => [
  ...Object.values(HEART_PRODUCT_IDS),
  SUBSCRIPTION_PRODUCT_ID,
];

/** Google 상품ID → 하트 packageId 역매핑(서버 검증·표시 보조). 없으면 null. */
export const heartPackageIdForProduct = (productId: string): string | null => {
  const entry = Object.entries(HEART_PRODUCT_IDS).find(([, v]) => v === productId);
  return entry ? entry[0] : null;
};
