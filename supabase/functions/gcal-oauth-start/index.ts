// Google 캘린더 연결 1단계 — 인증된 사용자가 호출. 사용자/리다이렉트를 단기 state 행에
// 저장하고 Google 동의 화면 URL 을 돌려준다(콜백엔 사용자 JWT 가 없으므로 state 로 결속).
import { corsHeaders } from "../_shared/cors.ts";
import { resolveAllowedOrigin } from "../_shared/allowedOrigins.ts";
import { googleAuthUrl } from "../_shared/googleCalendar.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    if (!Deno.env.get("GOOGLE_CLIENT_ID") || !Deno.env.get("GOOGLE_CLIENT_SECRET")) {
      return json({ error: "google_not_configured" }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const safeOrigin = resolveAllowedOrigin(body?.origin);
    if (!safeOrigin) return json({ error: "invalid_origin" }, 403);
    const returnPath = typeof body?.returnPath === "string" && body.returnPath.startsWith("/") ? body.returnPath : "/settings";

    const admin = createClient(supabaseUrl, serviceKey);
    const state = crypto.randomUUID();
    const { error: insErr } = await admin.from("calendar_oauth_states").insert({
      state,
      user_id: userId,
      provider: "google",
      redirect_origin: safeOrigin,
      return_path: returnPath,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (insErr) return json({ error: "state_failed" }, 500);

    const redirectUri = `${supabaseUrl}/functions/v1/gcal-oauth-callback`;
    return json({ url: googleAuthUrl(redirectUri, state) });
  } catch (e) {
    console.error("gcal-oauth-start error", e);
    return json({ error: "internal" }, 500);
  }
});
