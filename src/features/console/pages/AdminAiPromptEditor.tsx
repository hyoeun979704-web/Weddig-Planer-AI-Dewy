import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// AI 생성 프롬프트(LLM 텍스트) 실시간 편집 (/admin/ai-prompt-editor)
// ai_prompts 테이블의 content/is_active 를 고치면 엣지 함수가 다음 호출부터 바로 사용한다
// (앱·함수 재배포 불필요). 행이 비활성/조회실패면 엣지 함수는 코드 폴백을 쓴다.

interface PromptRow {
  key: string;
  label: string;
  description: string | null;
  content: string;
  category: string;
  is_active: boolean;
  updated_at: string;
}

const AdminAiPromptEditor = () => {
  const [rows, setRows] = useState<PromptRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 키별 로컬 편집 상태(저장 전). undefined = 미수정.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("ai_prompts")
      .select("key, label, description, content, category, is_active, updated_at")
      .order("category", { ascending: true })
      .order("key", { ascending: true });
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as PromptRow[]);
      setDrafts({});
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleSave = async (row: PromptRow) => {
    const next = drafts[row.key];
    if (next === undefined || next === row.content) return;
    if (!next.trim()) {
      toast({ title: "내용이 비어 있어요", description: "빈 프롬프트는 저장할 수 없어요(폴백이 쓰입니다).", variant: "destructive" });
      return;
    }
    setSavingKey(row.key);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("ai_prompts")
      .update({ content: next, updated_by: auth?.user?.id ?? null })
      .eq("key", row.key);
    setSavingKey(null);
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "저장됐어요", description: "다음 생성 호출부터 바로 반영돼요." });
    fetchRows();
  };

  const handleToggleActive = async (row: PromptRow, active: boolean) => {
    const { error } = await (supabase as any)
      .from("ai_prompts")
      .update({ is_active: active })
      .eq("key", row.key);
    if (error) {
      toast({ title: "변경 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: active ? "활성화됨" : "비활성화됨",
      description: active ? "이 프롬프트를 사용해요." : "코드 기본값(폴백)을 사용해요.",
    });
    fetchRows();
  };

  return (
    <AdminGuard>
      <AdminLayout
        title="AI 프롬프트 편집"
        description="LLM 텍스트 생성 프롬프트를 실시간 수정 — 저장 즉시 다음 호출에 반영(앱 업데이트 불필요)"
        rightAction={
          <Button size="sm" variant="outline" onClick={fetchRows} disabled={isLoading}>
            <RotateCcw className="w-4 h-4 mr-1" />
            새로고침
          </Button>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 px-6">
            <h2 className="text-base font-semibold text-foreground mb-2">편집 가능한 프롬프트가 없어요</h2>
            <p className="text-sm text-muted-foreground">
              마이그레이션(ai_prompts)이 적용되면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const draft = drafts[row.key] ?? row.content;
              const dirty = draft !== row.content;
              return (
                <div key={row.key} className="bg-background rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground">{row.label}</h3>
                        <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{row.key}</code>
                        {!row.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            폴백(코드 기본값) 사용 중
                          </span>
                        )}
                      </div>
                      {row.description && (
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{row.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">활성</span>
                      <Switch
                        checked={row.is_active}
                        onCheckedChange={(v) => handleToggleActive(row, v)}
                        aria-label="프롬프트 활성/비활성"
                      />
                    </div>
                  </div>

                  <textarea
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.key]: e.target.value }))}
                    spellCheck={false}
                    className="w-full min-h-[220px] max-h-[520px] resize-y rounded-lg border border-border bg-muted/30 p-3 font-mono text-[12px] leading-snug text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {draft.length.toLocaleString()}자 · 마지막 수정 {new Date(row.updated_at).toLocaleString("ko-KR")}
                    </span>
                    <div className="flex items-center gap-2">
                      {dirty && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setDrafts((d) => { const n = { ...d }; delete n[row.key]; return n; })}
                        >
                          되돌리기
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={!dirty || savingKey === row.key}
                        onClick={() => handleSave(row)}
                      >
                        {savingKey === row.key ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-1" />
                        )}
                        저장
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminAiPromptEditor;
