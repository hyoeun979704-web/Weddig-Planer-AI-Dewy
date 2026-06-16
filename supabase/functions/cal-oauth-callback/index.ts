// 캘린더 연결 2단계(provider 공용) — provider 의 OAuth 리다이렉트(사용자 JWT 없음).
// state 행으로 provider/사용자/리다이렉트를 복원하고 토큰을 교환·저장 후 앱으로 되돌린다.
// verify_jwt=false (config.toml).
import { getOAuth, isProvider } from "../_shared/calendarRegistry.ts";
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
  let providerQ = "";
  const redirectTo = (status: "connected" | "error") =>
    new Response(null, { status: 302, headers: { Location: `${dest}?calendar=${status}${providerQ}` } });

  try {
    if (!state) return new Response("missing state", { status: 400 });
    const { data: row } = await admin.from("calendar_oauth_states").select("*").eq("state", state).maybeSingle();
    await admin.from("calendar_oauth_states").delete().eq("state", state); // 일회용
    if (!row || !isProvider(row.provider)) return new Response("invalid state", { status: 400 });
    dest = `${row.redirect_origin}${row.return_path}`;
    providerQ = `&calprovider=${row.provider}`;
    if (new Date(row.expires_at).getTime() < Date.now()) return redirectTo("error");
    if (oauthError || !code) return redirectTo("error");

    const redirectUri = `${supabaseUrl}/functions/v1/cal-oauth-callback`;
    const tokens = await getOAuth(row.provider).exchangeCode(code, redirectUri);
    if (!tokens.access_token) return redirectTo("error");

    await admin.from("user_calendar_accounts").upsert(
      {
        user_id: row.user_id,
        provider: row.provider,
        access_token: tokens.access_token,
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        sync_token: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    return redirectTo("connected");
  } catch (e) {
    console.error("cal-oauth-callback error", e);
    return redirectTo("error");
  }
});
