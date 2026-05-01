import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
}

// 상세 페이지 리뷰 탭에서만 호출. 카탈로그 카드는 places.review_count/avg_rating
// 으로만 표시하므로 이 쿼리는 lazy (탭 진입 시점) 실행.
export const usePlaceReviews = (placeId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ["place-reviews", placeId],
    queryFn: async (): Promise<PlaceReview[]> => {
      if (!placeId) return [];
      const { data, error } = await supabase
        .from("place_reviews")
        .select(
          "review_id, title, content, author, rating, review_date, ai_summary, sentiment, helpful_count, source_name, hall_name, wedding_date, is_verified"
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
