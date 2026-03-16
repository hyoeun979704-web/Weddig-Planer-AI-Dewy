import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Image, MessageSquare, Edit, Eye, Heart, CheckCircle2, AlertCircle, ChevronRight, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isBusiness, businessProfile, isLoading: roleLoading } = useUserRole();
  const [stats, setStats] = useState({ views: 0, favorites: 0, gallery: 0, highlights: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!roleLoading && !isBusiness) {
      navigate("/business/onboard");
      return;
    }
  }, [authLoading, roleLoading, user, isBusiness, navigate]);

  useEffect(() => {
    if (!businessProfile?.vendor_id) return;

    const fetchStats = async () => {
      const vid = String(businessProfile.vendor_id);

      const [favRes, galleryRes, highlightRes] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("item_id", vid),
        (supabase as any).from("vendor_gallery").select("id", { count: "exact", head: true }).eq("vendor_id", businessProfile.vendor_id),
        (supabase as any).from("vendor_highlights").select("id", { count: "exact", head: true }).eq("vendor_id", businessProfile.vendor_id),
      ]);

      setStats({
        views: 0, // TODO: implement view tracking
        favorites: favRes.count ?? 0,
        gallery: galleryRes.count ?? 0,
        highlights: highlightRes.count ?? 0,
      });
    };

    fetchStats();
  }, [businessProfile]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!businessProfile) return null;

  const menuItems = [
    {
      icon: Edit,
      label: "업체 정보 수정",
      description: "상세페이지에 표시되는 정보 관리",
      href: "/business/edit",
      badge: null,
    },
    {
      icon: Image,
      label: "이미지/갤러리 관리",
      description: `등록된 이미지 ${stats.gallery}장 · 장점카드 ${stats.highlights}개`,
      href: "/business/gallery",
      badge: null,
    },
    {
      icon: MessageSquare,
      label: "문의/예약 관리",
      description: "고객 문의 및 예약 내역 확인",
      href: "/business/inquiries",
      badge: "준비중",
    },
  ];

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate("/mypage")} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">업체 관리</h1>
        </div>
      </header>

      <main className="pb-8">
        {/* Profile card */}
        <div className="mx-4 mt-4 p-5 bg-gradient-to-br from-primary/10 via-accent/30 to-transparent rounded-2xl border border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground truncate">{businessProfile.business_name}</h2>
                {businessProfile.is_verified ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {businessProfile.is_verified ? "인증된 업체" : "인증 대기중"} · {businessProfile.service_category}
              </p>
              <button
                onClick={() => navigate(`/vendor/${businessProfile.vendor_id}`)}
                className="mt-2 text-xs text-primary font-medium flex items-center gap-0.5"
              >
                <Eye className="w-3.5 h-3.5" /> 상세페이지 미리보기
              </button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mx-4 mt-4">
          {[
            { icon: Heart, label: "찜", value: stats.favorites, color: "text-primary" },
            { icon: Image, label: "이미지", value: stats.gallery, color: "text-primary" },
            { icon: Star, label: "장점카드", value: stats.highlights, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border p-3 text-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto`} />
              <p className="text-lg font-bold text-foreground mt-1">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Menu items */}
        <div className="mx-4 mt-6 space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground px-1 mb-2">관리 메뉴</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {menuItems.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => item.badge !== "준비중" && navigate(item.href)}
                disabled={item.badge === "준비중"}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted/80 transition-colors text-left disabled:opacity-50 ${
                  idx < menuItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{item.badge}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BusinessDashboard;
