// 외부 이미지 → 공개 Storage 미러링 (핫링크/CORS 우회).
//
// 배경: tip_instagrams 등에서 외부 이미지를 <img src> 로 바로 띄우면
//   - Instagram/일부 CDN 은 Referer 기반 핫링크 차단으로 403,
//   - 브라우저 CORS 로 막히기도 함.
//   그래서 운영자가 입력한 URL 을 "서버에서" 받아 공개 버킷(tip-thumbnails)에
//   복사해두고, 그 공개 URL 을 thumbnail_url 로 쓴다.
//
// 입력 URL 종류:
//   1) 이미지 URL (content-type image/*) → 그대로 다운로드
//   2) 페이지 URL (text/html) → og:image / twitter:image 추출 후 다운로드
//
// 한계: Instagram 프로필/게시물 페이지는 비로그인 서버 요청을 데이터센터 IP 에서
//   403/로그인월로 막는다. 따라서 instagram.com 페이지 URL 자동 미러링은
//   대부분 실패한다 — 운영자가 "직접 이미지 URL" 을 넣어야 확실히 동작.
//
// 호출: POST { url } → { thumbnail_url, source }  (verify_jwt=true: 로그인 필요)

import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";


const BUCKET = "tip-thumbnails";
const MAX_BYTES = 5 * 1024 * 1024; // 버킷 file_size_limit 와 일치
const FETCH_TIMEOUT_MS = 15_000;

// 데스크톱 브라우저처럼 보이게 — 일부 CDN 은 봇 UA 를 막는다.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "text/html,application/xhtml+xml,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

const OG_PATTERNS = [
  /<meta\s+property=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i,
  /<meta\s+content=["']([^"']+)["']\s+property=["']og:image(?::secure_url)?["']/i,
  /<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']/i,
  /<meta\s+property=["']twitter:image["']\s+content=["']([^"']+)["']/i,
  /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// 리다이렉트를 직접 따라가되 매 홉마다 호스트를 검사한다 — public→internal
// 리다이렉트로 SSRF 가드를 우회하는 것을 막기 위함 (redirect:"follow" 는 중간
// 홉을 검사할 수 없다). 최대 5홉.
async function safeFetch(startUrl: string, init: RequestInit = {}): Promise<Response> {
  let url = startUrl;
  for (let hop = 0; hop < 5; hop++) {
    assertPublicHost(url);
    const res = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      await res.body?.cancel();
      url = new URL(loc, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

// SSRF 가드: 이 함수는 service_role 로 임의 URL 을 서버에서 fetch 하므로,
// 내부망/메타데이터/loopback 으로의 요청을 차단한다. (DNS rebinding 등 고급
// 우회까지 막진 못하지만, 명백한 내부 타겟 탐침은 차단 — admin 전용 도구의
// 비례적 방어.)
function assertPublicHost(rawUrl: string): void {
  const host = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("blocked host");
  }
  // IPv4 리터럴 사설/loopback/link-local 범위 차단
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254) ||
      a >= 224 // multicast/reserved
    ) {
      throw new Error("blocked host");
    }
  }
  // IPv6 loopback / unique-local / link-local
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    throw new Error("blocked host");
  }
}

// 헤더의 Content-Length 로 본문을 다 읽기 "전에" 크기를 막는다 (메모리 고갈 방지).
function assertWithinSize(res: Response): void {
  const len = Number(res.headers.get("content-length") ?? "");
  if (Number.isFinite(len) && len > MAX_BYTES) {
    throw new Error(`image too large (${(len / 1048576).toFixed(1)}MB > 5MB)`);
  }
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 입력 URL 에서 실제 이미지 바이트를 얻는다. 페이지면 og:image 로 한 단계 따라간다.
async function resolveImage(
  inputUrl: string,
): Promise<{ bytes: Uint8Array; mime: string; source: "direct" | "og:image"; imageUrl: string }> {
  const res = await safeFetch(inputUrl, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`);
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();

  // 1) 이미지 직접
  if (ct.startsWith("image/")) {
    assertWithinSize(res);
    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, mime: ct.split(";")[0].trim(), source: "direct", imageUrl: inputUrl };
  }

  // 2) HTML → og:image 추출
  if (ct.includes("html") || ct === "") {
    assertWithinSize(res);
    const html = await res.text();
    let found: string | null = null;
    for (const re of OG_PATTERNS) {
      const m = html.match(re);
      if (m?.[1]) {
        found = decodeEntities(m[1].trim());
        break;
      }
    }
    if (!found) throw new Error("no og:image/twitter:image meta tag found on page");
    const imageUrl = new URL(found, res.url || inputUrl).toString();
    const imgRes = await safeFetch(imageUrl, { headers: BROWSER_HEADERS });
    if (!imgRes.ok) throw new Error(`og:image fetch failed: ${imgRes.status}`);
    const imgCt = (imgRes.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
    if (!imgCt.startsWith("image/")) throw new Error(`og:image is not an image (${imgCt})`);
    assertWithinSize(imgRes);
    return {
      bytes: new Uint8Array(await imgRes.arrayBuffer()),
      mime: imgCt,
      source: "og:image",
      imageUrl,
    };
  }

  throw new Error(`unsupported content-type: ${ct}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let inputUrl: string;
  try {
    const body = await req.json();
    inputUrl = String(body?.url ?? "").trim();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (!inputUrl) return json({ error: "url is required" }, 400);
  try {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return json({ error: "only http(s) urls are supported" }, 400);
    }
  } catch {
    return json({ error: "malformed url" }, 400);
  }

  let resolved;
  try {
    resolved = await resolveImage(inputUrl);
  } catch (e) {
    // Instagram 등 차단/og 없음은 정상적인 실패 — 운영자에게 직접 이미지 URL 안내.
    return json({ error: (e as Error).message, hint: "직접 이미지 URL을 입력해 주세요 (Instagram 페이지는 서버 fetch가 차단됩니다)." }, 422);
  }

  if (resolved.bytes.byteLength === 0) return json({ error: "empty image" }, 422);
  if (resolved.bytes.byteLength > MAX_BYTES) {
    return json({ error: `image too large (${(resolved.bytes.byteLength / 1048576).toFixed(1)}MB > 5MB)` }, 413);
  }

  const ext = EXT_BY_MIME[resolved.mime] ?? "jpg";
  const hash = await sha1Hex(resolved.bytes);
  const path = `${hash}.${ext}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, resolved.bytes, { contentType: resolved.mime, upsert: true });
  if (upErr) return json({ error: `storage upload failed: ${upErr.message}` }, 500);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return json({ thumbnail_url: pub.publicUrl, source: resolved.source, imageUrl: resolved.imageUrl });
});
