// 인앱 메일 연결 1단계 — 인증 사용자가 호출. state 저장 + Gmail/Drive 동의 URL 반환.
// cal-oauth-start 미러. 설계: docs/260616_inapp_email_design.md.
import { corsHeaders } from "../_shared/cors.ts";
import { resolveAllowedOrigin } from "../_shared/allowedOrigins.ts";
import { authUrl, isMailConfigured } from "../_shared/googleMail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    if (!isMailConfigured()) return json({ error: "mail_not_configured" }, 503);

    const body = await req.json().catch(() => ({}));
    const safeOrigin = resolveAllowedOrigin(body?.origin);
    if (!safeOrigin) return json({ error: "invalid_origin" }, 403);
    const returnPath =
      typeof body?.returnPath === "string" && body.returnPath.startsWith("/") ? body.returnPath : "/mail";

    const admin = createClient(supabaseUrl, serviceKey);
    const state = crypto.randomUUID();
    const { error: insErr } = await admin.from("mail_oauth_states").insert({
      state, user_id: userId,
      redirect_origin: safeOrigin, return_path: returnPath,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (insErr) return json({ error: "state_failed" }, 500);

    const redirectUri = `${supabaseUrl}/functions/v1/mail-oauth-callback`;
    return json({ url: authUrl(redirectUri, state) });
  } catch (e) {
    console.error("mail-oauth-start error", e);
    return json({ error: "internal" }, 500);
  }
});
