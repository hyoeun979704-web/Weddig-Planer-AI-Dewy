// place-geocode-backfill
// ─────────────────────────────────────────────────────────────────────────
// places.lat/lng 가 비어있는 업체를 네이버 "지역(local)" 검색으로 좌표 백필.
//
//   · 검색어 = "{name} {district}"  (상호명 + 구)
//   · 검색 API 자격증명: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET
//     (product-search 가 쓰는 openapi.naver.com 키. local 도 동일 키)
//   · 좌표: local API 의 mapx(경도)/mapy(위도). 스케일은 응답 raw 값으로 검증 후 변환.
//   · 구 교차검증: 검색결과 주소에 DB district 가 포함될 때만 신뢰(오매칭 방지).
//
// 안전장치:
//   · x-admin-token 헤더가 env(GEOCODE_ADMIN_TOKEN) 또는 DB(geocode_admin) 토큰과
//     일치해야 실행. 둘 다 없으면 모든 호출 401.
//   · dryRun=true(기본): DB 의 places 는 절대 안 건드리고 geocode_backfill_log 에만 기록.
//   · dryRun=false: district_match 인 행만 places.lat/lng UPDATE + 로그.
//
// 호출: 서버사이드 pg_net(주간 cron 자동화) POST { dryRun, limit, categories }
// ─────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 관리자 토큰은 시크릿(GEOCODE_ADMIN_TOKEN) 또는 RLS 잠금 테이블(geocode_admin)
// 에서 검증한다(둘 다 없으면 모든 호출 거부). DB 토큰 경로는 자동화 cron 이
// 대시보드 시크릿 설정 없이 호출할 수 있게 해준다 — serve() 안에서 확인.

const LOCAL_URL = "https://openapi.naver.com/v1/search/local.json";

interface PlaceRow {
  place_id: string;
  name: string;
  city: string | null;
  district: string | null;
  category: string | null;
}

interface GeoResult {
  place_id: string;
  name: string;
  district: string | null;
  category: string | null;
  query: string;
  matched: boolean;
  district_match: boolean;
  used_fallback: boolean;
  title: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  raw_mapx: string | null;
  raw_mapy: string | null;
  error: string | null;
}

