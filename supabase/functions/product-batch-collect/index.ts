/**
 * product-batch-collect — 카테고리별 키워드 리스트로 외부 상품을 일괄 수집.
 *
 * 호출 방법:
 *   1) 어드민 UI 의 "지금 자동 수집" 버튼: 사용자 JWT → admin role 검증
 *   2) pg_cron 등 서버 자동화: Authorization: Bearer <service_role_key>
 *
 * 동작:
 *   - public.product_seed_keywords (is_active=true) 의 각 키워드를 네이버에서 검색
 *   - product_blocklist 에 있는 상품은 skip
 *   - products 에 upsert (onConflict source,source_product_id, ignoreDuplicates)
 *   - 입력으로 받은 source 만 처리 (기본 "naver")
 *
 * 응답:
 *   { totalFetched, inserted, blocked, duplicates, errors }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RESULTS_PER_QUERY = 30;

interface NormalizedItem {
  source: "naver";
  source_product_id: string;
  name: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price: number;
  sale_price: number | null;
  source_url: string;
  source_mall: string | null;
  raw_data: unknown;
  categories: string[];
  is_active: boolean;
  is_featured: boolean;
  stock: number;
  synced_at: string;
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

async function naverSearch(
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<Array<Omit<NormalizedItem, "categories" | "is_active" | "is_featured" | "stock" | "synced_at">>> {
  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(MAX_RESULTS_PER_QUERY));
  url.searchParams.set("sort", "sim");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`네이버 API ${res.status}: ${body.slice(0, 200)}`);
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
      raw_data: item,
    };
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
  const naverId = Deno.env.get("NAVER_CLIENT_ID");
  const naverSecret = Deno.env.get("NAVER_CLIENT_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResp({ error: "config_missing", message: "Supabase env not configured" }, 500);
  }
  if (!naverId || !naverSecret) {
    return jsonResp(
      { error: "config_missing", message: "네이버 API 키가 설정되지 않았습니다 (NAVER_CLIENT_ID/SECRET)." },
      500,
    );
  }

  // 1) 권한 검증 — service role 직접 호출이면 통과, 아니면 admin role 확인.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResp({ error: "unauthorized" }, 401);
  }
  const token = authHeader.slice(7);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  if (token !== serviceRoleKey) {
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return jsonResp({ error: "unauthorized" }, 401);
    }
    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return jsonResp({ error: "forbidden", message: "Admin only" }, 403);
    }
  }

  // 2) 카테고리 필터 (선택). 미지정 시 전체.
  let onlyCategories: string[] | null = null;
  try {
    const body = await req.json();
    if (body && Array.isArray(body.categories) && body.categories.length > 0) {
      onlyCategories = body.categories as string[];
    }
  } catch {
    // 빈 body 허용
  }

  // 3) 키워드 catalog 를 DB 에서 로드 (어드민이 관리).
  let seedQuery = adminClient
    .from("product_seed_keywords")
    .select("category, keyword")
    .eq("is_active", true);
  if (onlyCategories) {
    seedQuery = seedQuery.in("category", onlyCategories);
  }
  const { data: seedRows, error: seedErr } = await seedQuery;
  if (seedErr) {
    return jsonResp({ error: "db_error", message: `seed_keywords: ${seedErr.message}` }, 500);
  }
  const seeds = (seedRows ?? []) as Array<{ category: string; keyword: string }>;

  // category → keyword[] 로 그룹화.
  const grouped = new Map<string, string[]>();
  for (const s of seeds) {
    if (!grouped.has(s.category)) grouped.set(s.category, []);
    grouped.get(s.category)!.push(s.keyword);
  }

  // 4) 카테고리별 키워드 순회 → 결과 누적 → 카테고리 태그 추가.
  const collectedByKey = new Map<string, NormalizedItem>();
  const errors: Array<{ category: string; keyword: string; error: string }> = [];
  let totalFetched = 0;
  const now = new Date().toISOString();

  for (const [category, keywords] of grouped) {
    for (const keyword of keywords) {
      try {
        const items = await naverSearch(keyword, naverId, naverSecret);
        totalFetched += items.length;
        for (const item of items) {
          if (!item.source_product_id) continue;
          const key = `${item.source}:${item.source_product_id}`;
          const existing = collectedByKey.get(key);
          if (existing) {
            // 같은 batch 안에서 여러 키워드에 걸린 상품 — 카테고리 머지.
            if (!existing.categories.includes(category)) {
              existing.categories.push(category);
            }
          } else {
            collectedByKey.set(key, {
              ...item,
              categories: [category],
              is_active: false,
              is_featured: false,
              stock: 0,
              synced_at: now,
            });
          }
        }
      } catch (err) {
        errors.push({ category, keyword, error: err instanceof Error ? err.message : String(err) });
      }
      // 네이버 RPS 제한 회피용 작은 딜레이.
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const candidates = Array.from(collectedByKey.values());

  // 5) Blocklist 조회 후 제외.
  const ids = candidates.map((c) => c.source_product_id);
  let blockedSet = new Set<string>();
  if (ids.length > 0) {
    const { data: blocked } = await adminClient
      .from("product_blocklist")
      .select("source, source_product_id")
      .eq("source", "naver")
      .in("source_product_id", ids);
    blockedSet = new Set((blocked ?? []).map((b: any) => `${b.source}:${b.source_product_id}`));
  }
  const allowed = candidates.filter(
    (c) => !blockedSet.has(`${c.source}:${c.source_product_id}`),
  );
  const blocked = candidates.length - allowed.length;

  // 6) upsert (ignoreDuplicates) — UNIQUE (source, source_product_id) 가 자동 dedupe.
  let inserted = 0;
  let duplicates = 0;
  if (allowed.length > 0) {
    const { data, error } = await adminClient
      .from("products")
      .upsert(allowed, {
        onConflict: "source,source_product_id",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      errors.push({ category: "*", keyword: "*", error: `upsert: ${error.message}` });
    } else {
      inserted = data?.length ?? 0;
      duplicates = allowed.length - inserted;
    }
  }

  return jsonResp({
    totalFetched,
    candidates: candidates.length,
    blocked,
    inserted,
    duplicates,
    errors,
  });
});
