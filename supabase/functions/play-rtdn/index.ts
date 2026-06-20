import { adminClient } from "../_shared/supabase.ts";
import { getSubscriptionPurchaseV2 } from "../_shared/googlePlay.ts";

// Google Play 실시간 개발자 알림(RTDN) 수신 — 구독 갱신/취소/만료/환불을 서버 구독상태에 멱등 반영.
// Pub/Sub push(POST). 본문 message.data(base64) → DeveloperNotification. 토큰으로 현재 구독상태를
// 재조회(Google = 진실)해 그대로 동기화하므로 재전송에도 안전. 설계: 260620_payment_compliance_plan §3·5.
// 보안: 푸시 구독 endpoint 에 ?token=<RTDN_VERIFY_TOKEN> 비밀파라미터를 두고 대조(설정 시).

const PACKAGE_NAME = Deno.env.get("ANDROID_PACKAGE_NAME") || "app.dewy";

// notificationType → 처리 분류.
const ACTIVE_TYPES = new Set([1, 2, 4, 7]); // RECOVERED, RENEWED, PURCHASED, RESTARTED
const ENDED_TYPES = new Set([12, 13]); // REVOKED, EXPIRED (CANCELED=3 은 만료 전까지 유효 — 별도 처리)

Deno.serve(async (req) => {
  // 검증 토큰 — 비밀 쿼리파라미터 대조. verify_jwt=false 라 이게 유일한 게이트이므로
  // fail-closed: 토큰 미설정이면 엔드포인트를 열지 않는다(누구나 위조 환불·취소 POST 가능 방지).
  const expected = Deno.env.get("RTDN_VERIFY_TOKEN");
  const got = new URL(req.url).searchParams.get("token");
  if (!expected || got !== expected) return new Response("forbidden", { status: 403 });
  try {
    const body = (await req.json().catch(() => ({}))) as { message?: { data?: string } };
    const dataB64 = body?.message?.data;
    if (!dataB64) return new Response("ok", { status: 200 }); // test/빈 메시지.

    const decoded = JSON.parse(atob(dataB64)) as {
      subscriptionNotification?: { notificationType: number; purchaseToken: string };
      voidedPurchaseNotification?: { purchaseToken?: string; orderId?: string };
      testNotification?: unknown;
    };

    const admin = adminClient();

    // 환불/취소(voided) — 구독·하트 거래 회수 표시 + 구독 만료.
    if (decoded.voidedPurchaseNotification?.purchaseToken) {
      const token = decoded.voidedPurchaseNotification.purchaseToken;
      await admin.from("iap_transactions").update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("store_txn_id", token);
      const { data: sub } = await admin.from("subscriptions").select("user_id").eq("payment_id", token).maybeSingle();
      if (sub?.user_id) {
        await admin.from("subscriptions").update({
          status: "expired", plan: "free", cancelled_at: new Date().toISOString(),
        }).eq("user_id", sub.user_id);
      }
      return new Response("ok", { status: 200 });
    }

    const note = decoded.subscriptionNotification;
    if (!note?.purchaseToken) return new Response("ok", { status: 200 });
    const token = note.purchaseToken;

    // 토큰 → user 역조회(검증 시 payment_id 에 저장).
    const { data: sub } = await admin.from("subscriptions").select("user_id").eq("payment_id", token).maybeSingle();
    if (!sub?.user_id) return new Response("ok", { status: 200 }); // 미매핑(타 토큰) — 무시.
    const userId = sub.user_id as string;

    // Google 에서 현재 구독상태 재조회(진실원천) → 멱등 반영.
    const v = await getSubscriptionPurchaseV2(PACKAGE_NAME, token);
    if (!v.ok) return new Response("retry", { status: 500 }); // 일시 실패 → Pub/Sub 재전송.

    const lineItems = (v.data.lineItems as Array<Record<string, unknown>>) ?? [];
    const expiry = (lineItems[0]?.expiryTime as string) ?? null;
    const t = note.notificationType;

    if (ACTIVE_TYPES.has(t)) {
      await admin.from("subscriptions").update({
        status: "active", expires_at: expiry, next_billing_at: expiry,
        last_billing_at: new Date().toISOString(), cancelled_at: null,
      }).eq("user_id", userId);
    } else if (t === 3) {
      // CANCELED = 자동갱신 해지 예약(만료 전까지 이용 가능). 상태 유지, 취소시각만 기록.
      await admin.from("subscriptions").update({ cancelled_at: new Date().toISOString(), next_billing_at: null })
        .eq("user_id", userId);
    } else if (ENDED_TYPES.has(t)) {
      await admin.from("subscriptions").update({ status: "expired", plan: "free", expires_at: expiry })
        .eq("user_id", userId);
    }
    // ON_HOLD(5)/GRACE(6)/PAUSED(10) 등은 만료시각만 갱신.
    else {
      await admin.from("subscriptions").update({ expires_at: expiry }).eq("user_id", userId);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("play-rtdn error", e);
    return new Response("error", { status: 500 });
  }
});
