// Naver Search API client
// Docs: https://developers.naver.com/docs/serviceapi/search/blog/blog.md

const ENDPOINTS = {
  blog: "https://openapi.naver.com/v1/search/blog.json",
  cafearticle: "https://openapi.naver.com/v1/search/cafearticle.json",
  local: "https://openapi.naver.com/v1/search/local.json",
} as const;

export type NaverSourceType = keyof typeof ENDPOINTS;

interface NaverEnv {
  clientId: string;
  clientSecret: string;
}

export interface BlogItem {
  source: "blog" | "cafe";
  title: string;
  description: string;
  link: string;
  bloggername?: string;
  bloggerlink?: string;
  postdate: string; // YYYYMMDD
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
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": env.clientId,
      "X-Naver-Client-Secret": env.clientSecret,
    },
  });
  if (!res.ok) {
    throw new Error(`Naver API ${endpoint} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
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
