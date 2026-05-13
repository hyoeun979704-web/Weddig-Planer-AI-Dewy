import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EARLY_BIRD_END = new Date("2026-08-01T00:00:00+09:00").getTime();

// Server-side source of truth. 클라이언트가 보낸 amount/type은 검증 용도로만 사용.
const PLAN_INFO: Record<string, { amount: number; heartReward?: number; heartReason?: string }> = {
  trial:   { amount: 100 },
  monthly: { amount: 4900, heartReward: 10,  heartReason: "early_bird_monthly" },
  yearly:  { amount: 39000, heartReward: 180, heartReason: "early_bird_yearly" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // anon client: 사용자 인증·소유권 검증용
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // admin client: payments/subscriptions write + RPC 호출용
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { tid, partnerOrderId, partnerUserId, pgToken, type } = await req.json();

    if (!tid || !partnerOrderId || !partnerUserId || !pgToken || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (partnerUserId !== userId) {
      return new Response(JSON.stringify({ error: "User mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = PLAN_INFO[type as string];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 멱등성: 이미 같은 tid 로 처리된 결제면 단락
    const { data: existing } = await adminClient
      .from("payments")
      .select("id, status")
      .eq("payment_key", tid)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          message: "이미 처리된 결제입니다.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminKey = Deno.env.get("KAKAO_ADMIN_KEY");
    const cid = Deno.env.get("KAKAO_CID") || "TC0ONETIME";
    if (!adminKey) {
      return new Response(JSON.stringify({ error: "KAKAO_ADMIN_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approveParams = new URLSearchParams({
      cid,
      tid,
      partner_order_id: partnerOrderId,
      partner_user_id: partnerUserId,
      pg_token: pgToken,
    });

    const approveRes = await fetch("https://kapi.kakao.com/v1/payment/approve", {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: approveParams.toString(),
    });

    const approveData = await approveRes.json();

    if (!approveRes.ok) {
      console.error("Kakao approve failed. status:", approveRes.status, "body:", JSON.stringify(approveData));
      return new Response(
        JSON.stringify({
          success: false,
          error: approveData.msg || approveData.error_description || "Approval failed",
          code: approveData.code,
          kakao_status: approveRes.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paidAmount: number = approveData?.amount?.total ?? 0;

    // 가격 변조 검증: 서버 PLAN_INFO 와 카카오 응답이 일치해야 한다.
    if (paidAmount !== plan.amount) {
      console.error("Amount mismatch:", { type, expected: plan.amount, got: paidAmount });
      // 잘못된 금액은 즉시 환불 시도
      try {
        const cancelParams = new URLSearchParams({
          cid,
          tid,
          cancel_amount: String(paidAmount),
          cancel_tax_free_amount: "0",
        });
        await fetch("https://kapi.kakao.com/v1/payment/cancel", {
          method: "POST",
          headers: {
            Authorization: `KakaoAK ${adminKey}`,
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          body: cancelParams.toString(),
        });
      } catch (e) {
        console.error("Mismatch refund failed:", e);
      }
      return new Response(
        JSON.stringify({ success: false, error: "결제 금액이 일치하지 않습니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // payments insert — UNIQUE(payment_key) 로 중복 결제 자동 차단
    const { error: insertError } = await adminClient.from("payments").insert({
      user_id: userId,
      payment_key: tid,
      order_number: partnerOrderId,
      amount: paidAmount,
      status: "approved",
      method: "kakaopay",
      approved_at: approveData.approved_at || new Date().toISOString(),
      raw_response: approveData,
    });
    if (insertError && !insertError.message?.includes("duplicate")) {
      console.error("payments insert failed:", insertError);
    }

    await adminClient
      .from("subscriptions")
      .update({ payment_id: tid, payment_method: "kakaopay" })
      .eq("user_id", userId);

    let heartsGranted = 0;
    if (plan.heartReward && plan.heartReason && Date.now() < EARLY_BIRD_END) {
      const { error: heartError } = await adminClient.rpc("earn_hearts", {
        p_user_id: userId,
        p_amount: plan.heartReward,
        p_reason: plan.heartReason,
        p_ref_id: null,
      });
      if (heartError) {
        console.error("Heart grant failed:", heartError);
      } else {
        heartsGranted = plan.heartReward;
      }
    }

    let refunded = false;
    if (type === "trial" && paidAmount === 100) {
      try {
        const cancelParams = new URLSearchParams({
          cid,
          tid,
          cancel_amount: String(paidAmount),
          cancel_tax_free_amount: "0",
        });
        const cancelRes = await fetch("https://kapi.kakao.com/v1/payment/cancel", {
          method: "POST",
          headers: {
            Authorization: `KakaoAK ${adminKey}`,
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          body: cancelParams.toString(),
        });

        if (cancelRes.ok) {
          refunded = true;
          await adminClient
            .from("payments")
            .update({ status: "refunded" })
            .eq("payment_key", tid);
        } else {
          const cancelData = await cancelRes.json();
          console.error("Kakao cancel failed:", cancelData);
          await adminClient
            .from("payments")
            .update({ status: "refund_pending" })
            .eq("payment_key", tid);
        }
      } catch (refundError) {
        console.error("Refund error:", refundError);
        await adminClient
          .from("payments")
          .update({ status: "refund_pending" })
          .eq("payment_key", tid);
      }
    }

    return new Response(
      JSON.stringify({ success: true, payment: approveData, refunded, heartsGranted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("kakao-pay-approve error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
