import { supabase } from "@/integrations/supabase/client";
import { getPlatform } from "@/lib/platform";
import {
  allProductIds,
  allAppleProductIds,
  HEART_PRODUCT_IDS,
  SUBSCRIPTION_PRODUCT_ID,
  APPLE_SUBSCRIPTION_PRODUCT_IDS,
  appleSubscriptionProductId,
  basePlanForType,
  isSubscriptionProductId,
  type SubscriptionType,
} from "./products";

// ── 네이티브 인앱결제(IAP) 엔진 — CdvPurchase(cordova-plugin-purchase v13) 래퍼 ──
// Android=Google Play / iOS=App Store 를 한 코드에서 분기한다(플러그인이 양 스토어 지원).
// 웹 번들을 깨지 않으려고 정적 import 대신 전역(window.CdvPurchase)으로 접근한다(네이티브에서만 존재).
// 서버가 단일 진실원천: 구매 승인(approved) → 서버 영수증검증(iap-verify-google|apple)에서만 하트/구독을
// 지급하고, 성공 후에만 transaction.finish()(소비성 consume/구독 acknowledge). 클라 결과는 신뢰하지 않음.
// ⚠️ 실제 동작은 실기기 + 스토어 샌드박스(Apple)/라이선스 테스터(Google)에서만 검증 가능(컨테이너 불가).
// 설계: docs/260620_payment_compliance_plan.md, 등록: docs/260620_google_iap_setup.md(Android)·
// docs/260622_apple_iap_setup.md(iOS).

// CdvPurchase 전역 최소 타입(플러그인 미설치 환경에서 빌드되도록 any 기반 얇은 정의).
interface CdvTransaction {
  products: { id: string }[];
  transactionId?: string;
  nativePurchase?: { purchaseToken?: string; orderId?: string };
  finish: () => void;
}
interface CdvOffer { id?: string; order: () => Promise<unknown>; }
interface CdvProduct { id: string; offers: CdvOffer[]; getOffer: () => CdvOffer | undefined; }
interface CdvStore {
  register: (defs: { id: string; type: string; platform: string }[]) => void;
  when: () => {
    approved: (cb: (t: CdvTransaction) => void) => { finished: (cb: (t: CdvTransaction) => void) => unknown };
  };
  initialize: (platforms: string[]) => Promise<void>;
  update: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  get: (id: string, platform?: string) => CdvProduct | undefined;
  applicationUsername?: string;
}
interface CdvNamespace {
  store: CdvStore;
  ProductType: { CONSUMABLE: string; PAID_SUBSCRIPTION: string };
  Platform: { GOOGLE_PLAY: string; APPLE_APPSTORE: string };
}

const getCdv = (): CdvNamespace | null => {
  if (typeof window === "undefined") return null;
  return (window as unknown as { CdvPurchase?: CdvNamespace }).CdvPurchase ?? null;
};

const isIos = (): boolean => getPlatform() === "ios";

/** 현재 플랫폼의 CdvPurchase 스토어 platform 상수(iOS=App Store / 그 외=Google Play). */
const storePlatform = (cdv: CdvNamespace): string =>
  isIos() ? cdv.Platform.APPLE_APPSTORE : cdv.Platform.GOOGLE_PLAY;

/** 네이티브(Android·iOS) + 플러그인 존재 시에만 IAP 사용 가능. */
export const isIapAvailable = (): boolean => {
  const p = getPlatform();
  return (p === "android" || p === "ios") && !!getCdv();
};

let initialized = false;
// productId 별 진행 중인 구매 promise 해소기(approved→verify→finished 흐름을 await 로 잇기).
const pending = new Map<string, { resolve: (r: PurchaseResult) => void; reject: (e: Error) => void }>();

export interface PurchaseResult {
  ok: boolean;
  heartsGranted?: number;
  message?: string;
}

