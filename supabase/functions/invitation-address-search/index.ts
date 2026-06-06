// 식장 검색 (상호명 + 주소).
//
// 정보 입력 단계의 "식장 주소" 입력창에서 사용. 사용자가 입력한 질의를
//   1) 네이버 지역검색(POI) — 상호명/건물명으로 업체를 찾고 (예: "더채플앳청담")
//   2) 네이버 지오코딩      — 도로명/지번 주소를 좌표로 변환
// 두 경로로 동시에 조회해 후보 목록(업체명 + 도로명/지번 주소)을 돌려준다.
// → 사용자가 후보를 고르면 도로명주소가 채워지고, 약도 생성(invitation-map)이
//   그 주소를 다시 지오코딩해 위치를 잡는다(여기 좌표에 의존하지 않음).
//
// 왜 둘 다? 지오코딩은 "주소→좌표" 전용이라 상호명("○○웨딩홀")으로는 0건이 난다.
//   업체 검색은 지역검색(openapi.naver.com)으로만 가능. 둘을 합쳐야 "식장명/주소"
//   placeholder 약속을 지킨다.
//
// 필요 시크릿:
//   - 지역검색: NAVER_CLIENT_ID/SECRET (네이버 개발자센터 검색 API — 상품검색과 공용,
//     헤더 X-Naver-Client-Id). NAVER_SEARCH_* 이름도 인식.
//   - 지오코딩: NAVER_MAP_CLIENT_ID/SECRET (NCP Maps, 헤더 X-NCP-APIGW-API-KEY-ID)
//     → NAVER_MAP_ID/SECRET → NAVER_CLIENT_*(폴백). 엔드포인트 NAVER_MAP_API_BASE 로 override.
//   둘 중 한쪽 키만 있어도 그 경로만으로 동작한다.

import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const MAP_API_BASE =
  Deno.env.get("NAVER_MAP_API_BASE") ?? "https://maps.apigw.ntruss.com";
const GEOCODE_URL = `${MAP_API_BASE}/map-geocode/v2/geocode`;
const LOCAL_URL = "https://openapi.naver.com/v1/search/local.json";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AddressResult {
  /** 업체/건물명 (지역검색 결과에만 있음. 지오코딩 결과는 빈 문자열) */
  name: string;
  roadAddress: string;
  jibunAddress: string;
  /** WGS84 경도/위도. 지역검색 결과는 비움(주소를 다시 지오코딩하므로 불필요). */
  lng: string;
  lat: string;
}

/** 지역검색 title 의 <b> 태그/HTML 엔티티 제거 */
function cleanTitle(t: string): string {
  return (t ?? "")
    .replace(/<\/?b>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** 네이버 지역검색(POI) — 상호명으로 업체 찾기 */
async function searchLocal(
  query: string,
  id: string,
  secret: string,
): Promise<AddressResult[]> {
  const res = await fetch(
    `${LOCAL_URL}?query=${encodeURIComponent(query)}&display=5&sort=random`,
    {
      headers: {
        "X-Naver-Client-Id": id,
        "X-Naver-Client-Secret": secret,
      },
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.items ?? []).map(
    (it: Record<string, string>): AddressResult => ({
      name: cleanTitle(it.title),
      roadAddress: it.roadAddress ?? "",
      jibunAddress: it.address ?? "",
      lng: "",
      lat: "",
    }),
  );
}

/** 네이버 지오코딩 — 주소를 좌표로 */
async function searchGeocode(
  query: string,
  id: string,
  secret: string,
): Promise<AddressResult[]> {
  const res = await fetch(
    `${GEOCODE_URL}?query=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": id,
        "X-NCP-APIGW-API-KEY": secret,
      },
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.addresses ?? []).map(
    (a: Record<string, string>): AddressResult => ({
      name: "",
      roadAddress: a.roadAddress ?? "",
      jibunAddress: a.jibunAddress ?? "",
      lng: a.x ?? "",
      lat: a.y ?? "",
    }),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 지역검색(개발자센터)용 키
  const searchId =
    Deno.env.get("NAVER_SEARCH_CLIENT_ID") ?? Deno.env.get("NAVER_CLIENT_ID");
  const searchSecret =
    Deno.env.get("NAVER_SEARCH_CLIENT_SECRET") ??
    Deno.env.get("NAVER_CLIENT_SECRET");
  // 지오코딩(NCP Maps)용 키
  const mapId =
    Deno.env.get("NAVER_MAP_CLIENT_ID") ??
    Deno.env.get("NAVER_MAP_ID") ??
    Deno.env.get("NAVER_CLIENT_ID");
  const mapSecret =
    Deno.env.get("NAVER_MAP_CLIENT_SECRET") ??
    Deno.env.get("NAVER_MAP_SECRET") ??
    Deno.env.get("NAVER_CLIENT_SECRET");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if ((!searchId || !searchSecret) && (!mapId || !mapSecret)) {
    return json(
      { error: "지도/검색 API 키가 설정되지 않았어요 (NAVER_CLIENT_* 또는 NAVER_MAP_*)." },
      500,
    );
  }
  if (!supabaseUrl || !anonKey) return json({ error: "서버 설정 오류" }, 500);

  // 로그인 검증 (남용 방지)
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);

  let query = "";
  try {
    const body = await req.json();
    query = (body?.query ?? "").toString().trim();
  } catch {
    return json({ error: "요청 형식 오류" }, 400);
  }
  if (query.length < 2) return json({ results: [] });

  // 지역검색(POI) + 지오코딩 동시 호출 — 한쪽 실패해도 다른 쪽 결과로 응답
  const [localR, geoR] = await Promise.allSettled([
    searchId && searchSecret
      ? searchLocal(query, searchId, searchSecret)
      : Promise.resolve([] as AddressResult[]),
    mapId && mapSecret
      ? searchGeocode(query, mapId, mapSecret)
      : Promise.resolve([] as AddressResult[]),
  ]);
  const local = localR.status === "fulfilled" ? localR.value : [];
  const geo = geoR.status === "fulfilled" ? geoR.value : [];

  // 업체(POI) 결과 우선, 그 다음 주소 후보. 도로명주소로 중복 제거.
  const seen = new Set<string>();
  const results: AddressResult[] = [];
  for (const r of [...local, ...geo]) {
    const key = (r.roadAddress || r.jibunAddress || r.name).replace(/\s+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(r);
  }

  return json({ results });
});
