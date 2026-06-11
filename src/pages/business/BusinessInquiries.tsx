import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ANSWER_MAX = 2000;

interface InquiryRow {
  id: string;
  title: string;
  content: string;
  contact: string | null;
  status: "open" | "answered" | "closed";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

/**
 * 업체 포털 — 고객 문의함. RLS 가 내 업체(place 소유) 문의만 돌려준다.
 * 답변 저장은 answer/status/answered_at 만 갱신 (문의 본문은 트리거가 불변 강제).
 */
const BusinessInquiries = () => {
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [rows, setRows] = useState<InquiryRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: listing, error: listingError } = await (supabase as any).rpc(
        "get_my_listing",
      );
      if (listingError) throw listingError;
      const row = Array.isArray(listing) ? listing[0] : listing;
      if (!row?.place_id) {
        setPlaceId(null);
        return;
      }
      setPlaceId(row.place_id);
      const { data, error } = await (supabase as any)
        .from("place_inquiries")
        .select("id, title, content, contact, status, answer, answered_at, created_at")
        .eq("place_id", row.place_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as InquiryRow[]);
    } catch {
      toast.error("문의를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = async (id: string) => {
    const answer = draft.trim();
    if (!answer) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("place_inquiries")
        .update({
          answer: answer.slice(0, ANSWER_MAX),
          status: "answered",
          answered_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("답변을 등록했어요");
      setOpenId(null);
      setDraft("");
      await load();
    } catch (err) {
      toast.error("답변 저장 실패", {
        description: err instanceof Error ? err.message : "다시 시도해주세요.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-10">
      <PageHeader title="문의 관리" />

      <main className="px-4 py-5 space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !placeId ? (
          <EmptyState text={"연결된 업체가 없어요.\n업체 정보 등록이 끝나면 문의를 받을 수 있어요."} />
        ) : rows.length === 0 ? (
          <EmptyState text={"아직 도착한 문의가 없어요.\n고객이 업체 상세에서 '예약 문의'를 보내면 여기에 모여요."} />
        ) : (
          rows.map((q) => {
            const expanded = openId === q.id;
            return (
              <div
                key={q.id}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full p-4 text-left"
                  onClick={() => {
                    setOpenId(expanded ? null : q.id);
                    setDraft(q.answer ?? "");
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {q.title}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                        q.status === "answered"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {q.status === "answered" ? "답변 완료" : "새 문의"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(q.created_at).toLocaleString("ko-KR")}
                  </p>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    <p className="text-[13px] text-foreground whitespace-pre-wrap">
                      {q.content}
                    </p>
                    {q.contact && (
                      <p className="text-[12px] text-muted-foreground">
                        연락처: <span className="text-foreground">{q.contact}</span>
                      </p>
                    )}
                    <textarea
                      value={draft}
                      maxLength={ANSWER_MAX}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="답변을 입력하세요. 고객이 같은 화면에서 바로 확인해요."
                      className="w-full h-28 p-3 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      className="w-full h-10"
                      disabled={saving || !draft.trim()}
                      onClick={() => handleAnswer(q.id)}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {q.answer ? "답변 수정" : "답변 등록"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
      <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
      {text}
    </p>
  </div>
);

export default BusinessInquiries;
