// 약관 제8조 ③: 다음 결제 예정일 7일 전 자동 갱신 사전 고지.
// pg_cron 또는 외부 스케줄러가 매일 1회 호출. 멱등성은 last_renewal_notified_at 으로 보장.
//
// 호출:
//   POST /functions/v1/notify-subscription-renewal
//   (인증: service-role key)
//   body 옵션: { "days_ahead": 7 }  // 기본 7일

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type DueRow = {
  subscription_id: string;
  user_id: string;
  plan: string;
  next_billing_date: string;
  price: number;
};

function formatKstDate(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, "0")}.${String(kst.getUTCDate()).padStart(2, "0")}`;
}

function buildMessage(row: DueRow) {
  const dateLabel = formatKstDate(row.next_billing_date);
  const planLabel = row.plan === "yearly" ? "연간 Premium" : row.plan === "monthly" ? "월간 Premium" : "Premium";
  const amount = (row.price ?? 0).toLocaleString("ko-KR");
  return {
    title: "구독 자동 갱신 안내",
    body: `${dateLabel}에 ${planLabel} ${amount}원이 자동 결제될 예정입니다. 해지를 원하시면 마이페이지에서 변경하실 수 있습니다.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let daysAhead = 7;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.days_ahead === "number" && body.days_ahead > 0) {
          daysAhead = Math.min(30, Math.floor(body.days_ahead));
        }
      } catch {
        // body 없음 — 기본값 사용
      }
    }

    const { data: rows, error: rpcError } = await supabase
      .rpc("subscriptions_due_for_renewal_notification", { days_ahead: daysAhead });

    if (rpcError) throw rpcError;
    const dueRows = (rows ?? []) as DueRow[];

    if (dueRows.length === 0) {
      return new Response(
        JSON.stringify({ notified: 0, failed: 0, scanned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let notified = 0;
    let failed = 0;
    const now = new Date().toISOString();

    for (const row of dueRows) {
      const { title, body } = buildMessage(row);
      try {
        const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: row.user_id,
            title,
            body,
            data: { deeplink: "/premium", subscription_id: row.subscription_id },
          }),
        });

        if (!pushRes.ok) {
          failed++;
          console.error("[notify-renewal] push failed", row.user_id, pushRes.status);
          continue;
        }

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({ last_renewal_notified_at: now })
          .eq("id", row.subscription_id);

        if (updateError) {
          failed++;
          console.error("[notify-renewal] update failed", row.subscription_id, updateError);
          continue;
        }

        notified++;
      } catch (e) {
        failed++;
        console.error("[notify-renewal] exception", row.user_id, e);
      }
    }

    return new Response(
      JSON.stringify({ notified, failed, scanned: dueRows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[notify-subscription-renewal] error:", e);
    return new Response((e as Error).message, { status: 500, headers: corsHeaders });
  }
});
