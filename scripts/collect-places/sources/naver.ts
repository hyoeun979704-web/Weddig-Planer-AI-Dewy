// Naver Search API client
// Docs: https://developers.naver.com/docs/serviceapi/search/blog/blog.md

const ENDPOINTS = {
  blog: "https://openapi.naver.com/v1/search/blog.json",
  cafearticle: "https://openapi.naver.com/v1/search/cafearticle.json",
  local: "https://openapi.naver.com/v1/search/local.json",
  webkr: "https://openapi.naver.com/v1/search/webkr.json",
  news: "https://openapi.naver.com/v1/search/news.json",
} as const;

export type NaverSourceType = keyof typeof ENDPOINTS;

interface NaverEnv {
  clientId: string;
  clientSecret: string;
}

export interface BlogItem {
  source: "blog" | "cafe" | "web" | "news";
  title: string;
  description: string;
  link: string;
  bloggername?: string;
  bloggerlink?: string;
  postdate: string; // YYYYMMDD; web/news may have empty
}

export interface LocalItem {
  source: "local";
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string; // lng × 10^7
  mapy: string; // lat × 10^7
}

const stripTags = (s: string) =>
  s.replace(/<\/?[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

// Naver free tier: ~10 req/sec, 25k/day. Throttle to 5 RPS for headroom.
const MIN_GAP_MS = 200;
let lastCallAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

async function call<T>(
  endpoint: string,
  query: string,
  env: NaverEnv,
  opts: { display?: number; start?: number; sort?: string } = {}
): Promise<T> {
  const display = opts.display ?? 30;
  const start = opts.start ?? 1;
  const sort = opts.sort;
  const params = new URLSearchParams({
    query,
    display: String(display),
    start: String(start),
  });
  if (sort) params.set("sort", sort);
  const url = `${endpoint}?${params.toString()}`;

  // Up to 3 attempts with exponential backoff on 429 (5s, 15s, 45s).
  const backoffs = [5_000, 15_000, 45_000];
  let lastErr: string = "";
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    await throttle();
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": env.clientId,
        "X-Naver-Client-Secret": env.clientSecret,
      },
    });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 429) {
      lastErr = await res.text();
      const wait = backoffs[attempt];
      console.warn(`Naver 429, sleeping ${wait / 1000}s (attempt ${attempt + 1}/3)`);
      await sleep(wait);
      continue;
    }
    throw new Error(`Naver API ${endpoint} failed: ${res.status} ${await res.text()}`);
  }
  throw new Error(`Naver API ${endpoint} failed: 429 (3 retries) ${lastErr.slice(0, 200)}`);
}

function withinLastNMonths(yyyymmdd: string, months: number): boolean {
  if (!yyyymmdd || yyyymmdd.length !== 8) return false;
  const y = +yyyymmdd.slice(0, 4);
  const m = +yyyymmdd.slice(4, 6);
  const d = +yyyymmdd.slice(6, 8);
  const postedAt = new Date(y, m - 1, d).getTime();
  const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  return postedAt >= cutoff;
}

export async function searchBlog(query: string, env: NaverEnv, opts: { months: number; limit: number }): Promise<BlogItem[]> {
  const data = await call<{ items: any[] }>(ENDPOINTS.blog, query, env, { display: opts.limit, sort: "date" });
  return data.items
    .map((it) => ({
      source: "blog" as const,
      title: stripTags(it.title),
      description: stripTags(it.description),
      link: it.link,
      bloggername: it.bloggername,
      bloggerlink: it.bloggerlink,
      postdate: it.postdate,
    }))
    .filter((it) => withinLastNMonths(it.postdate, opts.months));
}

export async function searchCafe(query: string, env: NaverEnv, opts: { months: number; limit: number }): Promise<BlogItem[]> {
  const data = await call<{ items: any[] }>(ENDPOINTS.cafearticle, query, env, { display: opts.limit, sort: "date" });
  return data.items
    .map((it) => ({
      source: "cafe" as const,
      title: stripTags(it.title),
      description: stripTags(it.description),
      link: it.link,
      postdate: it.postdate || "",
    }))
    .filter((it) => !it.postdate || withinLastNMonths(it.postdate, opts.months));
}

// Naver web docs search — catches official wedding venue pages, industry
// directories, official price tables that blog posts don't surface.
// No date filter (web pages don't expose postdate).
export async function searchWeb(query: string, env: NaverEnv, limit = 10): Promise<BlogItem[]> {
  const data = await call<{ items: any[] }>(ENDPOINTS.webkr, query, env, { display: limit });
  return data.items.map((it) => ({
    source: "web" as const,
    title: stripTags(it.title),
    description: stripTags(it.description),
    link: it.link,
    postdate: "",
  }));
}

// Naver news search — surfaces openings, ownership changes, controversies.
// Date filter applied since news has pubDate.
export async function searchNews(query: string, env: NaverEnv, opts: { months: number; limit: number }): Promise<BlogItem[]> {
  const data = await call<{ items: any[] }>(ENDPOINTS.news, query, env, { display: opts.limit, sort: "date" });
  return data.items
    .map((it) => {
      // Naver news returns pubDate as RFC 2822, convert to YYYYMMDD
      const postdate = it.pubDate ? new Date(it.pubDate).toISOString().slice(0, 10).replace(/-/g, "") : "";
      return {
        source: "news" as const,
        title: stripTags(it.title),
        description: stripTags(it.description),
        link: it.link,
        postdate,
      };
    })
    .filter((it) => !it.postdate || withinLastNMonths(it.postdate, opts.months));
}

export async function searchLocal(query: string, env: NaverEnv, limit = 5): Promise<LocalItem[]> {
  // Local API: max display=5, no sort=date (only 'random' or 'comment')
  const display = Math.min(limit, 5);
  const data = await call<{ items: any[] }>(ENDPOINTS.local, query, env, { display, sort: "random" });
  return data.items.map((it) => ({
    source: "local" as const,
    title: stripTags(it.title),
    link: it.link,
    category: it.category,
    description: it.description,
    telephone: it.telephone,
    address: it.address,
    roadAddress: it.roadAddress,
    mapx: it.mapx,
    mapy: it.mapy,
  }));
}

export async function searchAll(
  query: string,
  env: NaverEnv,
  opts: { months: number; perSource: number }
) {
  const [blog, cafe, local] = await Promise.all([
    searchBlog(query, env, { months: opts.months, limit: opts.perSource }).catch(() => []),
    searchCafe(query, env, { months: opts.months, limit: opts.perSource }).catch(() => []),
    searchLocal(query, env, 5).catch(() => []),
  ]);
  return { blog, cafe, local };
}
