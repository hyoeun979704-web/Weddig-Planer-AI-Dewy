import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAllowedOrigin } from "../_shared/allowedOrigins.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_INFO = {
  trial: { amount: 100, name: "프리미엄 무료 체험 (카드 인증)" },
  monthly: { amount: 4900, name: "프리미엄 월간 구독" },
  yearly: { amount: 39000, name: "프리미엄 연간 구독" },
} as const;

type PlanType = keyof typeof PLAN_INFO;

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

    const { type, origin } = (await req.json()) as { type: PlanType; origin: string };

    if (!type || !PLAN_INFO[type] || !origin) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CSRF·피싱 방어: 클라이언트가 보낸 origin 을 그대로 redirect URL 에 박지 않는다.
    // 화이트리스트와 정확히 일치하는 경우에만 그 표준 표기를 사용.
    const safeOrigin = resolveAllowedOrigin(origin);
    if (!safeOrigin) {
      console.warn("Rejected payment origin:", origin);
      return new Response(JSON.stringify({ error: "Invalid origin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = PLAN_INFO[type];

    const adminKey = Deno.env.get("KAKAO_ADMIN_KEY");
    const cid = Deno.env.get("KAKAO_CID") || "TC0ONETIME";
    if (!adminKey) {
      return new Response(JSON.stringify({ error: "KAKAO_ADMIN_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const partnerOrderId = `SUB_${type.toUpperCase()}_${date}${rand}`;

    const params = new URLSearchParams({
      cid,
      partner_order_id: partnerOrderId,
      partner_user_id: userId,
      item_name: plan.name,
      quantity: "1",
      total_amount: String(plan.amount),
      tax_free_amount: "0",
      approval_url: `${safeOrigin}/premium/payment/success?type=${type}&order=${partnerOrderId}`,
      cancel_url: `${safeOrigin}/premium/payment/fail?reason=cancel`,
      fail_url: `${safeOrigin}/premium/payment/fail?reason=fail`,
    });

    const kakaoRes = await fetch("https://kapi.kakao.com/v1/payment/ready", {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: params.toString(),
    });

    const kakaoData = await kakaoRes.json();

    if (!kakaoRes.ok) {
      console.error("Kakao ready failed. status:", kakaoRes.status, "body:", JSON.stringify(kakaoData));
      return new Response(
        JSON.stringify({
          success: false,
          error: kakaoData.msg || kakaoData.error_description || "Kakao ready failed",
          code: kakaoData.code,
          kakao_status: kakaoRes.status,
          kakao_raw: kakaoData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tid: kakaoData.tid,
        next_redirect_pc_url: kakaoData.next_redirect_pc_url,
        next_redirect_mobile_url: kakaoData.next_redirect_mobile_url,
        next_redirect_app_url: kakaoData.next_redirect_app_url,
        partner_order_id: partnerOrderId,
        partner_user_id: userId,
        amount: plan.amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("kakao-pay-ready error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
