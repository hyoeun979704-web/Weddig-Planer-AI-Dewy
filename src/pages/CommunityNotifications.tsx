import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageSquare } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, notificationText, type CommunityNotification } from "@/hooks/useNotifications";
import { useCommunityAuthors } from "@/hooks/useCommunityAuthors";
import AuthorAvatar from "@/components/community/AuthorAvatar";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const CommunityNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, markAllRead } = useNotifications();
  const authors = useCommunityAuthors(notifications.map((n) => n.actor_id));

  // 페이지 진입 시 전체 읽음 처리 (배지 클리어).
  useEffect(() => {
    if (user && notifications.some((n) => !n.read_at)) {
      markAllRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, notifications.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <PageHeader title="알림" />
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-6">로그인하면 내 글·댓글 반응 알림을 볼 수 있어요.</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium">
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  const goTo = (n: CommunityNotification) => {
    if (n.post_id) navigate(`/community/${n.post_id}`);
  };

  const icon = (n: CommunityNotification) =>
    n.type === "post_like" || n.type === "comment_like" ? (
      <Heart className="w-4 h-4 text-rose-500" />
    ) : (
      <MessageSquare className="w-4 h-4 text-primary" />
    );

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <PageHeader title="알림" />
      <main className="pb-20">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">아직 알림이 없어요.<br />글과 댓글을 남기면 반응이 여기 모여요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const id = authors.get(n.actor_id);
              return (
                <li key={n.id}>
                  <button
                    onClick={() => goTo(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3.5 active:bg-muted/40 ${n.read_at ? "" : "bg-primary/5"}`}
                  >
                    <AuthorAvatar identity={id} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{id.nickname}</span>
                        <span className="text-muted-foreground"> 님이 {notificationText(n)}</span>
                      </p>
                      {n.post?.title && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">"{n.post.title}"</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ko })}
                      </p>
                    </div>
                    <span className="shrink-0 mt-1">{icon(n)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default CommunityNotifications;
