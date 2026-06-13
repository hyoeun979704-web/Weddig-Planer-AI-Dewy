import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Brain, Trash2 } from "lucide-react";
import { useAIMemories } from "@/hooks/useAIMemories";
import { memoryTypeLabel, type AIMemory } from "@/lib/aiMemory";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * L5 메모리 검증 — 듀이가 자동 추출해 기억 중인 사실을 사용자가 직접 보고
 * 지울 수 있는 시트. 잘못 추출된 기억은 다음 대화까지 오염되므로(환각 누적)
 * 사용자에게 통제권을 준다.
 */
const MemoryManagerSheet = ({ open, onOpenChange }: Props) => {
  const { memories, isLoading, remove, isRemoving } = useAIMemories();
  const { toast } = useToast();

  const grouped = useMemo(() => {
    const byType = new Map<string, AIMemory[]>();
    for (const m of memories) {
      const list = byType.get(m.fact_type) ?? [];
      list.push(m);
      byType.set(m.fact_type, list);
    }
    return [...byType.entries()];
  }, [memories]);

  const handleDelete = async (memory: AIMemory) => {
    try {
      await remove(memory.id);
      toast({ title: "기억을 지웠어요", description: memory.fact_text });
    } catch {
      toast({
        title: "삭제하지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="app-col mx-auto rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            듀이가 기억하는 정보
          </SheetTitle>
        </SheetHeader>

        <p className="text-[11px] text-muted-foreground mt-1 mb-3 leading-relaxed">
          대화에서 알려주신 내용을 듀이가 기억해 답변에 활용해요.
          잘못 기억된 정보는 지워주세요 — 지우면 더 이상 답변에 반영되지 않아요.
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</p>
        ) : memories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            아직 기억하는 정보가 없어요.
            <br />
            대화하면서 알려주신 취향·예산·일정을 여기서 관리할 수 있어요.
          </p>
        ) : (
          <div className="space-y-4 pb-4">
            {grouped.map(([type, items]) => (
              <div key={type}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">
                  {memoryTypeLabel(type)}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-muted/60 border border-border"
                    >
                      <span className="text-sm text-foreground leading-snug min-w-0">{m.fact_text}</span>
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={isRemoving}
                        className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive active:scale-95 transition-all rounded-lg disabled:opacity-40"
                        aria-label={`기억 삭제: ${m.fact_text}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MemoryManagerSheet;