const stripTags = (s: string | null | undefined) =>
  (s ?? "").replace(/<\/?b>/g, "").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function geocodeOne(
  row: PlaceRow,
  clientId: string,
  clientSecret: string,
): Promise<GeoResult> {
  const base: GeoResult = {
    place_id: row.place_id,
    name: row.name,
    district: row.district,
    category: row.category,
    query: "",
    matched: false,
    district_match: false,
    used_fallback: false,
    title: null,
    address: null,
    lat: null,
    lng: null,
    raw_mapx: null,
    raw_mapy: null,
    error: null,
  };

  const query = `${row.name ?? ""} ${row.district ?? ""}`.trim();
  base.query = query;
  if (!query) {
    base.error = "empty query";
    return base;
  }

  const url = new URL(LOCAL_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");

  // 429(속도제한)는 백오프 재시도. local API 는 QPS 가 빡빡함.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      res = await fetch(url.toString(), {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      });
    } catch (e) {
      base.error = `fetch failed: ${e}`;
      return base;
    }
    if (res.status !== 429) break;
    await sleep(600 * (attempt + 1)); // 600 → 1200 → 1800ms
  }

  if (!res || !res.ok) {
    base.error = `naver ${res?.status}: ${(await res?.text())?.slice(0, 180)}`;
    return base;
  }

  const data = await res.json();
  const items: any[] = data.items ?? [];
  if (items.length === 0) {
    base.error = "no results";
    return base;
  }

  const districtKey = (row.district ?? "").trim();
  const addrOf = (it: any) =>
    `${stripTags(it.roadAddress)} ${stripTags(it.address)}`;
  // 구가 주소에 포함되는 첫 결과 우선. 없으면 첫 결과로 폴백(신뢰도 낮음 표시).
  let pick = districtKey
    ? items.find((it) => addrOf(it).includes(districtKey))
    : items[0];
  const usedFallback = !pick;
  if (!pick) pick = items[0];

  const address = stripTags(pick.roadAddress) || stripTags(pick.address);
  base.title = stripTags(pick.title);
  base.address = address;
  base.raw_mapx = pick.mapx != null ? String(pick.mapx) : null;
  base.raw_mapy = pick.mapy != null ? String(pick.mapy) : null;
  base.used_fallback = usedFallback;
  base.district_match = districtKey ? address.includes(districtKey) : false;

  // local API mapx/mapy = WGS84 경위도 × 1e7 (정수 문자열). lng=mapx, lat=mapy.
  const mx = Number(pick.mapx);
  const my = Number(pick.mapy);
  if (Number.isFinite(mx) && Number.isFinite(my) && mx !== 0 && my !== 0) {
    base.lng = mx / 1e7;
    base.lat = my / 1e7;
    base.matched = true;
  } else {
    base.error = "no coords in result";
  }
  return base;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 인증: x-admin-token 이 env 토큰 또는 DB(geocode_admin) 토큰과 일치해야 함.
  const provided = req.headers.get("x-admin-token");
  const envToken = Deno.env.get("GEOCODE_ADMIN_TOKEN");
  let authorized = !!provided && !!envToken && provided === envToken;
  if (!authorized && provided) {
    const { data: cfg } = await supabase
      .from("geocode_admin")
      .select("token")
      .eq("id", 1)
      .maybeSingle();
    authorized = !!cfg?.token && provided === cfg.token;
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun !== false; // 기본 true
  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 300);
  // category(단일) 또는 categories(배열). 둘 다 없으면 전체.
  const cats: string[] | null = Array.isArray(body.categories)
    ? body.categories
    : body.category
    ? [body.category]
    : null;

  const clientId = Deno.env.get("NAVER_CLIENT_ID");
  const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return json({ error: "NAVER_CLIENT_ID/SECRET not set" }, 500);
  }

  // 이미 시도한(non-dryRun 로그 존재) 행은 제외하고 다음 대상 선별.
  // → 반복 호출 시 못 찾은 행을 무한 재시도하지 않고 앞으로 진행.
  const { data: rows, error } = await supabase.rpc("pick_geocode_targets", {
    cats,
    lim: limit,
  });
  if (error) return json({ error: error.message }, 500);

  const runId = crypto.randomUUID();
  const results: GeoResult[] = [];
  let updated = 0;

  for (const row of (rows ?? []) as PlaceRow[]) {
    const r = await geocodeOne(row, clientId, clientSecret);
    results.push(r);

    if (!dryRun && r.matched && r.district_match && r.lat != null) {
      const { error: upErr } = await supabase
        .from("places")
        .update({ lat: r.lat, lng: r.lng })
        .eq("place_id", row.place_id);
      if (upErr) r.error = `update failed: ${upErr.message}`;
      else updated++;
    }
    await sleep(150); // ≈ 6-7 req/s, local API QPS 보호
  }

  // 검증용 로그 기록(서비스롤 — RLS 무시)
  if (results.length > 0) {
    await supabase.from("geocode_backfill_log").insert(
      results.map((r) => ({
        run_id: runId,
        place_id: r.place_id,
        name: r.name,
        district: r.district,
        category: r.category,
        query: r.query,
        matched: r.matched,
        district_match: r.district_match,
        used_fallback: r.used_fallback,
        title: r.title,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        raw_mapx: r.raw_mapx,
        raw_mapy: r.raw_mapy,
        error: r.error,
        dry_run: dryRun,
      })),
    );
  }

  const matched = results.filter((r) => r.matched).length;
  const districtMatched = results.filter((r) => r.district_match).length;
  return json({
    run_id: runId,
    dryRun,
    requested: rows?.length ?? 0,
    matched,
    district_matched: districtMatched,
    updated,
  });
});
