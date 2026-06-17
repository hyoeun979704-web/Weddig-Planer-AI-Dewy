import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer } from "vaul";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTextDraft } from "@/hooks/useTextDraft";
import { toast } from "sonner";

const TITLE_MAX = 100;
const CONTENT_MAX = 2000;
const CONTACT_MAX = 50;

interface InquiryRow {
  id: string;
  title: string;
  content: string;
  status: "open" | "answered" | "closed";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

interface Props {
  placeId: string;
  placeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 입점 업체 인앱 문의 시트 — 작성 + 내 문의/답변 확인을 한 화면에서.
 * RLS: 본인 문의만 조회되고, 소유자 있는(입점) 업체에만 INSERT 가 허용된다.
 */
const PlaceInquirySheet = ({ placeId, placeName, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<InquiryRow[] | null>(null);

  // 미저장 입력 유실 방지 — 시트를 닫거나 페이지 이탈해도 작성하던 문의 복원(업체별 격리).
  const draft = useTextDraft({
    scope: `place-inquiry:${placeId}`,
    userId: user?.id,
    enabled: open && !!user,
    values: { title, content, contact },
    apply: (d) => {
      if (d.title != null) setTitle(d.title);
      if (d.content != null) setContent(d.content);
      if (d.contact != null) setContact(d.contact);
    },
    hasContent: (v) => !!(v.title?.trim() || v.content?.trim()),
  });

  // 열릴 때 이 업체에 보낸 내 문의 + 답변 로드
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("place_inquiries")
        .select("id, title, content, status, answer, answered_at, created_at")
        .eq("place_id", placeId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setMine((data ?? []) as InquiryRow[]);
    })();
  }, [open, user, placeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("place_inquiries").insert({
        place_id: placeId,
        user_id: user.id,
        title: t.slice(0, TITLE_MAX),
        content: c.slice(0, CONTENT_MAX),
        contact: contact.trim() ? contact.trim().slice(0, CONTACT_MAX) : null,
      });
      if (error) throw error;
      toast.success("문의를 보냈어요", {
        description: "업체가 답변하면 여기에서 확인할 수 있어요.",
      });
      draft.clear();
      setTitle("");
      setContent("");
      setContact("");
      setMine((prev) =>
        prev
          ? [
              {
                id: crypto.randomUUID(),
                title: t,
                content: c,
                status: "open" as const,
                answer: null,
                answered_at: null,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ]
          : prev,
      );
    } catch (err) {
      toast.error("문의 전송 실패", {
        description: err instanceof Error ? err.message : "다시 시도해주세요.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[85%] mt-24 fixed bottom-0 left-0 right-0 app-col mx-auto z-50 focus:outline-none">
          <div className="p-4 bg-background rounded-t-[10px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-5" />
            <Drawer.Title className="text-lg font-bold text-center mb-1 text-foreground">
              업체에 문의하기
            </Drawer.Title>
            {placeName && (
              <p className="text-[12px] text-muted-foreground text-center mb-5 truncate">
                {placeName}
              </p>
            )}

            {!user ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  문의를 보내려면 로그인이 필요해요.
                </p>
                <Button onClick={() => navigate("/auth")}>로그인하기</Button>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    maxLength={TITLE_MAX}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목 (예: 10월 예식 견적 문의)"
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <textarea
                    required
                    maxLength={CONTENT_MAX}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="궁금한 내용을 적어주세요. 예식 날짜·인원·예산대를 함께 적으면 더 정확한 답변을 받아요."
                    className="w-full h-28 p-3 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    type="text"
                    maxLength={CONTACT_MAX}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="연락처 (선택 — 빠른 연락을 원하시면)"
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button type="submit" disabled={submitting} className="w-full h-11">
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    문의 보내기
                  </Button>
                </form>

                {/* 내 문의 내역 + 업체 답변 */}
                {mine && mine.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-[12px] font-bold text-muted-foreground">
                      내 문의 내역
                    </p>
                    {mine.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 bg-card rounded-xl border border-border space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-foreground truncate">
                            {q.title}
                          </p>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                              q.answer
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {q.answer ? "답변 완료" : "대기 중"}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground whitespace-pre-wrap">
                          {q.content}
                        </p>
                        {q.answer && (
                          <div className="mt-1 p-2.5 bg-primary/5 rounded-lg">
                            <p className="text-[11px] font-bold text-primary mb-0.5">
                              업체 답변
                            </p>
                            <p className="text-[12px] text-foreground whitespace-pre-wrap">
                              {q.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default PlaceInquirySheet;
