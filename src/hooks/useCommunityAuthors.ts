import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  toIdentity,
  type AuthorCard,
  type AuthorIdentity,
} from "@/lib/communityIdentity";

// 여러 작성자(user_id)의 공개 정체성(닉네임·스타일·역할)을 한 번에 조회.
// community_author_cards 뷰는 안전 필드만 노출(예식일/지역/이메일 없음).
// 카드가 없는 user_id 도 toIdentity 가 user_id 만으로 닉네임을 생성하므로 항상 해석됨.
export function useCommunityAuthors(userIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(userIds.filter((x): x is string => !!x))).sort();
  const key = ids.join(",");

  const { data: cardMap = new Map<string, AuthorCard>() } = useQuery({
    queryKey: ["community-authors", key],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_author_cards")
        .select("user_id, community_nickname, wedding_style, role")
        .in("user_id", ids);
      if (error) throw error;
      const m = new Map<string, AuthorCard>();
      for (const row of (data ?? []) as AuthorCard[]) m.set(row.user_id, row);
      return m;
    },
  });

  // user_id → AuthorIdentity. 카드 유무와 무관하게 항상 값 반환.
  const get = (userId: string): AuthorIdentity =>
    toIdentity(userId, cardMap.get(userId) ?? null);

  return { get };
}
