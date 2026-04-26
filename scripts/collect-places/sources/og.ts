// Fetch a business's official representative photo by reading the og:image
// meta tag from its homepage. This is what the business itself chose to show
// in social shares — a much higher-trust signal than keyword image search.

const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "blog.naver.com",
  "cafe.naver.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
];

const META_TIMEOUT_MS = 6000; // homepages can be slow; cap firmly

const OG_RE = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
const OG_RE_REVERSED = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i;
const TWITTER_RE = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i;

export function isCrawlableHomepage(url: string | null | undefined): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  return !SOCIAL_HOSTS.some((host) => lower.includes(host));
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
        // Some Korean sites refuse default fetch UA; pretend to be a real browser.
        "User-Agent":
          "Mozilla/5.0 (compatible; DewyBot/1.0; +https://dewy-wedding.com/)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    // Don't read the entire response if it's an image or huge file. We only
    // need the <head>; cap at 256 KB.
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
      // Most og: tags appear early; bail once we have enough head.
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => undefined);

    const match =
      html.match(OG_RE) ?? html.match(OG_RE_REVERSED) ?? html.match(TWITTER_RE);
    if (!match) return null;
    const raw = match[1].trim();
    if (!raw) return null;
    return resolveUrl(raw, url);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
