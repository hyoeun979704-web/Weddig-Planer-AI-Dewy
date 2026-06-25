import { useNavigate } from "react-router-dom";
import { Ban, UserX } from "lucide-react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/ui/empty-state";
import AuthorAvatar from "@/components/community/AuthorAvatar";
import { confirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useUserBlocks,
  useUnblockUser,
} from "@/hooks/useCommunityModeration";
import { useCommunityAuthors } from "@/hooks/useCommunityAuthors";

// 차단 목록 화면 — 스토어 정책(UGC 신고·차단·삭제, App Store 1.2)의 "차단 관리" 경로.
// BlockUserDialog 가 안내하는 "설정 → 차단 목록" 의 실제 도착지(/settings/blocked).
// 차단 사용자는 community_author_cards 의 안전 가명(닉네임·뱃지)만 노출 — 실명/연락처 없음.
const BlockedUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: blockedIds = [], isLoading } = useUserBlocks();
  const { get } = useCommunityAuthors(blockedIds);
  const unblock = useUnblockUser();

  const handleUnblock = async (blockedId: string) => {
    const identity = get(blockedId);
    const ok = await confirm({
      title: "차단을 해제할까요?",
      description: `${identity.nickname} 님의 게시글과 댓글이 다시 보이게 돼요.`,
      confirmText: "차단 해제",
    });
    if (!ok) return;
    try {
      await unblock.mutateAsync(blockedId);
      toast.success("차단을 해제했어요");
    } catch {
      toast.error("처리에 실패했어요. 잠시 후 다시 시도해주세요");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Seo title="차단 목록" description="차단한 사용자를 관리해요" />
      <PageHeader title="차단 목록" />

      <div className="px-4 pt-4">
        <p className="text-body text-muted-foreground mb-4">
          차단한 사용자의 게시글과 댓글은 커뮤니티에서 보이지 않아요. 언제든 차단을 해제할 수 있어요.
        </p>

        {!user ? (
          <EmptyState
            icon={Ban}
            title="로그인이 필요해요"
            description="차단 목록은 로그인 후 확인할 수 있어요."
          />
        ) : isLoading ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : blockedIds.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="차단한 사용자가 없어요"
            description="커뮤니티 게시글·댓글에서 사용자를 차단하면 여기에 모여요."
          />
        ) : (
          <ul className="space-y-2">
            {blockedIds.map((id) => {
              const identity = get(id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card"
                >
                  <AuthorAvatar identity={identity} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-foreground truncate">
                      {identity.nickname}
                    </p>
                    {identity.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {identity.badges.map((b) => (
                          <span
                            key={b}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnblock(id)}
                    disabled={unblock.isPending}
                    aria-label={`${identity.nickname} 차단 해제`}
                    className="shrink-0 px-3 py-2 rounded-full text-caption font-medium border border-border text-foreground hover:bg-muted active:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    차단 해제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BlockedUsers;
