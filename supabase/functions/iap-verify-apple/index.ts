import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient } from "../_shared/supabase.ts";
import { APPLE_BUNDLE_ID, getTransactionInfo, getSubscriptionStatus, APPLE_SUB_ACTIVE } from "../_shared/appStore.ts";
import {
  HEART_BY_PRODUCT,
  APPLE_SUB_BY_PRODUCT,
  APPLE_SUB_EARLY_BIRD,
  EARLY_BIRD_END,
} from "../_shared/iapProducts.ts";

// App Store IAP 영수증검증 — 클라가 보낸 transactionId 를 서버가 App Store Server API 로 검증하고
// **여기서만** 하트 지급 / 구독 활성(멱등: iap_transactions.store_txn_id UNIQUE). 클라 금액·하트 불신.
// 소비성 finish()·구독 처리는 클라 빌링 라이브러리가 수행. 설계: 260620_payment_compliance_plan §3,
// 등록: docs/260622_apple_iap_setup.md. iap-verify-google 과 동일 정책·원장을 공유한다.

const PLATFORM = "ios";

// appAccountToken(구매 시 바인딩한 user) ↔ 현재 user 대조. Apple 은 대소문자 무관 UUID.
function accountMatches(bound: string | undefined, userId: string): boolean {
  if (!bound) return true; // 토큰 미설정(구버전/일부 흐름) — 차단하지 않음(google obfuscated 와 동일).
  return bound.toLowerCase() === userId.toLowerCase();
}

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

    const { productId, transactionId } = (await req.json()) as {
      productId: string; transactionId: string; kind?: "hearts" | "subscription";
    };
    if (!productId || !transactionId) return json({ error: "Invalid request" }, 400);

    const admin = adminClient();

    // ── 하트(소비성) ───────────────────────────────────────────────
    if (HEART_BY_PRODUCT[productId]) {
      const def = HEART_BY_PRODUCT[productId];

      // 멱등 — 이 transaction 은 이미 검증·지급됨.
      const { data: existing } = await admin
        .from("iap_transactions").select("id").eq("platform", PLATFORM).eq("store_txn_id", transactionId).maybeSingle();
      if (existing) return json({ success: true, alreadyProcessed: true });

      const v = await getTransactionInfo(transactionId);
      if (!v.ok || !v.tx) return json({ success: false, error: "구매를 확인하지 못했어요.", status: v.status });
      const tx = v.tx;
      if (tx.bundleId && tx.bundleId !== APPLE_BUNDLE_ID) return json({ error: "Bundle mismatch" }, 403);
      if (tx.productId && tx.productId !== productId) return json({ success: false, error: "상품 정보가 일치하지 않아요." });
      if (tx.revocationDate) return json({ success: false, error: "환불된 결제예요." });
      if (!accountMatches(tx.appAccountToken, userId)) return json({ error: "User mismatch" }, 403);

      // 첫 충전 한정(starter): 웹·IAP·플랫폼 통틀어 평생 1회. 웹과 동일 reason 으로 partial UNIQUE 가 최종 가드.
      const heartReason = def.packageId === "starter" ? "charge_starter" : `iap_${def.packageId}`;
      if (def.packageId === "starter") {
        const { data: prior } = await admin
          .from("heart_transactions").select("id").eq("user_id", userId).eq("reason", "charge_starter").limit(1);
        if (prior && prior.length > 0) return json({ success: false, error: "첫 충전 특전은 1회만 받을 수 있어요." });
      }

      // 원장 기록(멱등 키) — 먼저 확정해 중복 지급 방지.
      const { error: txErr } = await admin.from("iap_transactions").insert({
        user_id: userId, platform: PLATFORM, product_id: productId, store_txn_id: transactionId,
        kind: "hearts", status: "verified", raw: tx as Record<string, unknown>,
      });
      if (txErr) {
        if ((txErr as { code?: string }).code === "23505") return json({ success: true, alreadyProcessed: true });
        console.error("iap_transactions insert failed (apple hearts)", txErr);
        return json({ success: false, error: "처리에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
      }

      const { error: earnErr } = await admin.rpc("earn_hearts", {
        p_user_id: userId, p_amount: def.hearts, p_reason: heartReason, p_ref_id: null,
      });
      if (earnErr) {
        // 지급 실패 — 원장 롤백(소비성 미consume → Apple 미청구/환불, 중복지급은 UNIQUE 가 차단).
        console.error("earn_hearts failed (apple iap), rolling back ledger", earnErr);
        await admin.from("iap_transactions").delete().eq("platform", PLATFORM).eq("store_txn_id", transactionId);
        const starterDup = (earnErr.message || "").includes("heart_transactions_charge_starter_once");
        return json(
          { success: false, error: starterDup ? "첫 충전 특전은 1회만 받을 수 있어요." : "지급 처리에 실패했어요. 잠시 후 다시 시도해 주세요." },
          starterDup ? 200 : 500,
        );
      }
      return json({ success: true, heartsGranted: def.hearts });
    }

    // ── 구독(자동갱신) ─────────────────────────────────────────────
    const planDef = APPLE_SUB_BY_PRODUCT[productId];
    if (!planDef) return json({ error: "알 수 없는 상품이에요." }, 400);

    const v = await getSubscriptionStatus(transactionId);
    if (!v.ok || !v.tx) return json({ success: false, error: "구독을 확인하지 못했어요.", status: v.status });
    const tx = v.tx;
    if (tx.bundleId && tx.bundleId !== APPLE_BUNDLE_ID) return json({ error: "Bundle mismatch" }, 403);
    if (typeof v.subStatus === "number" && !APPLE_SUB_ACTIVE.has(v.subStatus)) {
      return json({ success: false, error: "활성 구독이 아니에요.", state: v.subStatus });
    }
    if (!accountMatches(tx.appAccountToken, userId)) return json({ error: "User mismatch" }, 403);

    // 멱등 키 = originalTransactionId(갱신돼도 동일 — 서버알림 매핑과 공유).
    const origTxnId = tx.originalTransactionId || transactionId;
    const expiry = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null;

    const { data: existing } = await admin
      .from("iap_transactions").select("id").eq("platform", PLATFORM).eq("store_txn_id", origTxnId).maybeSingle();
    if (existing) return json({ success: true, alreadyProcessed: true });

    const { error: txErr } = await admin.from("iap_transactions").insert({
      user_id: userId, platform: PLATFORM, product_id: productId, store_txn_id: origTxnId,
      kind: "subscription", status: "verified", amount: planDef.webPrice, raw: tx as Record<string, unknown>,
    });
    if (txErr) {
      if ((txErr as { code?: string }).code === "23505") return json({ success: true, alreadyProcessed: true });
      console.error("iap_transactions insert failed (apple subscription)", txErr);
      return json({ success: false, error: "처리에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
    }

    // 구독 활성 — user_id UNIQUE upsert. payment_id=originalTransactionId(서버알림 역조회용).
    const { error: subErr } = await admin.from("subscriptions").upsert({
      user_id: userId, plan: planDef.plan, status: "active", price: planDef.webPrice,
      started_at: new Date().toISOString(), expires_at: expiry, next_billing_at: expiry,
      cancelled_at: null, payment_method: "app_store", payment_id: origTxnId,
    }, { onConflict: "user_id" });
    if (subErr) {
      console.error("subscription upsert failed (apple iap), rolling back ledger", subErr);
      await admin.from("iap_transactions").delete().eq("platform", PLATFORM).eq("store_txn_id", origTxnId);
      return json({ success: false, error: "구독 활성화에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
    }

    // 초기 이용자 보너스 하트(최초 검증 1회만 — iap_transactions 가 멱등 보장).
    let heartsGranted = 0;
    const eb = APPLE_SUB_EARLY_BIRD[productId];
    if (eb && Date.now() < EARLY_BIRD_END) {
      const { error: ebErr } = await admin.rpc("earn_hearts", {
        p_user_id: userId, p_amount: eb.amount, p_reason: eb.reason, p_ref_id: null,
      });
      if (ebErr) console.error("early-bird earn_hearts failed (apple iap)", ebErr);
      else heartsGranted = eb.amount;
    }
    return json({ success: true, plan: planDef.plan, heartsGranted });
  } catch (e) {
    console.error("iap-verify-apple error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
