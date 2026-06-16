// Gmail/Drive OAuth + API 헬퍼(인앱 이메일). googleCalendar.ts 패턴 미러, 같은 Google
// 클라이언트(GOOGLE_CLIENT_ID/SECRET) 재사용 + Gmail·Drive scope. 설계: docs/260616_inapp_email_design.md.
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";

// 최소 권한: 읽기(readonly) + 보내기(send) + 앱이 만든 Drive 파일(drive.file).
export const MAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

const clientId = () => Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const clientSecret = () => Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

export function isMailConfigured(): boolean {
  return !!clientId() && !!clientSecret();
}

export function authUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: MAIL_SCOPES,
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
  if (!res.ok) throw new Error(`google mail token exchange failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

export async function refresh(refreshToken: string): Promise<GoogleTokens> {
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
  if (!res.ok) throw new Error(`google mail token refresh failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

// 유효 access_token 확보(만료 임박 시 refresh + 저장). admin = service-role supabase client.
export async function getValidAccessToken(
  admin: { from: (t: string) => any },
  userId: string,
): Promise<string | null> {
  const { data: acc } = await admin
    .from("user_mail_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();
  if (!acc) return null;
  const expMs = acc.token_expires_at ? new Date(acc.token_expires_at).getTime() : 0;
  if (acc.access_token && expMs - Date.now() > 60_000) return acc.access_token;
  if (!acc.refresh_token) return acc.access_token ?? null;
  try {
    const t = await refresh(acc.refresh_token);
    if (!t.access_token) return acc.access_token ?? null;
    await admin
      .from("user_mail_accounts")
      .update({
        access_token: t.access_token,
        token_expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "google");
    return t.access_token;
  } catch (e) {
    console.error("googleMail refresh failed", e);
    return acc.access_token ?? null;
  }
}

export async function gmailFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return await fetch(`${GMAIL_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });
}

// Drive 업로드(대용량 첨부 대체) → anyoneWithLink 공유 링크 반환.
export async function driveUploadAndShare(
  accessToken: string,
  name: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | null> {
  // 1) 멀티파트 업로드.
  const boundary = "dewy" + crypto.randomUUID();
  const meta = JSON.stringify({ name });
  const enc = new TextEncoder();
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const post = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(pre.length + bytes.length + post.length);
  body.set(pre, 0); body.set(bytes, pre.length); body.set(post, pre.length + bytes.length);

  const up = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!up.ok) { console.error("drive upload failed", up.status, await up.text()); return null; }
  const { id } = await up.json();
  if (!id) return null;

  // 2) 링크 공유 권한.
  const perm = await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!perm.ok) console.error("drive permission failed", perm.status, await perm.text());
  return `https://drive.google.com/file/d/${id}/view?usp=sharing`;
}
