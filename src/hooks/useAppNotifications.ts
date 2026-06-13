import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// 범용 인앱 알림(기업 승인·시스템 등). 커뮤니티 알림(useNotifications)과 별개 소스.
export interface AppNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function useAppNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["app-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_notifications")
        .select("*")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["app-notifications-unread", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("app_notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["app-notifications", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["app-notifications-unread", user?.id] });
  };

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { notifications, unreadCount, isLoading, markAllRead, markRead };
}