// 서버 영수증검증 — 이 함수만 하트/구독을 지급(멱등). 성공 시 transaction.finish() 허용.
async function verifyOnServer(t: CdvTransaction): Promise<PurchaseResult> {
  const productId = t.products?.[0]?.id;
  if (!productId) return { ok: false, message: "구매 정보를 읽지 못했어요." };
  const kind = isSubscriptionProductId(productId) ? "subscription" : "hearts";

  if (isIos()) {
    // Apple: App Store transaction id 를 서버가 App Store Server API 로 검증.
    const transactionId = t.transactionId ?? t.nativePurchase?.orderId;
    if (!transactionId) return { ok: false, message: "구매 정보를 읽지 못했어요." };
    const { data, error } = await supabase.functions.invoke("iap-verify-apple", {
      body: { productId, transactionId, kind },
    });
    if (error || !data?.success) return { ok: false, message: data?.error || error?.message || "결제 검증 실패" };
    return { ok: true, heartsGranted: data.heartsGranted };
  }

  // Google: purchaseToken 을 서버가 Play Developer API 로 검증.
  const purchaseToken = t.nativePurchase?.purchaseToken;
  if (!purchaseToken) return { ok: false, message: "구매 정보를 읽지 못했어요." };
  const { data, error } = await supabase.functions.invoke("iap-verify-google", {
    body: { productId, purchaseToken, kind, orderId: t.nativePurchase?.orderId ?? t.transactionId },
  });
  if (error || !data?.success) return { ok: false, message: data?.error || error?.message || "결제 검증 실패" };
  return { ok: true, heartsGranted: data.heartsGranted };
}

/** IAP 스토어 1회 초기화 — 상품 등록 + 검증/완료 핸들러 연결. userId 를 구매에 바인딩(부정사용 방지). */
export async function initIapStore(userId: string): Promise<void> {
  const cdv = getCdv();
  if (!cdv) throw new Error("결제 모듈을 사용할 수 없어요.");
  if (initialized) {
    cdv.store.applicationUsername = userId;
    return;
  }
  const { store, ProductType } = cdv;
  // 구매를 user 에 바인딩(부정사용 방지) — Google=obfuscatedAccountId / Apple=appAccountToken 로 전달.
  store.applicationUsername = userId;

  const platform = storePlatform(cdv);
  // 플랫폼별 상품 집합: iOS=하트5+구독2(월/년 별도 상품) / Android=하트5+구독1(base plan).
  const productIds = isIos() ? allAppleProductIds() : allProductIds();
  const subIds = new Set<string>(
    isIos() ? Object.values(APPLE_SUBSCRIPTION_PRODUCT_IDS) : [SUBSCRIPTION_PRODUCT_ID],
  );

  store.register(
    productIds.map((id) => ({
      id,
      type: subIds.has(id) ? ProductType.PAID_SUBSCRIPTION : ProductType.CONSUMABLE,
      platform,
    })),
  );

  store
    .when()
    .approved((t) => {
      // 승인됨 → 서버 검증. 성공해야만 finish(소비/확인). 실패면 finish 안 함(재시도/환불 여지).
      void (async () => {
        const productId = t.products?.[0]?.id ?? "";
        try {
          const result = await verifyOnServer(t);
          // 결과를 finish() 전에 보관 — finish 가 동기로 finished 를 트리거해도
          // finished 가 검증 결과를 확실히 집어가게(없을 때 성공으로 오인 방지).
          lastVerified.set(productId, result);
          if (result.ok) {
            t.finish();
            // finish→finished 이벤트에서 resolve. (finish 가 동기여도 finished 가 뒤따름.)
          } else {
            pending.get(productId)?.reject(new Error(result.message || "결제 검증 실패"));
            pending.delete(productId);
          }
        } catch (e) {
          pending.get(productId)?.reject(e instanceof Error ? e : new Error("결제 처리 중 오류"));
          pending.delete(productId);
        }
      })();
    })
    .finished((t) => {
      const productId = t.products?.[0]?.id ?? "";
      // 검증 결과가 없으면(예: 복원·재전송) 성공으로 오인하지 않게 ok:false 기본값.
      // 서버가 단일 진실원천이라 실제 지급은 영향 없고, UX 만 거짓 성공을 막는다.
      const result = lastVerified.get(productId) ?? { ok: false, message: "결제 확인 정보를 찾지 못했어요." };
      lastVerified.delete(productId);
      pending.get(productId)?.resolve(result);
      pending.delete(productId);
    });

  await store.initialize([platform]);
  initialized = true;
}

