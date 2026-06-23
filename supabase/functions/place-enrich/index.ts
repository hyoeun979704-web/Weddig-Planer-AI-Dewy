// place-enrich
// ─────────────────────────────────────────────────────────────────────────
// 네이버 "지역(local)" 검색 1회로 업체의 연락처·웹사이트/SNS·도로명주소·좌표를
// 한꺼번에 백필한다. place-geocode-backfill 의 검색·지역교차검증·dryRun 패턴을
// 확장한 것(같은 NAVER_CLIENT_ID/SECRET·같은 LOCAL_URL).
//
//   · 검색어 = "{name} {district}"
//   · 구(district) 가 결과 주소에 포함될 때만 신뢰(오매칭 방지 — 예: "인터불고"가
//     대구로 잡히는 것 차단). district_match 인 행만 기록한다.
//   · 빈 필드만 채운다(기존 값 절대 덮어쓰지 않음).
//       - places:        road_address, lat, lng
//       - place_details: tel, address, website_url|instagram_url|naver_blog_url|
//                        youtube_url|kakao_channel_url (link 분류)
//   · 사진·가격·영업시간은 네이버 검색 API 에 없어 채우지 못함(별도 소스 필요).
//
// 안전장치: x-admin-token(GEOCODE_ADMIN_TOKEN 또는 geocode_admin 테이블) 인증,
//   dryRun=true 기본(미리보기만, DB 미변경).
//
// 호출: POST { dryRun=true, limit=20, categories?:string[] }
// ─────────────────────────────────────────────────────────────────────────
import { adminClient } from "../_shared/supabase.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOCAL_URL = "https://openapi.naver.com/v1/search/local.json";
const stripTags = (s: string | null | undefined) => (s ?? "").replace(/<\/?b>/g, "").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

