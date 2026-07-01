// 견적/문의/업체비교(quote-uploads storage · places · inquiries) 데이터 접근 레이어
// (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md, dressFitting.ts.
// QuoteNew·QuoteThread·MyInquiries·Contact·VendorCompare 가 페이지에 흩뿌렸던 supabase
// 직접 호출을 모은다. 스토리지 idiom 은 공용 헬퍼(@/lib/storage) 재사용.
// (스레드 메시지·견적 요청 생성/조회는 이미 @/hooks/useQuotes 가 담당 — 여기서 중복하지 않는다.)

import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import type { QuoteContext } from "@/lib/quoteContext";

export type { QuoteContext };

const QUOTE_UPLOAD_BUCKET = "quote-uploads";

// inquiries.feedback 은 DB 상 string|null 이나 UI 는 up/down 만 사용 — 경계에서 좁힌다.
export type InquiryFeedback = "up" | "down" | null;

export interface InquiryRow {
  id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  answer: string | null;
  feedback: InquiryFeedback;
  created_at: string;
}

/** 견적 후보 업체 경량 메타(비교 칩용 — 이름·썸네일만). */
export interface ComparePlaceMeta {
  place_id: string;
  name: string;
  main_image_url: string | null;
}

export const quotesKeys = {
  all: ["consumer", "quotes"] as const,
  // 사용자 무관 prefix — invalidate 시 전 사용자 변형을 한 번에 무효화.
  inquiriesPrefix: ["consumer", "quotes", "inquiries"] as const,
  myInquiries: (userId?: string) => [...quotesKeys.all, "inquiries", userId] as const,
  compareCandidates: (ids: string[]) => [...quotesKeys.all, "compareCandidates", ids.join(",")] as const,
};

/** 견적 요청 참고 사진을 quote-uploads 버킷에 올리고 저장 path 를 반환. 실패 시 throw. */
export async function uploadQuoteImage(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  await uploadToBucket(QUOTE_UPLOAD_BUCKET, path, file, { contentType: file.type, upsert: false });
  return path;
}

/** 견적 요청 컨텍스트(스레드 상단 요약 카드용). RLS: 요청자 본인 + 매칭 업체 모두 조회 가능
 *  (quote_requests_select = user_id=auth.uid() OR is_quote_target(id)).
 *  타입은 소비자·업체 공유라 @/lib/quoteContext(shared)에 둔다. */
export async function fetchQuoteContext(requestId: string): Promise<QuoteContext | null> {
  const { data } = await supabase
    .from("quote_requests")
    .select("category, region_city, region_district, budget_min, budget_max, wedding_date, style, note, image_paths")
    .eq("id", requestId)
    .maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    category: (d.category as string) ?? "",
    region_city: (d.region_city as string) ?? null,
    region_district: (d.region_district as string) ?? null,
    budget_min: (d.budget_min as number) ?? null,
    budget_max: (d.budget_max as number) ?? null,
    wedding_date: (d.wedding_date as string) ?? null,
    style: (d.style as string) ?? null,
    note: (d.note as string) ?? null,
    image_count: Array.isArray(d.image_paths) ? d.image_paths.length : 0,
  };
}

/** 견적 스레드 헤더용 업체 이름 조회. 없으면 빈 문자열(헤더 폴백). */
export async function fetchPlaceName(placeId: string): Promise<string> {
  const { data } = await supabase
    .from("places")
    .select("name")
    .eq("place_id", placeId)
    .maybeSingle();
  return (data as { name?: string } | null)?.name ?? "";
}

/** 비교 후보 업체들의 경량 메타(이름·썸네일). 빈 입력은 즉시 []. */
export async function fetchComparePlaces(placeIds: string[]): Promise<ComparePlaceMeta[]> {
  if (placeIds.length === 0) return [];
  const { data } = await supabase
    .from("places")
    .select("place_id, name, main_image_url")
    .in("place_id", placeIds);
  return (data ?? []) as ComparePlaceMeta[];
}

/** 내 1:1 문의 목록(최신순). 비로그인은 []. 에러 시 throw. */
export async function fetchMyInquiries(userId?: string): Promise<InquiryRow[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, category, title, content, status, answer, feedback, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InquiryRow[];
}

/** 1:1 문의 접수(insert). 에러 시 throw. */
export async function createInquiry(input: {
  userId: string;
  category: string;
  title: string;
  content: string;
}): Promise<void> {
  const { error } = await supabase.from("inquiries").insert({
    user_id: input.userId,
    category: input.category,
    title: input.title,
    content: input.content,
  });
  if (error) throw error;
}

/** 답변 만족도(feedback) 갱신 — 본인 문의만(RLS+트리거가 feedback 외 차단). 에러 시 throw. */
export async function updateInquiryFeedback(input: {
  id: string;
  userId: string;
  feedback: InquiryFeedback;
}): Promise<void> {
  const { error } = await supabase
    .from("inquiries")
    .update({ feedback: input.feedback })
    .eq("id", input.id)
    .eq("user_id", input.userId);
  if (error) throw error;
}
