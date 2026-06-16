import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient } from "../_shared/supabase.ts";
import { resolveAllowedOrigin } from "../_shared/allowedOrigins.ts";

// 디자인 구매 결제 준비(카카오페이). 서버에서 가격·포인트 할인을 계산해(클라 금액 불신)
// orders + design_purchase_intents 를 만들고 카카오 ready 호출. 승인은 design-purchase-approve.
// 설계: docs/260616_invitation_design_marketplace.md. 결제=실제 재화, 포인트=할인 차감.

const MIN_CHARGE = 100;

function computeCharge(price: number, requested: number, balance: number) {
  const p = Math.max(0, Math.floor(price || 0));
  const req = Math.max(0, Math.floor(requested || 0));
  const bal = Math.max(0, Math.floor(balance || 0));
  const maxDiscount = p > MIN_CHARGE ? p - MIN_CHARGE : 0;
  const discount = Math.min(req, bal, maxDiscount);
  return { discount, final: p - discount };
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

    const { designId, usePoints, origin } = (await req.json()) as { designId: string; usePoints?: number; origin: string };
    if (!designId || !origin) return json({ error: "Invalid request" }, 400);
    const safeOrigin = resolveAllowedOrigin(origin);
    if (!safeOrigin) return json({ error: "Invalid origin" }, 403);

    const admin = adminClient();

    // 디자인(가격·판매가능) — 서버 진실.
    const { data: design } = await admin
      .from("designer_designs")
      .select("id, title, price, status, active, designer_user_id")
      .eq("id", designId).maybeSingle();
    if (!design || design.status !== "approved" || !design.active) return json({ error: "구매할 수 없는 디자인이에요." }, 400);
    if (design.designer_user_id === userId) return json({ error: "본인 디자인은 구매할 수 없어요." }, 400);

    // 중복 구매 방지.
    const { data: owned } = await admin.from("design_purchases").select("id").eq("user_id", userId).eq("design_id", designId).maybeSingle();
    if (owned) return json({ error: "이미 보유한 디자인이에요." }, 400);

    // 포인트 잔액 → 할인 계산(서버).
    const { data: pts } = await admin.from("user_points").select("balance").eq("user_id", userId).maybeSingle();
    const balance = (pts?.balance as number) ?? 0;
    const { discount, final } = computeCharge(design.price as number, usePoints ?? 0, balance);
    if (final < MIN_CHARGE) return json({ error: "결제 최소 금액 미만입니다." }, 400);

    const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `DD${date}${rand}`;

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({ user_id: userId, order_number: orderNumber, status: "pending", total_amount: final, payment_method: "kakaopay" })
      .select("id").single();
    if (orderErr || !order) return json({ error: "주문 생성에 실패했어요." }, 500);

    const { error: intentErr } = await admin.from("design_purchase_intents").insert({
      order_number: orderNumber, user_id: userId, design_id: designId, points_used: discount, gross: design.price,
    });
    if (intentErr) { await admin.from("orders").delete().eq("id", order.id); return json({ error: "주문 생성에 실패했어요." }, 500); }

    const adminKey = Deno.env.get("KAKAO_ADMIN_KEY");
    const cid = Deno.env.get("KAKAO_CID") || "TC0ONETIME";
    if (!adminKey) return json({ error: "KAKAO_ADMIN_KEY is not configured" }, 500);

    const params = new URLSearchParams({
      cid, partner_order_id: orderNumber, partner_user_id: userId,
      item_name: String(design.title).slice(0, 100), quantity: "1",
      total_amount: String(final), tax_free_amount: "0",
      approval_url: `${safeOrigin}/payment/success?type=design&order=${orderNumber}`,
      cancel_url: `${safeOrigin}/payment/fail?reason=cancel`,
      fail_url: `${safeOrigin}/payment/fail?reason=fail`,
    });
    const kakaoRes = await fetch("https://kapi.kakao.com/v1/payment/ready", {
      method: "POST",
      headers: { Authorization: `KakaoAK ${adminKey}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: params.toString(),
    });
    const kakaoData = await kakaoRes.json();
    if (!kakaoRes.ok) {
      await admin.from("design_purchase_intents").delete().eq("order_number", orderNumber);
      await admin.from("orders").delete().eq("id", order.id);
      return json({ success: false, error: kakaoData.msg || "카카오 결제 준비에 실패했어요.", code: kakaoData.code });
    }

    return json({
      success: true, tid: kakaoData.tid,
      next_redirect_pc_url: kakaoData.next_redirect_pc_url,
      next_redirect_mobile_url: kakaoData.next_redirect_mobile_url,
      next_redirect_app_url: kakaoData.next_redirect_app_url,
      partner_order_id: orderNumber, partner_user_id: userId, amount: final, discount,
    });
  } catch (e) {
    console.error("design-purchase-ready error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