// 업체가 등록한 link 를 채널별 컬럼으로 분류. 모르면 일반 website_url.
function classifyLink(link: string): { col: string; val: string } | null {
  if (!link) return null;
  const u = link.trim();
  if (/instagram\.com/i.test(u)) return { col: "instagram_url", val: u };
  if (/blog\.naver\.com/i.test(u)) return { col: "naver_blog_url", val: u };
  if (/youtube\.com|youtu\.be/i.test(u)) return { col: "youtube_url", val: u };
  if (/pf\.kakao\.com/i.test(u)) return { col: "kakao_channel_url", val: u };
  if (/^https?:\/\//i.test(u)) return { col: "website_url", val: u };
  return null;
}

interface Row {
  place_id: string;
  name: string;
  city: string | null;
  district: string | null;
  category: string | null;
  road_address: string | null;
  lat: number | null;
  lng: number | null;
}

async function searchNaver(query: string, id: string, secret: string): Promise<any[]> {
  const url = new URL(LOCAL_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url.toString(), {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (res.status !== 429) break;
    await sleep(600 * (attempt + 1));
  }
  if (!res || !res.ok) throw new Error(`naver ${res?.status}: ${(await res?.text())?.slice(0, 160)}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const supabase = adminClient();

  // 인증 — place-geocode-backfill 과 동일 게이트(GEOCODE_ADMIN_TOKEN / geocode_admin)
  const provided = req.headers.get("x-admin-token");
  const envToken = Deno.env.get("GEOCODE_ADMIN_TOKEN");
  let authorized = !!provided && !!envToken && provided === envToken;
  if (!authorized && provided) {
    const { data: cfg } = await supabase.from("geocode_admin").select("token").eq("id", 1).maybeSingle();
    authorized = !!cfg?.token && provided === cfg.token;
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun !== false;
  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 200);
  const cats: string[] | null = Array.isArray(body.categories)
    ? body.categories
    : body.category ? [body.category] : null;

  const clientId = Deno.env.get("NAVER_CLIENT_ID");
  const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
  if (!clientId || !clientSecret) return json({ error: "NAVER_CLIENT_ID/SECRET not set" }, 500);

  // 대상 — 도로명주소가 비어있는(=미보강) 활성 업체, 작성도 낮은 순 우선. 채워지면 다음 배치에서 빠짐.
  let q = supabase
    .from("places")
    .select("place_id,name,city,district,category,road_address,lat,lng")
    .eq("is_active", true)
    .is("deleted_at", null)
    .is("road_address", null)
    .order("data_completeness", { ascending: true })
    .limit(limit);
  if (cats) q = q.in("category", cats);
  const { data: rows, error } = await q;
  if (error) return json({ error: error.message }, 500);
  const targets = (rows ?? []) as Row[];

  // 기존 place_details(빈 필드만 채우려 현재값 확인)
  const ids = targets.map((r) => r.place_id);
  const { data: pdRows } = ids.length
    ? await supabase.from("place_details").select("place_id,tel,address,website_url,instagram_url,naver_blog_url,youtube_url,kakao_channel_url").in("place_id", ids)
    : { data: [] as any[] };
  const pdMap = new Map((pdRows ?? []).map((d: any) => [d.place_id, d]));

  const results: any[] = [];
  let updated = 0;

  for (const row of targets) {
    const out: any = { place_id: row.place_id, name: row.name, district: row.district, matched: false, district_match: false, fills: {}, error: null };
    try {
      const query = `${row.name ?? ""} ${row.district ?? ""}`.trim();
      const items = await searchNaver(query, clientId, clientSecret);
      if (items.length === 0) { out.error = "no results"; results.push(out); await sleep(150); continue; }

      const districtKey = (row.district ?? "").trim();
      const addrOf = (it: any) => `${stripTags(it.roadAddress)} ${stripTags(it.address)}`;
      const pick = (districtKey ? items.find((it) => addrOf(it).includes(districtKey)) : null) ?? null;
      out.matched = true;
      out.title = stripTags(pick?.title ?? items[0]?.title);
      if (!pick) { out.error = "district not matched (skip write)"; results.push(out); await sleep(150); continue; }
      out.district_match = true;

      const roadAddr = stripTags(pick.roadAddress) || stripTags(pick.address) || null;
      const tel = (pick.telephone ?? "").trim() || null;
      const link = classifyLink((pick.link ?? "").trim());
      const mx = Number(pick.mapx), my = Number(pick.mapy);
      const hasCoord = Number.isFinite(mx) && Number.isFinite(my) && mx !== 0 && my !== 0;

      // places — 빈 필드만
      const placeUpd: Record<string, unknown> = {};
      if (!row.road_address && roadAddr) placeUpd.road_address = roadAddr;
      if (row.lat == null && hasCoord) { placeUpd.lat = my / 1e7; placeUpd.lng = mx / 1e7; }

      // place_details — 빈 필드만(현재값 확인)
      const pd = pdMap.get(row.place_id) ?? {};
      const pdUpd: Record<string, unknown> = {};
      if (!pd.tel && tel) pdUpd.tel = tel;
      if (!pd.address && roadAddr) pdUpd.address = roadAddr;
      if (link && !pd[link.col]) pdUpd[link.col] = link.val;

      out.fills = { places: placeUpd, place_details: pdUpd };

      if (!dryRun) {
        if (Object.keys(placeUpd).length) {
          const { error: e1 } = await supabase.from("places").update(placeUpd).eq("place_id", row.place_id);
          if (e1) out.error = `places: ${e1.message}`;
        }
        if (Object.keys(pdUpd).length) {
          const { error: e2 } = await supabase.from("place_details").upsert({ place_id: row.place_id, ...pdUpd }, { onConflict: "place_id" });
          if (e2) out.error = (out.error ? out.error + "; " : "") + `place_details: ${e2.message}`;
        }
        if (!out.error && (Object.keys(placeUpd).length || Object.keys(pdUpd).length)) updated++;
      }
    } catch (e) {
      out.error = String(e);
    }
    results.push(out);
    await sleep(150); // ≈6 req/s, local API QPS 보호
  }

  const matched = results.filter((r) => r.district_match).length;
  return json({ dryRun, requested: targets.length, matched_district: matched, updated, sample: results.slice(0, 12) });
});
