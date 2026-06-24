import { getPlatform } from "@/lib/platform";

// 결제수단 분기 단일 진입점. 웹=카카오페이(redirect), 네이티브(Android=Google Play / iOS=App Store)=IAP.
// 설계: docs/260620_payment_compliance_plan.md §3. iOS 셋업: docs/260622_apple_iap_setup.md.
export type PaymentProvider = "kakao" | "iap" | "unavailable";

// v1.0 출시: iOS 는 App Store IAP 상품을 아직 등록·심사 첨부하지 않아 결제를 열지 않는다.
// → 결제 진입 CTA 전면 숨김(미작동 버튼=심사 반려, 준비중=dead-end 회피). ASC 상품 등록 후 true.
// (Android/웹은 영향 없음. 진입점들은 getPaymentProvider()==='unavailable' 로 숨김 처리.)
const IOS_IAP_RELEASED = false;

export function getPaymentProvider(): PaymentProvider {
  switch (getPlatform()) {
    case "web":
      return "kakao";
    case "ios":
      return IOS_IAP_RELEASED ? "iap" : "unavailable"; // v1.0: 미오픈 → 숨김
    case "android":
      return "iap";
    default:
      return "unavailable"; // 알 수 없는 플랫폼 — 결제 UI 숨김(anti-steering 안전기본값).
  }
}

/** 결제 진입 CTA(충전·구독·업그레이드)를 노출해도 되는지. unavailable 이면 전면 숨김. */
export const isPaymentEntryVisible = (): boolean => getPaymentProvider() !== "unavailable";

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
