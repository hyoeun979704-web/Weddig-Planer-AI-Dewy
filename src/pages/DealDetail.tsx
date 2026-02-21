import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, ExternalLink, Tag, Copy, Check, Gift, Users, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { usePartnerDealDetail, usePartnerDeals } from "@/hooks/usePartnerDeals";
import { useAuth } from "@/contexts/AuthContext";

const dealTypeLabels: Record<string, { label: string; color: string }> = {
  discount: { label: "할인", color: "bg-red-100 text-red-600" },
  gift: { label: "사은품", color: "bg-purple-100 text-purple-600" },
  package: { label: "패키지", color: "bg-blue-100 text-blue-600" },
  event: { label: "이벤트", color: "bg-green-100 text-green-600" },
  coupon: { label: "쿠폰", color: "bg-amber-100 text-amber-600" },
};

const formatPrice = (price: number): string => {
  return price.toLocaleString() + "원";
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

const DealDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { deal, isLoading } = usePartnerDealDetail(id);
  const { claimDeal } = usePartnerDeals();

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleClaim = async () => {
    if (!deal || !user) {
      if (!user) navigate("/auth");
      return;
    }
    setIsClaiming(true);
    const success = await claimDeal(deal.id);
    if (success) setClaimed(true);
    setIsClaiming(false);
  };

  const handleCopyCode = async () => {
    if (!deal?.coupon_code) return;
    await navigator.clipboard.writeText(deal.coupon_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTabChange = (href: string) => navigate(href);

  const isClaimed = deal?.is_claimed || claimed;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">혜택을 찾을 수 없습니다</p>
      </div>
    );
  }

  const discountPercent =
    deal.original_price && deal.deal_price
      ? Math.round((1 - deal.deal_price / deal.original_price) * 100)
      : null;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground truncate">혜택 상세</h1>
        </div>
      </header>

      <main className="pb-32">
        {/* Banner */}
        {deal.banner_image_url ? (
          <img src={deal.banner_image_url} alt={deal.title} className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary/20 via-accent to-primary/10 flex items-center justify-center">
            <Gift className="w-16 h-16 text-primary/30" />
          </div>
        )}

        <div className="px-4 py-4">
          {/* Tags */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${dealTypeLabels[deal.deal_type]?.color || "bg-muted text-muted-foreground"}`}>
              {dealTypeLabels[deal.deal_type]?.label}
            </span>
            {deal.end_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(deal.start_date)} ~ {formatDate(deal.end_date)}
              </span>
            )}
          </div>

          {/* Title & Partner */}
          <h2 className="text-xl font-bold text-foreground mb-1">{deal.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{deal.partner_name}</p>

          {/* Price */}
          {deal.original_price && deal.deal_price && (
            <div className="flex items-center gap-3 mb-4 p-4 bg-primary/5 rounded-2xl">
              {discountPercent && (
                <span className="text-2xl font-black text-primary">{discountPercent}%</span>
              )}
              <div>
                <p className="text-sm text-muted-foreground line-through">{formatPrice(deal.original_price)}</p>
                <p className="text-xl font-bold text-foreground">{formatPrice(deal.deal_price)}</p>
              </div>
            </div>
          )}

          {/* Discount Info Badge */}
          {deal.discount_info && !deal.original_price && (
            <div className="mb-4 p-4 bg-primary/5 rounded-2xl flex items-center gap-3">
              <Tag className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold text-primary">{deal.discount_info}</span>
            </div>
          )}

          {/* Coupon Code */}
          {deal.coupon_code && isClaimed && (
            <div className="mb-4 p-4 bg-muted rounded-2xl">
              <p className="text-xs text-muted-foreground mb-2">쿠폰 코드</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-center font-mono text-lg font-bold tracking-widest text-foreground">
                  {deal.coupon_code}
                </span>
                <button onClick={handleCopyCode} className="p-2 hover:bg-background rounded-lg transition-colors">
                  {copiedCode ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-4">
            <h3 className="font-semibold text-foreground mb-2">상세 내용</h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{deal.description}</p>
          </div>

          {/* Terms */}
          {deal.terms && (
            <div className="mb-4 p-4 bg-muted/50 rounded-xl">
              <h3 className="font-semibold text-foreground text-sm mb-2">이용 조건</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{deal.terms}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {deal.view_count}명이 봤어요
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {deal.claim_count}명이 받았어요
            </span>
          </div>
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
        <div className="flex gap-2">
          {deal.external_url && (
            <a href={deal.external_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <Button variant="outline" size="icon" className="h-12 w-12">
                <ExternalLink className="w-5 h-5" />
              </Button>
            </a>
          )}
          <Button
            onClick={handleClaim}
            disabled={isClaimed || isClaiming}
            className="flex-1 h-12 text-base font-semibold"
          >
            {isClaiming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isClaimed ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                혜택 받기 완료
              </>
            ) : (
              <>
                <Gift className="w-5 h-5 mr-2" />
                혜택 받기
              </>
            )}
          </Button>
        </div>
      </div>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default DealDetail;
