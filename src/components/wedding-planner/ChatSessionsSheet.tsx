import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessagesSquare, Plus, Trash2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { relativeTime } from "@/lib/relativeTime";
import { messageCapFor, sessionLimitFor, type ChatSession } from "@/lib/aiChat";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  isPremium: boolean;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDelete: (sessionId: string) => void;
}

/**
 * 채팅 기록(세션) 목록 — 이전 채팅 열어 이어하기 / 새 채팅 / 삭제.
 * 채팅창 개수: 무료 1개 · 프리미엄 5개 (서버 트리거가 강제, 여기서는 UX 안내).
 */
const ChatSessionsSheet = ({
  open,
  onOpenChange,
  sessions,
  activeSessionId,
  isPremium,
  onSelect,
  onNewChat,
  onDelete,
}: Props) => {
  const navigate = useNavigate();
  const limit = sessionLimitFor(isPremium);
  const atLimit = sessions.length >= limit;

  const handleNew = () => {
    onNewChat();
    onOpenChange(false);
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    onOpenChange(false);
  };

  const handleDelete = (s: ChatSession) => {
    // 삭제는 메시지까지 영구 삭제(cascade) — 실수 방지 확인.
    if (window.confirm(`"${s.title}" 채팅을 삭제할까요? 메시지 기록까지 복구할 수 없어요.`)) {
      onDelete(s.id);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessagesSquare className="w-4 h-4 text-primary" />
              채팅 기록
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">
              채팅창 {sessions.length}/{limit}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="py-3 space-y-3">
          <button
            onClick={handleNew}
            disabled={atLimit}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border border-primary/30 bg-primary/8 text-sm font-semibold text-primary active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            <Plus className="w-4 h-4" /> 새 채팅
          </button>
          {atLimit && (
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              채팅창 한도에 도달했어요. 기존 채팅을 삭제하면 새로 시작할 수 있어요.
              {!isPremium && (
                <>
                  {" "}
                  <button
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/premium");
                    }}
                    className="inline-flex items-center gap-0.5 text-primary font-semibold underline underline-offset-2"
                  >
                    <Sparkles className="w-3 h-3" /> 프리미엄
                  </button>
                  은 채팅창 5개를 쓸 수 있어요.
                </>
              )}
            </p>
          )}

          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              저장된 채팅이 없어요.
              <br />
              대화를 시작하면 자동으로 기록돼요.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                    s.id === activeSessionId
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/40"
                  }`}
                >
                  <button onClick={() => handleSelect(s.id)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {relativeTime(s.updated_at)}
                      {s.id === activeSessionId && " · 현재 채팅"}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive active:scale-95 transition-all rounded-lg"
                    aria-label={`채팅 삭제: ${s.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            채팅당 최근 {messageCapFor(isPremium)}개의 메시지가 보관돼요
            {!isPremium && " (프리미엄은 500개)"}.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatSessionsSheet;
