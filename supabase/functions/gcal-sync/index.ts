// Google 캘린더 양방향 동기화 — 인증된 사용자가 호출(verify_jwt=true).
//   action: 'status' | 'disconnect' | 'sync'
//   sync = PUSH(앱→Google) + PULL(Google→앱) 1회 정합화. 매핑(calendar_event_links)으로
//          에코 루프를 막고, 양쪽 어디서 바꿔도 결국 같은 상태로 수렴한다.
import { corsHeaders } from "../_shared/cors.ts";
import {
  refreshAccessToken,
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  eventStartYmd,
} from "../_shared/googleCalendar.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROVIDER = "google";

interface Account {
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  sync_token: string | null;
  calendar_id: string;
}

// 만료 임박(60초)이면 refresh_token 으로 access_token 재발급 + 저장.
async function freshAccessToken(admin: SupabaseClient, acc: Account): Promise<string> {
  const exp = acc.token_expires_at ? new Date(acc.token_expires_at).getTime() : 0;
  if (acc.access_token && exp > Date.now() + 60_000) return acc.access_token;
  if (!acc.refresh_token) throw new Error("no_refresh_token");
  const t = await refreshAccessToken(acc.refresh_token);
  await admin
    .from("user_calendar_accounts")
    .update({
      access_token: t.access_token,
      token_expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
    })
    .eq("user_id", acc.user_id)
    .eq("provider", PROVIDER);
  return t.access_token;
}

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

    const admin = createClient(supabaseUrl, serviceKey);
    const { action } = await req.json().catch(() => ({ action: "sync" }));

    const { data: accRow } = await admin
      .from("user_calendar_accounts")
      .select("user_id, access_token, refresh_token, token_expires_at, sync_token, calendar_id")
      .eq("user_id", userId)
      .eq("provider", PROVIDER)
      .maybeSingle();

    if (action === "status") return json({ connected: !!accRow?.refresh_token });

    if (action === "disconnect") {
      await admin.from("calendar_event_links").delete().eq("user_id", userId).eq("provider", PROVIDER);
      await admin.from("user_calendar_accounts").delete().eq("user_id", userId).eq("provider", PROVIDER);
      return json({ ok: true });
    }

    // ── action === 'sync' ──
    if (!accRow?.refresh_token) return json({ error: "not_connected" }, 400);
    const acc = accRow as Account;
    const calId = acc.calendar_id || "primary";
    let token = await freshAccessToken(admin, acc);

    // 현재 내 일정 + 매핑 로드.
    const [{ data: itemRows }, { data: linkRows }] = await Promise.all([
      admin.from("user_schedule_items").select("id, title, scheduled_date, completed").eq("user_id", userId),
      admin.from("calendar_event_links").select("schedule_item_id, external_event_id").eq("user_id", userId).eq("provider", PROVIDER),
    ]);
    const items = (itemRows ?? []) as { id: string; title: string; scheduled_date: string; completed: boolean }[];
    const linkByItem = new Map<string, string>();
    for (const l of (linkRows ?? []) as { schedule_item_id: string; external_event_id: string }[]) {
      linkByItem.set(l.schedule_item_id, l.external_event_id);
    }

    // ── PUSH: 앱 → Google ──
    let pushed = 0;
    const itemIds = new Set<string>();
    for (const it of items) {
      itemIds.add(it.id);
      if (!DATE_RE.test(it.scheduled_date)) continue;
      const title = `${it.completed ? "✓ " : ""}${it.title}`;
      const existing = linkByItem.get(it.id);
      try {
        if (existing) {
          await updateEvent(token, calId, existing, title, it.scheduled_date);
        } else {
          const eid = await createEvent(token, calId, title, it.scheduled_date);
          await admin.from("calendar_event_links").insert({
            user_id: userId, provider: PROVIDER, schedule_item_id: it.id, external_event_id: eid,
          });
          linkByItem.set(it.id, eid);
          pushed++;
        }
      } catch (e) {
        console.warn("push item failed", it.id, e);
      }
    }
    // 앱에서 삭제된 항목 → Google 이벤트도 삭제 + 매핑 제거.
    for (const [itemId, eid] of linkByItem) {
      if (itemIds.has(itemId)) continue;
      try { await deleteEvent(token, calId, eid); } catch (e) { console.warn("push delete failed", eid, e); }
      await admin.from("calendar_event_links").delete().eq("user_id", userId).eq("provider", PROVIDER).eq("schedule_item_id", itemId);
    }

    // ── PULL: Google → 앱 ──
    // 매핑 역방향(external_event_id → schedule_item_id) 재로드(푸시로 새 매핑 추가됨).
    const { data: links2 } = await admin
      .from("calendar_event_links").select("schedule_item_id, external_event_id")
      .eq("user_id", userId).eq("provider", PROVIDER);
    const itemByExt = new Map<string, string>();
    for (const l of (links2 ?? []) as { schedule_item_id: string; external_event_id: string }[]) {
      itemByExt.set(l.external_event_id, l.schedule_item_id);
    }

    let listed;
    try {
      listed = await listEvents(token, calId, acc.sync_token);
    } catch (e) {
      if (String((e as Error).message).includes("SYNC_TOKEN_EXPIRED")) {
        token = await freshAccessToken(admin, acc);
        listed = await listEvents(token, calId, null); // 전체 재동기화
      } else throw e;
    }

    let pulled = 0;
    for (const ev of listed.items) {
      const mappedItemId = itemByExt.get(ev.id);
      if (ev.status === "cancelled") {
        if (mappedItemId) {
          // on delete cascade 가 링크도 정리.
          await admin.from("user_schedule_items").delete().eq("id", mappedItemId).eq("user_id", userId);
        }
        continue;
      }
      const ymd = eventStartYmd(ev);
      if (!ymd || !DATE_RE.test(ymd)) continue;
      const title = (ev.summary ?? "(제목 없음)").replace(/^✓ /, "");
      if (mappedItemId) {
        // 양쪽 모두 가진 항목 — Google 쪽 최신값으로 앱 항목 갱신.
        await admin.from("user_schedule_items").update({ title, scheduled_date: ymd }).eq("id", mappedItemId).eq("user_id", userId);
      } else {
        // Google 에서 새로 생긴 일정 → 앱에 추가 + 매핑.
        const { data: ins } = await admin
          .from("user_schedule_items")
          .insert({ user_id: userId, title, scheduled_date: ymd, category: "general", source: "gcal", completed: false })
          .select("id")
          .single();
        if (ins?.id) {
          await admin.from("calendar_event_links").insert({
            user_id: userId, provider: PROVIDER, schedule_item_id: ins.id, external_event_id: ev.id,
          });
          pulled++;
        }
      }
    }

    if (listed.nextSyncToken) {
      await admin.from("user_calendar_accounts").update({ sync_token: listed.nextSyncToken })
        .eq("user_id", userId).eq("provider", PROVIDER);
    }

    return json({ ok: true, pushed, pulled });
  } catch (e) {
    console.error("gcal-sync error", e);
    return json({ error: "internal", detail: String((e as Error).message) }, 500);
  }
});
