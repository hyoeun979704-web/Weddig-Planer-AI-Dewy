import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Plus, ChevronRight, LayoutGrid } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/relativeTime";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { useMyQuoteRequests } from "@/hooks/useQuotes";

// 소비자: 내가 보낸 견적 요청 목록.
const QuoteList = () => {
  const navigate = useNavigate();
  const { rows, loading } = useMyQuoteRequests();

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="내 견적 요청" rightExtra={
        <button onClick={() => navigate("/quote/new")} aria-label="새 견적" className="p-1 text-primary">
          <Plus className="w-5 h-5" />
        </button>
      } />
      <main className="px-4 py-5">
        {/* 업체 보드 — 카테고리별 진행 현황을 한눈에 정리하는 상위 뷰로 연결 */}
        <button
          onClick={() => navigate("/board")}
          className="w-full mb-4 px-4 py-3 rounded-2xl border border-primary/30 bg-primary/5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
        >
          <LayoutGrid className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-primary">내 업체 보드</p>
            <p className="text-[12px] text-muted-foreground">필요한 모든 업체를 미정/견적중/예약완료로 정리</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="아직 보낸 견적 요청이 없어요"
            description="원하는 조건을 남기면 여러 업체에서 견적을 받아볼 수 있어요."
            action={<Button onClick={() => navigate("/quote/new")}><Plus className="w-4 h-4 mr-1" />견적 요청하기</Button>}
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/quote/${r.id}`)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground truncate">
                      {PLACE_CATEGORY_LABEL[r.category] ?? r.category}
                      {r.region_city ? ` · ${r.region_city}` : ""}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {relativeTime(r.created_at)} · 받은 견적 {r.response_count}건
                      {r.booked ? " · 예약 완료" : r.status !== "open" ? " · 마감" : ""}
                    </p>
                  </div>
                  {r.booked ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">예약</span>
                  ) : r.response_count > 0 ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                      {r.response_count}
                    </span>
                  ) : null}
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default QuoteList;
