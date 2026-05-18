import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Vote {
  id: string;
  user_id: string;
  partner_user_id: string | null;
  topic: string;
  option_a: string;
  option_b: string;
  my_pick: string | null;
  my_reason: string | null;
  partner_pick: string | null;
  partner_reason: string | null;
  ai_suggestion: string | null;
  status: string;
}

const CoupleVoteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [vote, setVote] = useState<Vote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myPick, setMyPick] = useState<string | null>(null);
  const [myReason, setMyReason] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const isCreator = vote?.user_id === user?.id;

  const fetchVote = useCallback(async () => {
    if (!id) return;
    const { data } = await (supabase.from("couple_votes" as any).select("*") as any).eq("id", id).maybeSingle();
    if (data) {
      setVote(data as Vote);
      // Set initial picks based on user role
      if (user) {
        if ((data as any).user_id === user.id) {
          setMyPick((data as any).my_pick);
          setMyReason((data as any).my_reason || "");
        } else {
          setMyPick((data as any).partner_pick);
          setMyReason((data as any).partner_reason || "");
        }
      }
    }
    setIsLoading(false);
  }, [id, user]);

  useEffect(() => { fetchVote(); }, [fetchVote]);

  const handleVote = async () => {
    if (!vote || !user || !myPick) return;
    const updateData = isCreator
      ? { my_pick: myPick, my_reason: myReason || null }
      : { partner_pick: myPick, partner_reason: myReason || null };

    await (supabase.from("couple_votes" as any) as any).update(updateData).eq("id", vote.id);
    toast.success("투표가 저장되었어요!");
    fetchVote();
  };

  const bothVoted = vote?.my_pick && vote?.partner_pick;

  const requestAISuggestion = async () => {
    if (!vote || !bothVoted) return;
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");

      const prompt = `커플이 '${vote.topic}'에 대해 의견이 나뉘었어요.\n\nA: ${vote.option_a} — 이유: ${vote.my_reason || "없음"}\nB: ${vote.option_b} — 이유: ${vote.partner_reason || "없음"}\n\n양쪽 의견을 분석하고 절충안을 제안해주세요. 짧고 따뜻하게 3~5문장으로 답변해주세요.`;

      const resp = await fetch(`${((import.meta as any).env?.VITE_SUPABASE_URL ?? "")}/functions/v1/ai-planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!resp.ok || !resp.body) throw new Error("AI 요청 실패");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) result += c;
          } catch { /* skip */ }
        }
      }

      await (supabase.from("couple_votes" as any) as any).update({ ai_suggestion: result, status: "discussed" }).eq("id", vote.id);
      fetchVote();
    } catch (e) {
      console.error(e);
      toast.error("AI 절충안 생성에 실패했어요");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDecide = async () => {
    if (!vote) return;
    await (supabase.from("couple_votes" as any) as any).update({ status: "decided" }).eq("id", vote.id);
    toast.success("결정 완료! 🎉");
    fetchVote();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg font-bold">의견 조율</h1>
          </div>
        </header>
        <p className="text-center text-muted-foreground py-20">투표를 찾을 수 없어요</p>
      </div>
    );
  }

  const myCurrentPick = isCreator ? vote.my_pick : vote.partner_pick;
  const partnerCurrentPick = isCreator ? vote.partner_pick : vote.my_pick;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold truncate">{vote.topic}</h1>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 space-y-4">
        {/* Vote Cards */}
        <div className="grid grid-cols-2 gap-3">
          {["a", "b"].map(opt => {
            const label = opt === "a" ? vote.option_a : vote.option_b;
            const selected = myPick === opt;
            return (
              <button
                key={opt}
                onClick={() => vote.status !== "decided" && setMyPick(opt)}
                disabled={vote.status === "decided"}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-border bg-card"
                } disabled:opacity-70`}
              >
                <p className="text-xs font-bold text-muted-foreground mb-1">선택지 {opt.toUpperCase()}</p>
                <p className="text-sm font-bold text-foreground">{label}</p>
                {selected && <Check className="w-4 h-4 text-primary mt-2" />}
              </button>
            );
          })}
        </div>

        {/* Reason */}
        {vote.status !== "decided" && (
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">내 이유 (선택)</label>
            <textarea
              value={myReason}
              onChange={e => setMyReason(e.target.value)}
              placeholder="이 선택지를 원하는 이유를 적어주세요"
              rows={3}
              className="w-full px-4 py-3 bg-muted rounded-xl text-sm outline-none resize-none"
            />
            <button
              onClick={handleVote}
              disabled={!myPick}
              className="w-full mt-2 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm disabled:opacity-50"
            >
              {myCurrentPick ? "투표 수정하기" : "투표하기"}
            </button>
          </div>
        )}

        {/* Partner Status */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <p className="text-xs font-medium text-muted-foreground mb-1">상대방 투표</p>
          {partnerCurrentPick ? (
            <p className="text-sm font-bold text-foreground">
              선택지 {partnerCurrentPick.toUpperCase()}: {partnerCurrentPick === "a" ? vote.option_a : vote.option_b}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">상대방의 투표를 기다리는 중...</p>
          )}
        </div>

        {/* AI Suggestion */}
        {bothVoted && !vote.ai_suggestion && vote.status !== "decided" && (
          <button
            onClick={requestAISuggestion}
            disabled={aiLoading}
            className="w-full p-4 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className={`w-5 h-5 text-primary ${aiLoading ? "animate-pulse" : ""}`} />
            <span className="text-sm font-bold text-foreground">
              {aiLoading ? "AI 절충안 생성 중..." : "AI 절충안 받기"}
            </span>
          </button>
        )}

        {vote.ai_suggestion && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-primary">AI 듀이의 절충안</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{vote.ai_suggestion}</p>
          </div>
        )}

        {/* Decide Button */}
        {vote.ai_suggestion && vote.status !== "decided" && (
          <button
            onClick={handleDecide}
            className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-sm"
          >
            ✅ 결정 완료
          </button>
        )}

        {vote.status === "decided" && (
          <div className="text-center py-4">
            <p className="text-sm font-bold text-emerald-500">✅ 결정 완료되었습니다</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoupleVoteDetail;
