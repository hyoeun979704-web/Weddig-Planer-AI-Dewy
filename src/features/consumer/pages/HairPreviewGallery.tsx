import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, Scissors } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchHairGallery,
  hairResultUrl,
  type HairResultItem,
} from "@/features/consumer/data/hairPreview";

/**
 * 헤어 변형 결과 갤러리 (/ai-studio/hair-room/gallery)
 *
 * 본인이 생성한 hair_preview_jobs(status=completed) 만 표시. 드레스/메이크업
 * 갤러리와 동일한 형식 — 결과 첫 이미지를 썸네일로, 카드 탭 시 결과 페이지로.
 */

interface Row {
  id: string;
  results: HairResultItem[] | null;
  created_at: string;
}

interface ItemWithUrl extends Row {
  url: string | null;
  count: number;
}

const HairPreviewGallery = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [items, setItems] = useState<ItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const rows = await fetchHairGallery(user.id);
        const withUrls: ItemWithUrl[] = await Promise.all(
          (rows as Row[]).map(async (r) => {
            const results = Array.isArray(r.results) ? r.results : [];
            const first = results[0];
            if (!first?.path) return { ...r, url: null, count: results.length };
            // 헤어 결과는 청첩장 업로드와 같은 버킷에 재호스팅된다(HairPreviewResult 참고).
            const url = await hairResultUrl(first.path);
            return { ...r, url, count: results.length };
          }),
        );
        setItems(withUrls);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <div className={embedded ? "" : "min-h-screen bg-background app-col mx-auto pb-24"}>
      {!embedded && <PageHeader title="내 헤어 갤러리" />}

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="아직 생성한 헤어가 없어요"
            description="원하는 헤어스타일·컬러를 시연하고 결과를 갤러리에 모아보세요."
            action={
              <Button onClick={() => navigate("/ai-studio/hair-room")}>
                <Plus className="w-4 h-4 mr-1" />첫 헤어 만들기
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/ai-studio/hair-room/result/${it.id}`)}
                className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform"
              >
                <div className="aspect-[3/4] bg-muted">
                  {it.url && (
                    <img src={it.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[11px] text-muted-foreground truncate">
                    {it.count > 1 ? `${it.count}컷` : "헤어 시연"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(it.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {!embedded && <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />}
    </div>
  );
};

export default HairPreviewGallery;
