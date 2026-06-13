import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Pin, ChevronRight } from "lucide-react";
import { relativeTime } from "@/lib/relativeTime";
import { useCommunityAnnouncements } from "@/hooks/useCommunityAnnouncements";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * 커뮤니티 상단 운영자 공지 배너. 활성 공지만 노출(RLS), pinned 우선.
 * 운영자에게는 "관리" 링크를 함께 보여준다(/admin/announcements).
 * 공지가 없으면 — 운영자가 아니면 아무것도 렌더하지 않는다(빈 영역 방지).
 */
const CommunityAnnouncements = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { data: announcements = [], isLoading } = useCommunityAnnouncements();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return null;
  // 공지 0건: 일반 사용자는 숨김, 운영자는 작성 진입로만 노출.
  if (announcements.length === 0 && !isAdmin) return null;

  return (
    <section className="px-4 pt-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-foreground">
          <Megaphone className="w-4 h-4 text-primary" />
          공지사항
        </h2>
        {isAdmin && (
          <button
            onClick={() => navigate("/admin/announcements")}
            className="flex items-center gap-0.5 text-[11px] text-muted-foreground active:scale-95 transition-transform"
          >
            관리 <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <button
          onClick={() => navigate("/admin/announcements")}
          className="w-full text-center text-[12px] text-muted-foreground border border-dashed border-border rounded-xl py-3 active:scale-[0.99] transition-transform"
        >
          등록된 공지가 없어요. 첫 공지를 작성해보세요 →
        </button>
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => {
            const isOpen = expanded === a.id;
            return (
              <li
                key={a.id}
                className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-2">
                    {a.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-foreground leading-snug">
                        {a.title}
                      </p>
                      <p
                        className={`mt-1 text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line ${
                          isOpen ? "" : "line-clamp-2"
                        }`}
                      >
                        {a.body}
                      </p>
                      <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                        {relativeTime(a.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default CommunityAnnouncements;
