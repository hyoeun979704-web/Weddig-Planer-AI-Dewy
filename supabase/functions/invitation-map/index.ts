// 약도 자동 생성 Edge Function (네이버 지도).
//
// 흐름:
//   1) 로그인 사용자 검증 (남용/비용 방지)
//   2) 식장 주소 → 네이버 Geocoding 으로 좌표 변환
//   3) 좌표 → 네이버 Static Map 이미지(마커 포함)
//   4) invitation-uploads/{user_id}/map-{uuid}.png 로 업로드 (service_role)
//   5) { path } 반환 → 클라이언트가 map 슬롯 imagePaths 에 적용
//
// 필요 시크릿 (둘 중 하나):
//   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET          (기존 네이버 앱에 Maps 활성화한 경우)
//   또는 NAVER_MAP_CLIENT_ID, NAVER_MAP_CLIENT_SECRET (별도 NCP Maps 키를 쓰는 경우 — 우선)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (자동 주입)
//
// 헤더: 지도(Geocoding/Static Map)는 콘솔 출처와 무관하게 X-NCP-APIGW-API-KEY-ID 사용.
//   (X-Naver-Client-* 는 검색 openapi.naver.com 전용이라 지도엔 안 씀)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEOCODE_URL =
  "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode";
const STATICMAP_URL =
  "https://naveropenapi.apigw.ntruss.com/map-static/v2/raster";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 별도 Maps 키(NAVER_MAP_*)가 있으면 우선, 없으면 기존 네이버 앱 키(NAVER_*) 재사용.
  const naverId =
    Deno.env.get("NAVER_MAP_CLIENT_ID") ?? Deno.env.get("NAVER_CLIENT_ID");
  const naverSecret =
    Deno.env.get("NAVER_MAP_CLIENT_SECRET") ??
    Deno.env.get("NAVER_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!naverId || !naverSecret) {
    return json(
      { error: "지도 API 키가 설정되지 않았어요 (NAVER_CLIENT_* 또는 NAVER_MAP_*)." },
      500,
    );
  }
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "서버 설정 오류" }, 500);
  }

  // 1) 로그인 사용자 검증
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);

  let address = "";
  try {
    const body = await req.json();
    address = (body?.address ?? "").toString().trim();
  } catch {
    return json({ error: "요청 형식 오류" }, 400);
  }
  if (!address) return json({ error: "식장 주소를 먼저 입력해주세요." }, 400);

  const naverHeaders = {
    "X-NCP-APIGW-API-KEY-ID": naverId,
    "X-NCP-APIGW-API-KEY": naverSecret,
  };

  // 2) 지오코딩
  let lng: string, lat: string;
  try {
    const geoRes = await fetch(
      `${GEOCODE_URL}?query=${encodeURIComponent(address)}`,
      { headers: naverHeaders },
    );
    if (!geoRes.ok) {
      return json(
        { error: `지오코딩 실패 (${geoRes.status})` },
        502,
      );
    }
    const geo = await geoRes.json();
    const first = geo?.addresses?.[0];
    if (!first?.x || !first?.y) {
      return json({ error: "주소로 위치를 찾지 못했어요." }, 404);
    }
    lng = first.x;
    lat = first.y;
  } catch (e) {
    return json({ error: `지오코딩 오류: ${(e as Error).message}` }, 502);
  }

  // 3) 정적 지도 이미지
  let bytes: Uint8Array;
  try {
    const markers = `type:d|size:mid|pos:${lng} ${lat}`;
    const mapRes = await fetch(
      `${STATICMAP_URL}?w=640&h=420&center=${lng},${lat}&level=16&markers=${encodeURIComponent(markers)}&format=png`,
      { headers: naverHeaders },
    );
    if (!mapRes.ok) {
      return json({ error: `지도 생성 실패 (${mapRes.status})` }, 502);
    }
    bytes = new Uint8Array(await mapRes.arrayBuffer());
  } catch (e) {
    return json({ error: `지도 생성 오류: ${(e as Error).message}` }, 502);
  }

  // 4) Storage 업로드 (service_role 로 사용자 폴더에)
  const admin = createClient(supabaseUrl, serviceKey);
  const path = `${user.id}/map-${crypto.randomUUID()}.png`;
  const { error: upErr } = await admin.storage
    .from("invitation-uploads")
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (upErr) {
    return json({ error: `업로드 실패: ${upErr.message}` }, 500);
  }

  return json({ path, lat, lng });
});
