import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, FileText, Smartphone } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Row {
  id: string;
  template_id: string | null;
  user_data: Record<string, string> | null;
  status: string;
  created_at: string;
  updated_at: string;
  invitation_templates: {
    name: string;
    thumbnail_url: string;
    format: string;
  } | null;
}

const InvitationGallery = () => {
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
      const { data, error } = await (supabase as any)
        .from("invitations")
        .select("id, template_id, user_data, status, created_at, updated_at, invitation_templates(name, thumbnail_url, format)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error || !data) {
        setItems([]);
      } else {
        setItems(data);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24">
      <PageHeader title="내 청첩장" />

      <main className="px-4 py-5">
        <div className="grid grid-cols-2 gap-2 mb-5">
          <Button
            onClick={() => navigate("/invitation/new?format=paper")}
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1.5"
          >
            <FileText className="w-5 h-5" />
            <span className="text-[12px]">종이 청첩장</span>
          </Button>
          <Button
            onClick={() => navigate("/invitation/new?format=mobile")}
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1.5"
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[12px]">모바일 청첩장</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              아직 만든 청첩장이 없어요.
            </p>
            <Button onClick={() => navigate("/invitation/new?format=paper")}>
              <Plus className="w-4 h-4 mr-1" />첫 청첩장 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((it) => {
              const groom = it.user_data?.groom_name ?? "";
              const bride = it.user_data?.bride_name ?? "";
              const isMobilePublished =
                it.status === "published" &&
                it.invitation_templates?.format !== "paper";
              return (
                <div key={it.id} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate(`/invitation/${it.id}/edit`)}
                  className="bg-card rounded-xl overflow-hidden border border-border text-left active:scale-[0.98] transition-transform"
                >
                  <div className="aspect-[3/4] bg-muted">
                    {it.invitation_templates?.thumbnail_url ? (
                      <img
                        src={it.invitation_templates.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-2">
                    <p className="text-[12px] font-semibold text-foreground truncate">
                      {groom && bride ? `${groom} · ${bride}` : "제목 없음"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {it.invitation_templates?.format === "paper" ? "종이" : "모바일"}
                      {" · "}
                      {it.status === "draft"
                        ? "임시저장"
                        : it.status === "published"
                          ? "공유됨"
                          : it.status === "archived"
                            ? "보관됨"
                            : it.status}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(it.updated_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </button>
                {isMobilePublished && (
                  <button
                    type="button"
                    onClick={() => navigate(`/invitation/${it.id}/rsvp`)}
                    className="text-[11px] h-8 rounded-lg border border-border bg-card text-foreground active:scale-[0.98] transition-transform"
                  >
                    참석 응답 관리
                  </button>
                )}
                </div>
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

export default InvitationGallery;
