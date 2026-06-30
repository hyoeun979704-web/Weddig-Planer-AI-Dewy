import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Image, MessageSquare, Edit, Eye, Heart, CheckCircle2, AlertCircle, ChevronRight, Clock, Ticket, Megaphone, Package, Star, Inbox, Palette, BookOpen, ListChecks } from "lucide-react";
import { DESIGN_MARKET_ENABLED } from "@/lib/featureFlags";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranches } from "@/features/partners/hooks/useBranches";
import { useBusinessStats, usePartnerApplication, useApplyPartnership } from "@/features/partners/hooks/useBusinessDashboard";
import { useBusinessActionItems } from "@/features/partners/hooks/useBusinessActionItems";
import { useListingExtras } from "@/features/partners/hooks/useListingExtras";
import { computeListingCompleteness, type ListingFields } from "@/features/partners/lib/businessListingCompleteness";
import { toast } from "sonner";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isBusiness, isError, businessProfile, isLoading: roleLoading } = useUserRole();
  // 멀티지점: 선택된 지점 기준으로 통계·관리. 단일 지점이면 그 지점이 자동 선택.
  const { branches, selected, selectedId, select } = useBranches();
  // 승인된 기업만 통계/제휴 데이터를 로드. placeId·listingRow 는 선택 지점에서 파생.
  // 데이터 접근은 features/partners/data/businessDashboard 로 추상화(Task #3).
  const isApproved = businessProfile?.approval_status === "approved";
  const listingRow = isApproved ? ((selected ?? null) as Record<string, unknown> | null) : null;
  const placeId = (listingRow?.place_id as string | undefined) ?? null;
  const { stats } = useBusinessStats(placeId, (listingRow?.view_count as number) ?? 0);
  const { partnerApp } = usePartnerApplication(isApproved ? (businessProfile?.id ?? null) : null);
  const applyMutation = useApplyPartnership(businessProfile?.id ?? null);
  // "오늘 할 일" 액션큐 — 승인된 업체만 의미. 미응답 리드·문의·후기·임박 이벤트 집계.
  const { items: actionItems, total: actionTotal, totalLeads, responseRate } = useBusinessActionItems(isApproved ? placeId : null);
  // 완성도 게이지 확장(M5) — 기본 필드 + 포트폴리오·무드(개인화 연료) 신호.
  const extras = useListingExtras(isApproved ? placeId : null);

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

  // 완성도 게이지 — 위저드(BusinessVendorEdit)와 **동일한 computeListingCompleteness** 기반으로
  // 단일화(드리프트 제거: 두 화면이 같은 % · 같은 미입력 목록). REQUIRED_FIELDS/missingFields 는
  // 제휴 신청 자격 게이트 전용으로 분리 유지. 여기에 개인화 연료(포트폴리오·무드, M5)만 확장.
  const listingFields: ListingFields = {
    name: String(listingRow?.name ?? ""),
    description: String(listingRow?.description ?? ""),
    city: String(listingRow?.city ?? ""),
    district: String(listingRow?.district ?? ""),
    imageUrl: String(listingRow?.main_image_url ?? ""),
    minPrice: listingRow?.min_price != null ? String(listingRow.min_price) : "",
    tags: Array.isArray(listingRow?.tags) ? (listingRow!.tags as string[]).join(", ") : "",
    inquiryChannel: ["chat", "url", "phone"].includes(String(listingRow?.inquiry_channel))
      ? (listingRow!.inquiry_channel as "chat" | "url" | "phone")
      : "chat",
    inquiryUrl: String(listingRow?.inquiry_url ?? ""),
    inquiryPhone: String(listingRow?.inquiry_phone ?? ""),
  };
  const baseCompleteness = computeListingCompleteness(listingFields);
  const extraItems = [
    { key: "portfolio", label: "포트폴리오 사진", done: extras.hasPortfolio },
    { key: "mood", label: "취향 무드 태깅", done: extras.hasMood },
  ];
  const completenessDone = baseCompleteness.doneCount + extraItems.filter((e) => e.done).length;
  const completenessTotal = baseCompleteness.total + extraItems.length;
  const completenessPercent = Math.round((completenessDone / completenessTotal) * 100);
  const completenessMissing = [
    ...baseCompleteness.missing.map((m) => m.label),
    ...extraItems.filter((e) => !e.done).map((e) => e.label),
  ];

  const handleApplyPartner = () => {
    if (!user || !businessProfile) return;
    applyMutation.mutate(user.id, {
      onSuccess: () =>
        toast.success("제휴업체 신청을 접수했어요", {
          description: "검토 후 개인 면담 일정을 안내드릴게요.",
        }),
      onError: () => toast.error("신청에 실패했어요. 다시 시도해주세요."),
    });
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
      icon: BookOpen,
      label: "사용법 가이드",
      description: "전체 사용법 + 기능별 상세 가이드 모아보기",
      href: "/business/guides",
      badge: null,
    },
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
    // 디자인 마켓: 세무 확정 전까지 진입점 숨김(피처 플래그). 라우트/백엔드는 유지.
    ...(DESIGN_MARKET_ENABLED
      ? [{
          icon: Palette,
          label: "디자인 등록",
          description: "청첩장 디자인을 마켓에 등록·판매",
          href: "/business/designs",
          badge: null,
        }]
      : []),
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

        {/* 오늘 할 일 (액션큐) — 분산 메뉴 대신 미처리 건을 한 곳으로(S2). 0건이면 청정 상태. */}
        <div className="mx-4 mt-3 p-4 bg-card rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-2.5">
            <ListChecks className="w-4 h-4 text-primary" />
            <p className="text-[13px] font-semibold text-foreground">오늘 할 일</p>
            {actionTotal > 0 && (
              <span className="ml-auto text-[12px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">{actionTotal}</span>
            )}
          </div>
          {actionTotal === 0 ? (
            <p className="text-[13px] text-muted-foreground py-1">처리할 일이 없어요. 깔끔하네요 👍</p>
          ) : (
            <div className="space-y-1.5">
              {actionItems.filter((it) => it.count > 0).map((it) => (
                <button
                  key={it.key}
                  onClick={() => navigate(it.href)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 active:bg-muted transition-colors text-left"
                >
                  <span className="flex-1 text-[13px] font-medium text-foreground">{it.label}</span>
                  <span className="text-[12px] font-bold text-primary bg-background rounded-full px-2 py-0.5 min-w-[24px] text-center">{it.count}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 프로필 완성도 — 채울수록 추천 노출↑(plan §7). 기존 REQUIRED_FIELDS 재사용. */}
        {listingRow && (
          <div className="mx-4 mt-3 p-4 bg-card rounded-2xl border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[13px] font-semibold text-foreground">프로필 완성도</p>
              <p className="text-[13px] font-bold text-primary">{completenessPercent}%</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${completenessPercent}%` }} />
            </div>
            {completenessMissing.length > 0 ? (
              <button onClick={() => navigate("/business/edit")} className="mt-2 text-[11px] text-left w-full">
                <span className="text-foreground font-medium">채우면 노출↑:</span>{" "}
                <span className="text-muted-foreground">{completenessMissing.join(" · ")}</span>
                <span className="text-primary font-medium"> 채우러 가기 ›</span>
              </button>
            ) : (
              <p className="text-[11px] text-emerald-600 mt-2">완벽해요! 기본 정보·포트폴리오·취향 태깅까지 다 채웠어요. 취향 추천에 잘 노출돼요.</p>
            )}
          </div>
        )}

        {/* 지점 선택 — 멀티지점일 때 관리 대상 전환 + 새 지점 추가 */}
        <div className="mx-4 mt-3 p-3 bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[13px] font-semibold text-foreground">관리 지점</p>
            <button
              onClick={() => navigate("/business/edit?new=1")}
              className="text-[12px] text-primary font-medium"
            >
              + 새 지점 추가
            </button>
          </div>
          {branches.length === 0 ? (
            <Button variant="outline" className="w-full h-10" onClick={() => navigate("/business/edit")}>
              업체 정보 입력하기
            </Button>
          ) : (
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
              {branches.map((b) => (
                <button
                  key={b.place_id}
                  onClick={() => select(b.place_id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    selectedId === b.place_id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {b.name || "이름 없는 지점"}
                </button>
              ))}
            </div>
          )}
          {selectedId && (
            <button
              onClick={() => navigate(`/business/edit?branch=${selectedId}`)}
              className="mt-2 text-[12px] text-muted-foreground flex items-center gap-1"
            >
              <Edit className="w-3.5 h-3.5" /> 선택한 지점 정보 수정
            </button>
          )}
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
                    disabled={applyMutation.isPending}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mx-4 mt-4">
          {[
            { icon: Eye, label: "조회수", value: stats.views, color: "text-primary" },
            { icon: Heart, label: "찜", value: stats.favorites, color: "text-primary" },
            // 허영 스탯(쿠폰받기·사진) 폐기 → 의미있는 운영 지표(받은 리드·응답률)로 교체.
            { icon: Inbox, label: "받은 리드", value: totalLeads, color: "text-primary" },
            { icon: MessageSquare, label: "응답률", value: responseRate == null ? "–" : `${responseRate}%`, color: "text-primary" },
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
