// Kakao 톡캘린더 API 어댑터 + OAuth. Google 과 동일한 CalendarAdapter/CalendarOAuth 계약을
// 구현해 calendarSync.runSync 가 그대로 재사용한다.
//
// ⚠️ 카카오 API 의 정확한 요청/응답 필드는 talk_calendar 권한 승인 + 실호출로 검증 필요.
//    여기 엔드포인트·필드는 카카오 디벨로퍼 톡캘린더 문서 기준 best-effort 이며, 이 환경에선
//    실행 검증이 불가능하다(정적/타입만 통과). 배포·승인 후 실제 응답으로 맞춰야 한다.
//    Kakao 는 증분 sync 토큰이 없어 기간(window) 목록 기반 → pull 삭제 전파는 비활성.
import type { CalendarAdapter, CalendarOAuth, CalListResult, CalTokens, CalEvent } from "./calendarSync.ts";

const AUTH_URL = "https://kauth.kakao.com/oauth/authorize";
const TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const API_BASE = "https://kapi.kakao.com/v2/api/calendar";
const SCOPE = "talk_calendar"; // 읽기/쓰기 권한(비즈니스 승인 필요)

function restKey(): string { return Deno.env.get("KAKAO_REST_API_KEY")!; }
function clientSecret(): string | null { return Deno.env.get("KAKAO_CLIENT_SECRET") ?? null; }

function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}
// 종일 일정 time 객체(RFC3339, KST). end 는 다음 날 00:00.
function timeObj(ymd: string) {
  return { start_at: `${ymd}T00:00:00Z`, end_at: `${nextDay(ymd)}T00:00:00Z`, time_zone: "Asia/Seoul", all_day: true };
}

async function tokenRequest(params: Record<string, string>): Promise<CalTokens> {
  const body = new URLSearchParams({ client_id: restKey(), ...params });
  const sec = clientSecret();
  if (sec) body.set("client_secret", sec);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`kakao token failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function kapi(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded", ...(init.headers ?? {}) },
  });
}

export const kakaoOAuth: CalendarOAuth = {
  provider: "kakao",
  authUrl: (redirectUri, state) => {
    const p = new URLSearchParams({
      client_id: restKey(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
    });
    return `${AUTH_URL}?${p.toString()}`;
  },
  exchangeCode: (code, redirectUri) =>
    tokenRequest({ grant_type: "authorization_code", redirect_uri: redirectUri, code }),
};

export const kakaoAdapter: CalendarAdapter = {
  provider: "kakao",
  pullHandlesDeletions: false, // 증분 토큰 없음 → 목록 부재만으로 삭제 단정 안 함(오삭제 방지)
  refresh: (rt) => tokenRequest({ grant_type: "refresh_token", refresh_token: rt }),

  createEvent: async (token, _calId, title, ymd): Promise<string> => {
    const body = new URLSearchParams({ event: JSON.stringify({ title, time: timeObj(ymd) }) });
    const res = await kapi(token, `/create/event`, { method: "POST", body });
    if (!res.ok) throw new Error(`kakao create failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    return json.event_id as string;
  },

  updateEvent: async (token, _calId, eventId, title, ymd): Promise<void> => {
    const body = new URLSearchParams({ event_id: eventId, event: JSON.stringify({ title, time: timeObj(ymd) }) });
    const res = await kapi(token, `/update/event/host`, { method: "POST", body });
    if (!res.ok && res.status !== 404) throw new Error(`kakao update failed: ${res.status} ${await res.text()}`);
  },

  deleteEvent: async (token, _calId, eventId): Promise<void> => {
    const res = await kapi(token, `/delete/event?event_id=${encodeURIComponent(eventId)}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`kakao delete failed: ${res.status} ${await res.text()}`);
  },

  // Kakao 는 syncToken 이 없으므로 기간(과거 1년~미래 2년) 목록을 매번 조회한다.
  listEvents: async (token, _calId, _syncToken): Promise<CalListResult> => {
    const from = new Date(Date.now() - 365 * 864e5).toISOString();
    const to = new Date(Date.now() + 730 * 864e5).toISOString();
    const res = await kapi(token, `/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=100`, { method: "GET" });
    if (!res.ok) throw new Error(`kakao list failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const items: CalEvent[] = ((json.events ?? []) as any[]).map((e) => {
      const startAt: string | undefined = e.time?.start_at;
      return { id: String(e.id), title: e.title ?? "", ymd: startAt ? startAt.slice(0, 10) : null };
    });
    return { items, nextSyncToken: null };
  },
};
