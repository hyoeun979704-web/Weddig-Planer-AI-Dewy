import { useState } from "react";
import { Sparkles, Heart, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type {
  InvitationSlot,
  InvitationUserData,
  SlotRole,
} from "@/lib/invitation/types";

interface Props {
  slot: InvitationSlot;
  tone: string;
  templateHint: string | null;
  userData: InvitationUserData;
  onAccept: (text: string) => void;
  onClose: () => void;
}

/**
 * 텍스트 슬롯 선택 후 8초 미입력 시 뜨는 추천 시트.
 *
 *   · "추천받기" 클릭 → Edge function 호출 (1하트)
 *   · 응답으로 받은 3개 옵션 표시
 *   · 옵션 탭하면 onAccept(text) → 캔버스에 즉시 반영
 *   · "다음에" 또는 X → 이 슬롯은 세션 내 재팝업 안 함
 */
const AISuggestSheet = ({
  slot,
  tone,
  templateHint,
  userData,
  onAccept,
  onClose,
}: Props) => {
  const [phase, setPhase] = useState<"intro" | "loading" | "options">("intro");
  const [options, setOptions] = useState<string[]>([]);

  const handleRequest = async () => {
    setPhase("loading");
    try {
      const { data, error } = await supabase.functions.invoke(
        "invitation-text-suggest",
        {
          body: {
            slot_id: slot.id,
            slot_role: (slot.role ?? "free") as SlotRole,
            slot_placeholder: slot.placeholder,
            tone,
            template_hint: templateHint,
            user_data: userData,
          },
        },
      );
      if (error) throw error;
      const result = data as { suggestions?: string[]; error?: string };
      if (result.error) throw new Error(result.error);
      const list = result.suggestions ?? [];
      if (list.length === 0) {
        toast({ title: "추천 문구를 받지 못했어요", variant: "destructive" });
        onClose();
        return;
      }
      setOptions(list);
      setPhase("options");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류";
      if (msg.includes("insufficient_hearts")) {
        toast({ title: "하트가 부족해요" });
      } else {
        toast({
          title: "추천 실패",
          description: "하트는 환불됐어요.",
          variant: "destructive",
        });
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-w-[430px] mx-auto bg-card rounded-t-3xl border-t border-border shadow-2xl">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">AI 추천 문구</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="p-1 -mr-1"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-5 pb-5 pt-2">
        {phase === "intro" && (
          <>
            <p className="text-[13px] text-foreground/85 mb-1">
              이 슬롯에 어울리는 문구를 AI가 3개 추천해드릴까요?
            </p>
            <p className="text-[11px] text-muted-foreground mb-4">
              마음에 드는 옵션을 골라 바로 적용할 수 있어요.
            </p>
            <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg mb-3">
              <div className="flex items-center gap-1 text-[13px]">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span className="font-bold text-foreground">1</span>
                <span className="text-muted-foreground">하트 차감</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                실패 시 자동 환불
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                다음에
              </Button>
              <Button onClick={handleRequest} className="flex-1">
                <Sparkles className="w-4 h-4 mr-1" />
                추천받기
              </Button>
            </div>
          </>
        )}

        {phase === "loading" && (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              AI가 문구를 작성 중...
            </p>
          </div>
        )}

        {phase === "options" && (
          <>
            <p className="text-[11px] text-muted-foreground mb-3">
              마음에 드는 문구를 탭하면 바로 적용돼요.
            </p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onAccept(opt);
                    onClose();
                  }}
                  className="w-full text-left p-3 bg-background border border-border rounded-xl active:scale-[0.99] transition-transform"
                >
                  <p className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">
                    {opt}
                  </p>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full mt-3 text-xs text-muted-foreground"
            >
              그대로 두기
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AISuggestSheet;
