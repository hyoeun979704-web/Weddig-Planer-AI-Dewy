import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 정기결제(recurring) 가드: 현재 카카오페이는 TC0ONETIME 단건만 사용하므로
    // DB 마킹만으로 충분. 향후 TCSUBSCRIP / 토스 빌링키 등 정기결제로 전환되면
    // 여기서 PG 측 정기결제 해지를 호출해야 한다 — 명시적으로 거부해 회귀 방지.
    const { data: currentSub } = await adminClient
      .from("subscriptions")
      .select("payment_method")
      .eq("user_id", claimsData.claims.sub)
      .maybeSingle();
    const recurringMethods = new Set(["kakaopay_recurring", "toss_billing"]);
    if (currentSub?.payment_method && recurringMethods.has(currentSub.payment_method)) {
      console.error("recurring cancel not implemented for:", currentSub.payment_method);
      return new Response(
        JSON.stringify({ error: "Recurring cancel not implemented" }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error } = await adminClient
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("user_id", claimsData.claims.sub)
      .neq("plan", "free");

    if (error) {
      console.error("cancel subscription failed:", error);
      return new Response(JSON.stringify({ error: "Cancel failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("cancel-subscription error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
