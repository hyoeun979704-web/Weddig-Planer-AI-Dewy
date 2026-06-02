// 벤더/장소 약식 지도 (네이버 Static Map) — 공개 이미지 프록시.
//
// 용도: 벤더 상세(PlaceDetailLayout) 등에서 좌표(lat/lng)로 정적 지도 PNG 를 <img> 로
//   바로 띄우기 위함. Static Map 은 시크릿 헤더가 필요해 클라이언트가 직접 못 부르므로
//   이 함수가 프록시한다.
//
// 특징:
//   - verify_jwt=false (공개 GET) → <img src> 로 사용 가능. 인증/세션 불필요.
//   - 남용/비용 방지: lat/lng 를 한국 영역(bbox)으로 검증, 크기 고정 클램프, 30일 캐시.
//   - 시크릿: NAVER_MAP_CLIENT_ID/SECRET → NAVER_MAP_ID/SECRET → NAVER_CLIENT_ID/SECRET.
//   - 엔드포인트: NAVER_MAP_API_BASE (기본 maps.apigw.ntruss.com).
//
// 호출: GET ?lat=37.5&lng=127.0&w=600&h=320&level=15

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAP_API_BASE =
  Deno.env.get("NAVER_MAP_API_BASE") ?? "https://maps.apigw.ntruss.com";
const STATICMAP_URL = `${MAP_API_BASE}/map-static/v2/raster`;

// 한국 대략 영역 — 임의 좌표로 지도 quota 를 태우는 남용을 막는 1차 가드.
const KR_LAT = [32, 39.5] as const;
const KR_LNG = [124, 132] as const;

function err(status: number, msg: string) {
  return new Response(msg, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const naverId =
    Deno.env.get("NAVER_MAP_CLIENT_ID") ??
    Deno.env.get("NAVER_MAP_ID") ??
    Deno.env.get("NAVER_CLIENT_ID");
  const naverSecret =
    Deno.env.get("NAVER_MAP_CLIENT_SECRET") ??
    Deno.env.get("NAVER_MAP_SECRET") ??
    Deno.env.get("NAVER_CLIENT_SECRET");
  if (!naverId || !naverSecret) return err(500, "map api key not configured");

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return err(400, "lat/lng required");
  }
  if (lat < KR_LAT[0] || lat > KR_LAT[1] || lng < KR_LNG[0] || lng > KR_LNG[1]) {
    return err(422, "coordinates out of range");
  }

  const w = clampInt(url.searchParams.get("w"), 600, 200, 1024);
  const h = clampInt(url.searchParams.get("h"), 320, 120, 1024);
  const level = clampInt(url.searchParams.get("level"), 15, 6, 20);
  const markers = `type:d|size:mid|pos:${lng} ${lat}`;

  try {
    const mapRes = await fetch(
      `${STATICMAP_URL}?w=${w}&h=${h}&center=${lng},${lat}&level=${level}` +
        `&markers=${encodeURIComponent(markers)}&format=png&scale=2`,
      {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": naverId,
          "X-NCP-APIGW-API-KEY": naverSecret,
        },
      },
    );
    if (!mapRes.ok) return err(502, `static map failed (${mapRes.status})`);
    const bytes = new Uint8Array(await mapRes.arrayBuffer());
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        // 좌표 단위 캐시 — 같은 장소 재방문/다른 사용자도 무료로 재사용.
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (e) {
    return err(502, `static map error: ${(e as Error).message}`);
  }
});
