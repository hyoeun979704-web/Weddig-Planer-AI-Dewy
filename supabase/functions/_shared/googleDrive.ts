// Google Drive API v3 헬퍼 — OAuth(토큰 교환/갱신) + 폴더 보장 + 파일 업로드.
// googleMail.ts 의 driveUploadAndShare 멀티파트 패턴 미러(같은 GOOGLE_CLIENT_ID/SECRET).
// drive.file scope = 앱이 만든 파일/폴더만 접근(최소 권한). drive-* 함수가 공유.
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

// 최소 권한: 앱이 만든 Drive 파일(drive.file) + 표시용 이메일.
export const DRIVE_SCOPES = [
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

export function isDriveConfigured(): boolean {
  return !!clientId() && !!clientSecret();
}

// 동의 화면 URL — 오프라인(refresh_token) + 매번 동의(prompt=consent)로 refresh_token 확보.
export function authUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPES,
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
  if (!res.ok) throw new Error(`google drive token exchange failed: ${res.status} ${await res.text()}`);
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
  if (!res.ok) throw new Error(`google drive token refresh failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch(USERINFO, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.email as string) ?? null;
  } catch {
    return null;
  }
}

// 유효 access_token 확보(만료 임박 시 refresh + 저장). admin = service-role supabase client.
export async function getValidAccessToken(
  admin: { from: (t: string) => any },
  userId: string,
): Promise<string | null> {
  const { data: acc } = await admin
    .from("user_drive_accounts")
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
      .from("user_drive_accounts")
      .update({
        access_token: t.access_token,
        token_expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "google");
    return t.access_token;
  } catch (e) {
    console.error("googleDrive refresh failed", e);
    return acc.access_token ?? null;
  }
}

// 폴더 보장: 기존 folderId 가 살아있으면(휴지통 아님) 그대로, 아니면 새로 만들어 id 반환.
export async function ensureFolder(
  accessToken: string,
  name: string,
  existingFolderId: string | null,
): Promise<string | null> {
  if (existingFolderId) {
    const g = await fetch(`${DRIVE_FILES}/${existingFolderId}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (g.ok) {
      const j = await g.json();
      if (j?.id && !j.trashed) return j.id as string;
    }
    // 404/trashed → 아래에서 재생성.
  }
  const res = await fetch(`${DRIVE_FILES}?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) {
    console.error("drive ensureFolder failed", res.status, await res.text());
    return null;
  }
  const { id } = await res.json();
  return (id as string) ?? null;
}

// 폴더에 파일 업로드(멀티파트) → file id. 실패 시 null(호출측이 건너뛰고 다음 동기화에 재시도).
export async function uploadToFolder(
  accessToken: string,
  folderId: string,
  name: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | null> {
  const boundary = "dewy" + crypto.randomUUID();
  const meta = JSON.stringify({ name, parents: [folderId] });
  const enc = new TextEncoder();
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const post = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(pre.length + bytes.length + post.length);
  body.set(pre, 0);
  body.set(bytes, pre.length);
  body.set(post, pre.length + bytes.length);

  const up = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!up.ok) {
    console.error("drive upload failed", up.status, await up.text());
    return null;
  }
  const { id } = await up.json();
  return (id as string) ?? null;
}
