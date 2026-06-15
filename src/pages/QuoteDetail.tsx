import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Inbox, ChevronRight, MessageCircle, Star, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { useQuoteResponses, acceptQuoteResponse, markQuoteBooked } from "@/hooks/useQuotes";

const won = (n: number) => `${n.toLocaleString()}만원`;

// 소비자: 한 견적 요청에 들어온 업체 응답들을 비교한다.
const QuoteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { request, responses, loading, reload } = useQuoteResponses(id);
  const [accepting, setAccepting] = useState<string | null>(null);

  const handleAccept = async (responseId: string) => {
    setAccepting(responseId);
    const res = await acceptQuoteResponse(responseId);
    setAccepting(null);
    if (!res.ok) { toast.error("처리에 실패했어요. 다시 시도해주세요."); return; }
    toast.success("업체에 수락을 전달했어요. 곧 연락드릴 거예요!");
    reload();
  };

  const handleBook = async (responseId: string) => {
    setAccepting(responseId);
    const res = await markQuoteBooked(responseId);
    setAccepting(null);
    if (!res.ok) { toast.error("처리에 실패했어요. 다시 시도해주세요."); return; }
    toast.success("예약을 확정했어요! 🎉");
    reload();
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="받은 견적" />
      <main className="px-4 py-5">
        {request && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <p className="font-bold text-foreground">
              {PLACE_CATEGORY_LABEL[request.category] ?? request.category}
              {request.region_city ? ` · ${request.region_city}` : ""}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {request.budget_min || request.budget_max
                ? `예산 ${request.budget_min ?? "?"}~${request.budget_max ?? "?"}만원 · `
                : ""}
              {request.wedding_date ? `예식 ${request.wedding_date}` : "일정 미정"}
            </p>
            {request.note && <p className="mt-2 text-[13px] text-foreground/80 whitespace-pre-line">{request.note}</p>}
          </div>
        )}

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : responses.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="아직 도착한 견적이 없어요"
            description="업체가 답하면 알림으로 알려드려요. 조건에 맞는 업체가 늘면 더 많이 받을 수 있어요."
          />
        ) : (
          <>
            <p className="text-[12px] text-muted-foreground mb-3">견적 {responses.length}건 도착</p>
            <ul className="space-y-2">
              {responses.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => navigate(`/vendor/${r.place_id}`)}
                    className="w-full flex items-start gap-3 p-4 text-left active:bg-muted/40 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                      {r.place_image && <img src={r.place_image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-foreground truncate">{r.place_name ?? "업체"}</p>
                        {r.place_partner && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary/15 text-primary shrink-0">파트너</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        {r.place_rating ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {r.place_rating.toFixed(1)}{r.place_reviews ? `(${r.place_reviews})` : ""}
                          </span>
                        ) : null}
                        {r.place_region && <span className="truncate">· {r.place_region}</span>}
                      </p>
                      {(r.price_min || r.price_max) && (
                        <p className="text-[13px] text-primary font-semibold mt-0.5">
                          {r.price_min && r.price_max ? `${won(r.price_min)}~${won(r.price_max)}`
                            : won((r.price_min ?? r.price_max) as number)}
                        </p>
                      )}
                      <p className="mt-1 text-[13px] text-muted-foreground line-clamp-2 whitespace-pre-line">{r.message}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                  <div className="px-4 pb-3 -mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/quote/${id}/thread/${r.place_id}`)}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" /> 메시지
                      </Button>
                      {r.status === "booked" ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600 shrink-0 px-2">
                          <PartyPopper className="w-4 h-4" /> 예약 확정
                        </span>
                      ) : r.status === "accepted" ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleBook(r.id)}
                          disabled={accepting === r.id}
                        >
                          {accepting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "예약 완료로 표시"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAccept(r.id)}
                          disabled={accepting === r.id}
                        >
                          {accepting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "이 견적 수락"}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
};

export default QuoteDetail;
