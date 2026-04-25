// Lightweight official-site verification.
// Fetches HTML, checks for vendor-related signals (name match, address tags, og:image).

interface OfficialInfo {
  ok: boolean;
  title: string | null;
  ogImage: string | null;
  hasNameMatch: boolean;
  text: string;
}

const FETCH_TIMEOUT = 5000;

const fetchWithTimeout = async (url: string) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DewyBot/1.0; +https://dewy-wedding.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
};

export async function checkOfficialSite(url: string, expectedName: string | null): Promise<OfficialInfo> {
  const html = await fetchWithTimeout(url);
  if (!html) {
    return { ok: false, title: null, ogImage: null, hasNameMatch: false, text: "" };
  }
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

  // Strip tags for name matching
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 5000);

  const hasNameMatch = expectedName
    ? text.includes(expectedName) || (titleMatch?.[1] || "").includes(expectedName)
    : false;

  return {
    ok: true,
    title: titleMatch?.[1]?.trim() ?? null,
    ogImage: ogImageMatch?.[1] ?? null,
    hasNameMatch,
    text,
  };
}
