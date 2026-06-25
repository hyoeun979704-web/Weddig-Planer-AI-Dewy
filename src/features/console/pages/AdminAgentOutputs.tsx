import { useEffect, useState, useCallback } from "react";
import { Loader2, Filter, FileText, Image as ImageIcon, Check, X, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AgentOutput {
  id: string;
  kind: "draft" | "asset";
  source: string | null;
  title: string;
  body: string | null;
  media_url: string | null;
  deslop_score: number | null;
  issues: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const STATUS_LABEL: Record<string, { ko: string; cls: string }> = {
  pending: { ko: "대기", cls: "bg-amber-100 text-amber-700" },
  approved: { ko: "승인", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { ko: "반려", cls: "bg-rose-100 text-rose-700" },
};

const AdminAgentOutputs = () => {
  const [items, setItems] = useState<AgentOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<AgentOutput | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    let query = (supabase as any)
      .from("agent_outputs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data, error } = await query;
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setItems(data ?? []);
    }
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const review = async (item: AgentOutput, status: "approved" | "rejected") => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("agent_outputs")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: auth.user?.id ?? null })
      .eq("id", item.id);
    if (error) {
      toast({ title: "처리 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "승인됨" : "반려됨" });
      if (selected?.id === item.id) setSelected({ ...item, status });
      fetchItems();
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <AdminGuard>
      <AdminLayout title="에이전트 산출물" description="에이전트가 생성한 초안·이미지 승인 큐 (섀도 모드)">
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background rounded-lg border border-border items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">대기</SelectItem>
              <SelectItem value="approved">승인</SelectItem>
              <SelectItem value="rejected">반려</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">총 {items.length}건 · 대기 {pendingCount}건</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-sm text-muted-foreground">
            해당 상태의 산출물이 없어요. (로컬 에이전트가 생성·업로드하면 여기 표시됩니다)
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* 목록 */}
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSelected(it)}
                  className={`w-full text-left p-3 rounded-xl border bg-background hover:bg-muted/40 transition-colors ${
                    selected?.id === it.id ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {it.kind === "draft" ? <FileText className="w-4 h-4 text-muted-foreground" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-medium text-sm text-foreground flex-1 truncate">{it.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_LABEL[it.status].cls}`}>{STATUS_LABEL[it.status].ko}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    {it.source && <span>{it.source}</span>}
                    {it.deslop_score != null && <span>deslop {it.deslop_score}/10</span>}
                    <span>{new Date(it.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 미리보기 + 승인 */}
            <div className="p-4 rounded-xl border border-border bg-background min-h-[200px]">
              {!selected ? (
                <p className="text-sm text-muted-foreground">왼쪽에서 산출물을 선택하세요.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-foreground truncate">{selected.title}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_LABEL[selected.status].cls}`}>{STATUS_LABEL[selected.status].ko}</span>
                  </div>
                  {selected.deslop_score != null && (
                    <p className="text-xs text-muted-foreground">
                      자동 검수 deslop {selected.deslop_score}/10{selected.issues ? ` · ${selected.issues}` : ""}
                    </p>
                  )}
                  {selected.kind === "draft" ? (
                    <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded-lg p-3 max-h-72 overflow-auto text-foreground">{selected.body}</pre>
                  ) : (
                    <div className="space-y-2">
                      {selected.media_url && <img src={selected.media_url} alt={selected.title} className="rounded-lg max-h-72 object-contain" />}
                      {selected.media_url && (
                        <a href={selected.media_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> 원본 열기
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => review(selected, "approved")}
                      disabled={selected.status === "approved"}
                      className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> 승인
                    </button>
                    <button
                      onClick={() => review(selected, "rejected")}
                      disabled={selected.status === "rejected"}
                      className="flex-1 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" /> 반려
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminAgentOutputs;