const lastVerified = new Map<string, PurchaseResult>();

// 진행 중 구매를 promise 로 감싸 await. 동일 상품 중복 주문 방지.
function awaitPurchase(productId: string, order: () => Promise<unknown>): Promise<PurchaseResult> {
  if (pending.has(productId)) return Promise.reject(new Error("이미 결제가 진행 중이에요."));
  return new Promise<PurchaseResult>((resolve, reject) => {
    pending.set(productId, { resolve, reject });
    order().catch((e) => {
      // 주문 시작 자체 실패(취소 포함) — pending 정리.
      pending.delete(productId);
      reject(e instanceof Error ? e : new Error("결제를 시작하지 못했어요."));
    });
    // 안전장치: 5분 후 미해소면 타임아웃 정리.
    setTimeout(() => {
      if (pending.has(productId)) {
        pending.delete(productId);
        reject(new Error("결제 응답이 없어 종료했어요. 구매내역을 확인해주세요."));
      }
    }, 5 * 60 * 1000);
  });
}

/** 하트 패키지 IAP 구매(소비성). userId 로 사전 초기화 필요. */
export async function purchaseHeartsIap(userId: string, packageId: string): Promise<PurchaseResult> {
  const cdv = getCdv();
  if (!cdv) throw new Error("결제 모듈을 사용할 수 없어요.");
  await initIapStore(userId);
  const productId = HEART_PRODUCT_IDS[packageId];
  if (!productId) throw new Error("알 수 없는 상품이에요.");
  const product = cdv.store.get(productId, storePlatform(cdv));
  const offer = product?.getOffer();
  if (!offer) throw new Error("상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
  return awaitPurchase(productId, () => offer.order());
}

/** 구독 IAP 구매(자동갱신). iOS=기간별 상품 / Android=단일 상품+base plan. trial 은 월간(무료체험 offer). */
export async function purchaseSubscriptionIap(userId: string, type: SubscriptionType): Promise<PurchaseResult> {
  const cdv = getCdv();
  if (!cdv) throw new Error("결제 모듈을 사용할 수 없어요.");
  await initIapStore(userId);

  if (isIos()) {
    // Apple: 기간이 곧 상품(월/년). trial 은 월간 상품의 스토어 네이티브 무료체험 intro offer.
    const productId = appleSubscriptionProductId(type);
    const product = cdv.store.get(productId, storePlatform(cdv));
    if (!product) throw new Error("구독 상품을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    const offer = product.getOffer();
    if (!offer) throw new Error("구독 요금제 정보를 불러오지 못했어요.");
    return awaitPurchase(productId, () => offer.order());
  }

  // Google: 단일 구독 상품 + base plan offer 선택.
  const product = cdv.store.get(SUBSCRIPTION_PRODUCT_ID, storePlatform(cdv));
  if (!product) throw new Error("구독 상품을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
  const basePlan = basePlanForType(type);
  // base plan ID 가 offer.id 에 포함된 offer 선택, 없으면 첫 offer.
  const offer = product.offers.find((o) => (o.id ?? "").includes(basePlan)) ?? product.getOffer();
  if (!offer) throw new Error("구독 요금제 정보를 불러오지 못했어요.");
  return awaitPurchase(SUBSCRIPTION_PRODUCT_ID, () => offer.order());
}

/** 구매 복원(기기 변경·재설치 후 구독 상태 동기화). 서버가 webhook/검증으로 entitlement 갱신. */
export async function restoreIapPurchases(userId: string): Promise<void> {
  const cdv = getCdv();
  if (!cdv) throw new Error("결제 모듈을 사용할 수 없어요.");
  await initIapStore(userId);
  await cdv.store.restorePurchases();
}
