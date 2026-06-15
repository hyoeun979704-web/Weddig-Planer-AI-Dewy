import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Inbox, ChevronRight, MessageCircle, Star, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { PLACE_CATEGORY_LABEL, PLACE_TO_BUDGET_CATEGORY } from "@/lib/categoryLabels";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuoteResponses, acceptQuoteResponse, markQuoteBooked, quoteImageUrl, type QuoteResponse } from "@/hooks/useQuotes";
import { markBoardSlotBookedByQuoteCategory } from "@/hooks/useVendorBoard";

const won = (n: number) => `${n.toLocaleString()}만원`;

// 소비자: 한 견적 요청에 들어온 업체 응답들을 비교한다.
const QuoteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { request, responses, matchedCount, loading, reload } = useQuoteResponses(id);
  const [accepting, setAccepting] = useState<string | null>(null);

  const handleAccept = async (responseId: string) => {
    setAccepting(responseId);
    const res = await acceptQuoteResponse(responseId);
    setAccepting(null);
    if (!res.ok) { toast.error("처리에 실패했어요. 다시 시도해주세요."); return; }
    toast.success("업체에 수락을 전달했어요. 곧 연락드릴 거예요!");
    reload();
  };

  const handleBook = async (r: QuoteResponse) => {
    setAccepting(r.id);
    const res = await markQuoteBooked(r.id);
    if (!res.ok) { setAccepting(null); toast.error("처리에 실패했어요. 다시 시도해주세요."); return; }
    // 예약 → 내 예산에 자동 반영(만원 단위 동일). best-effort — 실패해도 예약은 확정.
    const amount = r.price_max ?? r.price_min ?? request?.budget_max ?? 0;
    let budgeted = false;
    if (user && amount > 0) {
      const { error } = await supabase.from("budget_items").insert({
        user_id: user.id,
        category: PLACE_TO_BUDGET_CATEGORY[request?.category ?? ""] ?? "etc",
        title: r.place_name ?? "예약 업체",
        amount,
        memo: "견적 매칭으로 예약",
      });
      budgeted = !error;
    }
    // 일정(체크리스트)에도 '예약 완료' 항목 추가 — user_schedule_items.category 는 place 카테고리와 동일.
    if (user) {
      await supabase.from("user_schedule_items").insert({
        user_id: user.id,
        category: request?.category ?? "general",
        title: `${r.place_name ?? "업체"} 예약 완료`,
        completed: true,
        source: "quote",
        scheduled_date: request?.wedding_date ?? new Date().toISOString().slice(0, 10),
      });
    }
    // 업체 보드의 해당 카테고리 대표 슬롯도 '예약완료'로 자동 반영(best-effort).
    if (user) {
      void markBoardSlotBookedByQuoteCategory(user.id, request?.category, r.place_id, r.place_name ?? null);
    }
    setAccepting(null);
    toast.success(budgeted ? "예약 확정 · 예산·일정에 반영했어요! 🎉" : "예약을 확정했어요! 🎉");
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
            {request.image_paths && request.image_paths.length > 0 && (
              <div className="mt-2 flex gap-1.5">
                {request.image_paths.map((p) => (
                  <a key={p} href={quoteImageUrl(p)} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={quoteImageUrl(p)} alt="참고 사진" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 진행 상태 트래커 — 소비자가 어디까지 왔는지 한눈에 */}
        {request && (() => {
          const accepted = responses.some((r) => r.status === "accepted" || r.status === "booked");
          const booked = responses.some((r) => r.status === "booked");
          const steps = [
            { label: "요청", done: true, sub: "" },
            { label: "매칭", done: matchedCount > 0, sub: matchedCount > 0 ? `${matchedCount}곳` : "" },
            { label: "응답", done: responses.length > 0, sub: responses.length > 0 ? `${responses.length}건` : "" },
            { label: "수락", done: accepted, sub: "" },
            { label: "예약", done: booked, sub: "" },
          ];
          return (
            <div className="flex items-center mb-4 px-1">
              {steps.map((s, i) => (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      s.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>{i + 1}</div>
                    <span className={`mt-1 text-[10px] ${s.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                    {s.sub && <span className="text-[9px] text-primary">{s.sub}</span>}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 -mt-4 ${steps[i + 1].done ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : responses.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="아직 도착한 견적이 없어요"
            description="업체가 답하면 알림으로 알려드려요. 조건을 넓혀 다시 요청하면 더 많이 받을 수 있어요."
            action={
              <Button variant="outline" onClick={() => navigate("/quote/new")}>다른 조건으로 요청하기</Button>
            }
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
                          onClick={() => handleBook(r)}
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
