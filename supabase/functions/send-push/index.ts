// Edge Function: 특정 user 의 모든 device_tokens 에 FCM HTTP v1 으로 푸시 발송.
//
// 운영 전 요구 사항(콘솔 작업):
//   1) Firebase 프로젝트 생성 → Android 앱 등록 → google-services.json 받아 android/app/ 에 배치.
//   2) Firebase 서비스 계정 키(JSON) 다운로드 → Supabase Secrets 에 등록:
//        FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
//      (PRIVATE_KEY 는 줄바꿈을 \\n 으로 escape 한 채로 저장)
//   3) supabase functions deploy send-push --no-verify-jwt=false
//
// 호출 예 (서버 사이드에서 service-role key 로):
//   POST /functions/v1/send-push
//   { "user_id": "...", "title": "...", "body": "...", "data": {"deeplink": "/foo"} }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

// ─── FCM OAuth 토큰 ──────────────────────────────────────────────────────
// Service account JWT → access token. 1시간 유효, 캐시 가능. 단순화를 위해 매 호출 발급.

async function getFcmAccessToken(): Promise<string> {
  const projectId = Deno.env.get("FCM_PROJECT_ID")!;
  const clientEmail = Deno.env.get("FCM_CLIENT_EMAIL")!;
  const privateKeyPem = Deno.env.get("FCM_PRIVATE_KEY")!.replace(/\\n/g, "\n");

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
  const signingInput = `${enc(header)}.${enc(claim)}`;

  // RS256 서명: PKCS#8 PEM → CryptoKey → sign.
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");

  const jwt = `${signingInput}.${sig}`;
  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokRes.ok) {
    throw new Error(`FCM token exchange failed: ${await tokRes.text()}`);
  }
  return (await tokRes.json()).access_token as string;
}

async function sendFcm(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          ...(data ? { data } : {}),
        },
      }),
    },
  );
  return { ok: res.ok, status: res.status, body: await res.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Payload;
    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response("missing fields", { status: 400, headers: corsHeaders });
    }

    // service role 로 RLS 우회해 사용자의 모든 토큰 조회.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", payload.user_id);
    if (error) throw error;
    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = Deno.env.get("FCM_PROJECT_ID")!;
    const accessToken = await getFcmAccessToken();

    const results = await Promise.allSettled(
      tokens.map((t) =>
        sendFcm(accessToken, projectId, t.token, payload.title, payload.body, payload.data),
      ),
    );

    // 무효 토큰(NOT_FOUND / UNREGISTERED) 정리.
    const dead: string[] = [];
    results.forEach((r, i) => {
      if (
        r.status === "fulfilled" &&
        !r.value.ok &&
        (r.value.body.includes("UNREGISTERED") || r.value.body.includes("NOT_FOUND"))
      ) {
        dead.push(tokens[i].token);
      }
    });
    if (dead.length) {
      await supabase.from("device_tokens").delete().in("token", dead);
    }

    return new Response(
      JSON.stringify({
        sent: results.filter((r) => r.status === "fulfilled" && r.value.ok).length,
        failed: results.length - results.filter((r) => r.status === "fulfilled" && r.value.ok).length,
        pruned: dead.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[send-push] error:", e);
    return new Response((e as Error).message, { status: 500, headers: corsHeaders });
  }
});
