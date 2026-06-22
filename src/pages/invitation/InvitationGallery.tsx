import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Plus, FileText, Smartphone } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCouplePartnerId } from "@/hooks/useCouplePartnerId";

interface Row {
  id: string;
  user_id: string;
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
  // 커플 공유(I8-A): 배우자의 '발행된 모바일' 청첩장도 함께 보여 RSVP 응답을 같이 관리.
  const { partnerId, isLoading: coupleLoading } = useCouplePartnerId();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || coupleLoading) {
      if (!user) setLoading(false);
      return;
    }
    (async () => {
      const ownerIds = partnerId ? [user.id, partnerId] : [user.id];
      const { data, error } = await (supabase as any)
        .from("invitations")
        .select("id, user_id, template_id, user_data, status, created_at, updated_at, invitation_templates(name, thumbnail_url, format)")
        .in("user_id", ownerIds)
        .order("updated_at", { ascending: false });
      if (error || !data) {
        setItems([]);
      } else {
        // 내 것은 전부, 배우자 것은 RSVP 가 있는 '발행된 모바일'만 노출(임시저장·종이 제외).
        setItems(
          (data as Row[]).filter(
            (r) =>
              r.user_id === user.id ||
              (r.status === "published" && r.invitation_templates?.format !== "paper"),
          ),
        );
      }
      setLoading(false);
    })();
  }, [user, partnerId, coupleLoading]);

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
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
              // 배우자 청첩장 — 편집은 소유자만, 여기선 RSVP 응답만 함께 본다.
              const isPartner = it.user_id !== user?.id;
              return (
                <div key={it.id} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    navigate(isPartner ? `/invitation/${it.id}/rsvp` : `/invitation/${it.id}/edit`)
                  }
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
                    <div className="flex items-center gap-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {groom && bride ? `${groom} · ${bride}` : "제목 없음"}
                      </p>
                      {isPartner && (
                        <span className="text-[9px] px-1 py-px rounded bg-primary/10 text-primary shrink-0">배우자</span>
                      )}
                    </div>
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
                {isMobilePublished && !isPartner && (
                  <button
                    type="button"
                    onClick={() => navigate(`/invitation/${it.id}/rsvp`)}
                    className="text-[11px] h-8 rounded-lg border border-border bg-card text-foreground active:scale-[0.98] transition-transform"
                  >
                    참석 응답 관리
                  </button>
                )}
                {isPartner && (
                  <button
                    type="button"
                    onClick={() => navigate(`/invitation/${it.id}/rsvp`)}
                    className="text-[11px] h-8 rounded-lg border border-border bg-card text-foreground active:scale-[0.98] transition-transform"
                  >
                    참석 응답 보기
                  </button>
                )}
                {(isMobilePublished || isPartner) && (
                  <button
                    type="button"
                    onClick={() => navigate(`/invitation/${it.id}/photos`)}
                    className="text-[11px] h-8 rounded-lg border border-border bg-card text-foreground active:scale-[0.98] transition-transform"
                  >
                    하객 사진
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
