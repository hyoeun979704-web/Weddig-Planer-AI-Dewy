import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { sceneByCode } from "@/data/fittingScenes";
import { fetchSdmGallery, sdmResultUrl, type SdmGalleryRow } from "@/features/consumer/data/sdmPreview";

/**
 * 스드메 미리보기 결과 갤러리 — 본인이 생성한 sdm_previews(status=done)만 표시.
 *
 * 품질검토 교정: 10하트 최고가 플로우인데 결과 페이지 URL 을 벗어나면 결과물에
 * 다시 도달할 수 없던 dead-end(갤러리·MyResults 탭 부재) 해소. 다른 갤러리
 * (DressFittingGallery)와 동일 패턴 — embedded 모드로 MyResults 탭에 마운트.
 */

interface ItemWithUrl extends SdmGalleryRow {
  url: string | null;
}

const SdmPreviewGallery = ({ embedded = false }: { embedded?: boolean } = {}) => {
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
        const rows = await fetchSdmGallery(user.id);
        const withUrls: ItemWithUrl[] = await Promise.all(
          rows.map(async (r) => ({
            ...r,
            url: r.result_image_path ? await sdmResultUrl(r.result_image_path) : null,
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
      {!embedded && <PageHeader title="내 스드메 갤러리" />}

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="아직 생성한 스드메 미리보기가 없어요"
            description="장소·메이크업·헤어·드레스를 한 번에 합성한 완성 컷을 모아보세요."
            action={
              <Button onClick={() => navigate("/ai-studio/sdm-preview")}>
                <Plus className="w-4 h-4 mr-1" />첫 미리보기 만들기
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((it) => {
              const sceneLabel = it.prompt_params?.scene_code
                ? sceneByCode(it.prompt_params.scene_code as never)?.shortLabel
                : null;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => navigate(`/ai-studio/sdm-preview/result/${it.id}`)}
                  className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform"
                >
                  <div className="aspect-[3/4] bg-muted">
                    {it.url && (
                      <img src={it.url} alt="" className="w-full h-full object-cover" />
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
        <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
      )}
    </div>
  );
};

export default SdmPreviewGallery;
