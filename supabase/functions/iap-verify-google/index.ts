import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient } from "../_shared/supabase.ts";
import { getProductPurchase, getSubscriptionPurchaseV2 } from "../_shared/googlePlay.ts";
import {
  HEART_BY_PRODUCT,
  SUBSCRIPTION_PRODUCT_ID,
  SUB_PLANS,
  SUB_EARLY_BIRD,
  EARLY_BIRD_END,
} from "../_shared/iapProducts.ts";

// Google Play IAP 영수증검증 — 클라가 보낸 purchaseToken 을 서버가 Play Developer API 로 검증하고
// **여기서만** 하트 지급 / 구독 활성(멱등: iap_transactions.store_txn_id UNIQUE). 클라 금액·하트 불신.
// 소비성 consume·구독 acknowledge 는 클라 빌링 라이브러리 finish() 가 처리. 설계: 260620_payment_compliance_plan §3.

const PACKAGE_NAME = Deno.env.get("ANDROID_PACKAGE_NAME") || "app.dewy";
const PLATFORM = "android";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { productId, purchaseToken, kind } = (await req.json()) as {
      productId: string; purchaseToken: string; kind: "hearts" | "subscription";
    };
    if (!productId || !purchaseToken) return json({ error: "Invalid request" }, 400);

    const admin = adminClient();

    // 멱등 — 이미 검증·지급된 토큰.
    const { data: existing } = await admin
      .from("iap_transactions").select("id, kind, amount").eq("platform", PLATFORM).eq("store_txn_id", purchaseToken).maybeSingle();
    if (existing) return json({ success: true, alreadyProcessed: true });

    // ── 하트(소비성) ───────────────────────────────────────────────
    if (kind === "hearts" || HEART_BY_PRODUCT[productId]) {
      const def = HEART_BY_PRODUCT[productId];
      if (!def) return json({ error: "알 수 없는 상품이에요." }, 400);

      const v = await getProductPurchase(PACKAGE_NAME, productId, purchaseToken);
      if (!v.ok) return json({ success: false, error: "구매를 확인하지 못했어요.", status: v.status });
      // purchaseState: 0=구매완료, 1=취소, 2=보류.
      if ((v.data.purchaseState as number) !== 0) return json({ success: false, error: "완료되지 않은 결제예요." });
      // 부정사용 바인딩 — 구매 시 넣은 obfuscatedAccountId 가 있으면 현재 user 와 대조.
      const boundId = v.data.obfuscatedExternalAccountId as string | undefined;
      if (boundId && boundId !== userId) return json({ error: "User mismatch" }, 403);

      // 첫 충전 한정(starter): 웹·IAP 통틀어 평생 1회. 웹과 동일 reason(charge_starter)으로 지급해
      // 기존 partial UNIQUE(heart_transactions_charge_starter_once)가 최종(레이스 포함) 가드가 된다.
      // 이미 받았으면 여기서 거부 — 원장(iap_transactions)을 기록하지 않으므로 클라가 finish()(consume)
      // 하지 않고, 소비되지 않은 소비성 결제는 Google 이 3일 내 자동 환불한다. (웹 kakao-pay-charge-ready 와 동일 정책)
      const heartReason = def.packageId === "starter" ? "charge_starter" : `iap_${def.packageId}`;
      if (def.packageId === "starter") {
        const { data: prior } = await admin
          .from("heart_transactions").select("id").eq("user_id", userId).eq("reason", "charge_starter").limit(1);
        if (prior && prior.length > 0) {
          return json({ success: false, error: "첫 충전 특전은 1회만 받을 수 있어요." });
        }
      }

      // 원장 기록(멱등 키) — 먼저 확정해 중복 지급 방지.
      const { error: txErr } = await admin.from("iap_transactions").insert({
        user_id: userId, platform: PLATFORM, product_id: productId, store_txn_id: purchaseToken,
        kind: "hearts", status: "verified", raw: v.data,
      });
      if (txErr) {
        // UNIQUE 위반(23505)만 "이미 처리"로 간주. 그 외 DB 오류를 성공으로 가리면
        // 결제됐는데 하트 미지급이 되므로 500 실패 반환(클라가 재시도).
        if ((txErr as { code?: string }).code === "23505") return json({ success: true, alreadyProcessed: true });
        console.error("iap_transactions insert failed (hearts)", txErr);
        return json({ success: false, error: "처리에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
      }

      const { error: earnErr } = await admin.rpc("earn_hearts", {
        p_user_id: userId, p_amount: def.hearts, p_reason: heartReason, p_ref_id: null,
      });
      if (earnErr) {
        // 지급 실패 — 원장을 롤백(소비성 미consume → Google 자동환불, 중복지급은 UNIQUE 가 여전히 차단).
        console.error("earn_hearts failed (iap), rolling back ledger", earnErr);
        await admin.from("iap_transactions").delete().eq("platform", PLATFORM).eq("store_txn_id", purchaseToken);
        // starter 평생 1회 제약 위반(동시 결제 레이스)은 재시도 무의미 → 명확한 안내.
        const starterDup = (earnErr.message || "").includes("heart_transactions_charge_starter_once");
        return json(
          { success: false, error: starterDup ? "첫 충전 특전은 1회만 받을 수 있어요." : "지급 처리에 실패했어요. 잠시 후 다시 시도해 주세요." },
          starterDup ? 200 : 500,
        );
      }
      return json({ success: true, heartsGranted: def.hearts });
    }

    // ── 구독(자동갱신) ─────────────────────────────────────────────
    if (productId !== SUBSCRIPTION_PRODUCT_ID) return json({ error: "알 수 없는 상품이에요." }, 400);

    const v = await getSubscriptionPurchaseV2(PACKAGE_NAME, purchaseToken);
    if (!v.ok) return json({ success: false, error: "구독을 확인하지 못했어요.", status: v.status });
    const state = v.data.subscriptionState as string;
    const ACTIVE = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"];
    if (!ACTIVE.includes(state)) return json({ success: false, error: "활성 구독이 아니에요.", state });

    const ext = v.data.externalAccountIdentifiers as { obfuscatedExternalAccountId?: string } | undefined;
    if (ext?.obfuscatedExternalAccountId && ext.obfuscatedExternalAccountId !== userId) {
      return json({ error: "User mismatch" }, 403);
    }

    const lineItems = (v.data.lineItems as Array<Record<string, unknown>>) ?? [];
    const li = lineItems[0] ?? {};
    const offerDetails = (li.offerDetails as { basePlanId?: string }) ?? {};
    const basePlanId = offerDetails.basePlanId ?? "monthly";
    const planDef = SUB_PLANS[basePlanId] ?? SUB_PLANS.monthly;
    const expiry = (li.expiryTime as string) ?? null;

    const { error: txErr } = await admin.from("iap_transactions").insert({
      user_id: userId, platform: PLATFORM, product_id: productId, store_txn_id: purchaseToken,
      kind: "subscription", status: "verified", amount: planDef.webPrice, raw: v.data,
    });
    if (txErr) {
      if ((txErr as { code?: string }).code === "23505") return json({ success: true, alreadyProcessed: true });
      console.error("iap_transactions insert failed (subscription)", txErr);
      return json({ success: false, error: "처리에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
    }

    // 구독 활성 — user_id UNIQUE upsert. 토큰을 payment_id 에 보관(RTDN 토큰→user 역조회용).
    const { error: subErr } = await admin.from("subscriptions").upsert({
      user_id: userId, plan: planDef.plan, status: "active", price: planDef.webPrice,
      started_at: new Date().toISOString(), expires_at: expiry, next_billing_at: expiry,
      cancelled_at: null, payment_method: "google_play", payment_id: purchaseToken,
    }, { onConflict: "user_id" });
    if (subErr) {
      // 구독 활성화 실패 — 원장 롤백해 재시도 가능하게.
      console.error("subscription upsert failed (iap), rolling back ledger", subErr);
      await admin.from("iap_transactions").delete().eq("platform", PLATFORM).eq("store_txn_id", purchaseToken);
      return json({ success: false, error: "구독 활성화에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
    }

    // 초기 이용자 보너스 하트(최초 검증 1회만 — iap_transactions 가 멱등 보장).
    let heartsGranted = 0;
    const eb = SUB_EARLY_BIRD[basePlanId];
    if (eb && Date.now() < EARLY_BIRD_END) {
      const { error: ebErr } = await admin.rpc("earn_hearts", {
        p_user_id: userId, p_amount: eb.amount, p_reason: eb.reason, p_ref_id: null,
      });
      if (ebErr) console.error("early-bird earn_hearts failed (iap)", ebErr);
      else heartsGranted = eb.amount;
    }
    return json({ success: true, plan: planDef.plan, heartsGranted });
  } catch (e) {
    console.error("iap-verify-google error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
