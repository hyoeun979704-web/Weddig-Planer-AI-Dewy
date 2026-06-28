import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CommunityAnnouncement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const COMMUNITY_ANNOUNCEMENTS_KEY = ["community-announcements"] as const;

// 새 테이블이 생성 타입(types.ts)에 아직 없어 any 캐스트 — 다른 신규 테이블과 동일 관례.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * 커뮤니티 공지사항.
 * - 기본(사용자): 활성 공지만(RLS 가 is_active 강제) — 커뮤니티 상단 배너.
 * - includeInactive(운영자): 비활성 포함 전체 — 어드민 관리 화면.
 * 정렬: pinned 우선 → 최신순.
 */
export const useCommunityAnnouncements = (opts: { includeInactive?: boolean } = {}) => {
  const includeInactive = opts.includeInactive ?? false;
  return useQuery<CommunityAnnouncement[]>({
    queryKey: [...COMMUNITY_ANNOUNCEMENTS_KEY, includeInactive ? "all" : "active"],
    queryFn: async () => {
      let q = db
        .from("community_announcements")
        .select("id, title, body, is_active, pinned, created_at, updated_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
};

export interface AnnouncementInput {
  title: string;
  body: string;
  pinned: boolean;
  is_active: boolean;
}

/** 운영자 전용 — 공지 생성/수정/삭제. RLS 가 admin 이외의 쓰기를 거부한다. */
export const useAnnouncementAdmin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: COMMUNITY_ANNOUNCEMENTS_KEY });

  const create = useMutation({
    mutationFn: async (input: AnnouncementInput) => {
      const { error } = await db
        .from("community_announcements")
        .insert({ ...input, created_by: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: AnnouncementInput & { id: string }) => {
      const { error } = await db
        .from("community_announcements")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("community_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });

  return { create, update, remove };
};
