// 견적 요청/매칭 데이터 레이어. 쓰기는 RPC(create_quote_request·submit_quote_response),
// 읽기는 RLS 가 허용한 직접 SELECT(요청자 + 매칭된 업체 소유자).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QuoteRequest {
  id: string;
  category: string;
  region_city: string | null;
  region_district: string | null;
  budget_min: number | null;
  budget_max: number | null;
  wedding_date: string | null;
  style: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

export interface QuoteResponse {
  id: string;
  request_id: string;
  place_id: string;
  message: string;
  price_min: number | null;
  price_max: number | null;
  status: string;
  created_at: string;
  place_name?: string | null;
  place_image?: string | null;
}

export interface NewQuoteInput {
  category: string;
  city?: string;
  district?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  weddingDate?: string | null;
  style?: string | null;
  note?: string | null;
}

export async function createQuoteRequest(input: NewQuoteInput): Promise<{ ok: boolean; error?: string; requestId?: string; matched?: number }> {
  const { data, error } = await (supabase as any).rpc("create_quote_request", {
    p_category: input.category,
    p_city: input.city ?? null,
    p_district: input.district ?? null,
    p_budget_min: input.budgetMin ?? null,
    p_budget_max: input.budgetMax ?? null,
    p_wedding_date: input.weddingDate || null,
    p_style: input.style ?? null,
    p_note: input.note ?? null,
  });
  const res = data as { ok?: boolean; error?: string; request_id?: string; matched?: number } | null;
  if (error || !res?.ok) return { ok: false, error: res?.error ?? "failed" };
  return { ok: true, requestId: res.request_id, matched: res.matched };
}

export async function submitQuoteResponse(requestId: string, message: string, priceMin: number | null, priceMax: number | null) {
  const { data, error } = await (supabase as any).rpc("submit_quote_response", {
    p_request_id: requestId,
    p_message: message,
    p_price_min: priceMin,
    p_price_max: priceMax,
  });
  const res = data as { ok?: boolean; error?: string } | null;
  return { ok: !!res?.ok && !error, error: res?.error };
}

// 소비자: 내 견적 요청 목록 + 각 요청의 응답 수.
export function useMyQuoteRequests() {
  const { user } = useAuth();
  const [rows, setRows] = useState<(QuoteRequest & { response_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("quote_requests")
      .select("*, quote_responses(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows(
      ((data ?? []) as any[]).map((r) => ({
        ...r,
        response_count: Array.isArray(r.quote_responses) ? (r.quote_responses[0]?.count ?? 0) : 0,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  return { rows, loading, reload: load };
}

// 소비자: 한 요청의 응답들(업체 이름·이미지 포함).
export function useQuoteResponses(requestId: string | undefined) {
  const [request, setRequest] = useState<QuoteRequest | null>(null);
  const [responses, setResponses] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!requestId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: req }, { data: resp }] = await Promise.all([
      (supabase as any).from("quote_requests").select("*").eq("id", requestId).maybeSingle(),
      (supabase as any)
        .from("quote_responses")
        .select("*, places(name, main_image_url)")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false }),
    ]);
    setRequest((req as QuoteRequest) ?? null);
    setResponses(
      ((resp ?? []) as any[]).map((r) => ({
        ...r,
        place_name: r.places?.name ?? null,
        place_image: r.places?.main_image_url ?? null,
      })),
    );
    setLoading(false);
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);
  return { request, responses, loading, reload: load };
}

export interface BusinessLead extends QuoteRequest {
  place_id: string;
  responded: boolean;
}

// 업체: 나에게 매칭된 견적 요청(리드) + 내 응답 여부.
export function useBusinessLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // 내가 타겟된 요청들 + 요청 상세(RLS 로 조인 허용) + 내 응답 여부.
    const { data: targets } = await (supabase as any)
      .from("quote_request_targets")
      .select("request_id, place_id, quote_requests(*)")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });
    const reqIds = ((targets ?? []) as any[]).map((t) => t.request_id);
    let respondedIds = new Set<string>();
    if (reqIds.length > 0) {
      const { data: myResp } = await (supabase as any)
        .from("quote_responses")
        .select("request_id")
        .eq("owner_user_id", user.id)
        .in("request_id", reqIds);
      respondedIds = new Set(((myResp ?? []) as any[]).map((r) => r.request_id));
    }
    setLeads(
      ((targets ?? []) as any[])
        .filter((t) => t.quote_requests)
        .map((t) => ({ ...(t.quote_requests as QuoteRequest), place_id: t.place_id, responded: respondedIds.has(t.request_id) })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  return { leads, loading, reload: load };
}
