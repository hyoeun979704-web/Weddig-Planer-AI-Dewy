import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sceneByCode } from "@/data/fittingScenes";

/**
 * 드레스 피팅 결과 갤러리 (/ai-studio/dress-tour/gallery)
 *
 * 본인이 생성한 dress_fittings(status=done) 만 표시.
 */

interface Row {
  id: string;
  result_image_path: string | null;
  prompt_params: { scene_code?: string } | null;
  created_at: string;
}

interface ItemWithUrl extends Row {
  url: string | null;
}

const DressFittingGallery = () => {
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
        .from("dress_fittings")
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
            .from("dress-results")
            .createSignedUrl(r.result_image_path, 60 * 60 * 24);
          return { ...r, url: signed?.signedUrl ?? null };
        }),
      );
      setItems(withUrls);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="뒤로 가기" className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">
            내 드레스 갤러리
          </h1>
        </div>
      </header>

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              아직 생성한 드레스가 없어요.
            </p>
            <Button onClick={() => navigate("/ai-studio/dress-tour")}>
              <Plus className="w-4 h-4 mr-1" />첫 드레스 만들기
            </Button>
          </div>
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

      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

export default DressFittingGallery;
