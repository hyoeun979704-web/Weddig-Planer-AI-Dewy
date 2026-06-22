import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Star, MessageSquareText, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBranches } from "@/hooks/useBranches";
import { toast } from "sonner";

interface ReviewRow {
  review_id: string;
  title: string | null;
  content: string | null;
  author: string | null;
  rating: number | null;
  review_date: string | null;
  created_at: string | null;
  source_name: string | null;
  owner_response: string | null;
  owner_response_at: string | null;
}

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1" | "unanswered";
type ReviewSort = "recent" | "high" | "low";

/**
 * 업체 포털 — 고객 후기 관리 대시보드.
 * 사장님이 자기 업체에 쌓인 후기·평점 분포를 확인하고, 답글을 달고, 평점/미답변으로
 * 필터·정렬해 우선순위가 높은 후기부터 응대할 수 있게 한다. place_reviews 는 공개 읽기
 * 대상이고 답글(owner_response)은 기존 컬럼을 사용 — 별도 마이그레이션 없음.
 */
const BusinessReviews = () => {
  const navigate = useNavigate();
  const { selectedId, loading: branchesLoading } = useBranches();
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const load = useCallback(async () => {
    if (!selectedId) { setPlaceId(null); setLoading(false); return; }
    setLoading(true);
    setPlaceId(selectedId);
    try {
      const { data, error } = await supabase
        .from("place_reviews")
        .select("review_id, title, content, author, rating, review_date, created_at, source_name, owner_response, owner_response_at")
        .eq("place_id", selectedId)
        .order("review_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      setRows((data ?? []) as ReviewRow[]);
    } catch {
      toast.error("후기를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (branchesLoading) return;
    void load();
  }, [branchesLoading, load]);

  // 답글 작성 상태
  const REPLY_MAX = 1000;
  const [replyId, setReplyId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const openReply = (r: ReviewRow) => {
    setReplyId(r.review_id);
    setDraft(r.owner_response ?? "");
  };

  const saveReply = async (reviewId: string) => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("place_reviews")
        .update({ owner_response: text.slice(0, REPLY_MAX), owner_response_at: new Date().toISOString() })
        .eq("review_id", reviewId);
      if (error) throw error;
      toast.success("답글을 등록했어요");
      setReplyId(null);
      setDraft("");
      await load();
    } catch (err) {
      toast.error("답글 저장 실패", {
        description: err instanceof Error ? err.message : "다시 시도해주세요.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 평점 요약 — rating 이 있는 후기만으로 평균·분포 계산(표시값과 데이터 일치).
  const summary = useMemo(() => {
    const rated = rows.filter((r) => typeof r.rating === "number" && r.rating! > 0);
    const total = rated.length;
    const sum = rated.reduce((acc, r) => acc + (r.rating as number), 0);
    const avg = total ? sum / total : 0;
    // 5→1점 분포
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: rated.filter((r) => Math.round(r.rating as number) === star).length,
    }));
    const positive = rated.filter((r) => (r.rating as number) >= 4).length;
    // 응대율 — 답글 단 후기 / 전체 후기(타 앱 대비 부족하던 운영 지표).
    const answered = rows.filter((r) => !!r.owner_response?.trim()).length;
    const responseRate = rows.length ? Math.round((answered / rows.length) * 100) : 0;
    return { total, avg, dist, positive, answered, responseRate, unanswered: rows.length - answered };
  }, [rows]);

  // 필터·정렬 — 평점/미답변으로 좁히고 최신·평점순으로 정렬(우선 응대용).
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortBy, setSortBy] = useState<ReviewSort>("recent");

  const visibleRows = useMemo(() => {
    let list = [...rows];
    if (ratingFilter === "unanswered") {
      list = list.filter((r) => !r.owner_response?.trim());
    } else if (ratingFilter !== "all") {
      const star = Number(ratingFilter);
      list = list.filter((r) => typeof r.rating === "number" && Math.round(r.rating!) === star);
    }
    if (sortBy === "high") {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "low") {
      list.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    }
    // recent 는 쿼리에서 이미 review_date desc 정렬됨(별도 정렬 불필요).
    return list;
  }, [rows, ratingFilter, sortBy]);

  const formatDate = (r: ReviewRow): string => {
    const raw = r.review_date || r.created_at;
    if (!raw) return "";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ko-KR");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="고객 후기" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // 아직 업체를 인수하지 않은 경우 — 관리권한 요청으로 안내.
  if (!placeId) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="고객 후기" />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
          <Store className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-foreground font-semibold">연결된 업체가 없어요</p>
          <p className="text-sm text-muted-foreground">
            먼저 우리 업체 페이지를 인수하면 후기를 확인할 수 있어요.
          </p>
          <Button className="mt-1" onClick={() => navigate("/business/claim")}>
            업체 관리권한 요청하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <PageHeader title="고객 후기" />
      <main className="px-4 py-4 pb-12 space-y-4">
        {/* 평점 요약 */}
        <section className="bg-card rounded-2xl border border-border p-5">
          {summary.total > 0 ? (
            <div className="flex items-center gap-5">
              <div className="text-center flex-shrink-0">
                <p className="text-3xl font-bold text-foreground leading-none">{summary.avg.toFixed(1)}</p>
                <div className="flex items-center justify-center gap-0.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= Math.round(summary.avg) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">후기 {summary.total}개</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  답글률 <span className="font-semibold text-foreground">{summary.responseRate}%</span>
                </p>
              </div>
              <div className="flex-1 space-y-1">
                {summary.dist.map(({ star, count }) => {
                  const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-6 text-right">{star}점</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-6">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              아직 평점이 등록된 후기가 없어요.
            </p>
          )}
        </section>

        {/* 필터·정렬 — 후기가 있을 때만 노출 */}
        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {([
                ["all", `전체 ${rows.length}`],
                ["unanswered", `미답변 ${summary.unanswered}`],
                ["5", "5점"],
                ["4", "4점"],
                ["3", "3점"],
                ["2", "2점"],
                ["1", "1점"],
              ] as [RatingFilter, string][]).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRatingFilter(v)}
                  className={`text-xs py-1 px-3 rounded-full border whitespace-nowrap transition-all active:scale-95 ${
                    ratingFilter === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {([
                ["recent", "최신순"],
                ["high", "평점 높은순"],
                ["low", "평점 낮은순"],
              ] as [ReviewSort, string][]).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSortBy(v)}
                  className={`text-[10px] py-1 px-2.5 rounded-full border transition-all active:scale-95 ${
                    sortBy === v ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 후기 목록 */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <MessageSquareText className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-foreground font-semibold">아직 등록된 후기가 없어요</p>
            <p className="text-sm text-muted-foreground">
              후기가 쌓이면 이곳에서 한눈에 확인할 수 있어요.
            </p>
          </div>
        ) : visibleRows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            해당 조건의 후기가 없어요.
          </p>
        ) : (
          <section className="space-y-2">
            {visibleRows.map((r) => (
              <article key={r.review_id} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {typeof r.rating === "number" && r.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-primary text-sm font-semibold flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        {r.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {r.author?.trim() || "익명"}
                      {r.source_name ? ` · ${r.source_name}` : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatDate(r)}</span>
                </div>
                {r.title?.trim() && (
                  <p className="text-sm font-semibold text-foreground mt-2">{r.title}</p>
                )}
                {r.content?.trim() && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                    {r.content}
                  </p>
                )}

                {/* 사장님 답글 — 표시 / 작성 / 수정 */}
                {r.owner_response && replyId !== r.review_id && (
                  <div className="mt-3 rounded-xl bg-primary/5 border border-primary/15 p-3">
                    <p className="text-[11px] font-semibold text-primary flex items-center gap-1">
                      <Store className="w-3 h-3" /> 사장님 답글
                    </p>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-line leading-relaxed">
                      {r.owner_response}
                    </p>
                    <button
                      onClick={() => openReply(r)}
                      className="text-[11px] text-muted-foreground mt-1.5 hover:text-foreground"
                    >
                      답글 수정
                    </button>
                  </div>
                )}

                {replyId === r.review_id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={REPLY_MAX}
                      rows={3}
                      placeholder="고객 후기에 정중하게 답글을 남겨보세요"
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{draft.length}/{REPLY_MAX}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyId(null);
                            setDraft("");
                          }}
                        >
                          취소
                        </Button>
                        <Button size="sm" disabled={saving || !draft.trim()} onClick={() => saveReply(r.review_id)}>
                          {saving ? "저장 중..." : "답글 등록"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  !r.owner_response && (
                    <button
                      onClick={() => openReply(r)}
                      className="mt-2.5 text-xs font-medium text-primary flex items-center gap-1 hover:opacity-80"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" /> 답글 달기
                    </button>
                  )
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default BusinessReviews;
