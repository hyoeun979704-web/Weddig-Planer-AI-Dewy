import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
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
      <PageHeader title="내 드레스 갤러리" />

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            emoji=""
            title="아직 생성한 드레스가 없어요"
            variant="inline"
            action={{ label: "첫 드레스 만들기", onClick: () => navigate("/ai-studio/dress-tour") }}
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
                    <p className="text-caption text-muted-foreground truncate">
                      {sceneLabel ?? "—"}
                    </p>
                    <p className="text-caption text-muted-foreground">
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
