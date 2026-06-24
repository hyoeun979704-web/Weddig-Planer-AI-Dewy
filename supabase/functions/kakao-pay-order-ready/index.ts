import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient } from "../_shared/supabase.ts";
import { resolveAllowedOrigin } from "../_shared/allowedOrigins.ts";

// 스토어 주문 결제 준비(카카오페이). 서버에서 상품 가격으로 총액을 계산해 orders/order_items 를
// 생성하고(클라 금액 불신), 카카오 ready 를 호출한다. 승인은 kakao-pay-order-approve.

interface ReqItem { product_id: string; quantity: number; }
interface Shipping { name?: string; phone?: string; address?: string; memo?: string; }

// 배송 정보 검증 — 물리 배송 주문은 받는분·연락처·주소가 필수(없으면 업체가 배송 불가).
// 클라 표시와 무관하게 서버에서 재검증한다. 반환: 정제된 값 또는 에러 메시지.
function validateShipping(s: Shipping | undefined): { ok: true; value: Required<Pick<Shipping, "name" | "phone" | "address">> & { memo: string } } | { ok: false; error: string } {
  const name = (s?.name ?? "").trim();
  const phone = (s?.phone ?? "").trim();
  const address = (s?.address ?? "").trim();
  const memo = (s?.memo ?? "").trim();
  if (name.length < 1 || name.length > 50) return { ok: false, error: "받는 분 성함을 입력해 주세요" };
  if (!/^[0-9+\-\s]{9,20}$/.test(phone)) return { ok: false, error: "연락처를 정확히 입력해 주세요" };
  if (address.length < 5 || address.length > 200) return { ok: false, error: "배송 주소를 정확히 입력해 주세요" };
  if (memo.length > 200) return { ok: false, error: "배송 메모가 너무 길어요" };
  return { ok: true, value: { name, phone, address, memo } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { items, origin, shipping } = (await req.json()) as { items: ReqItem[]; origin: string; shipping?: Shipping };
    if (!Array.isArray(items) || items.length === 0 || !origin) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ship = validateShipping(shipping);
    if (!ship.ok) {
      return new Response(JSON.stringify({ error: ship.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const safeOrigin = resolveAllowedOrigin(origin);
    if (!safeOrigin) {
      return new Response(JSON.stringify({ error: "Invalid origin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = adminClient();
    // 서버 가격으로 총액 계산 — 클라가 보낸 금액은 신뢰하지 않는다.
    const ids = [...new Set(items.map((i) => i.product_id))];
    const { data: products, error: prodErr } = await admin
      .from("products").select("id,name,price,sale_price,is_active").in("id", ids);
    if (prodErr || !products) {
      return new Response(JSON.stringify({ error: "상품 조회 실패" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const pmap = new Map(products.map((p: any) => [p.id, p]));

    let total = 0;
    const orderItems: { product_id: string; product_name: string; product_price: number; quantity: number }[] = [];
    for (const it of items) {
      const p: any = pmap.get(it.product_id);
      const qty = Math.floor(Number(it.quantity) || 0);
      if (!p || !p.is_active || qty < 1 || qty > 99) {
        return new Response(JSON.stringify({ error: "구매할 수 없는 상품이 포함돼 있어요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const price = (p.sale_price ?? p.price) as number;
      total += price * qty;
      orderItems.push({ product_id: p.id, product_name: p.name, product_price: price, quantity: qty });
    }
    if (total < 100) {
      return new Response(JSON.stringify({ error: "결제 최소 금액(100원) 미만입니다." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `DW${date}${rand}`;

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: userId, order_number: orderNumber, status: "pending", total_amount: total, payment_method: "kakaopay",
        shipping_name: ship.value.name, shipping_phone: ship.value.phone,
        shipping_address: ship.value.address, shipping_memo: ship.value.memo || null,
      })
      .select("id").single();
    if (orderErr || !order) {
      console.error("order insert failed:", orderErr);
      return new Response(JSON.stringify({ error: "주문 생성에 실패했어요." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { error: itemsErr } = await admin
      .from("order_items").insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
    if (itemsErr) {
      console.error("order_items insert failed:", itemsErr);
      await admin.from("orders").delete().eq("id", order.id);
      return new Response(JSON.stringify({ error: "주문 생성에 실패했어요." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminKey = Deno.env.get("KAKAO_ADMIN_KEY");
    const cid = Deno.env.get("KAKAO_CID") || "TC0ONETIME";
    if (!adminKey) {
      return new Response(JSON.stringify({ error: "KAKAO_ADMIN_KEY is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const itemName = orderItems.length === 1
      ? orderItems[0].product_name
      : `${orderItems[0].product_name} 외 ${orderItems.length - 1}건`;

    const params = new URLSearchParams({
      cid,
      partner_order_id: orderNumber,
      partner_user_id: userId,
      item_name: itemName.slice(0, 100),
      quantity: "1",
      total_amount: String(total),
      tax_free_amount: "0",
      approval_url: `${safeOrigin}/payment/success?order=${orderNumber}`,
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
      console.error("Kakao order-ready failed:", kakaoRes.status, JSON.stringify(kakaoData));
      // 결제 준비 실패 → 방금 만든 pending 주문 정리
      await admin.from("orders").delete().eq("id", order.id);
      return new Response(JSON.stringify({ success: false, error: kakaoData.msg || "카카오 결제 준비에 실패했어요.", code: kakaoData.code }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      tid: kakaoData.tid,
      next_redirect_pc_url: kakaoData.next_redirect_pc_url,
      next_redirect_mobile_url: kakaoData.next_redirect_mobile_url,
      next_redirect_app_url: kakaoData.next_redirect_app_url,
      partner_order_id: orderNumber,
      partner_user_id: userId,
      amount: total,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("kakao-pay-order-ready error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
