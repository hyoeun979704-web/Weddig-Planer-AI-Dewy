import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, MessageSquare, Check, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface CoupleVoteItem {
  id: string;
  topic: string;
  option_a: string;
  option_b: string;
  my_pick: string | null;
  partner_pick: string | null;
  status: string;
  created_at: string;
}

const CoupleVote = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isLinked } = useCoupleLink();
  const [votes, setVotes] = useState<CoupleVoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");

  const fetchVotes = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await (supabase
        .from("couple_votes" as any)
        .select("*") as any)
        .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      setVotes((data || []) as CoupleVoteItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  const handleCreate = async () => {
    if (!user || !topic.trim() || !optionA.trim() || !optionB.trim()) return;

    // Get partner_user_id from couple link context
    let partnerUserId = null;
    try {
      const { data } = await (supabase
        .from("couple_links" as any)
        .select("user_id, partner_user_id") as any)
        .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
        .eq("status", "linked")
        .maybeSingle();
      if (data) {
        partnerUserId = (data as any).user_id === user.id ? (data as any).partner_user_id : (data as any).user_id;
      }
    } catch (e) {
      // 파트너 조회 실패는 치명적이지 않다(혼자 쓰는 투표로 생성). 단 삼키지 말고 로깅.
      console.error("partner lookup failed:", e);
    }

    // Supabase 는 에러를 throw 하지 않고 { error } 로 반환하므로 직접 확인.
    // 안 그러면 insert 가 실패해도 폼이 비워져 "만들어진 것처럼" 보인다.
    const { error } = await (supabase.from("couple_votes" as any) as any).insert({
      user_id: user.id,
      partner_user_id: partnerUserId,
      topic: topic.trim(),
      option_a: optionA.trim(),
      option_b: optionB.trim(),
      status: "voting",
    });
    if (error) {
      console.error("vote create failed:", error);
      toast.error("투표 만들기에 실패했어요. 다시 시도해주세요");
      return;
    }
    setTopic(""); setOptionA(""); setOptionB("");
    setCreateOpen(false);
    fetchVotes();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto relative">
        <PageHeader title="의견 조율 보드" />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-muted-foreground text-sm mb-4">로그인 후 이용할 수 있어요</p>
          <button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold">로그인</button>
        </div>
        <BottomNav activeTab={location.pathname} onTabChange={h => navigate(h)} />
      </div>
    );
  }

  const statusIcon = (status: string) => {
    if (status === "decided") return <Check className="w-4 h-4 text-emerald-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusLabel = (status: string) => {
    if (status === "decided") return "결정 완료";
    if (status === "discussed") return "논의 중";
    return "투표 중";
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title="의견 조율 보드" />

      <main className="pb-24 px-4 py-4">
        {/* 비연동 안내 — 의견 조율은 파트너 연동 시 진가를 발휘한다. dead-end 방지용 CTA. */}
        {!isLoading && !isLinked && (
          <button
            onClick={() => navigate("/mypage")}
            className="w-full mb-4 text-left p-4 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <p className="text-sm font-bold text-foreground mb-0.5">파트너와 연동하면 함께 투표할 수 있어요</p>
            <p className="text-xs text-muted-foreground">마이페이지에서 초대 코드로 연결하기 →</p>
          </button>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : votes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-1">아직 의견 조율이 없어요</p>
            <p className="text-xs text-muted-foreground">둘이 고민 중인 게 있나요?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {votes.map(v => (
              <button
                key={v.id}
                onClick={() => navigate(`/couple-vote/${v.id}`)}
                className="w-full text-left p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-foreground">{v.topic}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {statusIcon(v.status)}
                    {statusLabel(v.status)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">A. {v.option_a}</span>
                  <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">B. {v.option_b}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-24 right-4 app-col w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-30"
        style={{ right: "max(1rem, calc((100vw - 430px)/2 + 1rem))" }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="app-col mx-auto rounded-t-3xl pb-8">
          <SheetHeader>
            <SheetTitle>새 주제 만들기</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">고민 주제</label>
              <input value={topic} onChange={e => setTopic(e.target.value.slice(0, 200))} placeholder="예: 웨딩홀 어디로 할까?" maxLength={200}
                className="w-full px-4 py-3 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">선택지 A</label>
              <input value={optionA} onChange={e => setOptionA(e.target.value.slice(0, 200))} placeholder="예: 그랜드 하얏트" maxLength={200}
                className="w-full px-4 py-3 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">선택지 B</label>
              <input value={optionB} onChange={e => setOptionB(e.target.value.slice(0, 200))} placeholder="예: 신라호텔" maxLength={200}
                className="w-full px-4 py-3 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <button
              onClick={handleCreate}
              disabled={!topic.trim() || !optionA.trim() || !optionB.trim()}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold text-sm disabled:opacity-50"
            >
              만들기
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav activeTab={location.pathname} onTabChange={h => navigate(h)} />
    </div>
  );
};

export default CoupleVote;
