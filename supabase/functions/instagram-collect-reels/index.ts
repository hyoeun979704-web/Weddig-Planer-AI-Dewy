/**
 * instagram-collect-reels — 큐레이션한 비즈니스/크리에이터 계정의 최근 릴스를
 * Graph API Business Discovery 로 수집해 tip_instagrams 에 적재한다.
 * (유튜브 tip_channels RSS sync 의 인스타 대응판.)
 *
 * 동작:
 *   1) tip_instagram_accounts(is_active) 로드
 *   2) 각 username → GET {IG_USER_ID}?fields=business_discovery.username(U){media{...}}
 *   3) 릴스(media_product_type=REELS)만 추림 + 기존 url 제외(신규만)
 *   4) thumbnail_url 바이트를 받아 공개 버킷 tip-thumbnails 에 재호스팅
 *      (인스타 CDN 은 referrer-lock·만료라 직접 핫링크 불가)
 *   5) tip_instagrams insert (moderation_status='pending' 기본, autoApprove 시 approved)
 *   6) 계정별 last_synced_at / last_sync_new / last_sync_error 갱신
 *
 * 필요 환경변수:
 *   IG_GRAPH_TOKEN  — 장기 비즈니스 토큰(연결된 IG 비즈니스 계정 + FB 페이지 + 앱 심사)
 *   IG_USER_ID      — Business Discovery 호출 주체인 내 IG 비즈니스 계정 id
 *   GRAPH_VERSION   — 선택, 기본 v21.0
 *
 * 호출: 어드민 "지금 수집" (admin JWT) 또는 cron(service_role).
 * Body(선택): { limitPerAccount?: number, autoApprove?: boolean }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BUCKET = "tip-thumbnails";
const UA = "Mozilla/5.0 (compatible; DewyBot/1.0)";

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface IgMedia {
  id: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  caption?: string;
  timestamp?: string;
  like_count?: number;
}

// og:image/CDN 이미지 바이트를 공개 버킷에 재호스팅 → 공개 URL. 실패 시 null.
async function rehost(admin: ReturnType<typeof createClient>, imgUrl: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(imgUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const path = `reels/${key}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
    if (error) return null;
    return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResp({ error: "server misconfigured" }, 500);

  // 권한 — service role(cron) 또는 admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return jsonResp({ error: "unauthorized" }, 401);
  const token = authHeader.slice(7);
  const admin = createClient(supabaseUrl, serviceRoleKey);
  if (token !== serviceRoleKey) {
    const userClient = createClient(supabaseUrl, serviceRoleKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return jsonResp({ error: "unauthorized" }, 401);
    const { data: isAdmin, error: re } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (re || !isAdmin) return jsonResp({ error: "forbidden" }, 403);
  }

  const igToken = Deno.env.get("IG_GRAPH_TOKEN");
  const igUserId = Deno.env.get("IG_USER_ID");
  const graphVer = Deno.env.get("GRAPH_VERSION") || "v21.0";
  if (!igToken || !igUserId) {
    return jsonResp({ error: "IG_GRAPH_TOKEN / IG_USER_ID 미설정 — Meta 앱·비즈니스 토큰 발급 후 환경변수 설정 필요" }, 400);
  }

  let limitPerAccount = 12;
  let autoApprove = false;
  try {
    const b = await req.json();
    if (typeof b?.limitPerAccount === "number" && b.limitPerAccount > 0 && b.limitPerAccount <= 25) limitPerAccount = b.limitPerAccount;
    if (b?.autoApprove === true) autoApprove = true;
  } catch { /* no body */ }

  // 1) 수집 대상 계정
  const { data: accounts, error: accErr } = await admin
    .from("tip_instagram_accounts")
    .select("username, category, is_active")
    .eq("is_active", true);
  if (accErr) return jsonResp({ error: `accounts load: ${accErr.message}` }, 500);
  if (!accounts || accounts.length === 0) return jsonResp({ ok: true, message: "수집할 활성 계정이 없습니다.", accounts: 0 });

  // 기존 url 셋(신규만 적재)
  const { data: existing } = await admin.from("tip_instagrams").select("url").limit(5000);
  const seen = new Set((existing ?? []).map((r: { url: string }) => r.url));

  let totalNew = 0;
  const perAccount: Record<string, { new: number; error?: string }> = {};

  for (const acc of accounts as { username: string; category: string }[]) {
    const u = acc.username.replace(/^@/, "");
    try {
      const url = new URL(`https://graph.facebook.com/${graphVer}/${igUserId}`);
      url.searchParams.set(
        "fields",
        `business_discovery.username(${u}){media.limit(${limitPerAccount}){id,media_type,media_product_type,permalink,thumbnail_url,media_url,caption,timestamp,like_count}}`,
      );
      url.searchParams.set("access_token", igToken);

      const res = await fetch(url.toString());
      const body = await res.json();
      if (!res.ok || body?.error) {
        const msg = body?.error?.message ?? `HTTP ${res.status}`;
        perAccount[u] = { new: 0, error: msg.slice(0, 200) };
        await admin.from("tip_instagram_accounts").update({ last_synced_at: new Date().toISOString(), last_sync_new: 0, last_sync_error: msg.slice(0, 300) }).eq("username", acc.username);
        continue;
      }

      const media: IgMedia[] = body?.business_discovery?.media?.data ?? [];
      const reels = media.filter((m) => (m.media_product_type === "REELS" || m.media_type === "VIDEO") && m.permalink && !seen.has(m.permalink!));

      const rows: Record<string, unknown>[] = [];
      for (const m of reels) {
        const permalink = m.permalink!;
        let thumb: string | null = null;
        if (m.thumbnail_url) thumb = await rehost(admin, m.thumbnail_url, await sha1Hex(permalink));
        const caption = (m.caption ?? "").trim();
        const title = caption ? caption.split("\n")[0].slice(0, 80) : null;
        rows.push({
          url: permalink,
          title,
          description: caption ? caption.slice(0, 500) : null,
          author: u,
          thumbnail_url: thumb,
          categories: [acc.category],
          source: "instagram_api",
          moderation_status: autoApprove ? "approved" : "pending",
          is_active: true,
        });
        seen.add(permalink);
      }

      if (rows.length > 0) {
        const { error: insErr } = await admin.from("tip_instagrams").insert(rows);
        if (insErr) {
          perAccount[u] = { new: 0, error: insErr.message.slice(0, 200) };
        } else {
          perAccount[u] = { new: rows.length };
          totalNew += rows.length;
        }
      } else {
        perAccount[u] = { new: 0 };
      }

      await admin.from("tip_instagram_accounts").update({
        last_synced_at: new Date().toISOString(),
        last_sync_new: perAccount[u].new,
        last_sync_error: perAccount[u].error ?? null,
        reel_count: (await admin.from("tip_instagrams").select("id", { count: "exact", head: true }).eq("author", u)).count ?? undefined,
      }).eq("username", acc.username);
    } catch (e) {
      perAccount[u] = { new: 0, error: String(e).slice(0, 200) };
      await admin.from("tip_instagram_accounts").update({ last_synced_at: new Date().toISOString(), last_sync_error: String(e).slice(0, 300) }).eq("username", acc.username);
    }
  }

  return jsonResp({ ok: true, accounts: accounts.length, total_new: totalNew, per_account: perAccount });
});
