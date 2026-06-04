/**
 * product-resync — 큐레이션 노출 중인 외부 상품들의 가격/품절/링크를 갱신.
 *
 * 호출 방법:
 *   1) 어드민 "지금 동기화" 버튼: 사용자 JWT → admin role 검증
 *   2) pg_cron: Authorization: Bearer <service_role_key>
 *
 * 동작:
 *   - is_active=true AND source='naver' 인 상품 SELECT (쿠팡 어댑터는 키 등록되면 분기 추가)
 *   - 각 상품의 name 으로 네이버 검색 → 매칭 (다단계)
 *     - PASS1 동일 productId / PASS2 동일 mall + 상품명 토큰 일치(재등록 대응, productId 재바인딩)
 *     - 매칭: price/sale_price/source_url/source_mall 업데이트, stale_reason=null, stale_count=0
 *     - 미매칭: stale_count++; 연속 3회(STALE_GRACE_CYCLES) 미매칭일 때만 is_active=false
 *       (네이버 productId 가 재등록 시 바뀌므로 1회 미스로 즉시 delisting 하지 않음)
 *   - chunkSize 단위로 진행 (timeout 안전, 기본 80개)
 *   - rate-limit: 네이버 RPS 보호 위해 호출 사이 80ms 슬립
 *
 * 응답:
 *   { scanned, updated, deactivated, errors }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_CHUNK = 80;
const PER_QUERY_DISPLAY = 30;
const PER_CALL_DELAY_MS = 80;

interface ActiveProduct {
  id: string;
  name: string;
  source: string;
  source_product_id: string | null;
  price: number;
  sale_price: number | null;
  source_mall: string | null;
  stale_count: number | null;
}

interface NaverResultItem {
  productId?: string;
  title?: string;
  lprice?: string;
  hprice?: string;
  link?: string;
  mallName?: string;
}

// Naver re-lists the same product under a NEW productId on inventory refresh,
// so an exact-id miss is not proof the product is gone. Only deactivate after
// this many consecutive resync cycles with no match (resync runs weekly).
const STALE_GRACE_CYCLES = 3;

// Fraction of the product-name tokens (first 6) present in a candidate title.
// Used as a conservative fallback match when the productId changed.
function nameOverlap(name: string, title: string): number {
  const toks = stripHtmlTags(name)
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  if (toks.length === 0) return 0;
  const hay = stripHtmlTags(title).toLowerCase();
  return toks.filter((t) => hay.includes(t)).length / toks.length;
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

async function naverSearchByName(
  name: string,
  clientId: string,
  clientSecret: string,
): Promise<NaverResultItem[]> {
  // 짧고 정확한 검색을 위해 상품명 앞쪽 토큰만 사용 (브랜드+모델까지).
  const q = stripHtmlTags(name).split(/\s+/).slice(0, 6).join(" ").trim();
  if (!q) return [];

  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", q);
  url.searchParams.set("display", String(PER_QUERY_DISPLAY));
  url.searchParams.set("sort", "sim");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) {
    throw new Error(`네이버 API ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.items) ? (data.items as NaverResultItem[]) : [];
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

  // 권한 검증 — service role 직접 호출이면 통과, 아니면 admin role 확인.
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
    if (userErr || !userRes?.user) return jsonResp({ error: "unauthorized" }, 401);
    const { data: isAdmin, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return jsonResp({ error: "forbidden" }, 403);
  }

  // 입력 — chunk size, oldest first.
  let chunkSize = DEFAULT_CHUNK;
  try {
    const body = await req.json();
    if (body && typeof body.chunkSize === "number" && body.chunkSize > 0 && body.chunkSize <= 200) {
      chunkSize = body.chunkSize;
    }
  } catch {
    // 빈 body OK
  }

  // 가장 오래 동기화 안 된 active 외부 상품 N 개.
  const { data: rows, error: selErr } = await adminClient
    .from("products")
    .select("id, name, source, source_product_id, price, sale_price, source_mall, stale_count")
    .eq("is_active", true)
    .neq("source", "manual")
    .not("source_product_id", "is", null)
    .order("last_resynced_at", { ascending: true, nullsFirst: true })
    .limit(chunkSize);

  if (selErr) {
    return jsonResp({ error: "db_error", message: selErr.message }, 500);
  }
  const targets = (rows ?? []) as ActiveProduct[];

  let updated = 0;
  let deactivated = 0;
  let graced = 0; // missed this cycle but kept active (within grace window)
  const errors: Array<{ id: string; error: string }> = [];
  const now = new Date().toISOString();

  for (const p of targets) {
    if (p.source !== "naver") continue; // 쿠팡 어댑터는 키 등록 후 별도 분기 추가.
    try {
      const items = await naverSearchByName(p.name, naverId, naverSecret);
      // PASS 1 — exact productId.
      let match = items.find((it) => String(it.productId ?? "") === p.source_product_id);
      // PASS 2 — productId likely changed on a re-list: same mall + strong name
      // overlap. Conservative (same mall required) to avoid matching a different product.
      let rebind = false;
      if (!match && p.source_mall) {
        match = items.find(
          (it) => (it.mallName ?? "") === p.source_mall && nameOverlap(p.name, it.title ?? "") >= 0.6,
        );
        if (match) rebind = true;
      }

      if (!match) {
        // PASS 3 — grace: don't delist on a single miss (Naver ids are unstable).
        const nextCount = (p.stale_count ?? 0) + 1;
        const deactivate = nextCount >= STALE_GRACE_CYCLES;
        const { error } = await adminClient
          .from("products")
          .update({
            stale_count: nextCount,
            is_active: !deactivate,
            stale_reason: deactivate ? "not_found" : `grace_${nextCount}`,
            last_resynced_at: now,
          })
          .eq("id", p.id);
        if (error) errors.push({ id: p.id, error: `stale: ${error.message}` });
        else if (deactivate) deactivated++;
        else graced++;
      } else {
        const newPrice = parseInt(match.lprice ?? "0", 10) || p.price;
        const hprice = parseInt(match.hprice ?? "0", 10) || 0;
        const newSale = hprice > 0 && hprice < newPrice ? hprice : null;
        const patch: Record<string, unknown> = {
          price: newPrice,
          sale_price: newSale,
          source_url: match.link ?? undefined,
          source_mall: match.mallName ?? undefined,
          stale_reason: null,
          stale_count: 0, // reset grace counter
          last_resynced_at: now,
        };
        // Re-bind to the new productId so future cycles match on PASS 1 again.
        if (rebind && match.productId) patch.source_product_id = String(match.productId);
        const { error } = await adminClient.from("products").update(patch).eq("id", p.id);
        if (error) {
          errors.push({ id: p.id, error: `update: ${error.message}` });
        } else {
          updated++;
        }
      }
    } catch (err) {
      errors.push({ id: p.id, error: err instanceof Error ? err.message : String(err) });
    }
    await new Promise((r) => setTimeout(r, PER_CALL_DELAY_MS));
  }

  return jsonResp({
    scanned: targets.length,
    updated,
    graced,
    deactivated,
    errors,
  });
});
