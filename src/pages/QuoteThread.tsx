import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuoteThread, sendQuoteMessage } from "@/hooks/useQuotes";

// 견적 요청-업체 간 인앱 메시지 스레드. 소비자·업체 양쪽이 같은 화면을 쓴다(RLS 로 보호).
const QuoteThread = () => {
  const navigate = useNavigate();
  const { requestId, placeId } = useParams<{ requestId: string; placeId: string }>();
  const { user } = useAuth();
  const { messages, loading, reload } = useQuoteThread(requestId, placeId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [placeName, setPlaceName] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placeId) return;
    void (supabase as any)
      .from("places")
      .select("name")
      .eq("place_id", placeId)
      .maybeSingle()
      .then(({ data }: any) => setPlaceName(data?.name ?? ""));
  }, [placeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !requestId || !placeId) return;
    setSending(true);
    const res = await sendQuoteMessage(requestId, placeId, body);
    setSending(false);
    if (!res.ok) { toast.error("전송에 실패했어요. 다시 시도해주세요."); return; }
    setText("");
    void reload();
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col">
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-base pr-10 truncate">{placeName || "견적 대화"}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-[13px] text-muted-foreground py-16">
            아직 메시지가 없어요. 궁금한 점을 편하게 물어보세요.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed whitespace-pre-line ${
                  mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  {m.body}
                  <span className={`block mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </main>

      <div className="sticky bottom-0 bg-background border-t border-border px-3 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="메시지 보내기"
          className="flex-1"
        />
        <Button size="icon" onClick={send} disabled={sending || !text.trim()} aria-label="보내기">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export default QuoteThread;
