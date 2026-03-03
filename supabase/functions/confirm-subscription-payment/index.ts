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

    // Use anon client only for JWT verification
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Use service role for all DB writes so RLS restrictions don't block legitimate updates
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { paymentKey, orderId, amount, type } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Confirm payment with TossPayments API
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
        body: JSON.stringify({ paymentKey, orderId, amount }),
      }
    );

    const tossResult = await tossResponse.json();

    if (!tossResponse.ok) {
      return new Response(
        JSON.stringify({
          error: tossResult.message || "Payment confirmation failed",
          code: tossResult.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save payment record
    await supabase.from("payments").insert({
      user_id: userId,
      payment_key: paymentKey,
      order_number: orderId,
      amount,
      status: "approved",
      method: tossResult.method || null,
      approved_at: tossResult.approvedAt || new Date().toISOString(),
      raw_response: tossResult,
    });

    // Activate subscription server-side (service role bypasses RLS restriction on plan updates)
    const now = new Date();
    if (type === "trial") {
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 30);
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan: "monthly",
        status: "active",
        price: 0,
        trial_ends_at: trialEnd.toISOString(),
        expires_at: trialEnd.toISOString(),
        started_at: now.toISOString(),
        payment_id: paymentKey,
        payment_method: tossResult.method || "card",
      }, { onConflict: "user_id" });
    } else {
      const expiresAt = new Date(now);
      if (type === "yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      else expiresAt.setMonth(expiresAt.getMonth() + 1);
      const price = type === "yearly" ? 39000 : 4900;
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan: type,
        status: "active",
        price,
        expires_at: expiresAt.toISOString(),
        started_at: now.toISOString(),
        trial_ends_at: null,
        cancelled_at: null,
        payment_id: paymentKey,
        payment_method: tossResult.method || "card",
      }, { onConflict: "user_id" });
    }

    // For trial (100원 auth), cancel/refund immediately
    if (type === "trial" && amount === 100) {
      try {
        await fetch(
          `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${encryptedKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cancelReason: "무료 체험 카드 인증 환불" }),
          }
        );
        // Update payment status to refunded
        await supabase
          .from("payments")
          .update({ status: "refunded" })
          .eq("payment_key", paymentKey)
          .eq("user_id", userId);
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }

    return new Response(JSON.stringify({ success: true, payment: tossResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
