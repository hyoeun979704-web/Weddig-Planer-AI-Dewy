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
  place_rating?: number | null;
  place_reviews?: number | null;
  place_partner?: boolean;
  place_region?: string | null;
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
  const { data, error } = await supabase.rpc("create_quote_request", {
    p_category: input.category,
    p_city: input.city ?? undefined,
    p_district: input.district ?? undefined,
    p_budget_min: input.budgetMin ?? undefined,
    p_budget_max: input.budgetMax ?? undefined,
    p_wedding_date: input.weddingDate || undefined,
    p_style: input.style ?? undefined,
    p_note: input.note ?? undefined,
  });
  const res = data as { ok?: boolean; error?: string; request_id?: string; matched?: number } | null;
  if (error || !res?.ok) return { ok: false, error: res?.error ?? "failed" };
  return { ok: true, requestId: res.request_id, matched: res.matched };
}

// 소비자가 수락한 견적을 '예약 완료'로 전환(성사) → 업체 알림 + 요청 마감.
export async function markQuoteBooked(responseId: string) {
  const { data, error } = await supabase.rpc("mark_quote_booked", { p_response_id: responseId });
  const res = data as { ok?: boolean; error?: string } | null;
  return { ok: !!res?.ok && !error, error: res?.error };
}

export interface BusinessFunnel { leads: number; responded: number; accepted: number; booked: number; }

export async function getBusinessQuoteFunnel(): Promise<BusinessFunnel | null> {
  const { data } = await supabase.rpc("get_business_quote_funnel");
  const f = data as any;
  if (!f) return null;
  return { leads: f.leads ?? 0, responded: f.responded ?? 0, accepted: f.accepted ?? 0, booked: f.booked ?? 0 };
}

// 소비자가 받은 견적 중 하나를 수락 → 업체에 알림(연결 완료).
export async function acceptQuoteResponse(responseId: string) {
  const { data, error } = await supabase.rpc("accept_quote_response", { p_response_id: responseId });
  const res = data as { ok?: boolean; error?: string } | null;
  return { ok: !!res?.ok && !error, error: res?.error };
}

export async function submitQuoteResponse(requestId: string, message: string, priceMin: number | null, priceMax: number | null) {
  const { data, error } = await supabase.rpc("submit_quote_response", {
    p_request_id: requestId,
    p_message: message,
    p_price_min: priceMin ?? undefined,
    p_price_max: priceMax ?? undefined,
  });
  const res = data as { ok?: boolean; error?: string } | null;
  return { ok: !!res?.ok && !error, error: res?.error };
}

// 소비자: 내 견적 요청 목록 + 각 요청의 응답 수 + 예약 여부.
export function useMyQuoteRequests() {
  const { user } = useAuth();
  const [rows, setRows] = useState<(QuoteRequest & { response_count: number; booked: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("quote_requests")
      .select("*, quote_responses(status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows(
      ((data ?? []) as any[]).map((r) => {
        const resp = Array.isArray(r.quote_responses) ? r.quote_responses : [];
        return {
          ...r,
          response_count: resp.length,
          booked: resp.some((x: any) => x.status === "booked"),
        };
      }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  return { rows, loading, reload: load };
}

// 소비자: 한 요청의 응답들(업체 이름·이미지 포함) + 매칭된 업체 수.
export function useQuoteResponses(requestId: string | undefined) {
  const [request, setRequest] = useState<QuoteRequest | null>(null);
  const [responses, setResponses] = useState<QuoteResponse[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!requestId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: req }, { data: resp }, { count: matched }] = await Promise.all([
      supabase.from("quote_requests").select("*").eq("id", requestId).maybeSingle(),
      supabase
        .from("quote_responses")
        .select("*, places(name, main_image_url, avg_rating, review_count, is_partner, city, district)")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false }),
      supabase.from("quote_request_targets").select("place_id", { count: "exact", head: true }).eq("request_id", requestId),
    ]);
    setMatchedCount(matched ?? 0);
    setRequest((req as QuoteRequest) ?? null);
    setResponses(
      ((resp ?? []) as any[]).map((r) => ({
        ...r,
        place_name: r.places?.name ?? null,
        place_image: r.places?.main_image_url ?? null,
        place_rating: r.places?.avg_rating ?? null,
        place_reviews: r.places?.review_count ?? null,
        place_partner: r.places?.is_partner ?? false,
        place_region: [r.places?.city, r.places?.district].filter(Boolean).join(" ") || null,
      })),
    );
    setLoading(false);
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);
  return { request, responses, matchedCount, loading, reload: load };
}

