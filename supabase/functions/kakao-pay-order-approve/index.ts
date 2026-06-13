import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient } from "../_shared/supabase.ts";

// 스토어 주문 결제 승인(카카오페이). 서버 DB(orders.total_amount)를 진실 금액으로 사용,
// 카카오 승인액과 불일치 시 자동 취소. 멱등성(payment_key=tid). kakao-pay-order-ready 의 후속.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = adminClient();
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { tid, partnerOrderId, partnerUserId, pgToken } = (await req.json()) as {
      tid: string; partnerOrderId: string; partnerUserId: string; pgToken: string;
    };
    if (!tid || !partnerOrderId || !partnerUserId || !pgToken) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (partnerUserId !== userId) {
      return new Response(JSON.stringify({ error: "User mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 멱등성 — 이미 처리된 tid
    const { data: existing } = await admin.from("payments").select("id").eq("payment_key", tid).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 진실 금액 — DB orders
    const { data: order } = await admin
      .from("orders").select("id,total_amount,status").eq("order_number", partnerOrderId).eq("user_id", userId).maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "주문을 찾을 수 없어요." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (order.status === "paid") {
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const trustedAmount = order.total_amount as number;

    const adminKey = Deno.env.get("KAKAO_ADMIN_KEY");
    const cid = Deno.env.get("KAKAO_CID") || "TC0ONETIME";
    if (!adminKey) {
      return new Response(JSON.stringify({ error: "KAKAO_ADMIN_KEY is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const approveRes = await fetch("https://kapi.kakao.com/v1/payment/approve", {
      method: "POST",
      headers: { Authorization: `KakaoAK ${adminKey}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({ cid, tid, partner_order_id: partnerOrderId, partner_user_id: partnerUserId, pg_token: pgToken }).toString(),
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok) {
      console.error("Kakao order-approve failed:", approveRes.status, JSON.stringify(approveData));
      return new Response(JSON.stringify({ success: false, error: approveData.msg || "결제 승인 실패", code: approveData.code }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const paidAmount: number = approveData?.amount?.total ?? 0;
    if (paidAmount !== trustedAmount) {
      console.error("Order amount mismatch:", { partnerOrderId, trustedAmount, paidAmount });
      try {
        await fetch("https://kapi.kakao.com/v1/payment/cancel", {
          method: "POST",
          headers: { Authorization: `KakaoAK ${adminKey}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
          body: new URLSearchParams({ cid, tid, cancel_amount: String(paidAmount), cancel_tax_free_amount: "0" }).toString(),
        });
      } catch (e) { console.error("mismatch refund failed:", e); }
      return new Response(JSON.stringify({ success: false, error: "결제 금액이 일치하지 않습니다." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: payErr } = await admin.from("payments").insert({
      user_id: userId, order_id: order.id, payment_key: tid, order_number: partnerOrderId,
      amount: paidAmount, status: "approved", method: "kakaopay",
      approved_at: approveData.approved_at || new Date().toISOString(), raw_response: approveData,
    });
    if (payErr) {
      // UNIQUE(payment_key) 동시 처리 → 다른 호출이 먼저 확정
      console.warn("payments insert (likely duplicate):", payErr.message);
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), payment_method: "kakaopay" }).eq("id", order.id);

    return new Response(JSON.stringify({ success: true, order_number: partnerOrderId, amount: paidAmount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("kakao-pay-order-approve error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
