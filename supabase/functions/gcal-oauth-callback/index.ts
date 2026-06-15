// Google 캘린더 연결 2단계 — Google 이 code+state 로 리다이렉트(사용자 JWT 없음).
// state 행으로 사용자/리다이렉트를 복원하고 토큰을 교환·저장한 뒤 앱으로 되돌린다.
// verify_jwt=false (config.toml) — Google 브라우저 리다이렉트라 JWT 가 없다.
import { exchangeCode } from "../_shared/googleCalendar.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // 안전한 리다이렉트 목적지 — state 행에서 복원. state 없으면 안전 폴백.
  let dest = "/";
  const redirectTo = (status: "connected" | "error") =>
    new Response(null, { status: 302, headers: { Location: `${dest}?calendar=${status}` } });

  try {
    if (!state) return new Response("missing state", { status: 400 });
    const { data: row } = await admin.from("calendar_oauth_states").select("*").eq("state", state).maybeSingle();
    // state 는 일회용 — 조회 즉시 삭제(재사용/재생 공격 방지).
    await admin.from("calendar_oauth_states").delete().eq("state", state);
    if (!row) return new Response("invalid state", { status: 400 });
    dest = `${row.redirect_origin}${row.return_path}`;
    if (new Date(row.expires_at).getTime() < Date.now()) return redirectTo("error");
    if (oauthError || !code) return redirectTo("error");

    const redirectUri = `${supabaseUrl}/functions/v1/gcal-oauth-callback`;
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.access_token) return redirectTo("error");

    await admin.from("user_calendar_accounts").upsert(
      {
        user_id: row.user_id,
        provider: "google",
        access_token: tokens.access_token,
        // refresh_token 은 최초 동의에서만 옴 — 없으면 기존 값 보존(undefined 는 upsert 시 덮어쓰지 않음).
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        sync_token: null, // 다음 동기화는 전체부터
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

    return redirectTo("connected");
  } catch (e) {
    console.error("gcal-oauth-callback error", e);
    return redirectTo("error");
  }
});
