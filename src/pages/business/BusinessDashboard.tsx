import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Image, MessageSquare, Edit, Eye, Heart, CheckCircle2, AlertCircle, ChevronRight, Clock, Ticket, Megaphone, Package, Star, Inbox, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isBusiness, isError, businessProfile, isLoading: roleLoading } = useUserRole();
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [stats, setStats] = useState({ media: 0, favorites: 0, views: 0, couponDownloads: 0, reviews: 0 });

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    // 일시적 역할 조회 오류(isError)일 때는 온보딩으로 보내지 않는다 — 가드가
    // 처리한다. business 역할인데 프로필이 아직 없을 때만 온보딩으로 안내.
    if (!isError && isBusiness && !businessProfile) {
      navigate("/business/onboard");
      return;
    }
  }, [authLoading, roleLoading, user, isBusiness, isError, businessProfile, navigate]);

  useEffect(() => {
    if (!businessProfile || businessProfile.approval_status !== "approved") return;
    (async () => {
      const { data, error } = await supabase.rpc("get_my_listing");
      if (error) {
        toast.error("통계를 불러오지 못했어요");
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.place_id) return;
      setPlaceId(row.place_id);
      setListingRow(row);
      const [favRes, mediaRes, dlRes, reviewRes] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("item_id", row.place_id),
        supabase.from("place_media").select("id", { count: "exact", head: true }).eq("place_id", row.place_id),
        supabase.rpc("get_my_coupon_download_count"),
        supabase.from("place_reviews").select("review_id", { count: "exact", head: true }).eq("place_id", row.place_id),
      ]);
      setStats({
        favorites: favRes.count ?? 0,
        media: mediaRes.count ?? 0,
        views: row.view_count ?? 0,
        couponDownloads: typeof dlRes.data === "number" ? dlRes.data : 0,
        reviews: reviewRes.count ?? 0,
      });
    })();
  }, [businessProfile]);

  // 제휴(프렌즈) 신청 현황 — 대기/면담중이면 CTA 대신 상태 표시
  const [partnerApp, setPartnerApp] = useState<{ status: string } | null>(null);
  const [listingRow, setListingRow] = useState<Record<string, unknown> | null>(null);
  const [applying, setApplying] = useState(false);
  const loadPartnerApp = async () => {
    if (!businessProfile) return;
    const { data } = await supabase
      .from("partnership_applications")
      .select("status")
      .eq("business_profile_id", businessProfile.id)
      .in("status", ["pending", "interviewing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPartnerApp(data ?? null);
  };
  useEffect(() => {
    if (!businessProfile || businessProfile.approval_status !== "approved") return;
    void loadPartnerApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessProfile]);

  // 제휴업체는 스키마(업체 정보) 완성이 필수 — 필수 필드 체크리스트
  const REQUIRED_FIELDS: { key: string; label: string }[] = [
    { key: "name", label: "업체명" },
    { key: "category", label: "카테고리" },
    { key: "city", label: "지역(시)" },
    { key: "district", label: "지역(구)" },
    { key: "description", label: "업체 소개" },
    { key: "main_image_url", label: "대표 사진" },
  ];
  const missingFields = listingRow
    ? REQUIRED_FIELDS.filter((f) => {
        const v = listingRow[f.key];
        return v === null || v === undefined || String(v).trim() === "";
      })
    : REQUIRED_FIELDS;
  const isSchemaComplete = !!listingRow && missingFields.length === 0;

  const handleApplyPartner = async () => {
    if (!user || !businessProfile) return;
    setApplying(true);
    try {
      const { error } = await supabase
        .from("partnership_applications")
        .insert({
          business_profile_id: businessProfile.id,
          user_id: user.id,
          message: "대시보드에서 신청",
        });
      if (error) throw error;
      toast.success("제휴업체 신청을 접수했어요", {
        description: "검토 후 개인 면담 일정을 안내드릴게요.",
      });
      await loadPartnerApp();
    } catch {
      toast.error("신청에 실패했어요. 다시 시도해주세요.");
    } finally {
      setApplying(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!businessProfile) return null;

  // 운영자 승인 전에는 대시보드 기능 대신 상태 화면을 보여준다.
  if (businessProfile.approval_status !== "approved") {
    const rejected = businessProfile.approval_status === "rejected";
    // 입점은 승인이 2단계(가입 승인 → 정보 검토 후 노출)라 "가입했는데 왜 안
    // 보이지?" 혼란이 잦다. 진행 단계를 시각화해 지금 어디까지 왔는지 보여준다.
    const steps = [
      { label: "기업회원 가입 승인", desc: "운영자가 사업자 정보를 확인해요" },
      { label: "업체 정보 등록", desc: "상세페이지에 들어갈 정보를 입력해요" },
      { label: "검토 후 노출", desc: "고객에게 우리 업체가 보여요" },
    ];
    const currentStep = 0; // 검토 중 = 1단계(가입 승인) 진행 중
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => navigate("/mypage")} className="w-10 h-10 flex items-center justify-center -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-center font-semibold text-lg pr-10">기업회원</h1>
          </div>
        </header>
        <main className="px-5 py-12 space-y-6">
          <div className="text-center space-y-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${rejected ? "bg-destructive/10" : "bg-amber-100"}`}>
              {rejected ? <AlertCircle className="w-10 h-10 text-destructive" /> : <Clock className="w-10 h-10 text-amber-600" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {rejected ? "등록이 반려되었어요" : "등록을 검토하고 있어요"}
              </h2>
              {!rejected && businessProfile.business_name && (
                <p className="text-sm font-semibold text-foreground mt-1">
                  ‘{businessProfile.business_name}’
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {rejected
                  ? businessProfile.review_note
                    ? "아래 사유를 확인하고 다시 신청해주세요."
                    : "정보를 다시 확인하고 재신청해주세요. 문의는 고객센터로 연락 주세요."
                  : "보통 1~2영업일 이내에 검토가 끝나요. 승인되면 알림으로 알려드리고, 바로 업체 정보를 입력할 수 있어요."}
              </p>
            </div>
          </div>

          {rejected && businessProfile.review_note && (
            <p className="text-sm text-foreground bg-muted rounded-lg p-3 text-left whitespace-pre-line">
              {businessProfile.review_note}
            </p>
          )}

          {/* 진행 단계 — 검토 중일 때만(2단계 승인 흐름을 한눈에) */}
          {!rejected && (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">진행 단계</p>
              {steps.map((s, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div key={s.label} className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        done
                          ? "bg-primary text-primary-foreground"
                          : active
                            ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                        {active && (
                          <span className="ml-1.5 text-[11px] text-amber-600 font-normal">· 진행 중</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rejected ? (
            <Button onClick={() => navigate("/business/onboard")} className="w-full h-12">
              다시 신청하기
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/mypage")} className="w-full h-12">
              마이페이지로
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
      icon: Building2,
      label: "기존 업체 관리권한 요청",
      description: "이미 듀이에 등록된 우리 업체 페이지를 인수 (운영자 승인)",
      href: "/business/claim",
      badge: null,
    },
    {
      icon: Image,
      label: isMenuCategory ? "메뉴 관리" : "사진 관리",
      description: isMenuCategory
        ? `등록된 메뉴 ${stats.media}개 · 즉시 노출`
        : `등록된 사진 ${stats.media}장 · 즉시 노출`,
      href: "/business/gallery",
      badge: null,
    },
    {
      icon: Ticket,
      label: "쿠폰 관리",
      description: "할인 쿠폰 발행 (검토 후 노출)",
      href: "/business/coupons",
      badge: null,
    },
    {
      icon: Megaphone,
      label: "이벤트 관리",
      description: "이벤트 등록 (운영자 검토 후 노출)",
      href: "/business/events",
      badge: null,
    },
    {
      icon: Package,
      label: "상품 관리",
      description: "상품 등록 (운영자 검토 후 노출)",
      href: "/business/products",
      badge: null,
    },
    {
      icon: MessageSquare,
      label: "문의/예약 관리",
      description: "고객 문의 확인·답변",
      href: "/business/inquiries",
      badge: null,
    },
    {
      icon: Package,
      label: "결과물 보내기",
      description: "보정본 등 결과물을 고객에게 전달",
      href: "/business/deliveries",
      badge: null,
    },
    {
      icon: Palette,
      label: "디자인 등록",
      description: "청첩장 디자인을 마켓에 등록·판매",
      href: "/business/designs",
      badge: null,
    },
    {
      icon: Inbox,
      label: "받은 견적 요청",
      description: "고객 견적 요청에 빠르게 답변하고 리드를 잡으세요",
      href: "/business/leads",
      badge: null,
    },
    {
      icon: Star,
      label: "고객 후기",
      description: `등록된 후기 ${stats.reviews}개 · 평점 확인`,
      href: "/business/reviews",
      badge: null,
    },
  ];

  const TIER_LABEL: Record<string, string> = {
    basic: "일반",
    friends: "프렌즈",
    bff: "이달의 베프",
  };
  const tier = businessProfile.partner_tier ?? "basic";

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
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
                {/* 이 화면은 approval_status === "approved" 일 때만 도달한다. */}
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                승인 완료 · {businessProfile.service_category} ·{" "}
                <span className={tier === "basic" ? "" : "font-bold text-primary"}>
                  {TIER_LABEL[tier]}
                  {tier === "bff" ? " 🏆" : ""}
                </span>
              </p>
              {/* 국세청 사업자 인증은 운영자 승인과 별개 지표로 분리 표기. */}
              {!businessProfile.is_verified && (
                <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> 국세청 사업자 인증 대기 중
                </p>
              )}
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

        {/* 제휴(프렌즈) 신청 — basic 등급에서만 노출, 등록 완료(프렌즈/베프)되면 사라짐 */}
        {tier === "basic" && (
          <div className="mx-4 mt-3 p-4 bg-card rounded-2xl border border-border space-y-2">
            {partnerApp ? (
              <>
                <p className="text-sm font-bold text-foreground">
                  제휴업체 신청 {partnerApp.status === "interviewing" ? "면담 진행 중" : "검토 중"}
                </p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {partnerApp.status === "interviewing"
                    ? "개인 면담이 진행 중이에요. 결과를 곧 알려드릴게요."
                    : "운영자 검토 후 개인 면담 일정을 안내드려요."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground">
                  프렌즈(제휴업체)가 되어보세요
                </p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  추천 우선 노출·파트너 배지 등 제휴 혜택을 받아요. 검토와 개인
                  면담 후 선정되며, 언제든 신청할 수 있어요.
                </p>
                {isSchemaComplete ? (
                  <Button
                    className="w-full h-10 mt-1"
                    disabled={applying}
                    onClick={handleApplyPartner}
                  >
                    제휴업체 신청하기
                  </Button>
                ) : (
                  <>
                    <p className="text-[11px] text-amber-600">
                      제휴업체는 업체 정보를 모두 채워야 신청할 수 있어요 — 미입력:{" "}
                      {missingFields.map((f) => f.label).join(", ")}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full h-10 mt-1"
                      onClick={() => navigate("/business/edit")}
                    >
                      업체 정보 채우러 가기 ({REQUIRED_FIELDS.length - missingFields.length}/{REQUIRED_FIELDS.length})
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mx-4 mt-4">
          {[
            { icon: Eye, label: "조회수", value: stats.views, color: "text-primary" },
            { icon: Heart, label: "찜", value: stats.favorites, color: "text-primary" },
            { icon: Ticket, label: "쿠폰받기", value: stats.couponDownloads, color: "text-primary" },
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
