// 상세페이지 동적 sitemap — 업체(places)·상품(products) 개별 URL을 DB에서 생성.
//
// 배경: public/sitemap.xml 은 마케팅·가이드·카테고리 인덱스만 담는다(정적). 실제 업체
// 4천여 곳·상품의 **개별 상세 URL**이 sitemap 에 없으면 검색·AI 가 그 페이지들을 발견하지
// 못한다. 이 함수가 활성 데이터로 urlset 을 만들어 색인 가능 표면을 수천 배 넓힌다.
//
// vercel.json rewrite: /sitemap-places.xml → ?type=places, /sitemap-products.xml → ?type=products.
// sitemap_index.xml(정적)이 이 둘 + 마케팅 sitemap.xml 을 묶는다.

export const config = { runtime: "edge" };

import { SITE, SUPABASE_URL, SUPABASE_ANON_KEY } from "./_lib/ssr";

// places.category → 상세 라우트 prefix(App.tsx 라우트와 일치).
// dress_shop·makeup_shop 은 전용 상세 라우트가 없어 제외(스튜디오 상세에 흡수).
const PLACE_PREFIX: Record<string, string> = {
  wedding_hall: "venue",
  studio: "studio",
  hanbok: "hanbok",
  tailor_shop: "suit",
  honeymoon: "honeymoon",
  jewelry: "jewelry",
  appliance: "appliances",
  invitation_venue: "invitation-venues",
};

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlTag(loc: string, lastmod?: unknown): string {
  const lm = typeof lastmod === "string" && lastmod ? `<lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>` : "";
  return `<url><loc>${xmlEscape(loc)}</loc>${lm}</url>`;
}

function xmlDoc(urls: string[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
  );
}

// PostgREST 는 응답을 max-rows(기본 1000)로 제한하므로 Range 헤더로 페이지네이션해 전부 가져온다.
async function fetchAll(query: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const size = 1000;
  for (let page = 0; page < 60; page++) {
    const from = page * size;
    const to = from + size - 1;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Range-Unit": "items",
        Range: `${from}-${to}`,
      },
    });
    if (!res.ok) break;
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...(rows as Record<string, unknown>[]));
    if (rows.length < size) break;
  }
  return out;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const headers = {
    "content-type": "application/xml; charset=utf-8",
    // 하루 캐시 + 일주일 stale-while-revalidate(대량 쿼리를 매 요청마다 돌리지 않음).
    "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
  } as const;

  try {
    if (type === "products") {
      const rows = await fetchAll("products?select=id,updated_at&is_active=eq.true");
      const urls = rows.map((r) => urlTag(`${SITE}/store/${r.id}`, r.updated_at));
      return new Response(xmlDoc(urls), { headers });
    }
    // 기본: 활성·미삭제 + 라우트 있는 카테고리만.
    const cats = Object.keys(PLACE_PREFIX).join(",");
    const rows = await fetchAll(
      `places?select=place_id,category,updated_at&is_active=eq.true&deleted_at=is.null&category=in.(${cats})`,
    );
    const urls = rows.flatMap((r) => {
      const prefix = PLACE_PREFIX[String(r.category)];
      if (!prefix || !r.place_id) return [];
      return [urlTag(`${SITE}/${prefix}/${r.place_id}`, r.updated_at)];
    });
    return new Response(xmlDoc(urls), { headers });
  } catch {
    // 실패 시에도 유효한 빈 sitemap(크롤러 에러 방지).
    return new Response(xmlDoc([]), { headers });
  }
}
