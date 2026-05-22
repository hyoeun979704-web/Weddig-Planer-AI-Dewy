import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Image, MessageSquare, Edit, Eye, Heart, CheckCircle2, AlertCircle, ChevronRight, Clock, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isBusiness, businessProfile, isLoading: roleLoading } = useUserRole();
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [stats, setStats] = useState({ media: 0, favorites: 0 });

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
    if (!businessProfile || businessProfile.approval_status !== "approved") return;
    (async () => {
      const { data } = await (supabase as any).rpc("get_my_listing");
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.place_id) return;
      setPlaceId(row.place_id);
      const [favRes, mediaRes] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("item_id", row.place_id),
        (supabase as any).from("place_media").select("id", { count: "exact", head: true }).eq("place_id", row.place_id),
      ]);
      setStats({ favorites: favRes.count ?? 0, media: mediaRes.count ?? 0 });
    })();
  }, [businessProfile]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!businessProfile) return null;

  // 운영자 승인 전에는 대시보드 기능 대신 상태 화면을 보여준다.
  if (businessProfile.approval_status !== "approved") {
    const rejected = businessProfile.approval_status === "rejected";
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => navigate("/mypage")} className="w-10 h-10 flex items-center justify-center -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center font-semibold text-lg pr-10">기업회원</h1>
          </div>
        </header>
        <main className="px-5 py-16 text-center space-y-5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${rejected ? "bg-destructive/10" : "bg-amber-100"}`}>
            {rejected ? <AlertCircle className="w-10 h-10 text-destructive" /> : <Clock className="w-10 h-10 text-amber-600" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {rejected ? "등록이 반려되었어요" : "등록 검토 중이에요"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {rejected
                ? "아래 사유를 확인하고 다시 신청해주세요."
                : "운영자 검토 후 결과를 알려드릴게요. 승인되면 업체 상세정보를 입력할 수 있어요."}
            </p>
            {rejected && businessProfile.review_note && (
              <p className="text-sm text-foreground mt-3 bg-muted rounded-lg p-3 text-left whitespace-pre-line">
                {businessProfile.review_note}
              </p>
            )}
          </div>
          {rejected && (
            <Button onClick={() => navigate("/business/onboard")} className="w-full h-12">
              다시 신청하기
            </Button>
          )}
        </main>
      </div>
    );
  }

  const isMenuCategory = businessProfile.service_category === "invitation_venue";
  const menuItems = [
    {
      icon: Edit,
      label: "업체 정보 수정",
      description: "상세페이지에 표시되는 정보 관리 (검토 후 반영)",
      href: "/business/edit",
      badge: null,
    },
    {
      icon: Image,
      label: isMenuCategory ? "메뉴 관리" : "사진 관리",
      description: isMenuCategory
        ? `등록된 메뉴 ${stats.media}개`
        : `등록된 사진 ${stats.media}장`,
      href: "/business/gallery",
      badge: null,
    },
    {
      icon: Ticket,
      label: "쿠폰 관리",
      description: "할인 쿠폰 발행 (검토 없이 즉시 노출)",
      href: "/business/coupons",
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
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
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
              {placeId && (
                <button
                  onClick={() => navigate(`/vendor/${placeId}`)}
                  className="mt-2 text-xs text-primary font-medium flex items-center gap-0.5"
                >
                  <Eye className="w-3.5 h-3.5" /> 상세페이지 미리보기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 mx-4 mt-4">
          {[
            { icon: Heart, label: "찜", value: stats.favorites, color: "text-primary" },
            { icon: Image, label: isMenuCategory ? "메뉴" : "사진", value: stats.media, color: "text-primary" },
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
