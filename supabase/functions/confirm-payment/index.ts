import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 일반 상품 주문(orders 테이블) 결제 확정 함수.
//
// 보안 모델:
//   - 클라이언트가 보내는 amount 를 절대 그대로 Toss 에 전달하지 않는다.
//   - orderId 로 우리 DB 의 orders.total_amount 를 진짜 금액으로 채택.
//   - 클라이언트 amount 는 디버깅·로깅 용도로만 비교.
//   - Toss 응답의 totalAmount 가 우리 측 금액과 다르면 즉시 차단 + 알람.
//
// 멱등성:
//   - 같은 orderId 로 payments 가 이미 'approved' 면 다시 처리하지 않고 기존 결과 반환.
//   - Toss 콜백이 재시도되더라도 안전하게 동작.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) 인증
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub;

    // 2) 입력 검증
    const { paymentKey, orderId, amount: clientAmount } = await req.json();

    if (!paymentKey || !orderId) {
      return jsonResp({ error: "Missing required fields" }, 400);
    }

    if (
      typeof paymentKey !== "string" ||
      typeof orderId !== "string" ||
      paymentKey.length > 200 ||
      orderId.length > 200
    ) {
      return jsonResp({ error: "Invalid field format" }, 400);
    }

    // 3) 멱등성 — 같은 orderId 의 결제가 이미 approved 면 그 결과를 반환
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, raw_response")
      .eq("order_number", orderId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle();

    if (existingPayment) {
      return jsonResp({
        success: true,
        already_confirmed: true,
        payment: existingPayment.raw_response,
      });
    }

    // 4) 진짜 결제 금액 — DB 의 orders.total_amount 사용
    //    클라이언트가 보낸 amount 는 신뢰하지 않는다.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("total_amount, status")
      .eq("order_number", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (orderError || !order) {
      console.error("Order lookup failed:", { orderId, userId, orderError });
      return jsonResp({ error: "Order not found" }, 404);
    }

    if (order.status === "paid") {
      // 멱등성 보강 — 결제는 새로 들어왔는데 주문은 이미 paid
      return jsonResp({ error: "Order already paid" }, 409);
    }

    const trustedAmount = order.total_amount;

    if (typeof trustedAmount !== "number" || trustedAmount <= 0) {
      return jsonResp({ error: "Invalid order amount" }, 400);
    }

    // 5) 클라이언트가 잘못된 amount 보내면 거부 (감사 로그)
    if (typeof clientAmount === "number" && clientAmount !== trustedAmount) {
      console.warn("Amount mismatch (client vs db):", {
        orderId,
        userId,
        client: clientAmount,
        db: trustedAmount,
      });
      return jsonResp({ error: "Amount mismatch" }, 400);
    }

    // 6) Toss 에 결제 확정 — DB 금액 사용
    const secretKey = Deno.env.get("TOSS_SECRET_KEY")!;
    const encryptedKey = btoa(`${secretKey}:`);

    const tossResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encryptedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: trustedAmount,
        }),
      },
    );

    const tossResult = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error("Toss confirm failed:", { orderId, userId, code: tossResult.code });
      return jsonResp(
        {
          error: tossResult.message || "Payment confirmation failed",
          code: tossResult.code,
        },
        400,
      );
    }

    // 7) Toss 응답 금액 재검증 — 변조 방지의 마지막 관문
    //    Toss 의 totalAmount 는 우리가 보낸 amount 와 정확히 같아야 한다.
    const tossTotal = Number(tossResult.totalAmount ?? tossResult.balanceAmount ?? NaN);
    if (Number.isNaN(tossTotal) || tossTotal !== trustedAmount) {
      console.error("Toss amount mismatch:", {
        orderId,
        expected: trustedAmount,
        got: tossTotal,
      });
      // 실수든 공격이든 결제 기록은 남기지 않고 차단.
      // 자동 환불은 운영팀이 raw_response 확인 후 처리.
      return jsonResp({ error: "Payment amount verification failed" }, 400);
    }

    // 8) payments 기록 + orders 상태 갱신
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      payment_key: paymentKey,
      order_number: orderId,
      amount: trustedAmount,
      status: "approved",
      method: tossResult.method || null,
      approved_at: tossResult.approvedAt || new Date().toISOString(),
      raw_response: tossResult,
    });

    if (paymentError) {
      console.error("Failed to save payment:", paymentError);
    }

    await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: tossResult.method || "toss",
      })
      .eq("order_number", orderId)
      .eq("user_id", userId);

    return jsonResp({ success: true, payment: tossResult });
  } catch (error) {
    console.error("Error:", error);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});
