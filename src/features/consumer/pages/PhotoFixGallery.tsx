import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, Sparkles, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPhotoFixJobs } from "@/features/consumer/data/photoFix";

// 사진보정 결과 목록 (/ai-studio/photo-fix/gallery)
// 본인이 만든 photo_retouch_jobs 전체(진행중/완료/실패) 표시.

const STATUS_LABEL: Record<string, string> = {
  processing: "보정 중",
  completed: "완료",
  failed: "실패",
};

interface Row {
  id: string;
  status: "processing" | "completed" | "failed";
  source_paths: string[];
  created_at: string;
}

const PhotoFixGallery = ({ embedded = false }: { embedded?: boolean } = {}) => {
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
      setItems((await fetchPhotoFixJobs(user.id)) as Row[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className={embedded ? "" : "min-h-screen bg-background app-col mx-auto pb-24"}>
      {!embedded && <PageHeader title="내 웨딩 보정" />}

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="아직 보정한 사진이 없어요"
            description="색감·체형까지 초간단 고화질 AI 보정을 받아보세요."
            action={
              <Button onClick={() => navigate("/ai-studio/photo-fix")}>
                <Plus className="w-4 h-4 mr-1" />첫 사진 보정하기
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {items.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => navigate(`/ai-studio/photo-fix/result/${j.id}`)}
                className="w-full flex items-center justify-between px-3 py-3 bg-background active:bg-muted/40"
              >
                <div className="text-left">
                  <p className="text-[13px] font-medium text-foreground">
                    사진 {j.source_paths?.length ?? 0}장
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(j.created_at).toLocaleString("ko-KR", {
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
                      j.status === "completed"
                        ? "text-primary"
                        : j.status === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {j.status === "processing" && (
                      <Loader2 className="inline w-3 h-3 mr-0.5 animate-spin" />
                    )}
                    {STATUS_LABEL[j.status] ?? j.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {!embedded && (
        <BottomNav
          activeTab={location.pathname}
          onTabChange={(href) => navigate(href)}
        />
      )}
    </div>
  );
};

export default PhotoFixGallery;
