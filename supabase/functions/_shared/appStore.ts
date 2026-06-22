// App Store Server API 접근 헬퍼(Deno/edge). App Store Connect 의 In-App Purchase 키(.p8, ES256)로
// JWT 를 서명해 api.storekit(.sandbox).itunes.apple.com 을 호출한다. 영수증검증(iap-verify-apple)·
// 서버알림 재조회(apple-notifications-v2)에 사용. 키 발급·등록: docs/260622_apple_iap_setup.md.
//
// 보안 노트: 응답의 signedTransactionInfo/signedRenewalInfo 는 JWS(Apple 서명)이지만, 본 모듈은
// **우리 자격증명으로 인증된 Apple 서버 API(TLS) 응답**에서 받은 값만 디코드해 신뢰한다 — 즉
// transactionId/originalTransactionId 로 Apple 에 **직접 재조회한 권위 데이터**다(서버알림의 위조
// 가능한 payload 가 아니라). play-rtdn 이 Google 에 재조회한 값을 신뢰하는 것과 동일한 패턴.

const ENV = (k: string) => Deno.env.get(k);

export const APPLE_BUNDLE_ID = ENV("APPLE_BUNDLE_ID") || "app.dewy";

const PROD_BASE = "https://api.storekit.itunes.apple.com";
const SBX_BASE = "https://api.storekit-sandbox.itunes.apple.com";

// 조회 환경: production | sandbox | auto(기본 — prod 먼저, 미발견 시 sandbox 재시도).
function envBases(): string[] {
  const e = (ENV("APPLE_IAP_ENV") || "auto").toLowerCase();
  if (e === "production") return [PROD_BASE];
  if (e === "sandbox") return [SBX_BASE];
  return [PROD_BASE, SBX_BASE];
}

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlFromString(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}
function b64urlDecodeToString(seg: string): string {
  const pad = seg.length % 4 === 0 ? "" : "=".repeat(4 - (seg.length % 4));
  const bin = atob(seg.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** JWS(헤더.payload.서명)의 payload 만 디코드. 출처가 인증된 Apple API 라 서명검증 없이 신뢰(상단 노트). */
export function decodeJws<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("invalid JWS");
  return JSON.parse(b64urlDecodeToString(parts[1])) as T;
}

function pkcs8FromP8(pem: string): ArrayBuffer {
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

// App Store Server API 용 ES256 JWT 발급(20분 미만 유효). aud=appstoreconnect-v1, bid=번들ID.
async function makeJwt(): Promise<string> {
  const keyId = ENV("APPLE_IAP_KEY_ID");
  const issuerId = ENV("APPLE_IAP_ISSUER_ID");
  const p8 = ENV("APPLE_IAP_PRIVATE_KEY");
  if (!keyId || !issuerId || !p8) throw new Error("Apple IAP credentials are not configured");

  const now = Math.floor(Date.now() / 1000);
  const header = b64urlFromString(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = b64urlFromString(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + 600, aud: "appstoreconnect-v1", bid: APPLE_BUNDLE_ID }),
  );
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8FromP8(p8),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  // WebCrypto ECDSA 서명 = raw r||s(64바이트) → JWS ES256 가 기대하는 형식 그대로.
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

export interface AppleApiResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

async function appStoreGet(path: string): Promise<AppleApiResult> {
  const jwt = await makeJwt();
  let last: AppleApiResult = { ok: false, status: 0, data: {} };
  for (const base of envBases()) {
    const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${jwt}` } });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    last = { ok: res.ok, status: res.status, data };
    if (res.ok) return last;
    // 미발견(404 / 4040010 TransactionIdNotFound)만 다음(sandbox) 재시도. 그 외(401 등)는 즉시 반환.
    const code = (data as { errorCode?: number }).errorCode;
    if (res.status !== 404 && code !== 4040010) return last;
  }
  return last;
}

// JWSTransactionDecodedPayload 의 필요한 필드(부분).
export interface AppleTransaction {
  bundleId?: string;
  productId?: string;
  type?: string; // "Consumable" | "Auto-Renewable Subscription" | ...
  transactionId?: string;
  originalTransactionId?: string;
  appAccountToken?: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  [k: string]: unknown;
}

/** 단일 거래 조회(소비성 영수증검증용). GET /inApps/v1/transactions/{id}. */
export async function getTransactionInfo(
  transactionId: string,
): Promise<{ ok: boolean; status: number; tx?: AppleTransaction }> {
  const r = await appStoreGet(`/inApps/v1/transactions/${encodeURIComponent(transactionId)}`);
  if (!r.ok) return { ok: false, status: r.status };
  const signed = (r.data as { signedTransactionInfo?: string }).signedTransactionInfo;
  if (!signed) return { ok: false, status: r.status };
  return { ok: true, status: r.status, tx: decodeJws<AppleTransaction>(signed) };
}

// 구독 상태코드: 1=active, 2=expired, 3=billing retry, 4=grace period, 5=revoked.
export const APPLE_SUB_ACTIVE = new Set<number>([1, 3, 4]);

/** 구독 최신 상태 조회. GET /inApps/v1/subscriptions/{transactionId}. */
export async function getSubscriptionStatus(
  transactionId: string,
): Promise<{ ok: boolean; status: number; subStatus?: number; tx?: AppleTransaction }> {
  const r = await appStoreGet(`/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`);
  if (!r.ok) return { ok: false, status: r.status };
  const groups =
    (r.data as { data?: Array<{ lastTransactions?: Array<{ status?: number; signedTransactionInfo?: string }> }> })
      .data ?? [];
  for (const g of groups) {
    for (const lt of g.lastTransactions ?? []) {
      if (!lt.signedTransactionInfo) continue;
      return { ok: true, status: r.status, subStatus: lt.status, tx: decodeJws<AppleTransaction>(lt.signedTransactionInfo) };
    }
  }
  return { ok: true, status: r.status };
}
