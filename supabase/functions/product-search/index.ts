/**
 * product-search — 어드민이 큐레이션할 외부 상품을 네이버/쿠팡에서 검색.
 *
 * 입력:
 *   { source: "naver" | "coupang", query: string, page?: number }
 *
 * 출력:
 *   { items: ProductSearchItem[], cached: boolean }
 *   또는 { error, message }
 *
 * 권한:
 *   Authorization 헤더 필수. 호출자가 'admin' role 아닐 시 403.
 *
 * 캐시:
 *   product_search_cache 테이블에 24h 적중 윈도우. 외부 API 호출 절감.
 *
 * 키 누락 graceful:
 *   - 네이버: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 누락 시
 *     500 + "네이버 API 키가 설정되지 않았습니다" 메시지.
 *   - 쿠팡: COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 누락 시 동일 형식.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_HOURS = 24;
const MAX_RESULTS = 30;

interface ProductSearchItem {
  source: "naver" | "coupang";
  source_product_id: string;
  name: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price: number;
  sale_price: number | null;
  source_url: string;
  source_mall: string | null;
  raw: unknown;
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

// 네이버 쇼핑 검색 API.
// 응답 형태: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
async function searchNaver(query: string): Promise<ProductSearchItem[]> {
  const clientId = Deno.env.get("NAVER_CLIENT_ID");
  const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("네이버 API 키가 설정되지 않았습니다 (NAVER_CLIENT_ID/SECRET).");
  }

  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(MAX_RESULTS));
  url.searchParams.set("sort", "sim");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`네이버 API 오류 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const items: unknown[] = Array.isArray(data?.items) ? data.items : [];

  return items.map((it) => {
    const item = it as Record<string, string>;
    const price = parseInt(item.lprice ?? "0", 10) || 0;
    const hprice = parseInt(item.hprice ?? "0", 10) || 0;
    return {
      source: "naver",
      source_product_id: String(item.productId ?? ""),
      name: stripHtmlTags(item.title ?? ""),
      short_description: item.brand || item.maker || null,
      thumbnail_url: item.image ?? null,
      price,
      sale_price: hprice > 0 && hprice < price ? hprice : null,
      source_url: item.link ?? "",
      source_mall: item.mallName ?? null,
      raw: item,
    } satisfies ProductSearchItem;
  });
}

// HMAC SHA256 — 쿠팡 파트너스 서명용.
async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 쿠팡 파트너스 상품 검색.
// 문서: https://partners.coupang.com/#help/api-reference (Product Search)
async function searchCoupang(query: string): Promise<ProductSearchItem[]> {
  const accessKey = Deno.env.get("COUPANG_ACCESS_KEY");
  const secretKey = Deno.env.get("COUPANG_SECRET_KEY");
  if (!accessKey || !secretKey) {
    throw new Error("쿠팡 API 키가 설정되지 않았습니다 (COUPANG_ACCESS_KEY/SECRET_KEY).");
  }

  const method = "GET";
  const path = "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search";
  const qs = `keyword=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`;
  const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";

  // 서명 메시지: datetime + method + path + query
  const message = `${datetime}${method}${path.replace(/^\//, "/")}${qs}`;
  const signature = await hmacSha256Hex(secretKey, message);

  const authorization =
    `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;

  const res = await fetch(`https://api-gateway.coupang.com${path}?${qs}`, {
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`쿠팡 API 오류 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const items: unknown[] = Array.isArray(data?.data?.productData) ? data.data.productData : [];

  return items.map((it) => {
    const item = it as Record<string, unknown>;
    return {
      source: "coupang",
      source_product_id: String(item.productId ?? ""),
      name: String(item.productName ?? ""),
      short_description: item.categoryName ? String(item.categoryName) : null,
      thumbnail_url: item.productImage ? String(item.productImage) : null,
      price: Number(item.productPrice ?? 0),
      sale_price: null,
      source_url: String(item.productUrl ?? ""),
      source_mall: "쿠팡",
      raw: item,
    } satisfies ProductSearchItem;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResp({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResp({ error: "config_missing", message: "Supabase env not configured" }, 500);
  }

  // 1) Admin 권한 검증 — 호출자의 JWT 로 user 확인 후 has_role RPC.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResp({ error: "unauthorized" }, 401);
  }
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return jsonResp({ error: "unauthorized" }, 401);
  }
  const userId = userRes.user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleErr || !isAdmin) {
    return jsonResp({ error: "forbidden", message: "Admin only" }, 403);
  }

  // 2) 입력 파싱.
  let body: { source?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "bad_request", message: "Invalid JSON" }, 400);
  }
  const source = body.source;
  const query = (body.query ?? "").trim();
  if (source !== "naver" && source !== "coupang") {
    return jsonResp({ error: "bad_request", message: "source must be 'naver' or 'coupang'" }, 400);
  }
  if (!query) {
    return jsonResp({ error: "bad_request", message: "query is required" }, 400);
  }

  // 3) 캐시 조회.
  const cacheCutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const { data: cacheRow } = await adminClient
    .from("product_search_cache")
    .select("results, fetched_at")
    .eq("source", source)
    .eq("query", query)
    .gte("fetched_at", cacheCutoff)
    .maybeSingle();
  if (cacheRow) {
    return jsonResp({ items: cacheRow.results, cached: true });
  }

  // 4) 외부 API 호출.
  let items: ProductSearchItem[];
  try {
    items = source === "naver" ? await searchNaver(query) : await searchCoupang(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResp({ error: "upstream_error", message }, 502);
  }

  // 5) 캐시 저장 (실패해도 응답엔 영향 없음).
  await adminClient
    .from("product_search_cache")
    .upsert(
      { source, query, results: items, fetched_at: new Date().toISOString() },
      { onConflict: "source,query" },
    );

  return jsonResp({ items, cached: false });
});
