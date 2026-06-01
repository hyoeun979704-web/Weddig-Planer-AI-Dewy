// 식장 주소 검색 (네이버 NCP Geocoding).
//
// 정보 입력 단계의 "식장 주소" 입력창에서 사용. 사용자가 입력한 질의(주소/건물명)를
// 네이버 지오코딩으로 변환해 후보 목록(도로명/지번 주소 + 좌표)을 돌려준다.
// → 사용자가 후보를 고르면 정확한 주소가 채워지고, 좌표는 약도 생성에 재사용.
//
// 비용: NCP Geocoding 은 대표계정 월 무료 제공량이 커서 이 앱 규모에선 사실상 무료.
//
// 필요 시크릿 (둘 중 하나): NAVER_CLIENT_ID/SECRET (기존 앱에 Maps 활성화) 또는
//   NAVER_MAP_CLIENT_ID/SECRET (별도 NCP Maps 키 — 우선). 헤더는 X-NCP-APIGW-API-KEY-ID.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEOCODE_URL =
  "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AddressResult {
  roadAddress: string;
  jibunAddress: string;
  lng: string;
  lat: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const naverId =
    Deno.env.get("NAVER_MAP_CLIENT_ID") ?? Deno.env.get("NAVER_CLIENT_ID");
  const naverSecret =
    Deno.env.get("NAVER_MAP_CLIENT_SECRET") ??
    Deno.env.get("NAVER_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!naverId || !naverSecret) {
    return json(
      { error: "지도 API 키가 설정되지 않았어요 (NAVER_CLIENT_* 또는 NAVER_MAP_*)." },
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

  try {
    const res = await fetch(
      `${GEOCODE_URL}?query=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": naverId,
          "X-NCP-APIGW-API-KEY": naverSecret,
        },
      },
    );
    if (!res.ok) {
      return json({ error: `주소 검색 실패 (${res.status})` }, 502);
    }
    const data = await res.json();
    const results: AddressResult[] = (data?.addresses ?? []).map(
      (a: Record<string, string>) => ({
        roadAddress: a.roadAddress ?? "",
        jibunAddress: a.jibunAddress ?? "",
        lng: a.x ?? "",
        lat: a.y ?? "",
      }),
    );
    return json({ results });
  } catch (e) {
    return json({ error: `주소 검색 오류: ${(e as Error).message}` }, 502);
  }
});
