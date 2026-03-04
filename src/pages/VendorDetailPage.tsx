import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Star, MapPin, Phone, Clock, Car, ExternalLink } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useVendor, useWeddingHallDetail, useVendorReviews, categoryRouteMap } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const VendorDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { data: vendor, isLoading } = useVendor(id || "");
  const { data: hallDetail } = useWeddingHallDetail(id || "");
  const { data: reviews = [] } = useVendorReviews(id || "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <Skeleton className="h-56 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">업체를 찾을 수 없습니다</p>
      </div>
    );
  }

  const snsInfo = vendor.sns_info as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1 text-center -mr-8 truncate">{vendor.name}</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Thumbnail */}
        <div className="aspect-[16/9] bg-muted overflow-hidden">
          {vendor.thumbnail_url ? (
            <img src={vendor.thumbnail_url} alt={vendor.name} className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <span className="text-5xl">{categoryRouteMap[vendor.category_type]?.emoji || "🏢"}</span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {vendor.category_type}
            </span>
            <div className="flex items-center gap-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold">{vendor.avg_rating?.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({vendor.review_count})</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-3">{vendor.name}</h2>

          <div className="space-y-2 text-sm text-muted-foreground">
            {vendor.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{vendor.address}</span>
              </div>
            )}
            {vendor.tel && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${vendor.tel}`} className="text-primary underline">{vendor.tel}</a>
              </div>
            )}
            {vendor.business_hours && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{vendor.business_hours}</span>
              </div>
            )}
            {(vendor.parking_location || vendor.parking_hours) && (
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 flex-shrink-0" />
                <span>{[vendor.parking_location, vendor.parking_hours].filter(Boolean).join(" · ")}</span>
              </div>
            )}
          </div>

          {vendor.amenities && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vendor.amenities.split(",").map((a, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                  {a.trim()}
                </span>
              ))}
            </div>
          )}

          {vendor.keywords && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vendor.keywords.split(",").map((k, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-primary/5 text-primary rounded-full">
                  #{k.trim()}
                </span>
              ))}
            </div>
          )}

          {/* SNS Links */}
          {snsInfo && Object.keys(snsInfo).length > 0 && (
            <div className="mt-3 flex gap-2">
              {Object.entries(snsInfo).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-muted rounded-full text-foreground hover:bg-accent transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {platform}
                </a>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Wedding Hall Details */}
        {vendor.category_type === "웨딩홀" && hallDetail && (
          <>
            <div className="p-4">
              <h3 className="text-base font-bold text-foreground mb-3">웨딩홀 상세 정보</h3>
              <div className="grid grid-cols-2 gap-3">
                {hallDetail.meal_type && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">식사 유형</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.meal_type}</p>
                  </div>
                )}
                {hallDetail.meal_cost_range && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">식대 범위</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.meal_cost_range}</p>
                  </div>
                )}
                {hallDetail.rental_cost_range && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">대관료 범위</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.rental_cost_range}</p>
                  </div>
                )}
                {hallDetail.parking_info && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">주차</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{hallDetail.parking_info}</p>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Reviews */}
        <div className="p-4">
          <h3 className="text-base font-bold text-foreground mb-3">
            리뷰 ({reviews.length})
          </h3>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.review_id} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  {review.content && (
                    <p className="text-sm text-foreground">{review.content}</p>
                  )}
                  {review.ai_summary && (
                    <div className="mt-2 bg-primary/5 rounded-lg px-3 py-2">
                      <p className="text-xs text-primary font-medium">🤖 AI 요약</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{review.ai_summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">아직 리뷰가 없습니다</p>
          )}
        </div>

        {/* Contact CTA */}
        <div className="px-4 pb-4">
          <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => vendor.tel && window.open(`tel:${vendor.tel}`)}>
            <Phone className="w-4 h-4 mr-2" />
            전화 문의하기
          </Button>
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default VendorDetailPage;
