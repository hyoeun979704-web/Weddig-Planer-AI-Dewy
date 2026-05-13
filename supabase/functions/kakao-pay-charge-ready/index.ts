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
  basic: { price: 4900, hearts: 30, label: "베이직" },
  popular: { price: 9900, hearts: 70, label: "인기" },
  value: { price: 13900, hearts: 100, label: "실속" },
  premium: { price: 19900, hearts: 150, label: "프리미엄" },
};

const POINT_TO_KRW = 0.2;     // 1P = 0.2원
const POINT_DISCOUNT_MAX = 0.5; // 결제액의 50% 한도

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

    const { packageId, pointsToSpend = 0, origin } = (await req.json()) as {
      packageId: string;
      pointsToSpend?: number;
      origin: string;
    };

    const pkg = HEART_PACKAGES[packageId];
    if (!pkg || !origin) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 첫 충전 한정 패키지: 사용자가 이전에 첫충전을 받은 적이 없어야 함
    if (pkg.firstOnly) {
      const { data: prior } = await supabase
        .from("heart_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("reason", "charge_starter")
        .limit(1);
      if (prior && prior.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: "첫 충전 특전은 1회만 사용할 수 있습니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 포인트 차감액 검증 (50% 한도)
    const maxDiscount = Math.floor(pkg.price * POINT_DISCOUNT_MAX);
    const requestedDiscount = Math.floor(pointsToSpend * POINT_TO_KRW);
    if (requestedDiscount > maxDiscount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `포인트는 결제액의 ${POINT_DISCOUNT_MAX * 100}%까지만 사용할 수 있습니다.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 사용자 P 잔액 확인
    if (pointsToSpend > 0) {
      const { data: pts } = await supabase
        .from("user_points")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      if ((pts?.balance ?? 0) < pointsToSpend) {
        return new Response(
          JSON.stringify({ success: false, error: "포인트 잔액이 부족합니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const finalAmount = pkg.price - requestedDiscount;
    if (finalAmount < 100) {
      // 카카오페이 최소 결제액 100원
      return new Response(
        JSON.stringify({ success: false, error: "결제 최소 금액(100원) 미만입니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const partnerOrderId = `HEART_${packageId.toUpperCase()}_${date}${rand}`;

    const params = new URLSearchParams({
      cid,
      partner_order_id: partnerOrderId,
      partner_user_id: userId,
      item_name: `하트 ${pkg.hearts}개 (${pkg.label})`,
      quantity: "1",
      total_amount: String(finalAmount),
      tax_free_amount: "0",
      approval_url: `${origin}/points/charge/success?package=${packageId}&order=${partnerOrderId}`,
      cancel_url: `${origin}/points/charge/fail?reason=cancel`,
      fail_url: `${origin}/points/charge/fail?reason=fail`,
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
      console.error("Kakao charge-ready failed:", kakaoRes.status, JSON.stringify(kakaoData));
      return new Response(
        JSON.stringify({
          success: false,
          error: kakaoData.msg || kakaoData.error_description || "Kakao ready failed",
          code: kakaoData.code,
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
        package_id: packageId,
        hearts: pkg.hearts,
        original_amount: pkg.price,
        points_to_spend: pointsToSpend,
        final_amount: finalAmount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("kakao-pay-charge-ready error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
