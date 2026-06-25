// 기업 대시보드 React Query 훅 (Task #3 데이터 접근 레이어 — hooks 레이어).
// 순수 데이터 함수(../data/businessDashboard)를 useQuery/useMutation 으로 감싼다.
// 페이지는 이 훅만 import 한다(raw supabase 금지).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBusinessStats,
  fetchActivePartnerApplication,
  submitPartnershipApplication,
  partnerDashboardKeys,
  type BusinessStats,
  type PartnerApplication,
} from "@/features/partners/data/businessDashboard";

const EMPTY_STATS: BusinessStats = { favorites: 0, media: 0, views: 0, couponDownloads: 0, reviews: 0 };

/** 선택된 지점의 통계. placeId 가 없으면 비활성(빈 통계 반환). */
export function useBusinessStats(placeId: string | null, viewCount: number) {
  const query = useQuery({
    queryKey: partnerDashboardKeys.stats(placeId ?? "none"),
    queryFn: () => fetchBusinessStats(placeId as string, viewCount),
    enabled: !!placeId,
  });
  return { stats: query.data ?? EMPTY_STATS, isLoading: query.isLoading };
}

/** 진행 중 제휴 신청. businessProfileId 가 없으면 비활성. */
export function usePartnerApplication(businessProfileId: string | null) {
  const query = useQuery({
    queryKey: partnerDashboardKeys.partnerApplication(businessProfileId ?? "none"),
    queryFn: () => fetchActivePartnerApplication(businessProfileId as string),
    enabled: !!businessProfileId,
  });
  return { partnerApp: (query.data ?? null) as PartnerApplication | null };
}

/** 제휴 신청 제출 — 성공 시 해당 신청 상태를 무효화해 즉시 갱신. */
export function useApplyPartnership(businessProfileId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      submitPartnershipApplication(businessProfileId as string, userId),
    onSuccess: () => {
      if (businessProfileId) {
        void qc.invalidateQueries({ queryKey: partnerDashboardKeys.partnerApplication(businessProfileId) });
      }
    },
  });
}
