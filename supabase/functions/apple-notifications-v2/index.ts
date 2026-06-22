import { adminClient } from "../_shared/supabase.ts";
import { APPLE_BUNDLE_ID, decodeJws, getSubscriptionStatus, getTransactionInfo, type AppleTransaction } from "../_shared/appStore.ts";

// App Store Server Notifications v2 수신 — 구독 갱신/취소/만료/환불을 서버 구독상태에 멱등 반영.
// Apple 이 POST { signedPayload }(JWS). payload 에서 originalTransactionId 만 뽑아 **Apple 서버 API 로
// 재조회한 권위 상태**로 동기화하므로 재전송·위조 payload 에도 안전(play-rtdn 의 Google 재조회와 동일).
// 설계: 260620_payment_compliance_plan §3·5, 등록: docs/260622_apple_iap_setup.md.
// 보안: verify_jwt=false 라 선택적 ?token=APPLE_ASN_TOKEN 게이트(설정 시 fail-closed) + 권위 재조회.

interface NotificationV2 {
  notificationType?: string;
  subtype?: string;
  data?: { bundleId?: string; signedTransactionInfo?: string; signedRenewalInfo?: string };
}

const now = () => new Date().toISOString();

Deno.serve(async (req) => {
  // 선택적 토큰 게이트 — 설정돼 있으면 불일치 거부. (Apple ASN URL 에 ?token=… 을 붙여 등록.)
  const expected = Deno.env.get("APPLE_ASN_TOKEN");
  if (expected) {
    const got = new URL(req.url).searchParams.get("token");
    if (got !== expected) return new Response("forbidden", { status: 403 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { signedPayload?: string };
    if (!body?.signedPayload) return new Response("ok", { status: 200 }); // 빈/테스트 핑.

    const payload = decodeJws<NotificationV2>(body.signedPayload);
    if (payload.data?.bundleId && payload.data.bundleId !== APPLE_BUNDLE_ID) {
      return new Response("ok", { status: 200 }); // 타 앱 알림 — 무시.
    }
    const type = payload.notificationType ?? "";
    const info = payload.data?.signedTransactionInfo
      ? decodeJws<AppleTransaction>(payload.data.signedTransactionInfo)
      : undefined;
    const origTxnId = info?.originalTransactionId;
    if (!origTxnId) return new Response("ok", { status: 200 });

    const admin = adminClient();

    // 환불/취소(회수) — Apple 재조회로 확인 후 거래 회수 표시 + 구독 만료.
    if (type === "REFUND" || type === "REVOKE") {
      // 권위 확인: 해당 거래가 실제 회수(revocationDate)됐는지.
      const confirm = await getTransactionInfo(info?.transactionId || origTxnId);
      const revoked = confirm.ok && !!confirm.tx?.revocationDate;
      if (revoked) {
        await admin.from("iap_transactions").update({ status: "refunded", updated_at: now() })
          .eq("platform", "ios").eq("store_txn_id", origTxnId);
        if (info?.transactionId && info.transactionId !== origTxnId) {
          await admin.from("iap_transactions").update({ status: "refunded", updated_at: now() })
            .eq("platform", "ios").eq("store_txn_id", info.transactionId);
        }
        const { data: sub } = await admin.from("subscriptions").select("user_id").eq("payment_id", origTxnId).maybeSingle();
        if (sub?.user_id) {
          await admin.from("subscriptions").update({ status: "expired", plan: "free", cancelled_at: now() })
            .eq("user_id", sub.user_id);
        }
      }
      return new Response("ok", { status: 200 });
    }

    // 구독 라이프사이클 — originalTransactionId → user 역조회(검증 시 payment_id 에 저장).
    const { data: sub } = await admin.from("subscriptions").select("user_id").eq("payment_id", origTxnId).maybeSingle();
    if (!sub?.user_id) return new Response("ok", { status: 200 }); // 미매핑(검증 전/타 토큰) — 무시.
    const userId = sub.user_id as string;

    // Apple 에서 현재 구독상태 재조회(권위) → 멱등 반영.
    const st = await getSubscriptionStatus(origTxnId);
    if (!st.ok) return new Response("retry", { status: 500 }); // 일시 실패 → Apple 재전송.
    const expiry = st.tx?.expiresDate ? new Date(st.tx.expiresDate).toISOString() : null;
    const s = st.subStatus; // 1 active, 2 expired, 3 retry, 4 grace, 5 revoked

    if (s === 1 || s === 3 || s === 4) {
      // 자동갱신 해지 예약(만료 전까지 이용 가능)은 상태 유지 + 취소시각 기록.
      const cancelled = type === "DID_CHANGE_RENEWAL_STATUS" && payload.subtype === "AUTO_RENEW_DISABLED";
      await admin.from("subscriptions").update({
        status: "active", expires_at: expiry, next_billing_at: cancelled ? null : expiry,
        last_billing_at: now(), cancelled_at: cancelled ? now() : null,
      }).eq("user_id", userId);
    } else {
      // expired(2) / revoked(5) — 만료 처리.
      await admin.from("subscriptions").update({ status: "expired", plan: "free", expires_at: expiry })
        .eq("user_id", userId);
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("apple-notifications-v2 error", e);
    return new Response("error", { status: 500 });
  }
});
