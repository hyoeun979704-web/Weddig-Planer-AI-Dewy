import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { sceneByCode } from "@/data/fittingScenes";
import { fetchDressGallery, dressResultUrl, type DressGalleryRow } from "@/features/consumer/data/dressFitting";

/**
 * 드레스 피팅 결과 갤러리 (/ai-studio/dress-tour/gallery)
 *
 * 본인이 생성한 dress_fittings(status=done) 만 표시.
 */

interface ItemWithUrl extends DressGalleryRow {
  url: string | null;
}

const DressFittingGallery = ({ embedded = false }: { embedded?: boolean } = {}) => {
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
        const rows = await fetchDressGallery(user.id);
        const withUrls: ItemWithUrl[] = await Promise.all(
          rows.map(async (r) => ({
            ...r,
            url: r.result_image_path ? await dressResultUrl(r.result_image_path) : null,
          })),
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
      {!embedded && <PageHeader title="내 드레스 갤러리" />}

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="아직 생성한 드레스가 없어요"
            description="원하는 드레스를 입어보고 결과를 갤러리에 모아보세요."
            action={
              <Button onClick={() => navigate("/ai-studio/dress-tour")}>
                <Plus className="w-4 h-4 mr-1" />첫 드레스 만들기
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((it) => {
              const sceneLabel = it.prompt_params?.scene_code
                ? sceneByCode(it.prompt_params.scene_code as any)?.shortLabel
                : null;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() =>
                    navigate(`/ai-studio/dress-tour/result/${it.id}`)
                  }
                  className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform"
                >
                  <div className="aspect-[3/4] bg-muted">
                    {it.url && (
                      <img
                        src={it.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-muted-foreground truncate">
                      {sceneLabel ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(it.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </button>
              );
            })}
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

export default DressFittingGallery;
