// 캘린더 양방향 동기화(provider 공용) — 인증 사용자가 호출(verify_jwt=true).
//   body: { provider: 'google'|'kakao', action: 'status'|'disconnect'|'sync' }
import { corsHeaders } from "../_shared/cors.ts";
import { getAdapter, isProvider } from "../_shared/calendarRegistry.ts";
import { runSync, type CalAccount } from "../_shared/calendarSync.ts";
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

    const { provider, action } = await req.json().catch(() => ({}));
    if (!isProvider(provider)) return json({ error: "invalid_provider" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: accRow } = await admin
      .from("user_calendar_accounts")
      .select("user_id, provider, access_token, refresh_token, token_expires_at, sync_token, calendar_id")
      .eq("user_id", userId).eq("provider", provider).maybeSingle();

    if (action === "status") return json({ connected: !!accRow?.refresh_token });

    if (action === "disconnect") {
      await admin.from("calendar_event_links").delete().eq("user_id", userId).eq("provider", provider);
      await admin.from("user_calendar_accounts").delete().eq("user_id", userId).eq("provider", provider);
      return json({ ok: true });
    }

    // action === 'sync'
    if (!accRow?.refresh_token) return json({ error: "not_connected" }, 400);
    const { pushed, pulled } = await runSync(admin, userId, getAdapter(provider), accRow as CalAccount);
    return json({ ok: true, pushed, pulled });
  } catch (e) {
    console.error("cal-sync error", e);
    return json({ error: "internal", detail: String((e as Error).message) }, 500);
  }
});
