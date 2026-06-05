import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, Sparkles, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// 웨딩컨설팅 결과 목록 (/ai-studio/consulting/gallery)
// 본인이 생성한 wedding_consulting_reports 전체(진행중/완료/실패) 표시.

const LABEL: Record<string, string> = {
  personal_color: "퍼스널컬러",
  hair: "헤어",
  makeup: "메이크업",
  dress: "드레스+부케",
};
const STATUS_LABEL: Record<string, string> = {
  processing: "생성 중",
  completed: "완료",
  failed: "실패",
};

interface Row {
  id: string;
  status: "processing" | "completed" | "failed";
  sections: string[];
  created_at: string;
}

const ConsultingGallery = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("wedding_consulting_reports")
        .select("id, status, sections, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24">
      <PageHeader title="내 웨딩컨설팅" />

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="아직 받은 컨설팅이 없어요"
            description="사진을 올리면 퍼스널컬러·헤어·메이크업·드레스 보드를 만들어 드려요."
            action={
              <Button onClick={() => navigate("/ai-studio/consulting")}>
                <Plus className="w-4 h-4 mr-1" />첫 컨설팅 받기
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {items.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/ai-studio/consulting/result/${r.id}`)}
                className="w-full flex items-center justify-between px-3 py-3 bg-background active:bg-muted/40"
              >
                <div className="text-left">
                  <p className="text-[13px] font-medium text-foreground">
                    {r.sections.map((s) => LABEL[s] ?? s).join(" · ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("ko-KR", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-semibold ${
                      r.status === "completed"
                        ? "text-primary"
                        : r.status === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {r.status === "processing" && (
                      <Loader2 className="inline w-3 h-3 mr-0.5 animate-spin" />
                    )}
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

export default ConsultingGallery;
