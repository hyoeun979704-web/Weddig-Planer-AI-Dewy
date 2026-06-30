import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReviewSourceType =
  | "user_verified"
  | "user_unverified"
  | "editor"
  | "partner"
  | "promotional"
  | null;

export interface PlaceReview {
  review_id: string;
  title: string | null;
  content: string;
  author: string | null;
  rating: number | null;
  review_date: string | null;
  ai_summary: string | null;
  sentiment: string | null;
  helpful_count: number | null;
  source_name: string | null;
  hall_name: string | null;
  wedding_date: string | null;
  is_verified: boolean | null;
  /** 후기 출처 분류 — 광고/협찬/사용자/에디터 구분. P3·P13·P18 페인 해소용. */
  source_type: ReviewSourceType;
  /** Dewy 행동로그 기반 자동 인증 — consult(문의/견적)·contract(예식장 등록)·null. 트리거가 세팅. */
  verification_tier: "consult" | "contract" | null;
  /** 작성자 지역(같은 지역 후기 우선 정렬용). */
  author_region: string | null;
}

/** 후기 출처별 사용자에게 보일 라벨·색상·우선순위(낮을수록 신뢰 높음). */
export const REVIEW_SOURCE_META: Record<
  Exclude<ReviewSourceType, null>,
  { label: string; tone: string; rank: number; hint: string }
> = {
  user_verified: {
    label: "사용자·검증",
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rank: 1,
    hint: "운영자가 영수증/계약서로 확인한 실제 사용자 후기",
  },
  editor: {
    label: "DEWY 에디터",
    tone: "bg-sky-100 text-sky-700 border-sky-200",
    rank: 2,
    hint: "DEWY 큐레이터가 직접 방문·취재해 작성",
  },
  user_unverified: {
    label: "사용자",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
    rank: 3,
    hint: "사용자 후기 — 검증 미완료",
  },
  partner: {
    label: "업체 제공",
    tone: "bg-amber-100 text-amber-700 border-amber-200",
    rank: 4,
    hint: "업체 자체 제공 후기 — 체험단·협찬 가능성",
  },
  promotional: {
    label: "광고",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
    rank: 5,
    hint: "광고/유료 콘텐츠",
  },
};

// 상세 페이지 리뷰 탭에서만 호출. 카탈로그 카드는 places.review_count/avg_rating
// 으로만 표시하므로 이 쿼리는 lazy (탭 진입 시점) 실행.
export const usePlaceReviews = (placeId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ["place-reviews", placeId],
    queryFn: async (): Promise<PlaceReview[]> => {
      if (!placeId) return [];
      const { data, error } = await (supabase as any)
        .from("place_reviews")
        .select(
          "review_id, title, content, author, rating, review_date, ai_summary, sentiment, helpful_count, source_name, hall_name, wedding_date, is_verified, source_type, verification_tier, author_region"
        )
        .eq("place_id", placeId)
        .order("review_date", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PlaceReview[];
    },
    enabled: !!placeId && enabled,
  });
};
