// Edge Function: push_outbox 를 비우는 디스패처. pg_cron 이 1분 주기로 호출(파일만 커밋).
//
// 가드(docs/push-notification-scenarios.md 발송 원칙):
//   - 사용자 알림 설정(user_notification_prefs) 존중. 마스터 push OFF → 발송 안 함.
//   - 카테고리 매핑: community/partner=서비스(push), schedule=push&&schedule,
//     vendor=push&&favorite&&마케팅동의, event=push&&마케팅동의.
//   - 조용한 시간(KST 21:00~08:00)에는 발송하지 않고 다음 실행으로 미룸.
//   - 1인당 24시간 내 최대 3건(빈도 상한).
// 실제 FCM 발송은 기존 send-push 함수에 위임(코드 중복 방지).
//
// 운영 전: device_tokens/Firebase/send-push 가 모두 준비돼야 실제 발송된다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_CAP = 3;
const BATCH = 100;
// 설정상 차단된 행을 소비(재조회 방지)하면서 실제 발송과 구분하기 위한 attempts 마커.
const SUPPRESSED_MARKER = 999;

type OutboxRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  route: string | null;
  category: "community" | "partner" | "schedule" | "vendor" | "event";
  attempts: number;
};

type Prefs = {
  push: boolean;
  marketing: boolean;
  schedule: boolean;
  favorite: boolean;
};

const DEFAULT_PREFS: Prefs = { push: true, marketing: false, schedule: true, favorite: true };

/** KST 현재 시각이 조용한 시간(21:00~08:00)인지. */
function isQuietHoursKST(now = new Date()): boolean {
  const kstHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  ) % 24;
  return kstHour >= 21 || kstHour < 8;
}

/** 카테고리별 발송 허용 여부(설정 + 마케팅 동의). */
function isAllowed(
  category: OutboxRow["category"],
  prefs: Prefs,
  marketingConsent: boolean,
): boolean {
  if (!prefs.push) return false;
  switch (category) {
    case "community":
    case "partner":
      return true;
    case "schedule":
      return prefs.schedule;
    case "vendor":
      return prefs.favorite && prefs.marketing && marketingConsent;
    case "event":
      return prefs.marketing && marketingConsent;
    default:
      return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // 조용한 시간이면 이번 실행은 스킵(미발송 행은 그대로 남아 다음 오전에 발송).
  if (isQuietHoursKST()) return json({ skipped: "quiet_hours" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: rows, error } = await supabase
    .from("push_outbox")
    .select("id, user_id, title, body, route, category, attempts")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) return json({ error: error.message }, 500);
  if (!rows?.length) return json({ sent: 0, processed: 0 });

  const prefsCache = new Map<string, Prefs>();
  const consentCache = new Map<string, boolean>();
  const sentTodayCache = new Map<string, number>();

  async function getPrefs(userId: string): Promise<Prefs> {
    if (prefsCache.has(userId)) return prefsCache.get(userId)!;
    const { data } = await supabase
      .from("user_notification_prefs")
      .select("push, marketing, schedule, favorite")
      .eq("user_id", userId)
      .maybeSingle();
    const p = { ...DEFAULT_PREFS, ...(data ?? {}) } as Prefs;
    prefsCache.set(userId, p);
    return p;
  }
  async function getMarketingConsent(userId: string): Promise<boolean> {
    if (consentCache.has(userId)) return consentCache.get(userId)!;
    const { data } = await supabase
      .from("user_consents_canonical")
      .select("agreed")
      .eq("user_id", userId)
      .eq("consent_type", "marketing_v1")
      .order("agreed_at", { ascending: false })
      .limit(1);
    const agreed = !!data?.[0]?.agreed;
    consentCache.set(userId, agreed);
    return agreed;
  }
  async function getSentToday(userId: string): Promise<number> {
    if (sentTodayCache.has(userId)) return sentTodayCache.get(userId)!;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    // 실제 발송만 카운트 — 차단으로 소비된(attempts=SUPPRESSED_MARKER) 행은 제외.
    const { count } = await supabase
      .from("push_outbox")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("sent_at", since)
      .neq("attempts", SUPPRESSED_MARKER);
    const c = count ?? 0;
    sentTodayCache.set(userId, c);
    return c;
  }

  let sent = 0;
  let suppressed = 0;
  for (const row of rows as OutboxRow[]) {
    const prefs = await getPrefs(row.user_id);
    const consent = row.category === "vendor" || row.category === "event"
      ? await getMarketingConsent(row.user_id)
      : false;

    // 설정상 차단 → 발송 안 함. 재시도 방지 위해 sent_at 으로 마킹(=소비).
    if (!isAllowed(row.category, prefs, consent)) {
      await supabase
        .from("push_outbox")
        .update({ sent_at: new Date().toISOString(), attempts: SUPPRESSED_MARKER })
        .eq("id", row.id);
      suppressed++;
      continue;
    }

    // 빈도 상한 — 초과 시 이번 실행에서 보류(다음 24h 윈도우에서 재시도).
    if ((await getSentToday(row.user_id)) >= DAILY_CAP) {
      suppressed++;
      continue;
    }

    // 실제 발송은 send-push 에 위임.
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        user_id: row.user_id,
        title: row.title,
        body: row.body,
        data: row.route ? { route: row.route } : undefined,
      }),
    });

    if (res.ok) {
      await supabase
        .from("push_outbox")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sentTodayCache.set(row.user_id, (sentTodayCache.get(row.user_id) ?? 0) + 1);
      sent++;
    } else {
      // 발송 실패 — sent_at 을 비워둔 채 attempts 만 올려 다음 실행에서 재시도.
      await supabase
        .from("push_outbox")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
    }
  }

  return json({ processed: rows.length, sent, suppressed });
});
