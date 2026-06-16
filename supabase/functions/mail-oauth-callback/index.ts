// 인앱 메일 연결 2단계 — Google 리다이렉트(사용자 JWT 없음, verify_jwt=false).
// state 로 사용자 복원 → 토큰 교환 → user_mail_accounts 저장 → 앱으로 복귀. cal-oauth-callback 미러.
import { exchangeCode } from "../_shared/googleMail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  let dest = "/mail";
  const redirectTo = (status: "connected" | "error") =>
    new Response(null, { status: 302, headers: { Location: `${dest}?mail=${status}` } });

  try {
    if (!state) return new Response("missing state", { status: 400 });
    const { data: row } = await admin.from("mail_oauth_states").select("*").eq("state", state).maybeSingle();
    await admin.from("mail_oauth_states").delete().eq("state", state); // 일회용
    if (!row) return new Response("invalid state", { status: 400 });
    dest = `${row.redirect_origin}${row.return_path}`;
    if (new Date(row.expires_at).getTime() < Date.now()) return redirectTo("error");
    if (oauthError || !code) return redirectTo("error");

    const redirectUri = `${supabaseUrl}/functions/v1/mail-oauth-callback`;
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.access_token) return redirectTo("error");

    // 연결 계정 이메일(표시용).
    let email: string | null = null;
    try {
      const r = await fetch(USERINFO, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      if (r.ok) email = (await r.json())?.email ?? null;
    } catch (e) {
      console.error("mail-oauth-callback userinfo failed", e);
    }

    await admin.from("user_mail_accounts").upsert(
      {
        user_id: row.user_id,
        provider: "google",
        email,
        access_token: tokens.access_token,
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    return redirectTo("connected");
  } catch (e) {
    console.error("mail-oauth-callback error", e);
    return redirectTo("error");
  }
});
