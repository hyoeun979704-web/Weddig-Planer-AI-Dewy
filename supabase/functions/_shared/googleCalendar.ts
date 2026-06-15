// Google Calendar API v3 래퍼 — OAuth 토큰 교환/갱신 + 이벤트 CRUD/증분목록.
// gcal-oauth-callback / gcal-sync 가 공유한다(복붙 방지). 종일 일정만 다룬다.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
}

function clientId(): string { return Deno.env.get("GOOGLE_CLIENT_ID")!; }
function clientSecret(): string { return Deno.env.get("GOOGLE_CLIENT_SECRET")!; }

// 동의 화면 URL — 오프라인(refresh_token) + 매번 동의(prompt=consent)로 refresh_token 확보.
export function googleAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`google token exchange failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`google token refresh failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

// 종일 일정 본문. end.date 는 exclusive(다음 날).
function nextDay(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

function eventBody(title: string, dateYmd: string) {
  return { summary: title, start: { date: dateYmd }, end: { date: nextDay(dateYmd) } };
}

async function gcal(accessToken: string, path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export async function createEvent(accessToken: string, calendarId: string, title: string, dateYmd: string): Promise<string> {
  const res = await gcal(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(eventBody(title, dateYmd)),
  });
  if (!res.ok) throw new Error(`createEvent failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

export async function updateEvent(accessToken: string, calendarId: string, eventId: string, title: string, dateYmd: string): Promise<void> {
  const res = await gcal(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(eventBody(title, dateYmd)),
  });
  // 404(외부에서 삭제됨) 는 무시 — 다음 동기화에서 재생성.
  if (!res.ok && res.status !== 404) throw new Error(`updateEvent failed: ${res.status} ${await res.text()}`);
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const res = await gcal(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`deleteEvent failed: ${res.status} ${await res.text()}`);
  }
}

export interface GCalEvent {
  id: string;
  status?: string; // 'cancelled' 면 삭제됨
  summary?: string;
  start?: { date?: string; dateTime?: string };
}

export interface GCalListResult {
  items: GCalEvent[];
  nextSyncToken: string | null;
}

// 증분 목록 — syncToken 있으면 변경분만, 없으면 최근 1년치 전체(초기 동기화).
export async function listEvents(accessToken: string, calendarId: string, syncToken: string | null): Promise<GCalListResult> {
  const items: GCalEvent[] = [];
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;
  do {
    const p = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "250" });
    if (syncToken) p.set("syncToken", syncToken);
    else p.set("timeMin", new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString());
    if (pageToken) p.set("pageToken", pageToken);
    const res = await gcal(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${p.toString()}`, { method: "GET" });
    // syncToken 만료(410) → 호출측이 전체 재동기화하도록 신호.
    if (res.status === 410) throw new Error("SYNC_TOKEN_EXPIRED");
    if (!res.ok) throw new Error(`listEvents failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    for (const it of (json.items ?? [])) items.push(it as GCalEvent);
    pageToken = json.nextPageToken ?? null;
    nextSyncToken = json.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
}

// Google 이벤트의 시작일을 "YYYY-MM-DD" 로(종일=date, 시간일정=dateTime 의 날짜부분).
export function eventStartYmd(e: GCalEvent): string | null {
  if (e.start?.date) return e.start.date;
  if (e.start?.dateTime) return e.start.dateTime.slice(0, 10);
  return null;
}
