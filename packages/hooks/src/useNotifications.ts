import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType = "comment" | "reply" | "post_like" | "comment_like";

export interface CommunityNotification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  read_at: string | null;
  created_at: string;
  post?: { title: string | null } | null;
}

const LABEL: Record<NotificationType, string> = {
  comment: "내 글에 댓글을 남겼어요",
  reply: "내 댓글에 답글을 남겼어요",
  post_like: "내 글을 좋아해요",
  comment_like: "내 댓글을 좋아해요",
};

export const notificationText = (n: CommunityNotification): string => LABEL[n.type];

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["community-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_notifications")
        .select("*, post:community_posts(title)")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CommunityNotification[];
    },
  });

  // 미읽음 개수 — 배지용. 정확도를 위해 별도 head count.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["community-notifications-unread", user?.id],
    enabled: !!user,
    // 실시간 구독은 없으므로 세션 중 주기적으로 새 알림을 반영(배지 신선도).
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("community_notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("community_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["community-notifications-unread", user?.id] });
    },
  });

  return { notifications, unreadCount, isLoading, markAllRead };
}
