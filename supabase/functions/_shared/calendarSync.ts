// 캘린더 동기화 코어(provider 공용) — Google·Kakao 가 공유하는 양방향 정합화 로직.
// provider 별 차이(인증 URL·이벤트 API·증분 토큰 유무)는 어댑터로 캡슐화하고, 앱 일정
// (user_schedule_items)을 허브로 보는 push/pull 정합화는 여기 한 곳에 둔다(드리프트 방지).
//
// 허브-스포크: 앱이 source of truth. 각 provider 는 앱과 독립 양방향. provider 간 전파는
// 앱을 거쳐 일어난다(앱→A push, B→앱 pull). 매핑(calendar_event_links)이 provider 별로
// 분리돼 중복·에코를 막는다.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface CalTokens { access_token: string; refresh_token?: string; expires_in: number; }
export interface CalEvent { id: string; status?: string; title: string; ymd: string | null; }
export interface CalListResult { items: CalEvent[]; nextSyncToken: string | null; }

export interface CalAccount {
  user_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  sync_token: string | null;
  calendar_id: string;
}

// provider 별 캘린더 API 어댑터.
export interface CalendarAdapter {
  provider: "google" | "kakao";
  /** pull 응답이 삭제(취소)를 알려주는가. Google=true(showDeleted), Kakao=false(목록에 없음→
   *  안전상 삭제 전파 안 함 — 범위 밖 항목 오삭제 방지). */
  pullHandlesDeletions: boolean;
  refresh(refreshToken: string): Promise<CalTokens>;
  createEvent(token: string, calId: string, title: string, ymd: string): Promise<string>;
  updateEvent(token: string, calId: string, eventId: string, title: string, ymd: string): Promise<void>;
  deleteEvent(token: string, calId: string, eventId: string): Promise<void>;
  listEvents(token: string, calId: string, syncToken: string | null): Promise<CalListResult>;
}

// provider 별 OAuth.
export interface CalendarOAuth {
  provider: "google" | "kakao";
  authUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<CalTokens>;
}

// 만료 임박(60초)이면 refresh → 저장 후 access_token 반환.
async function freshToken(admin: SupabaseClient, adapter: CalendarAdapter, acc: CalAccount): Promise<string> {
  const exp = acc.token_expires_at ? new Date(acc.token_expires_at).getTime() : 0;
  if (acc.access_token && exp > Date.now() + 60_000) return acc.access_token;
  if (!acc.refresh_token) throw new Error("no_refresh_token");
  const t = await adapter.refresh(acc.refresh_token);
  await admin.from("user_calendar_accounts").update({
    access_token: t.access_token,
    token_expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
  }).eq("user_id", acc.user_id).eq("provider", adapter.provider);
  return t.access_token;
}

export async function runSync(
  admin: SupabaseClient,
  userId: string,
  adapter: CalendarAdapter,
  account: CalAccount,
): Promise<{ pushed: number; pulled: number }> {
  const provider = adapter.provider;
  const calId = account.calendar_id || "primary";
  let token = await freshToken(admin, adapter, account);

  const [{ data: itemRows }, { data: linkRows }] = await Promise.all([
    admin.from("user_schedule_items").select("id, title, scheduled_date, completed").eq("user_id", userId),
    admin.from("calendar_event_links").select("schedule_item_id, external_event_id").eq("user_id", userId).eq("provider", provider),
  ]);
  const items = (itemRows ?? []) as { id: string; title: string; scheduled_date: string; completed: boolean }[];
  const linkByItem = new Map<string, string>();
  for (const l of (linkRows ?? []) as { schedule_item_id: string; external_event_id: string }[]) {
    linkByItem.set(l.schedule_item_id, l.external_event_id);
  }

  // ── PUSH: 앱 → provider ──
  let pushed = 0;
  const itemIds = new Set<string>();
  for (const it of items) {
    itemIds.add(it.id);
    if (!DATE_RE.test(it.scheduled_date)) continue;
    const title = `${it.completed ? "✓ " : ""}${it.title}`;
    const existing = linkByItem.get(it.id);
    try {
      if (existing) {
        await adapter.updateEvent(token, calId, existing, title, it.scheduled_date);
      } else {
        const eid = await adapter.createEvent(token, calId, title, it.scheduled_date);
        await admin.from("calendar_event_links").insert({ user_id: userId, provider, schedule_item_id: it.id, external_event_id: eid });
        linkByItem.set(it.id, eid);
        pushed++;
      }
    } catch (e) { console.warn(`[${provider}] push item failed`, it.id, e); }
  }
  // 앱에서 삭제된 항목 → provider 이벤트 삭제 + 매핑 제거.
  for (const [itemId, eid] of linkByItem) {
    if (itemIds.has(itemId)) continue;
    try { await adapter.deleteEvent(token, calId, eid); } catch (e) { console.warn(`[${provider}] push delete failed`, eid, e); }
    await admin.from("calendar_event_links").delete().eq("user_id", userId).eq("provider", provider).eq("schedule_item_id", itemId);
  }

  // ── PULL: provider → 앱 ──
  const { data: links2 } = await admin.from("calendar_event_links")
    .select("schedule_item_id, external_event_id").eq("user_id", userId).eq("provider", provider);
  const itemByExt = new Map<string, string>();
  for (const l of (links2 ?? []) as { schedule_item_id: string; external_event_id: string }[]) {
    itemByExt.set(l.external_event_id, l.schedule_item_id);
  }

  let listed: CalListResult;
  try {
    listed = await adapter.listEvents(token, calId, account.sync_token);
  } catch (e) {
    if (String((e as Error).message).includes("SYNC_TOKEN_EXPIRED")) {
      token = await freshToken(admin, adapter, account);
      listed = await adapter.listEvents(token, calId, null);
    } else throw e;
  }

  let pulled = 0;
  for (const ev of listed.items) {
    const mappedItemId = itemByExt.get(ev.id);
    if (ev.status === "cancelled") {
      if (adapter.pullHandlesDeletions && mappedItemId) {
        await admin.from("user_schedule_items").delete().eq("id", mappedItemId).eq("user_id", userId);
      }
      continue;
    }
    if (!ev.ymd || !DATE_RE.test(ev.ymd)) continue;
    const title = (ev.title || "(제목 없음)").replace(/^✓ /, "");
    if (mappedItemId) {
      await admin.from("user_schedule_items").update({ title, scheduled_date: ev.ymd }).eq("id", mappedItemId).eq("user_id", userId);
    } else {
      const { data: ins } = await admin.from("user_schedule_items")
        .insert({ user_id: userId, title, scheduled_date: ev.ymd, category: "general", source: provider, completed: false })
        .select("id").single();
      if (ins?.id) {
        await admin.from("calendar_event_links").insert({ user_id: userId, provider, schedule_item_id: ins.id, external_event_id: ev.id });
        pulled++;
      }
    }
  }

  if (listed.nextSyncToken) {
    await admin.from("user_calendar_accounts").update({ sync_token: listed.nextSyncToken })
      .eq("user_id", userId).eq("provider", provider);
  }

  return { pushed, pulled };
}
