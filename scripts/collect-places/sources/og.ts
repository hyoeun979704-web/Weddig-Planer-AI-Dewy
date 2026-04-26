// Hosts that commonly serve referrer-locked or thumbnail-only assets that
// later 403 in a browser. Skip these in favor of the next candidate.
const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "blog.naver.com",
  "cafe.naver.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
];

// URL substrings that strongly suggest a tiny / wrong asset:
// favicon, logo, sprite, search-thumbnail size markers.
const LOW_QUALITY_PATTERNS = [
  /favicon/i,
  /\/logo[._/-]/i,
  /sprite/i,
  /icon[._/-]/i,
  /thumb(nail)?[._/-]/i,
  /\bs\d{2,3}_/i, // Naver phinf size markers like /s120_/, /s150_/
  /search\.pstatic\.net/i,
];

const META_TIMEOUT_MS = 6000;
const MIN_BYTES = 30_000; // 30KB — below this, almost certainly a thumbnail/icon

const OG_RE = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
const OG_RE_REVERSED = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i;
const TWITTER_RE = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i;

export function isCrawlableHomepage(url: string | null | undefined): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  return !SOCIAL_HOSTS.some((host) => lower.includes(host));
}

function isLowQualityUrl(url: string): boolean {
  return LOW_QUALITY_PATTERNS.some((re) => re.test(url));
}

// HEAD probe — accept only if the asset's Content-Length is plausibly photo-
// sized. Many sites return 200 OK for misconfigured images, so this guards
// against tiny logos / search thumbs sneaking in.
async function probeSize(url: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DewyBot/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const len = res.headers.get("content-length");
    return len ? parseInt(len, 10) : null;
  } catch {
    return null;
  }
}

function resolveUrl(found: string, base: string): string | null {
  try {
    return new URL(found, base).toString();
  } catch {
    return null;
  }
}

export async function fetchOgImage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DewyBot/1.0; +https://dewy-wedding.com/)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html") && !ctype.includes("application/xhtml")) {
      return null;
    }
    const reader = res.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let html = "";
    let total = 0;
    while (total < 256 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      total += value.byteLength;
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => undefined);

    const match =
      html.match(OG_RE) ?? html.match(OG_RE_REVERSED) ?? html.match(TWITTER_RE);
    if (!match) return null;
    const raw = match[1].trim();
    if (!raw) return null;
    const resolved = resolveUrl(raw, url);
    if (!resolved) return null;

    // Filter out obvious tiny assets by URL shape.
    if (isLowQualityUrl(resolved)) return null;

    // Probe filesize. Reject if too small to be a real photo.
    const size = await probeSize(resolved);
    if (size !== null && size < MIN_BYTES) return null;

    return resolved;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
