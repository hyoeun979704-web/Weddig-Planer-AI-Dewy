import { getPlatform } from "@/lib/platform";

// 결제수단 분기 단일 진입점. 웹=카카오페이(redirect), 네이티브(Android=Google Play / iOS=App Store)=IAP.
// 설계: docs/260620_payment_compliance_plan.md §3. iOS 셋업: docs/260622_apple_iap_setup.md.
export type PaymentProvider = "kakao" | "iap" | "unavailable";

export function getPaymentProvider(): PaymentProvider {
  switch (getPlatform()) {
    case "web":
      return "kakao";
    case "android":
    case "ios":
      return "iap";
    default:
      return "unavailable"; // 알 수 없는 플랫폼 — 결제 UI 숨김(anti-steering 안전기본값).
  }
}

/** IAP 결제 CTA·안내에 쓰는 스토어 표시명(플랫폼별). */
export const iapStoreName = (): string => (getPlatform() === "ios" ? "App Store" : "Google Play");

export * from "./products";
export {
  isIapAvailable,
  initIapStore,
  purchaseHeartsIap,
  purchaseSubscriptionIap,
  restoreIapPurchases,
  type PurchaseResult,
} from "./iap";
