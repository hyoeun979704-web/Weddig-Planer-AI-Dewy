import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/features/console/components/AdminLayout";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fetchInquiries, answerInquiry, type AdminInquiry } from "@/features/console/data/inquiries";
import { inquiryCategoryLabel } from "@/lib/inquiryCategories";
import { relativeTime } from "@/lib/relativeTime";

// AdminInquiry 타입은 features/console/data/inquiries 에서 import.

const STATUS_FILTERS = [
  { value: "all", label: "전체" },
  { value: "pending", label: "대기중" },
  { value: "answered", label: "답변완료" },
] as const;

/**
 * 운영자 — 1:1 문의·불편접수(CX 챗봇 에스컬레이션 포함) 확인·답변.
 * 답변 등록 시 status=answered — 사용자는 '내 문의 내역'에서 확인하고
 * 만족도(👍/👎)를 남길 수 있다(여기 카드에 표시 — CX 품질 측정).
 */
const AdminInquiries = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: fetchInquiries,
  });

  const answerMutation = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => answerInquiry(id, answer),
    onSuccess: (_d, { id }) => {
      toast.success("답변을 등록했어요");
      setDrafts(prev => ({ ...prev, [id]: "" }));
      void queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
    },
    onError: () => toast.error("답변 등록에 실패했어요. 잠시 후 다시 시도해 주세요."),
  });

  const filtered = inquiries.filter((i) => statusFilter === "all" || i.status === statusFilter);
  const pendingCount = inquiries.filter((i) => i.status === "pending").length;

  return (
    <AdminLayout
      title="1:1 문의·불편접수"
      description={`고객센터 챗봇 에스컬레이션 포함 · 대기 ${pendingCount}건`}
    >
      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
            {f.value === "pending" && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          {statusFilter === "pending" ? "대기 중인 문의가 없어요 🎉" : "문의가 없어요"}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const draft = drafts[item.id] ?? item.answer ?? "";
            return (
              <div key={item.id} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {inquiryCategoryLabel(item.category)}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          item.status === "answered"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status === "answered" ? "답변완료" : "대기중"}
                      </span>
                      {/* 답변 만족도 — CX 품질 신호 */}
                      {item.feedback === "up" && (
                        <span className="text-[11px] inline-flex items-center gap-0.5 text-green-700">
                          <ThumbsUp className="w-3 h-3" /> 도움됨
                        </span>
                      )}
                      {item.feedback === "down" && (
                        <span className="text-[11px] inline-flex items-center gap-0.5 text-red-600">
                          <ThumbsDown className="w-3 h-3" /> 아쉬움
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground mt-1 break-all">{item.title}</h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {relativeTime(item.created_at)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-line mb-1 max-h-60 overflow-y-auto">
                  {item.content}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mb-3">user: {item.user_id}</p>

                <Textarea
                  value={draft}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="답변을 입력하세요 — 등록하면 사용자 '내 문의 내역'에 표시됩니다"
                  rows={3}
                  className="mb-2"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!draft.trim() || answerMutation.isPending}
                    onClick={() => answerMutation.mutate({ id: item.id, answer: draft.trim() })}
                  >
                    {item.status === "answered" ? "답변 수정" : "답변 등록"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInquiries;
