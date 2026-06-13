import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Building2, Megaphone } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeTime } from "@/lib/relativeTime";
import { useAppNotifications, type AppNotification } from "@/hooks/useAppNotifications";
import { useAuth } from "@/contexts/AuthContext";

const iconFor = (type: string) => {
  if (type.startsWith("business_")) return Building2;
  return Megaphone;
};

const AppNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, markAllRead, markRead } = useAppNotifications();

  const handleClick = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader
        title="알림"
        rightExtra={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 text-xs font-medium text-primary px-2 h-10"
            >
              <CheckCheck className="w-4 h-4" />
              모두 읽음
            </button>
          ) : undefined
        }
      />

      <main className="pb-20">
        {!user ? (
          <EmptyState text="로그인하면 알림을 확인할 수 있어요" />
        ) : isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState text="아직 받은 알림이 없어요" />
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const Icon = iconFor(n.type);
              const unread = !n.read_at;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${
                    unread ? "bg-primary/5" : "bg-transparent"
                  } hover:bg-muted/40`}
                >
                  <div className="relative w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                    {unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{relativeTime(n.created_at)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
    <Bell className="w-14 h-14 text-muted-foreground/30 mb-3" />
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export default AppNotifications;
