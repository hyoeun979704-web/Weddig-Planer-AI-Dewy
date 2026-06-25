// 기업 대시보드 데이터 접근 레이어 (Task #3 — 데이터 접근 레이어 추상화 PoC).
//
// 패턴(docs/data-access-layer.md): 페이지에 산재하던 supabase `.from()/.rpc()` 호출을
// 여기로 모은다. 이 모듈은 **React 비의존 순수 함수**라 단위 테스트가 쉽고(모킹된 supabase),
// React Query 래핑은 hooks/useBusinessDashboard.ts 가 담당한다. 페이지는 훅만 import.
//
// 단일 소스: 쿼리키는 아래 partnerDashboardKeys 하나로 관리(드리프트 차단).

import { supabase } from "@/integrations/supabase/client";

export interface BusinessStats {
  favorites: number;
  media: number;
  views: number;
  couponDownloads: number;
  reviews: number;
}

export interface PartnerApplication {
  status: string;
}

// React Query 키 팩토리 — 무효화(invalidate) 시 이 키를 재사용한다.
export const partnerDashboardKeys = {
  all: ["partner", "dashboard"] as const,
  stats: (placeId: string) => [...partnerDashboardKeys.all, "stats", placeId] as const,
  partnerApplication: (businessProfileId: string) =>
    [...partnerDashboardKeys.all, "partnerApplication", businessProfileId] as const,
};

/**
 * 선택된 지점(place)의 대시보드 통계.
 * 조회수(views)는 별도 쿼리가 아니라 선택된 지점 row 의 view_count 라 인자로 받는다.
 * 통계 카드는 부분 실패에 관대해야 하므로(한 카운트가 깨져도 화면 유지) 쿼리별로 0 폴백.
 */
export async function fetchBusinessStats(
  placeId: string,
  viewCount: number,
): Promise<BusinessStats> {
  const [favRes, mediaRes, dlRes, reviewRes] = await Promise.all([
    supabase.from("favorites").select("id", { count: "exact", head: true }).eq("item_id", placeId),
    supabase.from("place_media").select("id", { count: "exact", head: true }).eq("place_id", placeId),
    supabase.rpc("get_my_coupon_download_count"),
    supabase.from("place_reviews").select("review_id", { count: "exact", head: true }).eq("place_id", placeId),
  ]);
  return {
    favorites: favRes.count ?? 0,
    media: mediaRes.count ?? 0,
    views: viewCount,
    couponDownloads: typeof dlRes.data === "number" ? dlRes.data : 0,
    reviews: reviewRes.count ?? 0,
  };
}

/**
 * 진행 중(pending|interviewing)인 제휴(프렌즈) 신청 1건. 없으면 null.
 */
export async function fetchActivePartnerApplication(
  businessProfileId: string,
): Promise<PartnerApplication | null> {
  const { data } = await supabase
    .from("partnership_applications")
    .select("status")
    .eq("business_profile_id", businessProfileId)
    .in("status", ["pending", "interviewing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * 제휴업체(프렌즈) 신청 접수. 실패 시 throw(호출부에서 toast).
 */
export async function submitPartnershipApplication(
  businessProfileId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("partnership_applications").insert({
    business_profile_id: businessProfileId,
    user_id: userId,
    message: "대시보드에서 신청",
  });
  if (error) throw error;
}
