import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


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
    const admin = adminClient();

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
    const { data: existing } = await admin
      .from("payments")
      .select("id, status, user_id, approved_at, amount, plan_type")
      .eq("payment_key", tid)
      .maybeSingle();
    if (existing) {
      if (existing.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Payment owner mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 원본 결제의 plan_type 을 진실 소스로 사용. backfill 안 된 과거 행은 amount 로 역추론.
      const originalType = existing.plan_type
        ?? (existing.amount === 100 ? "trial"
          : existing.amount === PLAN_INFO.monthly.amount ? "monthly"
          : existing.amount === PLAN_INFO.yearly.amount ? "yearly"
          : null);

      // 클라이언트가 보낸 type 이 원본과 다르면 거부 (무료 업그레이드 방지).
      if (originalType && originalType !== type) {
        return new Response(
          JSON.stringify({ error: "Payment type mismatch", expected: originalType }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 이미 active + 미만료 구독이 있으면 upsert 자체를 skip — 취소 상태도 보존.
      const { data: currentSub } = await admin
        .from("subscriptions")
        .select("status, expires_at, payment_id")
        .eq("user_id", userId)
        .maybeSingle();

      const hasValidActive = currentSub?.status === "active"
        && currentSub.expires_at
        && new Date(currentSub.expires_at) > new Date();

      if (hasValidActive) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyProcessed: true,
            subscriptionActivated: true,
            message: "이미 처리된 결제입니다.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 구독 row 가 없거나 만료/취소된 경우에만 복구성 활성화 — 원래 결제 시점 기준.
      const startedAt = existing.approved_at ? new Date(existing.approved_at) : new Date();
      const expiresAt = new Date(startedAt);
      if (type === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // 원래 결제 시점 + 기간이 이미 과거면 복구할 entitlement 없음 → upsert 안 함.
      if (expiresAt <= new Date()) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyProcessed: true,
            subscriptionActivated: false,
            message: "이미 처리된 결제입니다. (만료된 결제)",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: subscriptionError } = await admin
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan: type === "yearly" ? "yearly" : "monthly",
          status: "active",
          price: type === "trial" ? 0 : plan.amount,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          trial_ends_at: type === "trial" ? expiresAt.toISOString() : null,
          cancelled_at: null,
          payment_id: tid,
          payment_method: "kakaopay",
        }, { onConflict: "user_id" });

      if (subscriptionError) {
        console.error("existing payment subscription activation failed:", subscriptionError);
        return new Response(
          JSON.stringify({ success: false, error: "구독 활성화에 실패했습니다." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          subscriptionActivated: true,
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
    const { error: insertError } = await admin.from("payments").insert({
      user_id: userId,
      payment_key: tid,
      order_number: partnerOrderId,
      amount: paidAmount,
      status: "approved",
      method: "kakaopay",
      plan_type: type,
      approved_at: approveData.approved_at || new Date().toISOString(),
      raw_response: approveData,
    });
    if (insertError) {
      // UNIQUE(payment_key) 위반 = 동시 승인 호출이 먼저 적립한 것 → 여기서 return 해서
      // 아래 구독 upsert + earn_hearts 재실행을 막는다. (early-bird 하트는 멱등 가드가 없어
      // 그냥 통과하면 **하트가 두 번 발급**되던 P1 레이스. 위 existing 체크를 두 호출이 동시에
      // 통과해도 insert 단계에서 한쪽만 성공하므로 여기서 차단.) — charge-approve 와 동일 패턴.
      const isDuplicate =
        (insertError as { code?: string }).code === "23505" ||
        insertError.message?.includes("duplicate");
      if (isDuplicate) {
        console.warn("payments insert (duplicate, concurrent approve):", insertError.message);
        return new Response(
          JSON.stringify({ success: true, alreadyProcessed: true, message: "이미 처리된 결제입니다." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // 비-중복 오류: 결제 레코드 저장은 실패했지만 카카오 승인은 이미 완료 → 구독 활성화는
      // 진행(결제했는데 미활성되는 것 방지), 단 명시적으로 로깅.
      console.error("payments insert failed (non-duplicate):", insertError);
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (type === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const { error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert({
        user_id: userId,
        plan: type === "yearly" ? "yearly" : "monthly",
        status: "active",
        price: type === "trial" ? 0 : plan.amount,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        trial_ends_at: type === "trial" ? expiresAt.toISOString() : null,
        cancelled_at: null,
        payment_id: tid,
        payment_method: "kakaopay",
      }, { onConflict: "user_id" });

    if (subscriptionError) {
      console.error("subscription activation failed:", subscriptionError);
      return new Response(
        JSON.stringify({ success: false, error: "구독 활성화에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let heartsGranted = 0;
    if (plan.heartReward && plan.heartReason && Date.now() < EARLY_BIRD_END) {
      const { error: heartError } = await admin.rpc("earn_hearts", {
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
          await admin
            .from("payments")
            .update({ status: "refunded" })
            .eq("payment_key", tid);
        } else {
          const cancelData = await cancelRes.json();
          console.error("Kakao cancel failed:", cancelData);
          await admin
            .from("payments")
            .update({ status: "refund_pending" })
            .eq("payment_key", tid);
        }
      } catch (refundError) {
        console.error("Refund error:", refundError);
        await admin
          .from("payments")
          .update({ status: "refund_pending" })
          .eq("payment_key", tid);
      }
    }

    return new Response(
      JSON.stringify({ success: true, payment: approveData, refunded, heartsGranted, subscriptionActivated: true }),
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
