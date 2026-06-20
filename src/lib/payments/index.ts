import { getPlatform } from "@/lib/platform";

// 결제수단 분기 단일 진입점. 웹=카카오페이(redirect), 안드로이드=Google IAP,
// iOS=미지원(준비중 — StoreKit 후속). 설계: docs/260620_payment_compliance_plan.md §3.
export type PaymentProvider = "kakao" | "iap" | "unavailable";

export function getPaymentProvider(): PaymentProvider {
  switch (getPlatform()) {
    case "web":
      return "kakao";
    case "android":
      return "iap";
    case "ios":
    default:
      return "unavailable"; // iOS IAP 선반영 전까지 결제 UI 숨김(anti-steering).
  }
}

export * from "./products";
export {
  isIapAvailable,
  initIapStore,
  purchaseHeartsIap,
  purchaseSubscriptionIap,
  restoreIapPurchases,
  type PurchaseResult,
} from "./iap";
