import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient } from "../_shared/supabase.ts";

// 디자인 구매 결제 승인(카카오페이). orders.total_amount 를 진실 금액으로 검증, 멱등(payment_key=tid).
// 승인 성공 시 포인트 차감(spend_points·서버 전용) + design_purchases 라이선스 grant.
// design-purchase-ready 의 후속. 설계: docs/260616_invitation_design_marketplace.md.

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
    const admin = adminClient();
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { tid, partnerOrderId, partnerUserId, pgToken } = (await req.json()) as {
      tid: string; partnerOrderId: string; partnerUserId: string; pgToken: string;
    };
    if (!tid || !partnerOrderId || !partnerUserId || !pgToken) return json({ error: "Missing required fields" }, 400);
    if (partnerUserId !== userId) return json({ error: "User mismatch" }, 403);

    // 멱등 — 이미 처리된 tid.
    const { data: existing } = await admin.from("payments").select("id").eq("payment_key", tid).maybeSingle();
    if (existing) return json({ success: true, alreadyProcessed: true });

    const { data: order } = await admin
      .from("orders").select("id, total_amount, status").eq("order_number", partnerOrderId).eq("user_id", userId).maybeSingle();
    if (!order) return json({ error: "주문을 찾을 수 없어요." }, 404);
    if (order.status === "paid") return json({ success: true, alreadyProcessed: true });
    const trustedAmount = order.total_amount as number;

    const { data: intent } = await admin
      .from("design_purchase_intents").select("design_id, points_used").eq("order_number", partnerOrderId).maybeSingle();
    if (!intent) return json({ error: "구매 정보를 찾을 수 없어요." }, 404);

    const adminKey = Deno.env.get("KAKAO_ADMIN_KEY");
    const cid = Deno.env.get("KAKAO_CID") || "TC0ONETIME";
    if (!adminKey) return json({ error: "KAKAO_ADMIN_KEY is not configured" }, 500);

    const approveRes = await fetch("https://kapi.kakao.com/v1/payment/approve", {
      method: "POST",
      headers: { Authorization: `KakaoAK ${adminKey}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({ cid, tid, partner_order_id: partnerOrderId, partner_user_id: partnerUserId, pg_token: pgToken }).toString(),
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok) return json({ success: false, error: approveData.msg || "결제 승인 실패", code: approveData.code });

    const paidAmount: number = approveData?.amount?.total ?? 0;
    if (paidAmount !== trustedAmount) {
      console.error("Design amount mismatch:", { partnerOrderId, trustedAmount, paidAmount });
      try {
        await fetch("https://kapi.kakao.com/v1/payment/cancel", {
          method: "POST",
          headers: { Authorization: `KakaoAK ${adminKey}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
          body: new URLSearchParams({ cid, tid, cancel_amount: String(paidAmount), cancel_tax_free_amount: "0" }).toString(),
        });
      } catch (e) { console.error("mismatch refund failed:", e); }
      return json({ success: false, error: "결제 금액이 일치하지 않습니다." });
    }

    // 결제 기록(멱등 키) — 먼저 확정해 중복 grant 방지.
    const { error: payErr } = await admin.from("payments").insert({
      user_id: userId, order_id: order.id, payment_key: tid, order_number: partnerOrderId,
      amount: paidAmount, status: "approved", method: "kakaopay",
      approved_at: approveData.approved_at || new Date().toISOString(), raw_response: approveData,
    });
    if (payErr) return json({ success: true, alreadyProcessed: true }); // UNIQUE(payment_key) 동시처리

    await admin.from("orders").update({ status: "paid" }).eq("id", order.id);

    // 포인트 할인분 차감(서버 전용 RPC). 실패해도 결제는 유효 → 경고만(중복차감 방지 위해 best-effort).
    if (intent.points_used > 0) {
      const { error: spErr } = await admin.rpc("spend_points", {
        p_user_id: userId, p_amount: intent.points_used, p_reason: "design_purchase", p_ref_id: order.id,
      });
      if (spErr) console.error("spend_points failed (design)", spErr);
    }

    // 라이선스 grant(멱등 — unique(user_id, design_id)). 적용 수수료(초기 0% → 이후 제휴 3%) 기록.
    let commissionBps = 0;
    const { data: dz } = await admin.from("designer_designs").select("designer_user_id").eq("id", intent.design_id).maybeSingle();
    if (dz?.designer_user_id) {
      const { data: bp } = await admin.from("business_profiles").select("commission_rate_bps").eq("user_id", dz.designer_user_id).maybeSingle();
      commissionBps = (bp?.commission_rate_bps as number) ?? 0;
    }
    const commissionAmount = Math.floor((paidAmount * commissionBps) / 10000);

    const { error: grantErr } = await admin.from("design_purchases").insert({
      user_id: userId, design_id: intent.design_id, amount: paidAmount, points_used: intent.points_used, order_ref: tid,
      commission_bps: commissionBps, commission_amount: commissionAmount,
    });
    if (grantErr) console.error("design_purchases grant failed", grantErr);

    return json({ success: true, order_number: partnerOrderId, design_id: intent.design_id });
  } catch (e) {
    console.error("design-purchase-approve error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
