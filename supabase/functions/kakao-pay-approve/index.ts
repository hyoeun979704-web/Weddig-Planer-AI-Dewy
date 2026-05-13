import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EARLY_BIRD_END = new Date("2026-08-01T00:00:00+09:00").getTime();
const HEART_REWARDS: Record<string, { amount: number; reason: string }> = {
  monthly: { amount: 10, reason: "early_bird_monthly" },
  yearly: { amount: 180, reason: "early_bird_yearly" },
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { tid, partnerOrderId, partnerUserId, pgToken, type, amount } = await req.json();

    if (!tid || !partnerOrderId || !partnerUserId || !pgToken) {
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
          kakao_raw: approveData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paidAmount = approveData?.amount?.total ?? amount ?? 0;

    await supabase.from("payments").insert({
      user_id: userId,
      payment_key: tid,
      order_number: partnerOrderId,
      amount: paidAmount,
      status: "approved",
      method: "kakaopay",
      approved_at: approveData.approved_at || new Date().toISOString(),
      raw_response: approveData,
    });

    await supabase
      .from("subscriptions")
      .update({
        payment_id: tid,
        payment_method: "kakaopay",
      })
      .eq("user_id", userId);

    let heartsGranted = 0;
    const reward = HEART_REWARDS[type as string];
    if (reward && Date.now() < EARLY_BIRD_END) {
      const { error: heartError } = await supabase.rpc("earn_hearts", {
        p_user_id: userId,
        p_amount: reward.amount,
        p_reason: reward.reason,
        p_ref_id: null,
      });
      if (heartError) {
        console.error("Heart grant failed:", heartError);
      } else {
        heartsGranted = reward.amount;
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
          await supabase
            .from("payments")
            .update({ status: "refunded" })
            .eq("payment_key", tid)
            .eq("user_id", userId);
        } else {
          const cancelData = await cancelRes.json();
          console.error("Kakao cancel failed:", cancelData);
        }
      } catch (refundError) {
        console.error("Refund error:", refundError);
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
