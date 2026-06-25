import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { makeupSceneByCode } from "@/data/makeupScenes";

interface Row {
  id: string;
  result_image_path: string | null;
  prompt_params: { scene_code?: string } | null;
  created_at: string;
}

interface ItemWithUrl extends Row {
  url: string | null;
}

const MakeupFittingGallery = ({ embedded = false }: { embedded?: boolean } = {}) => {
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
      const { data, error } = await (supabase as any)
        .from("makeup_fittings")
        .select("id, result_image_path, prompt_params, created_at")
        .eq("user_id", user.id)
        .eq("status", "done")
        .order("created_at", { ascending: false });

      if (error || !data) {
        setItems([]);
        setLoading(false);
        return;
      }

      const withUrls: ItemWithUrl[] = await Promise.all(
        (data as Row[]).map(async (r) => {
          if (!r.result_image_path) return { ...r, url: null };
          const { data: signed } = await supabase.storage
            .from("makeup-results")
            .createSignedUrl(r.result_image_path, 60 * 60 * 24);
          return { ...r, url: signed?.signedUrl ?? null };
        }),
      );
      setItems(withUrls);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className={embedded ? "" : "min-h-screen bg-background app-col mx-auto pb-24"}>
      {!embedded && <PageHeader title="내 메이크업 갤러리" />}

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="아직 생성한 메이크업이 없어요"
            description="원하는 메이크업을 시도해보고 결과를 갤러리에 모아보세요."
            action={
              <Button onClick={() => navigate("/ai-studio/makeup-room")}>
                <Plus className="w-4 h-4 mr-1" />첫 메이크업 만들기
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((it) => {
              const sceneLabel = it.prompt_params?.scene_code
                ? makeupSceneByCode(it.prompt_params.scene_code as any)
                    ?.shortLabel
                : null;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() =>
                    navigate(`/ai-studio/makeup-room/result/${it.id}`)
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

export default MakeupFittingGallery;
