// 드라이브 연결 2단계 — Google OAuth 리다이렉트(사용자 JWT 없음). verify_jwt=false.
// state 행으로 사용자/리다이렉트를 복원하고 토큰 교환·저장 후 앱으로 되돌린다.
// cal-oauth-callback / mail-oauth-callback 미러.
import { DRIVE_SCOPES, exchangeCode, getUserEmail } from "../_shared/googleDrive.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  let dest = "/";
  const redirectTo = (status: "connected" | "error") =>
    new Response(null, { status: 302, headers: { Location: `${dest}?drive=${status}` } });

  try {
    if (!state) return new Response("missing state", { status: 400 });
    const { data: row } = await admin.from("drive_oauth_states").select("*").eq("state", state).maybeSingle();
    await admin.from("drive_oauth_states").delete().eq("state", state); // 일회용
    if (!row) return new Response("invalid state", { status: 400 });
    dest = `${row.redirect_origin}${row.return_path}`;
    if (new Date(row.expires_at).getTime() < Date.now()) return redirectTo("error");
    if (oauthError || !code) return redirectTo("error");

    const redirectUri = `${supabaseUrl}/functions/v1/drive-oauth-callback`;
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.access_token) return redirectTo("error");
    const email = await getUserEmail(tokens.access_token);

    await admin.from("user_drive_accounts").upsert(
      {
        user_id: row.user_id,
        provider: "google",
        email,
        access_token: tokens.access_token,
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        scopes: DRIVE_SCOPES,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    return redirectTo("connected");
  } catch (e) {
    console.error("drive-oauth-callback error", e);
    return redirectTo("error");
  }
});
