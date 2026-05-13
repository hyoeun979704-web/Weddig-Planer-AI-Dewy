import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HeartPackage {
  price: number;
  hearts: number;
  label: string;
  firstOnly?: boolean;
}

const HEART_PACKAGES: Record<string, HeartPackage> = {
  starter: { price: 1900, hearts: 10, label: "첫 충전 한정", firstOnly: true },
  basic:   { price: 4900, hearts: 30, label: "베이직" },
  popular: { price: 9900, hearts: 70, label: "인기" },
  value:   { price: 13900, hearts: 100, label: "실속" },
  premium: { price: 19900, hearts: 150, label: "프리미엄" },
};

const POINT_TO_KRW = 0.2;

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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
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

    const {
      tid, partnerOrderId, partnerUserId, pgToken, packageId, pointsToSpend = 0,
    } = (await req.json()) as {
      tid: string;
      partnerOrderId: string;
      partnerUserId: string;
      pgToken: string;
      packageId: string;
      pointsToSpend?: number;
    };

    if (!tid || !partnerOrderId || !partnerUserId || !pgToken || !packageId) {
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

    const pkg = HEART_PACKAGES[packageId];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Unknown package" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 멱등성: 이미 처리된 tid 면 단락
    const { data: existing } = await adminClient
      .from("payments")
      .select("id")
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
      cid, tid,
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
      console.error("Kakao charge-approve failed:", approveRes.status, JSON.stringify(approveData));
      return new Response(
        JSON.stringify({
          success: false,
          error: approveData.msg || approveData.error_description || "Approval failed",
          code: approveData.code,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paidAmount: number = approveData?.amount?.total ?? 0;

    // 가격 검증: 서버 카탈로그 가격 - 포인트 차감액과 일치해야 한다.
    const expectedFinal = pkg.price - Math.floor(pointsToSpend * POINT_TO_KRW);
    if (paidAmount !== expectedFinal) {
      console.error("Amount mismatch:", { packageId, expectedFinal, paidAmount, pointsToSpend });
      try {
        const cancelParams = new URLSearchParams({
          cid, tid,
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

    // payments insert — UNIQUE(payment_key) 중복 시 ON CONFLICT 처리
    const { data: paymentRow, error: insertError } = await adminClient
      .from("payments")
      .insert({
        user_id: userId,
        payment_key: tid,
        order_number: partnerOrderId,
        amount: paidAmount,
        status: "approved",
        method: "kakaopay",
        approved_at: approveData.approved_at || new Date().toISOString(),
        raw_response: approveData,
      })
      .select("id")
      .single();

    if (insertError) {
      // UNIQUE 위반이면 동시 호출이 먼저 적립한 것이므로 그쪽을 신뢰
      console.warn("payments insert (likely duplicate):", insertError.message);
      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          message: "이미 처리된 결제입니다.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = paymentRow?.id ?? null;

    // 포인트 차감 — 결제 직후, 멱등성 확보된 시점에 service_role 로 호출
    let pointsSpent = 0;
    if (pointsToSpend > 0) {
      const { error: spendError } = await adminClient.rpc("spend_points", {
        p_user_id: userId,
        p_amount: pointsToSpend,
        p_reason: "heart_charge",
        p_ref_id: paymentId,
      });
      if (spendError) {
        console.error("Point spend failed (proceeding):", spendError);
      } else {
        pointsSpent = pointsToSpend;
      }
    }

    // 하트 적립
    const isStarter = packageId === "starter";
    const { data: earnData, error: earnError } = await adminClient.rpc("earn_hearts", {
      p_user_id: userId,
      p_amount: pkg.hearts,
      p_reason: isStarter ? "charge_starter" : `charge_${packageId}`,
      p_ref_id: paymentId,
    });

    if (earnError) {
      console.error("Heart grant failed:", earnError);
      // starter UNIQUE 위반(동시 결제) 등은 사용자 친화 메시지로
      const msg = earnError.message?.includes("heart_transactions_charge_starter_once")
        ? "첫 충전 특전은 1회만 사용할 수 있어요. 환불 처리 중입니다."
        : "결제는 승인됐으나 하트 적립에 실패했습니다. 고객센터 문의해주세요.";
      // 적립 실패 시 결제 환불 시도
      try {
        await fetch("https://kapi.kakao.com/v1/payment/cancel", {
          method: "POST",
          headers: {
            Authorization: `KakaoAK ${adminKey}`,
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          body: new URLSearchParams({
            cid, tid,
            cancel_amount: String(paidAmount),
            cancel_tax_free_amount: "0",
          }).toString(),
        });
        await adminClient
          .from("payments")
          .update({ status: "refunded" })
          .eq("payment_key", tid);
      } catch (e) {
        console.error("Auto refund after earn fail:", e);
        await adminClient
          .from("payments")
          .update({ status: "refund_pending" })
          .eq("payment_key", tid);
      }
      return new Response(
        JSON.stringify({ success: false, error: msg, payment: approveData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newBalance = Array.isArray(earnData) ? earnData[0]?.balance_after : (earnData as any)?.balance_after;

    return new Response(
      JSON.stringify({
        success: true,
        payment: approveData,
        heartsGranted: pkg.hearts,
        heartsBalance: newBalance ?? null,
        pointsSpent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("kakao-pay-charge-approve error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
