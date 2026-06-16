// 인앱 메일 — 최근 메시지 목록(인증 사용자). 토큰으로 Gmail messages.list+get(metadata).
// 설계: docs/260616_inapp_email_design.md.
import { corsHeaders } from "../_shared/cors.ts";
import { getValidAccessToken, gmailFetch } from "../_shared/googleMail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface MailItem {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

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

    const admin = createClient(supabaseUrl, serviceKey);
    const token = await getValidAccessToken(admin, userId);
    if (!token) return json({ error: "not_connected" }, 409);

    const body = await req.json().catch(() => ({}));
    const q = typeof body?.q === "string" ? body.q : "";
    const max = Math.min(Number(body?.max) || 20, 50);

    const listRes = await gmailFetch(
      token,
      `/users/me/messages?maxResults=${max}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    );
    if (!listRes.ok) {
      console.error("gmail-list messages.list failed", listRes.status, await listRes.text());
      return json({ error: "gmail_failed" }, 502);
    }
    const { messages = [] } = await listRes.json();

    const items: MailItem[] = [];
    for (const m of messages as Array<{ id: string }>) {
      const r = await gmailFetch(
        token,
        `/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      );
      if (!r.ok) continue;
      const msg = await r.json();
      const headers: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
      const h = (n: string) => headers.find((x) => x.name === n)?.value ?? "";
      items.push({
        id: msg.id,
        threadId: msg.threadId,
        snippet: msg.snippet ?? "",
        subject: h("Subject"),
        from: h("From"),
        date: h("Date"),
      });
    }
    return json({ items });
  } catch (e) {
    console.error("gmail-list error", e);
    return json({ error: "internal" }, 500);
  }
});
