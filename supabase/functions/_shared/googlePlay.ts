// Google Play Developer API 접근 헬퍼(Deno/edge). 서비스계정 JSON(env GOOGLE_PLAY_SA_KEY)으로
// RS256 JWT 서명 → OAuth 토큰 교환 → androidpublisher v3 호출. 영수증검증·구독상태 조회에 사용.
// 등록·서비스계정 발급: docs/260620_google_iap_setup.md §C.

const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("GOOGLE_PLAY_SA_KEY");
  if (!raw) throw new Error("GOOGLE_PLAY_SA_KEY is not configured");
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("GOOGLE_PLAY_SA_KEY is not valid JSON");
  }
  if (!sa.client_email || !sa.private_key) throw new Error("Invalid service account key");
  return sa;
}

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// 서비스계정으로 androidpublisher 액세스 토큰 발급(JWT bearer grant).
async function getAccessToken(): Promise<string> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(new Uint8Array(sig))}`;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Google token error: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token as string;
}

export interface PlayApiResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

/** androidpublisher GET. path = applications/ 뒤의 경로(예: `app.dewy/purchases/...`). */
export async function playApiGet(path: string): Promise<PlayApiResult> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

/** 소비성 상품 구매 검증. purchaseState: 0=구매완료. obfuscatedExternalAccountId 로 user 대조. */
export async function getProductPurchase(packageName: string, productId: string, token: string) {
  return playApiGet(`${packageName}/purchases/products/${productId}/tokens/${encodeURIComponent(token)}`);
}

/** 구독 v2 상태 조회(토큰 기준). lineItems[].expiryTime, subscriptionState 등. */
export async function getSubscriptionPurchaseV2(packageName: string, token: string) {
  return playApiGet(`${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`);
}
