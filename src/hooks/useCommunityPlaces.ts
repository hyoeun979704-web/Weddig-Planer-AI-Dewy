import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendorLite {
  place_id: string;
  name: string;
  category: string | null;
  city: string | null;
  district: string | null;
  main_image_url?: string | null;
}

export interface RelatedPost {
  id: string;
  title: string;
  category: string;
  like_count: number;
  comment_count: number;
  created_at: string;
}

// 글 작성 시 업체 태그 검색 (이름 부분일치).
export function useVendorSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["vendor-search", q],
    enabled: q.length >= 1,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("place_id, name, category, city, district, main_image_url")
        .ilike("name", `%${q}%`)
        .eq("is_active", true)
        .limit(8);
      if (error) throw error;
      return (data ?? []) as VendorLite[];
    },
  });
}

// 한 글에 태그된 업체들 (글 상세 칩).
export function usePostPlaces(postId: string | undefined) {
  return useQuery({
    queryKey: ["post-places", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_post_places")
        .select("place_id, places(place_id, name, category, city, district, main_image_url)")
        .eq("post_id", postId!);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => r.places as VendorLite)
        .filter(Boolean);
    },
  });
}

// 한 업체에 연결된 커뮤니티 글들 (업체 상세 "관련 글").
export function useRelatedPosts(placeId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["related-posts", placeId, limit],
    enabled: !!placeId,
    queryFn: async () => {
      // community_posts 를 루트로 inner-join 필터 → 글의 created_at 으로 정렬.
      // (community_post_places 를 루트로 두면 .order 가 "태그된 시각" 기준이라
      //  오래된 글을 오늘 태그하면 최신글처럼 위로 올라오는 버그가 있었음.)
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, title, category, like_count, comment_count, created_at, community_post_places!inner(place_id)")
        .eq("community_post_places.place_id", placeId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id, title: r.title, category: r.category,
        like_count: r.like_count, comment_count: r.comment_count, created_at: r.created_at,
      })) as RelatedPost[];
    },
  });
}