export interface BusinessLead extends QuoteRequest {
  place_id: string;
  /** 내 응답 상태: 미응답 / 응답함 / 고객 수락 / 예약 확정 */
  responseStatus: "none" | "sent" | "accepted" | "booked";
}

// 수락된 견적의 고객 연락처(이름·전화)를 조회 — 그 업체에만, accepted 일 때만 공개.
export async function getQuoteLeadContact(requestId: string): Promise<{ name: string | null; phone: string | null } | null> {
  const { data } = await supabase.rpc("get_quote_lead_contact", { p_request_id: requestId });
  const res = data as { ok?: boolean; name?: string | null; phone?: string | null } | null;
  if (!res?.ok) return null;
  return { name: res.name ?? null, phone: res.phone ?? null };
}

export interface QuoteMessage {
  id: string;
  request_id: string;
  place_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}

export async function sendQuoteMessage(requestId: string, placeId: string, body: string) {
  const { data, error } = await supabase.rpc("send_quote_message", {
    p_request_id: requestId,
    p_place_id: placeId,
    p_body: body,
  });
  const res = data as { ok?: boolean; error?: string } | null;
  return { ok: !!res?.ok && !error, error: res?.error };
}

// 견적 스레드(요청-업체) 메시지 로드 + Supabase realtime 구독으로 즉시 반영.
export function useQuoteThread(requestId: string | undefined, placeId: string | undefined) {
  const [messages, setMessages] = useState<QuoteMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!requestId || !placeId) { setLoading(false); return; }
    const { data } = await supabase
      .from("quote_messages")
      .select("id, request_id, place_id, sender_user_id, body, created_at")
      .eq("request_id", requestId)
      .eq("place_id", placeId)
      .order("created_at", { ascending: true });
    setMessages(((data ?? []) as QuoteMessage[]));
    setLoading(false);
  }, [requestId, placeId]);

  useEffect(() => {
    if (!requestId || !placeId) return;
    void load();
    // 실시간 — 이 요청의 메시지 INSERT 시 즉시 재조회(RLS 가 참여자에게만 전달).
    const channel = supabase
      .channel(`quote-thread-${requestId}-${placeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quote_messages", filter: `request_id=eq.${requestId}` },
        () => { void load(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [requestId, placeId, load]);

  return { messages, loading, reload: load };
}

// 업체: 나에게 매칭된 견적 요청(리드) + 내 응답 상태.
export function useBusinessLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // 내가 타겟된 요청들 + 요청 상세(RLS 로 조인 허용) + 내 응답 상태.
    const { data: targets } = await supabase
      .from("quote_request_targets")
      .select("request_id, place_id, quote_requests(*)")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });
    const reqIds = ((targets ?? []) as any[]).map((t) => t.request_id);
    const statusByReq = new Map<string, "sent" | "accepted" | "booked">();
    if (reqIds.length > 0) {
      const { data: myResp } = await supabase
        .from("quote_responses")
        .select("request_id, status")
        .eq("owner_user_id", user.id)
        .in("request_id", reqIds);
      for (const r of ((myResp ?? []) as any[])) {
        statusByReq.set(r.request_id, r.status === "booked" ? "booked" : r.status === "accepted" ? "accepted" : "sent");
      }
    }
    setLeads(
      ((targets ?? []) as any[])
        .filter((t) => t.quote_requests)
        .map((t) => ({
          ...(t.quote_requests as QuoteRequest),
          place_id: t.place_id,
          responseStatus: statusByReq.get(t.request_id) ?? "none",
        })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  return { leads, loading, reload: load };
}
